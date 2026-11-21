import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  AlertTriangle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  BoardValidation,
  CellCoord,
  CellMark,
  PandokuPuzzle,
} from '../shared/types';
import { validatePandokuBoard } from '../shared/puzzleGenerator';
import { REGION_COLORS } from './PandaToken';
import { BoardReactionKind } from './BoardBuddyPanda';
import { soundFx } from '../utils/sound';
import {
  attachStudioEnvironment,
  buildMiniPandaToken,
  createCrossTexture,
  createRoundedTileGeometry,
  createStudioRenderer,
  createTilePatternTexture,
  scheduleNextFrame,
} from '../utils/threeSetup';

interface PandokuBoardProps {
  puzzle: PandokuPuzzle;
  disabled?: boolean;
  showPatterns?: boolean;
  autoX?: boolean;
  /** Optional solution array (provided in Easy Solo mode for Hints; null in Hard/Duel) */
  soloSolution?: number[] | null;
  onProgressChange?: (pandasPlaced: number, mistakes: number) => void;
  onSolved?: (pandas: CellCoord[], mistakes: number) => void;
  onBoardReaction?: (kind: BoardReactionKind) => void;
}

type GridState = CellMark[][];

function createEmptyGrid(size: number): GridState {
  return Array.from({ length: size }, () => new Array<CellMark>(size).fill('empty'));
}

function cloneGrid(grid: GridState): GridState {
  return grid.map((row) => [...row]);
}

function extractPandas(grid: GridState): CellCoord[] {
  const result: CellCoord[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 'panda') {
        result.push({ row: r, col: c });
      }
    }
  }
  return result;
}

/**
 * Bresenham grid line interpolation so fast horizontal/vertical/diagonal swipes
 * across 5+ cells NEVER skip an intermediate cell!
 */
function interpolateCells(a: CellCoord, b: CellCoord): CellCoord[] {
  const cells: CellCoord[] = [];
  let r0 = a.row;
  let c0 = a.col;
  const r1 = b.row;
  const c1 = b.col;
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;

  while (true) {
    cells.push({ row: r0, col: c0 });
    if (r0 === r1 && c0 === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) {
      err -= dc;
      r0 += sr;
    }
    if (e2 < dr) {
      err += dr;
      c0 += sc;
    }
  }
  return cells;
}

/** Smooth cubic ease-out (strictly monotonic, ZERO oscillation/vibration!) */
function easeOutCubic(t: number): number {
  const u = 1 - Math.max(0, Math.min(1, t));
  return 1 - u * u * u;
}

/** Gentle single-crest pop curve: rises cleanly once, settles smoothly to 0 with ZERO vibration */
function singlePopCurve(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return Math.sin(clamped * Math.PI) * (1 - clamped * 0.35);
}

interface TileVisualState {
  row: number;
  col: number;
  baseColor: THREE.Color;
  tileGroup: THREE.Group;
  tileMat: THREE.MeshStandardMaterial;
  patternPlane: THREE.Mesh;
  xPlane: THREE.Mesh;
  autoXPlane: THREE.Mesh;
  pandaGroup: THREE.Group;
  ringMesh: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  // Smooth, non-vibrating animation channels (100% static when settled!)
  scale: number;
  yOffset: number;
  pandaScale: number;
  xScale: number;
  /** One-shot clean pulse timer (0 = idle/static, 0..1 = smooth single swell) */
  pulseT: number;
  pulseStrength: number;
  ringProgress: number;
}

interface ConfettiParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.15);
const _hitPoint = new THREE.Vector3();
const _conflictColor = new THREE.Color('#F87171');
const _hintColor = new THREE.Color('#34D399');

const DOUBLE_TAP_MS = 320;

export function PandokuBoard({
  puzzle,
  disabled = false,
  showPatterns = false,
  autoX = true,
  soloSolution = null,
  onProgressChange,
  onSolved,
  onBoardReaction,
}: PandokuBoardProps) {
  const [grid, setGrid] = useState<GridState>(() => createEmptyGrid(puzzle.size));
  const [history, setHistory] = useState<GridState[]>([]);
  const [mistakes, setMistakes] = useState<number>(0);
  const [hintCell, setHintCell] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<GridState>(grid);
  gridRef.current = grid;

  const activePuzzleIdRef = useRef<string>(puzzle.id);
  const solvedEmittedRef = useRef<boolean>(false);
  const pressedCellRef = useRef<CellCoord | null>(null);
  const tilesRef = useRef<TileVisualState[][]>([]);
  const triggerCelebrationRef = useRef<(() => void) | null>(null);
  const wakeRenderRef = useRef<(() => void) | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const puzzleRegionsRef = useRef<number[][]>(puzzle.regions);
  puzzleRegionsRef.current = puzzle.regions;

  const gestureRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startCell: CellCoord | null;
    lastCell: CellCoord | null;
    isSwiping: boolean;
    swipeAction: 'mark-x' | 'clear-x';
    swipeChangedAny: boolean;
    swipeNoteStep: number;
    preGestureSnapshot: GridState | null;
  }>({
    active: false,
    pointerId: null,
    startCell: null,
    lastCell: null,
    isSwiping: false,
    swipeAction: 'mark-x',
    swipeChangedAny: false,
    swipeNoteStep: 0,
    preGestureSnapshot: null,
  });

  const lastTapRef = useRef<{ row: number; col: number; time: number } | null>(null);
  const recentPandaFromXRef = useRef<{ row: number; col: number; time: number } | null>(null);

  // Reset board cleanly whenever a new puzzle ID loads
  useEffect(() => {
    activePuzzleIdRef.current = puzzle.id;
    const empty = createEmptyGrid(puzzle.size);
    setGrid(empty);
    gridRef.current = empty;
    setHistory([]);
    setMistakes(0);
    setHintCell(null);
    solvedEmittedRef.current = false;
    lastTapRef.current = null;
    recentPandaFromXRef.current = null;
    pressedCellRef.current = null;
    wakeRenderRef.current?.();
  }, [puzzle.id, puzzle.size]);

  const pandas = useMemo(() => extractPandas(grid), [grid]);

  const validation: BoardValidation = useMemo(
    () => validatePandokuBoard(puzzle.regions, pandas),
    [puzzle.regions, pandas]
  );

  const effectiveAutoX = autoX && puzzle.colorMode === 'connected';

  const conflictRef = useRef<Record<string, unknown>>(validation.conflictCells);
  conflictRef.current = validation.conflictCells;
  const hintCellRef = useRef<string | null>(hintCell);
  hintCellRef.current = hintCell;
  const showPatternsRef = useRef<boolean>(showPatterns);
  showPatternsRef.current = showPatterns;
  const autoXRef = useRef<boolean>(effectiveAutoX);
  autoXRef.current = effectiveAutoX;

  // Wake on-demand renderer whenever reactive state or settings change
  useEffect(() => {
    wakeRenderRef.current?.();
  }, [grid, validation.conflictCells, hintCell, showPatterns, effectiveAutoX]);

  // Smooth, single-crest non-vibrating tile width expansion pulse
  const pulseTile = useCallback(
    (row: number, col: number, kind: 'x' | 'erase' | 'panda' | 'conflict') => {
      const tile = tilesRef.current[row]?.[col];
      if (!tile) return;
      if (kind === 'panda') {
        tile.pulseT = 0.001;
        tile.pulseStrength = 0.032; // Smooth width expansion strictly inside gutter & wall clearance
        tile.ringProgress = 0.001;
      } else if (kind === 'x') {
        tile.pulseT = 0.001;
        tile.pulseStrength = 0.028;
      } else if (kind === 'conflict') {
        tile.pulseT = 0.001;
        tile.pulseStrength = 0.028;
      } else {
        tile.pulseT = 0.001;
        tile.pulseStrength = -0.03;
      }
      wakeRenderRef.current?.();
    },
    []
  );

  useEffect(() => {
    if (disabled || activePuzzleIdRef.current !== puzzle.id) return;
    onProgressChange?.(pandas.length, mistakes);

    // Ensure the live ref grid also matches solved state (never stale from prior attempt)
    const livePandas = extractPandas(gridRef.current);
    if (validation.solved && livePandas.length === puzzle.size && !solvedEmittedRef.current) {
      solvedEmittedRef.current = true;
      soundFx.roundSolved();
      triggerCelebrationRef.current?.();
      onBoardReaction?.('solved');
      onSolved?.(pandas, mistakes);
    }
  }, [
    puzzle.id,
    puzzle.size,
    pandas,
    mistakes,
    validation.solved,
    disabled,
    onProgressChange,
    onSolved,
    onBoardReaction,
  ]);

  // =========================================================================
  // THREE.JS 3D BOARD (TRUE COLORS + CRISP STATIC REST + ZERO VIBRATION)
  // =========================================================================
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const size = puzzle.size;
    const regions = puzzleRegionsRef.current;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // Linear tone mapping at 1.0 exposure keeps every territory color 100% rich & vivid!
    const { renderer, isSoftwareGl } = createStudioRenderer(true, 1.0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';

    const scene = new THREE.Scene();
    // Subtle environment intensity (0.12) adds gentle bevel polish without washing out colors
    const envTex = attachStudioEnvironment(renderer, scene, 0.12);

    // Clean top-down OrthographicCamera with subtle depth angle
    const halfSpan = size * 0.5 + 0.14;
    const camera = new THREE.OrthographicCamera(
      -halfSpan,
      halfSpan,
      halfSpan,
      -halfSpan,
      0.1,
      40
    );
    camera.position.set(0, 12, 0.85);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    // Physically calibrated Studio Rig:
    // Hemi(1.55/pi=0.49) + Dir(1.55*0.91/pi=0.45) + Env(0.10) ≈ 1.04 linear -> exact vivid swatch colors!
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa89f, 1.55);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffdf8, 1.55);
    keyLight.position.set(2.5, 9.5, 3.8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -halfSpan - 1;
      keyLight.shadow.camera.right = halfSpan + 1;
      keyLight.shadow.camera.top = halfSpan + 1;
      keyLight.shadow.camera.bottom = -halfSpan - 1;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Subtle Slate-Charcoal Tray Frame (soft grid seams inside same region, bold dark walls between regions)
    const trayGeo = new THREE.BoxGeometry(size + 0.22, 0.2, size + 0.22);
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x35423b,
      roughness: 0.82,
      metalness: 0.02,
    });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(0, -0.1, 0);
    tray.receiveShadow = true;
    scene.add(tray);

    // Rounded Beveled 3D Tiles (0.86 + 0.04 bevel = 0.90 resting width -> 0.45 half-width < 0.466 wall edge)
    const tileGeo = createRoundedTileGeometry(0.86, 0.86, 0.1, 0.11);
    const patternPlaneGeo = new THREE.PlaneGeometry(0.84, 0.84);
    const planeGeo = new THREE.PlaneGeometry(0.74, 0.74);
    const ringGeo = new THREE.RingGeometry(0.24, 0.34, 24);

    const manualXTex = createCrossTexture('manual');
    const autoXTex = createCrossTexture('auto');
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    manualXTex.anisotropy = maxAniso;
    autoXTex.anisotropy = maxAniso;

    // 8 shared optional per-color tile pattern textures & overlay materials
    const patternTextures = Array.from({ length: REGION_COLORS.length }, (_, idx) => {
      const tex = createTilePatternTexture(idx);
      tex.anisotropy = maxAniso;
      return tex;
    });
    const patternMats = patternTextures.map(
      (tex) =>
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
    );

    const matManualX = new THREE.MeshBasicMaterial({
      map: manualXTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const matAutoX = new THREE.MeshBasicMaterial({
      map: autoXTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // Shared 3D Mini Panda geometries & materials
    const pandaGeos = {
      rim: new THREE.CylinderGeometry(0.35, 0.36, 0.08, 22),
      head: new THREE.SphereGeometry(0.32, 20, 16),
      ear: new THREE.SphereGeometry(0.11, 12, 10),
      patch: new THREE.SphereGeometry(0.098, 12, 10),
      eye: new THREE.SphereGeometry(0.042, 10, 8),
      nose: new THREE.SphereGeometry(0.048, 10, 8),
      cheek: new THREE.SphereGeometry(0.055, 10, 8),
    };
    const pandaMats = {
      whiteFur: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }),
      darkFur: new THREE.MeshStandardMaterial({ color: 0x161e1a, roughness: 0.72 }),
      glossEye: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      blush: new THREE.MeshStandardMaterial({ color: 0xf48da2, roughness: 0.72 }),
      conflictDark: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 }),
    };

    const offset = (size - 1) / 2;
    const gridTiles: TileVisualState[][] = [];

    for (let r = 0; r < size; r++) {
      const rowList: TileVisualState[] = [];
      for (let c = 0; c < size; c++) {
        const regId = regions[r][c];
        const hex = REGION_COLORS[regId % REGION_COLORS.length].bg;
        const baseColor = new THREE.Color(hex);

        const tileGroup = new THREE.Group();
        tileGroup.position.set(c - offset, 0, r - offset);
        scene.add(tileGroup);

        const tileMat = new THREE.MeshStandardMaterial({
          color: baseColor.clone(),
          roughness: 0.82,
          metalness: 0.0,
        });
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.castShadow = true;
        tileMesh.receiveShadow = true;
        tileGroup.add(tileMesh);

        // Tile top sits at Y = 0.11 + 0.04 = 0.15; layer pattern -> autoX -> manualX cleanly above it
        const patternPlane = new THREE.Mesh(
          patternPlaneGeo,
          patternMats[regId % patternMats.length]
        );
        patternPlane.rotation.x = -Math.PI / 2;
        patternPlane.position.y = 0.156;
        patternPlane.visible = showPatternsRef.current;
        tileGroup.add(patternPlane);

        const xPlane = new THREE.Mesh(planeGeo, matManualX);
        xPlane.rotation.x = -Math.PI / 2;
        xPlane.position.y = 0.168;
        xPlane.visible = false;
        tileGroup.add(xPlane);

        const autoXPlane = new THREE.Mesh(planeGeo, matAutoX);
        autoXPlane.rotation.x = -Math.PI / 2;
        autoXPlane.position.y = 0.164;
        autoXPlane.visible = false;
        tileGroup.add(autoXPlane);

        const pandaGroup = buildMiniPandaToken(pandaGeos, pandaMats);
        pandaGroup.position.y = 0.15;
        pandaGroup.scale.set(0.001, 0.001, 0.001);
        pandaGroup.visible = false;
        tileGroup.add(pandaGroup);

        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x1b7a4e,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.184;
        ringMesh.visible = false;
        tileGroup.add(ringMesh);

        rowList.push({
          row: r,
          col: c,
          baseColor,
          tileGroup,
          tileMat,
          patternPlane,
          xPlane,
          autoXPlane,
          pandaGroup,
          ringMesh,
          ringMat,
          scale: 1.0,
          yOffset: 0,
          pandaScale: 0,
          xScale: 0,
          pulseT: 0,
          pulseStrength: 0,
          ringProgress: 0,
        });
      }
      gridTiles.push(rowList);
    }
    tilesRef.current = gridTiles;

    // Crisp Raised Sumi-Ink Territory Divider Walls between distinct regions
    const isScattered = puzzle.colorMode === 'scattered';
    const wallThickness = isScattered ? 0.036 : 0.068;
    const wallHeight = isScattered ? 0.165 : 0.2;
    const wallMat = new THREE.MeshStandardMaterial({
      color: isScattered ? 0x1e2822 : 0x111814,
      roughness: 0.65,
      metalness: 0.04,
    });
    const hWallGeo = new THREE.BoxGeometry(1.02, wallHeight, wallThickness);
    const vWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 1.02);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const reg = regions[r][c];
        if (r < size - 1 && regions[r + 1][c] !== reg) {
          const wall = new THREE.Mesh(hWallGeo, wallMat);
          wall.position.set(c - offset, wallHeight / 2, r - offset + 0.5);
          scene.add(wall);
        }
        if (c < size - 1 && regions[r][c + 1] !== reg) {
          const wall = new THREE.Mesh(vWallGeo, wallMat);
          wall.position.set(c - offset + 0.5, wallHeight / 2, r - offset);
          scene.add(wall);
        }
      }
    }

    // 3D Victory Confetti Particle System
    const confettiList: ConfettiParticle[] = [];
    const confettiGeo = new THREE.BoxGeometry(0.14, 0.03, 0.2);
    const confettiColors = [0x1b7a4e, 0xf5ca5c, 0xf28da8, 0x6ec2f5, 0xb49bf2];

    // On-Demand Smooth Animation Loop — 100% STATIC (0% CPU) when settled!
    const clock = new THREE.Clock();
    let frameHandle = 0;
    let frameIsTimeout = false;
    let isLoopRunning = false;
    let dirtyWhileRunning = false;
    let disposed = false;

    const renderTick = () => {
      if (disposed) return;
      dirtyWhileRunning = false;
      const dt = Math.min(0.04, clock.getDelta());
      const curGrid = gridRef.current;
      const curRegions = puzzleRegionsRef.current;
      const curConflicts = conflictRef.current;
      const curHint = hintCellRef.current;
      const pressed = pressedCellRef.current;

      // Compute Auto-X blocked cells synchronously from curGrid so removing a Panda
      // clears its suggested crosses immediately on the very next rendered frame.
      const curAuto = new Set<string>();
      if (autoXRef.current) {
        const curPandas: CellCoord[] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (curGrid[r]?.[c] === 'panda') {
              curPandas.push({ row: r, col: c });
            }
          }
        }
        for (const p of curPandas) {
          const pReg = curRegions[p.row]?.[p.col];
          for (let i = 0; i < size; i++) {
            curAuto.add(`${p.row},${i}`);
            curAuto.add(`${i},${p.col}`);
          }
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = p.row + dr;
              const nc = p.col + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                curAuto.add(`${nr},${nc}`);
              }
            }
          }
          if (pReg !== undefined) {
            for (let r = 0; r < size; r++) {
              for (let c = 0; c < size; c++) {
                if (curRegions[r]?.[c] === pReg) {
                  curAuto.add(`${r},${c}`);
                }
              }
            }
          }
        }
      }

      let stillAnimating = false;
      const smoothK = 22; // Critically damped smooth exponential convergence (ZERO overshoot/vibration!)

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const tile = gridTiles[r][c];
          const mark = curGrid[r]?.[c] ?? 'empty';
          const key = `${r},${c}`;
          const isConflict = Boolean(curConflicts[key]);
          const isAuto = mark === 'empty' && curAuto.has(key);
          const isPressed = pressed?.row === r && pressed?.col === c;
          const isHinted = curHint === key;

          // Advance single clean one-shot pulse (zero oscillation!)
          let pulseOffset = 0;
          if (tile.pulseT > 0) {
            tile.pulseT += dt * 5.2; // Crisp ~190ms swell and return
            if (tile.pulseT >= 1) {
              tile.pulseT = 0;
              pulseOffset = 0;
            } else {
              pulseOffset = singlePopCurve(tile.pulseT) * tile.pulseStrength;
              stillAnimating = true;
            }
          }

          // Smooth tile width decrease on press & gentle expansion on release (ZERO vibration!)
          const baseScale = isPressed ? 0.86 : 1.0;
          const targetScale = baseScale + pulseOffset;
          const targetY = isPressed ? -0.032 : pulseOffset > 0 ? pulseOffset * 0.45 : 0;

          tile.scale = THREE.MathUtils.damp(tile.scale, targetScale, smoothK, dt);
          tile.yOffset = THREE.MathUtils.damp(tile.yOffset, targetY, smoothK, dt);

          if (
            Math.abs(tile.scale - targetScale) > 0.001 ||
            Math.abs(tile.yOffset - targetY) > 0.001
          ) {
            stillAnimating = true;
          } else {
            tile.scale = targetScale;
            tile.yOffset = targetY;
          }

          tile.tileGroup.position.set(c - offset, tile.yOffset, r - offset);
          tile.tileGroup.scale.set(tile.scale, 1, tile.scale);

          // Smooth color transition (true territory color vs conflict vs hint)
          const targetCol = isConflict
            ? _conflictColor
            : isHinted
              ? _hintColor
              : tile.baseColor;
          const colorDist =
            Math.abs(tile.tileMat.color.r - targetCol.r) +
            Math.abs(tile.tileMat.color.g - targetCol.g) +
            Math.abs(tile.tileMat.color.b - targetCol.b);
          if (colorDist > 0.004) {
            tile.tileMat.color.lerp(targetCol, Math.min(1, dt * 18));
            stillAnimating = true;
          } else {
            tile.tileMat.color.copy(targetCol);
          }

          // Smooth monotonic X appear/disappear
          const targetX = mark === 'x' ? 1 : 0;
          if (Math.abs(tile.xScale - targetX) > 0.005) {
            tile.xScale = THREE.MathUtils.damp(tile.xScale, targetX, 26, dt);
            stillAnimating = true;
          } else {
            tile.xScale = targetX;
          }
          tile.xPlane.visible = tile.xScale > 0.02;
          if (tile.xPlane.visible) {
            const s = easeOutCubic(tile.xScale);
            tile.xPlane.scale.set(s, s, 1);
          }

          tile.patternPlane.visible = showPatternsRef.current;
          tile.autoXPlane.visible = isAuto;

          // Smooth monotonic 3D Mini Panda pop-in (100% static once placed — ZERO idle rocking!)
          const targetPanda = mark === 'panda' ? 1 : 0;
          if (Math.abs(tile.pandaScale - targetPanda) > 0.005) {
            tile.pandaScale = THREE.MathUtils.damp(tile.pandaScale, targetPanda, 22, dt);
            stillAnimating = true;
          } else {
            tile.pandaScale = targetPanda;
          }
          tile.pandaGroup.visible = tile.pandaScale > 0.02;
          if (tile.pandaGroup.visible) {
            const ps = easeOutCubic(tile.pandaScale);
            tile.pandaGroup.scale.set(ps, ps, ps);
            tile.pandaGroup.rotation.y = 0;
            tile.pandaGroup.traverse((child) => {
              if ((child as THREE.Mesh).isMesh && child.userData.role === 'fur-dark') {
                (child as THREE.Mesh).material = isConflict
                  ? pandaMats.conflictDark
                  : pandaMats.darkFur;
              }
            });
          }

          // Expanding Emerald Ring Wave on clean Panda placement
          if (tile.ringProgress > 0) {
            tile.ringProgress += dt * 3.0;
            if (tile.ringProgress >= 1) {
              tile.ringProgress = 0;
              tile.ringMesh.visible = false;
            } else {
              tile.ringMesh.visible = true;
              const s = 0.72 + easeOutCubic(tile.ringProgress) * 1.15;
              tile.ringMesh.scale.set(s, s, 1);
              tile.ringMat.opacity = (1 - tile.ringProgress) * 0.85;
              stillAnimating = true;
            }
          }
        }
      }

      // Advance victory 3D confetti
      if (confettiList.length > 0) {
        stillAnimating = true;
        for (let i = confettiList.length - 1; i >= 0; i--) {
          const p = confettiList[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            scene.remove(p.mesh);
            (p.mesh.material as THREE.Material).dispose();
            confettiList.splice(i, 1);
          } else {
            p.vel.y -= 9.5 * dt;
            p.mesh.position.addScaledVector(p.vel, dt);
            p.mesh.rotation.x += p.rotVel.x * dt;
            p.mesh.rotation.y += p.rotVel.y * dt;
            p.mesh.rotation.z += p.rotVel.z * dt;
            const fade = Math.max(0, 1 - p.life / p.maxLife);
            p.mesh.scale.setScalar(fade);
          }
        }
      }

      renderer.render(scene, camera);

      if (stillAnimating || dirtyWhileRunning) {
        scheduleNextFrame(renderer, isSoftwareGl, renderTick, (id, isTo) => {
          frameHandle = id;
          frameIsTimeout = isTo;
        });
      } else {
        isLoopRunning = false;
      }
    };

    const wakeRender = () => {
      if (disposed) return;
      if (isLoopRunning) {
        dirtyWhileRunning = true;
        return;
      }
      isLoopRunning = true;
      clock.getDelta(); // Reset delta so first frame doesn't jump
      scheduleNextFrame(renderer, isSoftwareGl, renderTick, (id, isTo) => {
        frameHandle = id;
        frameIsTimeout = isTo;
      });
    };
    wakeRenderRef.current = wakeRender;

    triggerCelebrationRef.current = () => {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          gridTiles[r][c].pulseT = 0.001;
          gridTiles[r][c].pulseStrength = 0.032;
        }
      }
      for (let i = 0; i < 32; i++) {
        const mat = new THREE.MeshStandardMaterial({
          color: confettiColors[i % confettiColors.length],
          roughness: 0.45,
        });
        const mesh = new THREE.Mesh(confettiGeo, mat);
        mesh.position.set(
          (Math.random() - 0.5) * size * 0.85,
          0.4,
          (Math.random() - 0.5) * size * 0.85
        );
        scene.add(mesh);
        confettiList.push({
          mesh,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 3.8,
            4.2 + Math.random() * 3.2,
            (Math.random() - 0.5) * 3.8
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          ),
          life: 0,
          maxLife: 1.45 + Math.random() * 0.6,
        });
      }
      wakeRender();
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(120, Math.floor(entry.contentRect.width));
        const h = Math.max(120, Math.floor(entry.contentRect.height));
        renderer.setSize(w, h);
        // Render synchronously right after resize so no blank/black compositor frame ever flashes!
        renderer.render(scene, camera);
        wakeRender();
      }
    });
    resizeObserver.observe(container);

    // Block native mobile page scrolling/rubber-banding while swiping across the 3D puzzle board
    const blockTouchScroll = (ev: TouchEvent) => {
      ev.preventDefault();
    };
    container.addEventListener('touchmove', blockTouchScroll, { passive: false });

    // Draw initial crisp static frame immediately
    renderer.render(scene, camera);

    return () => {
      disposed = true;
      isLoopRunning = false;
      if (frameIsTimeout) clearTimeout(frameHandle);
      else cancelAnimationFrame(frameHandle);
      container.removeEventListener('touchmove', blockTouchScroll);
      resizeObserver.disconnect();
      triggerCelebrationRef.current = null;
      wakeRenderRef.current = null;
      tilesRef.current = [];

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else if (m.material) m.material.dispose();
        }
      });
      manualXTex.dispose();
      autoXTex.dispose();
      patternTextures.forEach((tex) => tex.dispose());
      envTex.dispose();
      renderer.dispose();
    };
  }, [puzzle.id, puzzle.size, puzzle.colorMode]);

  const getCellFromClientPoint = useCallback(
    (clientX: number, clientY: number): CellCoord | null => {
      const mount = canvasMountRef.current;
      const camera = cameraRef.current;
      if (!mount || !camera) return null;

      const rect = mount.getBoundingClientRect();
      _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_ndc, camera);
      if (!_raycaster.ray.intersectPlane(_boardPlane, _hitPoint)) {
        return null;
      }

      const size = puzzle.size;
      const offset = (size - 1) / 2;
      const col = Math.round(_hitPoint.x + offset);
      const row = Math.round(_hitPoint.z + offset);

      if (row < 0 || row >= size || col < 0 || col >= size) {
        return null;
      }
      return { row, col };
    },
    [puzzle.size]
  );

  const commitGridChange = useCallback(
    (
      nextGrid: GridState,
      previousGrid: GridState,
      placedNewPanda: boolean,
      placedCoord?: CellCoord,
      replaceTopHistory = false
    ) => {
      setHistory((prev) => {
        if (replaceTopHistory && prev.length > 0) {
          return prev;
        }
        return [...prev.slice(-49), previousGrid];
      });
      setGrid(nextGrid);
      gridRef.current = nextGrid;
      setHintCell(null);

      if (placedNewPanda) {
        const nextValidation = validatePandokuBoard(puzzle.regions, extractPandas(nextGrid));
        if (!nextValidation.valid) {
          setMistakes((m) => m + 1);
          soundFx.conflict();
          onBoardReaction?.('mistake');
          if (placedCoord) pulseTile(placedCoord.row, placedCoord.col, 'conflict');
        } else {
          soundFx.placePanda();
          onBoardReaction?.('panda');
          if (placedCoord) pulseTile(placedCoord.row, placedCoord.col, 'panda');
        }
      }
      wakeRenderRef.current?.();
    },
    [onBoardReaction, pulseTile, puzzle.regions]
  );

  /**
   * Tap behavior:
   * - Single tap (or slow repeated tap > 320ms): strictly toggles Cross (X) <-> Blank (empty), NEVER places a Panda!
   * - Quick double-tap (2nd tap on the same cell within 320ms): places a Panda!
   * - Single tap on an existing Panda (after 280ms stray-tap guard): removes Panda -> Blank (and clears its Auto-X immediately).
   */
  const handleCellTap = useCallback(
    (row: number, col: number) => {
      if (disabled || solvedEmittedRef.current) return;
      const now = Date.now();
      const currentGrid = gridRef.current;
      const current = currentGrid[row][col];
      const snapshot = cloneGrid(currentGrid);
      const next = cloneGrid(currentGrid);

      const lastTap = lastTapRef.current;
      const isQuickDoubleTap = Boolean(
        lastTap &&
          lastTap.row === row &&
          lastTap.col === col &&
          now - lastTap.time <= DOUBLE_TAP_MS
      );

      if (current === 'panda') {
        const recent = recentPandaFromXRef.current;
        if (recent && recent.row === row && recent.col === col && now - recent.time < 280) {
          recentPandaFromXRef.current = null;
          soundFx.placePanda();
          pulseTile(row, col, 'panda');
          onBoardReaction?.('panda');
          return;
        }
        lastTapRef.current = null;
        next[row][col] = 'empty';
        soundFx.clearCell();
        pulseTile(row, col, 'erase');
        onBoardReaction?.('undo');
        commitGridChange(next, snapshot, false);
        return;
      }

      if (isQuickDoubleTap) {
        lastTapRef.current = null;
        next[row][col] = 'panda';
        recentPandaFromXRef.current = { row, col, time: now };
        commitGridChange(next, snapshot, true, { row, col }, true);
        return;
      }

      // Normal single tap (or slow tap): strictly toggles Cross <-> Blank
      lastTapRef.current = { row, col, time: now };
      if (current === 'empty') {
        next[row][col] = 'x';
        soundFx.tapX();
        pulseTile(row, col, 'x');
        onBoardReaction?.('cross');
        commitGridChange(next, snapshot, false);
      } else {
        next[row][col] = 'empty';
        soundFx.clearCell();
        pulseTile(row, col, 'erase');
        onBoardReaction?.('undo');
        commitGridChange(next, snapshot, false);
      }
    },
    [commitGridChange, disabled, onBoardReaction, pulseTile]
  );

  const togglePandaDirect = useCallback(
    (row: number, col: number) => {
      if (disabled || solvedEmittedRef.current) return;
      const currentGrid = gridRef.current;
      const snapshot = cloneGrid(currentGrid);
      const next = cloneGrid(currentGrid);
      const placing = currentGrid[row][col] !== 'panda';
      next[row][col] = placing ? 'panda' : 'empty';
      if (!placing) {
        soundFx.clearCell();
        pulseTile(row, col, 'erase');
      }
      commitGridChange(next, snapshot, placing, placing ? { row, col } : undefined);
    },
    [commitGridChange, disabled, pulseTile]
  );

  const applySwipeOnCells = useCallback(
    (cells: CellCoord[], action: 'mark-x' | 'clear-x') => {
      const currentGrid = gridRef.current;
      let nextGrid: GridState | null = null;
      const changedCoords: CellCoord[] = [];

      for (const cell of cells) {
        const currentVal = (nextGrid ?? currentGrid)[cell.row][cell.col];
        if (action === 'mark-x' && currentVal === 'empty') {
          if (!nextGrid) nextGrid = cloneGrid(currentGrid);
          nextGrid[cell.row][cell.col] = 'x';
          changedCoords.push(cell);
        } else if (action === 'clear-x' && currentVal === 'x') {
          if (!nextGrid) nextGrid = cloneGrid(currentGrid);
          nextGrid[cell.row][cell.col] = 'empty';
          changedCoords.push(cell);
        }
      }

      if (nextGrid && changedCoords.length > 0) {
        gridRef.current = nextGrid;
        setGrid(nextGrid);
        gestureRef.current.swipeChangedAny = true;

        for (const coord of changedCoords) {
          if (action === 'mark-x') {
            soundFx.swipeX(gestureRef.current.swipeNoteStep++);
            pulseTile(coord.row, coord.col, 'x');
          } else {
            soundFx.swipeEraseX(gestureRef.current.swipeNoteStep++);
            pulseTile(coord.row, coord.col, 'erase');
          }
        }
        onBoardReaction?.(action === 'mark-x' ? 'cross' : 'undo');
      }
    },
    [onBoardReaction, pulseTile]
  );

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || solvedEmittedRef.current) return;
    if (e.button === 2) return;

    soundFx.unlockAudio();
    const cell = getCellFromClientPoint(e.clientX, e.clientY);
    if (!cell) return;

    pressedCellRef.current = cell;
    wakeRenderRef.current?.();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const startVal = gridRef.current[cell.row][cell.col];
    const swipeAction: 'mark-x' | 'clear-x' = startVal === 'x' ? 'clear-x' : 'mark-x';

    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      startCell: cell,
      lastCell: cell,
      isSwiping: false,
      swipeAction,
      swipeChangedAny: false,
      swipeNoteStep: 0,
      preGestureSnapshot: cloneGrid(gridRef.current),
    };
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId || disabled || solvedEmittedRef.current) return;

    const cell = getCellFromClientPoint(e.clientX, e.clientY);
    if (!cell || !g.lastCell || !g.startCell) return;

    if (cell.row === g.lastCell.row && cell.col === g.lastCell.col) return;

    pressedCellRef.current = cell;
    wakeRenderRef.current?.();

    if (!g.isSwiping) {
      g.isSwiping = true;
      const path = interpolateCells(g.startCell, cell);
      applySwipeOnCells(path, g.swipeAction);
    } else {
      const path = interpolateCells(g.lastCell, cell);
      applySwipeOnCells(path, g.swipeAction);
    }

    g.lastCell = cell;
  };

  const finishPointerGesture = (e: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId) return;

    pressedCellRef.current = null;
    wakeRenderRef.current?.();

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    const wasSwiping = g.isSwiping;
    const swipeChanged = g.swipeChangedAny;
    const preSnap = g.preGestureSnapshot;
    const startCell = g.startCell;

    g.active = false;
    g.pointerId = null;
    g.startCell = null;
    g.lastCell = null;
    g.isSwiping = false;
    g.swipeChangedAny = false;
    g.preGestureSnapshot = null;

    if (cancelled) return;

    if (wasSwiping) {
      lastTapRef.current = null;
      if (swipeChanged && preSnap) {
        setHistory((prev) => [...prev.slice(-49), preSnap]);
      }
    } else if (startCell) {
      handleCellTap(startCell.row, startCell.col);
    }
  };

  const handleUndo = () => {
    if (disabled || history.length === 0) return;
    lastTapRef.current = null;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setGrid(previous);
    gridRef.current = previous;
    soundFx.undoMove();
    onBoardReaction?.('undo');
    wakeRenderRef.current?.();
  };

  const handleClear = () => {
    if (disabled) return;
    const hasAny = grid.some((row) => row.some((cell) => cell !== 'empty'));
    if (!hasAny) return;
    lastTapRef.current = null;
    setHistory((prev) => [...prev.slice(-49), cloneGrid(grid)]);
    const empty = createEmptyGrid(puzzle.size);
    setGrid(empty);
    gridRef.current = empty;
    setHintCell(null);
    soundFx.clearBoard();
    onBoardReaction?.('undo');
    wakeRenderRef.current?.();
  };

  const handleHint = () => {
    if (disabled || !soloSolution || solvedEmittedRef.current) return;

    const currentGrid = gridRef.current;
    const snapshot = cloneGrid(currentGrid);
    const next = cloneGrid(currentGrid);

    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (next[r][c] === 'panda' && soloSolution[r] !== c) {
          next[r][c] = 'x';
          commitGridChange(next, snapshot, false);
          setHintCell(`${r},${c}`);
          pulseTile(r, c, 'x');
          soundFx.tapX();
          return;
        }
      }
    }

    for (let r = 0; r < puzzle.size; r++) {
      const targetCol = soloSolution[r];
      if (next[r][targetCol] !== 'panda') {
        next[r][targetCol] = 'panda';
        commitGridChange(next, snapshot, true, { row: r, col: targetCol });
        setHintCell(`${r},${targetCol}`);
        return;
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full select-none overscroll-none" style={{ touchAction: 'none' }}>
      {/* Three.js 3D Tactile Puzzle Board (sized to always fit cleanly in viewport with zero scroll) */}
      <div className="w-full max-w-[min(100%,calc(100dvh-235px))] bg-white p-2 sm:p-2.5 rounded-[22px] border-2 border-[#D4DCD1] shadow-[0_8px_24px_rgba(24,32,28,0.08)]">
        <div
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={(e) => finishPointerGesture(e, false)}
          onPointerCancel={(e) => finishPointerGesture(e, true)}
          onContextMenu={(e) => {
            e.preventDefault();
            const cell = getCellFromClientPoint(e.clientX, e.clientY);
            if (cell) togglePandaDirect(cell.row, cell.col);
          }}
          className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#35423B]"
          style={{ touchAction: 'none' }}
          role="application"
          aria-label={`Pandoku ${puzzle.size} by ${puzzle.size} interactive 3D puzzle board`}
        >
          <div ref={canvasMountRef} className="w-full h-full" />
        </div>

        {/* Fixed-Height Single-Line Rule Status (never shifts or scrolls the board) */}
        <div className="mt-2 px-1 h-6 overflow-hidden flex items-center justify-between gap-2 text-xs">
          {validation.summaryMessage ? (
            <div className="flex items-center gap-1.5 text-[#B91C1C] font-semibold min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{validation.summaryMessage}</span>
            </div>
          ) : validation.solved ? (
            <div className="flex items-center gap-1.5 text-[#1B7A4E] font-bold min-w-0">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">All {puzzle.size} pandas placed — Solved!</span>
            </div>
          ) : (
            <div className="text-[#56635B] tabular-nums flex items-center justify-between w-full gap-2">
              <span>
                <strong className="text-[#18201C]">
                  {pandas.length}/{puzzle.size}
                </strong>{' '}
                pandas
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Thumb-Zone Mobile Game Action Bar (Undo, Clear, Hint) */}
      <div className={`w-full mt-2.5 grid gap-2 ${soloSolution ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <button
          type="button"
          onClick={handleUndo}
          disabled={disabled || history.length === 0}
          className="min-h-[46px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#18201C] bg-white border border-[#D4DCD1] border-b-[3px] rounded-xl active:translate-y-[2px] active:border-b disabled:opacity-40 disabled:active:translate-y-0 transition-all whitespace-nowrap cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Undo</span>
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="min-h-[46px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#18201C] bg-white border border-[#D4DCD1] border-b-[3px] rounded-xl active:translate-y-[2px] active:border-b disabled:opacity-40 disabled:active:translate-y-0 transition-all whitespace-nowrap cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear</span>
        </button>

        {soloSolution && (
          <button
            type="button"
            onClick={handleHint}
            disabled={disabled || validation.solved}
            className="min-h-[46px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#14603D] bg-[#E7F5EC] border border-[#B5DFC4] border-b-[3px] rounded-xl active:translate-y-[2px] active:border-b disabled:opacity-40 transition-all whitespace-nowrap cursor-pointer"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Hint</span>
          </button>
        )}
      </div>
    </div>
  );
}
