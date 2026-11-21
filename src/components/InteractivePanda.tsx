import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, Music, Sparkles, Sprout, Star } from 'lucide-react';
import {
  AccessoryId,
  AccessorySlot,
  ALL_PANDA_TRICKS,
  AnyTrickId,
  DEFAULT_HOME_TRICKS,
  PANDA_ACCESSORIES,
  PandaTrickId,
} from '../shared/soloCatalog';
import { TrickIcon } from './TrickIcons';
import { soundFx } from '../utils/sound';
import {
  attachStudioEnvironment,
  createContactShadowTexture,
  createStudioRenderer,
  scheduleNextFrame,
} from '../utils/threeSetup';

type BasePandaAction = 'idle' | 'pet' | 'boop' | 'giggle' | 'munch' | 'dance' | 'hop';
export type PandaAction = BasePandaAction | PandaTrickId;

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  kind: 'heart' | 'sparkle' | 'note' | 'bamboo' | 'star' | 'zzz';
}

const BASE_ACTION_LINES: Record<Exclude<BasePandaAction, 'idle'>, string[]> = {
  pet: [
    'Hehe! Dat feels sooo squishy-soft!',
    'Mmmm! Behind my fluffy ears, pleeease!',
    'Yay! I love head pats so much!',
  ],
  boop: [
    'Boop! Hehe, you got my tiny nose!',
    'Achoo! Hee-hee, silly nose boop!',
    'Whoa! My nosey is super tickly!',
  ],
  giggle: [
    'Hahahaha! Staaahp, my tummy is tickly!',
    'Hee-hee-hee! Tickle monster alert!',
    'Giggle giggle! Belly rubs are the bestest!',
  ],
  munch: [
    'Nom nom nom! Yummy crunchy bamboo!',
    'Chomp chomp! My tummy is soooo happy!',
    'Ooooh! Crispy green snacky time!',
  ],
  dance: [
    'Wiggle wiggle! Look at my silly dance!',
    'Boing boing! Dancey party time!',
    'Yay yay! Shake my fluffy tail!',
  ],
  hop: [
    'Boing! Hehe, ticklish little paws!',
    'Wheee! Look how bouncy I am!',
    'Hop hop hop! Wanna play wif me?',
  ],
};

const WARDROBE_CHATTER_LINES: string[] = [
  'Psst! Can we use Bamboo to get me a silly hat?',
  'Ooooh! Wanna buy me cool sunglasses wif Bamboo?',
  'Hee-hee! I wanna wear a shiny Crown! Tap Bamboo!',
  'Yay! We can get fun new tricks in my shop!',
  'Pleease can we look at fluffy scarves in the shop?',
];

const CUTE_IDLE_THOUGHTS: string[] = [
  'Hehe! Boop my nose or tickle my tummy!',
  'Yay! Wanna play a fun puzzle game together?',
  'Mmmm... I am thinking about yummy bamboo!',
  'You are my bestest puzzle friend ever!',
  'Psst! Do I have a leaf on my head? Hee-hee!',
];

const ALL_TRICKS_MAP = new Map(ALL_PANDA_TRICKS.map((t) => [t.id, t]));
const ACCESSORY_SLOT_MAP = new Map(PANDA_ACCESSORIES.map((a) => [a.id, a.slot]));

const DEFAULT_EQUIPPED: Record<AccessorySlot, AccessoryId | null> = {
  head: null,
  face: null,
  neck: null,
  prop: null,
};

export interface PandaSpeechOverride {
  text: string;
  seq: number;
  reactAction?: 'hop' | 'giggle' | 'dance';
}

export interface InteractivePandaProps {
  equippedAccessories?: Record<AccessorySlot, AccessoryId | null>;
  /** Optional locked accessory currently being previewed live on the 3D Panda */
  previewAccessory?: AccessoryId | null;
  activeTrick?: { id: AnyTrickId; seq: number } | null;
  /** Optional externally triggered speech bubble + happy reaction (e.g. Thank You on buying/equipping outfits) */
  speechOverride?: PandaSpeechOverride | null;
  /** 3 chosen tricks displayed as Home Screen quick action buttons */
  homeTricks?: [AnyTrickId, AnyTrickId, AnyTrickId];
  /** Secret cheat callback triggered by 10x Feed followed by 1x Pet */
  onCheatUnlockAll?: () => void;
  /** Compact mode hides the bottom buttons for Studio preview */
  compact?: boolean;
  /** Hide the default 3D meadow pedestal & background bamboo stalks (for illustrated Shop / School / Duel scenes) */
  hideStageProps?: boolean;
  /** Duel Arena battle-ready stance facing right toward the rival Shadow Panda */
  duelReady?: boolean;
  /** Compact duel panda height for Create/Join single-screen view */
  duelCompact?: boolean;
  /** 1v1 Duel Victory Screen poses: winner arms-up celebration, loser floored with head bandage & tongue out, or cheerful tie */
  duelOutcome?: 'winner' | 'loser' | 'tie' | null;
  /** Optional subtle angle facing left/right in Duel Victory */
  duelFacing?: 'left' | 'right' | 'center';
  /** Mini Victory Mode reuses the exact same 3D Home Panda small & dancing inside the Victory popup */
  victoryMode?: 'dance' | 'tip' | null;
  /** Incremented when user taps a star in the Victory popup to trigger a celebratory hop/react */
  victoryBoostSeq?: number;
  /** Optional quick button to open the Accessories & Tricks Studio from Home */
  onOpenStudio?: () => void;
  unlockedCount?: number;
}

// Reusable module-scope math helpers (zero GC in render loop)
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

export function InteractivePanda({
  equippedAccessories = DEFAULT_EQUIPPED,
  previewAccessory = null,
  activeTrick = null,
  speechOverride = null,
  homeTricks = DEFAULT_HOME_TRICKS,
  onCheatUnlockAll,
  compact = false,
  hideStageProps = false,
  duelReady = false,
  duelCompact = false,
  duelOutcome = null,
  duelFacing = 'center',
  victoryMode = null,
  victoryBoostSeq = 0,
  onOpenStudio,
  unlockedCount = 0,
}: InteractivePandaProps) {
  const isVictoryMini = victoryMode !== null;
  const isDuelOutcome = duelOutcome !== null;
  const isMiniStage = isVictoryMini || duelReady || isDuelOutcome;
  const victoryModeRef = useRef<'dance' | 'tip' | null>(victoryMode);
  victoryModeRef.current = victoryMode;
  const duelReadyRef = useRef<boolean>(duelReady);
  duelReadyRef.current = duelReady;
  const duelOutcomeRef = useRef<'winner' | 'loser' | 'tie' | null>(duelOutcome);
  duelOutcomeRef.current = duelOutcome;
  const duelFacingRef = useRef<'left' | 'right' | 'center'>(duelFacing);
  duelFacingRef.current = duelFacing;
  const hideStagePropsRef = useRef<boolean>(hideStageProps || isMiniStage);
  hideStagePropsRef.current = hideStageProps || isMiniStage;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [speechState, setSpeechState] = useState<{
    text: string;
    seq: number;
    isShopHint?: boolean;
    visible: boolean;
  }>({
    text: '',
    seq: 0,
    isShopHint: false,
    visible: false,
  });
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [webglLost, setWebglLost] = useState<boolean>(false);

  const hideSpeechTimerRef = useRef<number>(0);
  const idleSpeechTimerRef = useRef<number>(0);

  const actionRef = useRef<{
    type: PandaAction;
    startedAt: number;
    duration: number;
  }>({ type: 'idle', startedAt: 0, duration: 0 });

  const feedStreakRef = useRef<number>(0);

  const scheduleNextIdleChatterRef = useRef<() => void>(() => {});

  const showSpeech = (text: string, isShopHint = false, holdMs = 4200, fromIdle = false) => {
    window.clearTimeout(hideSpeechTimerRef.current);
    setSpeechState((prev) => ({
      text,
      seq: prev.seq + 1,
      isShopHint,
      visible: true,
    }));
    hideSpeechTimerRef.current = window.setTimeout(() => {
      setSpeechState((prev) => ({ ...prev, visible: false }));
    }, holdMs);

    // Reset the quiet 20s-60s idle chatter interval after any user interaction
    if (!fromIdle && !compact && !isMiniStage) {
      scheduleNextIdleChatterRef.current();
    }
  };

  // Quiet when not interacted with: occasionally whisper a cute thought once every 20s to 60s
  useEffect(() => {
    if (compact || isMiniStage) return;

    const scheduleNext = () => {
      window.clearTimeout(idleSpeechTimerRef.current);
      const randomDelayMs = 20000 + Math.random() * 40000; // 20s to 60s
      idleSpeechTimerRef.current = window.setTimeout(() => {
        if (actionRef.current.type === 'idle') {
          const suggestWardrobe = Math.random() < 0.55;
          const pool = suggestWardrobe ? WARDROBE_CHATTER_LINES : CUTE_IDLE_THOUGHTS;
          const line = pool[Math.floor(Math.random() * pool.length)];
          showSpeech(line, suggestWardrobe, 4400, true);
        }
        scheduleNext();
      }, randomDelayMs);
    };

    scheduleNextIdleChatterRef.current = scheduleNext;
    scheduleNext();

    return () => {
      window.clearTimeout(idleSpeechTimerRef.current);
      window.clearTimeout(hideSpeechTimerRef.current);
    };
  }, [compact, isVictoryMini]);

  // Clean up hide timer on unmount in compact/studio mode too
  useEffect(() => {
    return () => {
      window.clearTimeout(hideSpeechTimerRef.current);
    };
  }, []);

  // Merge live previewAccessory over equippedAccessories on its slot
  const effectiveEquipped: Record<AccessorySlot, AccessoryId | null> = {
    ...equippedAccessories,
  };
  if (previewAccessory) {
    const slot = ACCESSORY_SLOT_MAP.get(previewAccessory);
    if (slot) {
      effectiveEquipped[slot] = previewAccessory;
    }
  }

  const equippedRef = useRef<Record<AccessorySlot, AccessoryId | null>>(effectiveEquipped);
  equippedRef.current = effectiveEquipped;

  const gazeTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const particleIdRef = useRef<number>(0);

  const spawnParticles = (kind: FloatingParticle['kind'], count = 4) => {
    const fresh: FloatingParticle[] = Array.from({ length: count }, (_, i) => ({
      id: ++particleIdRef.current,
      x: (i - (count - 1) / 2) * 32 + (Math.random() * 18 - 9),
      y: -14 - Math.random() * 24,
      kind,
    }));
    setParticles((prev) => [...prev.slice(-10), ...fresh]);
    setTimeout(() => {
      const ids = new Set(fresh.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, 950);
  };

  const allowTouchSpeech = !compact && !isMiniStage;

  const triggerAction = (
    next: Exclude<PandaAction, 'idle'>,
    fromHomeButton = false,
    fromDirectTouch = false
  ) => {
    const shouldShowSpeech = !fromDirectTouch || allowTouchSpeech;
    // Secret Cheat Code: press Feed 10 times, then Pet 1 time!
    if (fromHomeButton && onCheatUnlockAll) {
      if (next === 'munch') {
        feedStreakRef.current += 1;
      } else if (next === 'pet' && feedStreakRef.current >= 10) {
        feedStreakRef.current = 0;
        onCheatUnlockAll();
        actionRef.current = {
          type: 'super_star',
          startedAt: performance.now() / 1000,
          duration: 2.2,
        };
        showSpeech('Secret Code!! Yay! All levels + 100 Bamboo!', false, 4800);
        soundFx.unlockItem();
        spawnParticles('star', 8);
        return;
      } else {
        feedStreakRef.current = 0;
      }
    }

    const trick = ALL_TRICKS_MAP.get(next as AnyTrickId);
    const isSpecialTrick = Boolean(trick && !trick.isDefault);
    let duration = 1.05;
    if (next === 'munch' || next === 'dance') duration = 1.45;
    else if (isSpecialTrick) {
      if (next === 'sleepy_nap' || next === 'levitate' || next === 'juggle' || next === 'moonwalk') {
        duration = 2.1;
      } else if (next === 'super_star') {
        duration = 2.2;
      } else if (next === 'dizzy_spin' || next === 'kung_fu' || next === 'belly_drum') {
        duration = 1.65;
      } else {
        duration = 1.35;
      }
    }

    actionRef.current = {
      type: next,
      startedAt: performance.now() / 1000,
      duration,
    };

    if (isSpecialTrick && trick) {
      if (shouldShowSpeech) {
        showSpeech(trick.speechLine, false, 4200);
      }
      soundFx.playTrickSound(trick.id);
      if (trick.id === 'sleepy_nap') spawnParticles('zzz', 4);
      else if (trick.id === 'super_star') spawnParticles('star', 7);
      else if (trick.id === 'levitate') spawnParticles('sparkle', 6);
      else if (trick.id === 'wave') spawnParticles('heart', 4);
      else if (trick.id === 'belly_drum' || trick.id === 'moonwalk') spawnParticles('note', 5);
      else spawnParticles('sparkle', 5);
      return;
    }

    const baseKey = next as Exclude<BasePandaAction, 'idle'>;
    if (shouldShowSpeech) {
      const lines = BASE_ACTION_LINES[baseKey];
      showSpeech(lines[Math.floor(Math.random() * lines.length)], false, 4000);
    }

    if (baseKey === 'pet') {
      soundFx.pandaPurr();
      spawnParticles('heart', 4);
    } else if (baseKey === 'boop') {
      soundFx.pandaBoop();
      spawnParticles('sparkle', 4);
    } else if (baseKey === 'giggle') {
      soundFx.pandaGiggle();
      spawnParticles('sparkle', 5);
    } else if (baseKey === 'munch') {
      soundFx.pandaMunch();
      spawnParticles('bamboo', 4);
    } else if (baseKey === 'dance') {
      soundFx.pandaDance();
      spawnParticles('note', 5);
    } else if (baseKey === 'hop') {
      soundFx.pandaGiggle();
      spawnParticles('sparkle', 4);
    }
  };

  const triggerActionRef = useRef(triggerAction);
  triggerActionRef.current = triggerAction;

  // Trigger external trick requests (from Panda Studio)
  useEffect(() => {
    if (!activeTrick) return;
    triggerActionRef.current(activeTrick.id);
  }, [activeTrick?.seq, activeTrick?.id]);

  // Trigger external thank-you speech & happy reaction (e.g. buying or equipping an outfit in Panda Studio)
  const showSpeechRef = useRef(showSpeech);
  showSpeechRef.current = showSpeech;
  useEffect(() => {
    if (!speechOverride || !speechOverride.text) return;
    showSpeechRef.current(speechOverride.text, false, 4500);
    const react = speechOverride.reactAction ?? 'hop';
    actionRef.current = {
      type: react,
      startedAt: performance.now() / 1000,
      duration: react === 'dance' ? 1.55 : 1.15,
    };
    spawnParticles(react === 'dance' ? 'star' : 'heart', 5);
  }, [speechOverride?.seq]);

  // Celebratory burst hop when user taps a star in the Victory popup
  const victoryBoostRef = useRef<number>(victoryBoostSeq);
  useEffect(() => {
    if (!isVictoryMini) return;
    if (victoryBoostSeq === victoryBoostRef.current) return;
    victoryBoostRef.current = victoryBoostSeq;
    if (victoryMode === 'dance') {
      actionRef.current = {
        type: 'hop',
        startedAt: performance.now() / 1000,
        duration: 0.9,
      };
      spawnParticles('star', 4);
    } else {
      actionRef.current = {
        type: 'wave',
        startedAt: performance.now() / 1000,
        duration: 1.0,
      };
    }
  }, [isVictoryMini, victoryBoostSeq, victoryMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 240;

    const { renderer, isSoftwareGl } = createStudioRenderer(true);
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.cursor = 'pointer';
    canvas.style.touchAction = 'manipulation';

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => setWebglLost(false);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const envTex = attachStudioEnvironment(renderer, scene, 0.3);

    const camera = new THREE.PerspectiveCamera(isMiniStage ? 36 : 40, width / height, 0.1, 40);
    // Keep the 3D Panda perfectly centered on the Main Screen & Studio stage!
    const camOffsetX = 0;
    if (duelReady) {
      camera.position.set(0, 1.62, 4.95);
      camera.lookAt(0, 1.44, 0);
    } else if (duelOutcome === 'loser') {
      camera.position.set(0, 1.38, 4.95);
      camera.lookAt(0, 1.06, 0);
    } else if (duelOutcome === 'winner' || duelOutcome === 'tie') {
      camera.position.set(0, 1.68, 5.45);
      camera.lookAt(0, 1.44, 0);
    } else if (isVictoryMini) {
      camera.position.set(0, 1.5, 5.05);
      camera.lookAt(0, 1.22, 0);
    } else {
      camera.position.set(camOffsetX, 1.72, 6.35);
      camera.lookAt(camOffsetX, 1.36, 0);
    }

    // 3-Point Warm Studio Lighting calibrated for plush chibi fur, glossy eyes & props
    const hemi = new THREE.HemisphereLight(0xfffdf8, 0xb2d5be, 1.25);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff6e8, 1.5);
    keyLight.position.set(3.0, 5.2, 4.4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -2.8;
      keyLight.shadow.camera.right = 2.8;
      keyLight.shadow.camera.top = 3.2;
      keyLight.shadow.camera.bottom = -1.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd9f5e6, 0.65);
    rimLight.position.set(-3.4, 2.8, -2.8);
    scene.add(rimLight);

    // Plush PBR Materials (Velvety sheen on fur, glossy clearcoat on kawaii eyes & nose)
    const matWhiteFur = new THREE.MeshPhysicalMaterial({
      color: 0xfffef9,
      roughness: 0.82,
      metalness: 0.0,
      sheen: 0.55,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0xfff4eb),
    });
    const matDarkFur = new THREE.MeshPhysicalMaterial({
      color: 0x222a27,
      roughness: 0.76,
      metalness: 0.02,
      sheen: 0.35,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color(0x4b5c55),
    });
    const matInnerEar = new THREE.MeshStandardMaterial({
      color: 0x454f4b,
      roughness: 0.85,
    });
    const matGlossEye = new THREE.MeshPhysicalMaterial({
      color: 0x090b0f,
      roughness: 0.03,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });
    const matEyeSparkle = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matEyeArcCream = new THREE.MeshStandardMaterial({
      color: 0xfff5e4,
      roughness: 0.5,
      metalness: 0.0,
    });
    const matPawPink = new THREE.MeshStandardMaterial({
      color: 0xf9b4c4,
      roughness: 0.68,
    });
    const matMouthDark = new THREE.MeshStandardMaterial({
      color: 0x2a1f22,
      roughness: 0.5,
    });
    const matTongue = new THREE.MeshStandardMaterial({
      color: 0xff6f8d,
      roughness: 0.4,
    });
    const matBamboo = new THREE.MeshStandardMaterial({
      color: 0x2f9d66,
      roughness: 0.42,
      metalness: 0.04,
    });
    const matBambooLeaf = new THREE.MeshStandardMaterial({
      color: 0x4ec485,
      roughness: 0.46,
    });
    const matMeadow = new THREE.MeshStandardMaterial({
      color: 0xcbe5d2,
      roughness: 0.92,
    });

    // Accessory & Prop PBR Materials
    const matGold = new THREE.MeshStandardMaterial({
      color: 0xf4c430,
      roughness: 0.22,
      metalness: 0.85,
    });
    const matCrimson = new THREE.MeshStandardMaterial({
      color: 0xd93038,
      roughness: 0.42,
      metalness: 0.08,
    });
    const matIndigo = new THREE.MeshStandardMaterial({
      color: 0x3b358c,
      roughness: 0.55,
      metalness: 0.1,
    });
    const matShadesFrame = new THREE.MeshStandardMaterial({
      color: 0x161c22,
      roughness: 0.14,
      metalness: 0.65,
    });
    const matSakura = new THREE.MeshStandardMaterial({
      color: 0xfb8fb6,
      roughness: 0.52,
    });
    const matAmberCloth = new THREE.MeshStandardMaterial({
      color: 0xe38d1c,
      roughness: 0.74,
    });
    const matChefWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.66,
    });
    const matEmeraldCrystal = new THREE.MeshStandardMaterial({
      color: 0x22d38a,
      emissive: 0x0d7a4d,
      emissiveIntensity: 0.55,
      roughness: 0.12,
      metalness: 0.3,
    });
    const matWood = new THREE.MeshStandardMaterial({
      color: 0x9c6234,
      roughness: 0.62,
      metalness: 0.04,
    });
    const matLightWood = new THREE.MeshStandardMaterial({
      color: 0xe7c496,
      roughness: 0.52,
    });
    const matDrumShell = new THREE.MeshPhysicalMaterial({
      color: 0xc8282f,
      roughness: 0.26,
      metalness: 0.08,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    });

    // Procedural Drumhead Parchment CanvasTexture (zero external assets)
    const drumCanvas = document.createElement('canvas');
    drumCanvas.width = 256;
    drumCanvas.height = 256;
    const dctx = drumCanvas.getContext('2d');
    if (dctx) {
      dctx.fillStyle = '#fbf0d9';
      dctx.fillRect(0, 0, 256, 256);
      const grad = dctx.createRadialGradient(128, 128, 18, 128, 128, 126);
      grad.addColorStop(0, '#fffaf0');
      grad.addColorStop(0.75, '#f5e2bc');
      grad.addColorStop(1, '#dfc292');
      dctx.fillStyle = grad;
      dctx.beginPath();
      dctx.arc(128, 128, 126, 0, Math.PI * 2);
      dctx.fill();
      // Festival concentric rings
      dctx.strokeStyle = '#c8282f';
      dctx.lineWidth = 8;
      dctx.beginPath();
      dctx.arc(128, 128, 96, 0, Math.PI * 2);
      dctx.stroke();
      dctx.strokeStyle = '#d98a12';
      dctx.lineWidth = 4;
      dctx.beginPath();
      dctx.arc(128, 128, 82, 0, Math.PI * 2);
      dctx.stroke();
      // Cute paw emblem in center of drumhead
      dctx.fillStyle = '#c8282f';
      dctx.beginPath();
      dctx.ellipse(128, 138, 22, 17, 0, 0, Math.PI * 2);
      dctx.fill();
      [
        [104, 114],
        [128, 105],
        [152, 114],
      ].forEach(([bx, by]) => {
        dctx.beginPath();
        dctx.arc(bx, by, 8.5, 0, Math.PI * 2);
        dctx.fill();
      });
    }
    const drumHeadTex = new THREE.CanvasTexture(drumCanvas);
    drumHeadTex.colorSpace = THREE.SRGBColorSpace;
    drumHeadTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const matDrumHead = new THREE.MeshStandardMaterial({
      map: drumHeadTex,
      roughness: 0.68,
    });

    // Meadow Pedestal & Contact Shadow (hide meadow rim & background stalks in mini Victory card for crisp floating look!)
    const meadow = new THREE.Mesh(
      new THREE.CylinderGeometry(1.62, 1.82, 0.22, 36),
      matMeadow
    );
    meadow.position.set(0, -0.11, 0);
    meadow.receiveShadow = true;
    meadow.visible = !hideStagePropsRef.current;
    scene.add(meadow);

    const shadowTex = createContactShadowTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.45),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, 0.015, 0.05);
    scene.add(shadowPlane);

    // Glowing Aura Rings (Zen Levitate / Superstar / Moonwalk Spotlight)
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.92, 36), auraMat);
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.set(0, 0.04, 0);
    auraRing.visible = false;
    scene.add(auraRing);

    const auraInnerMat = new THREE.MeshBasicMaterial({
      color: 0x99f6e4,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const auraInnerRing = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.52, 32), auraInnerMat);
    auraInnerRing.rotation.x = -Math.PI / 2;
    auraInnerRing.position.set(0, 0.06, 0);
    auraInnerRing.visible = false;
    scene.add(auraInnerRing);

    // Decorative Swaying 3D Bamboo Stalks
    const bambooGroups: THREE.Group[] = [];
    const buildBambooStalk = (x: number, z: number, h: number, tilt: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.z = tilt;
      const segs = 3;
      const segH = h / segs;
      for (let i = 0; i < segs; i++) {
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.062, 0.07, segH - 0.03, 12),
          matBamboo
        );
        cyl.position.y = segH * i + segH / 2;
        g.add(cyl);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.068, 0.014, 8, 16),
          matBambooLeaf
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = segH * (i + 1);
        g.add(ring);
      }

      const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), matBambooLeaf);
      leaf1.scale.set(1.8, 0.25, 0.6);
      leaf1.position.set(x < 0 ? 0.24 : -0.24, h * 0.74, 0.05);
      leaf1.rotation.z = x < 0 ? 0.35 : -0.35;
      g.add(leaf1);

      const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), matBambooLeaf);
      leaf2.scale.set(1.6, 0.25, 0.55);
      leaf2.position.set(x < 0 ? -0.2 : 0.2, h * 0.52, 0.08);
      leaf2.rotation.z = x < 0 ? -0.4 : 0.4;
      g.add(leaf2);

      g.visible = !hideStagePropsRef.current;
      scene.add(g);
      bambooGroups.push(g);
    };
    buildBambooStalk(-1.38, -0.58, 2.05, 0.06);
    buildBambooStalk(1.4, -0.54, 2.22, -0.05);

    // =========================================================================
    // COMPOSITE CHIBI 3D PANDA (Plush proportions, kawaii eyes, smile, paw beans)
    // =========================================================================
    const pandaRoot = new THREE.Group();
    scene.add(pandaRoot);

    // Center-of-mass pivot so Backflip rotates cleanly around the tummy instead of the floor
    const flipPivot = new THREE.Group();
    flipPivot.position.set(0, 0.92, 0);
    pandaRoot.add(flipPivot);

    const pandaRig = new THREE.Group();
    pandaRig.position.set(0, -0.92, 0);
    flipPivot.add(pandaRig);

    const hitMeshes: THREE.Object3D[] = [];
    const registerHit = (mesh: THREE.Object3D, zone: Exclude<BasePandaAction, 'idle'>) => {
      mesh.userData.zone = zone;
      hitMeshes.push(mesh);
    };

    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 0.62, 0);
    pandaRig.add(bodyGroup);

    // Chubby soft plush pear-shaped belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.56, 30, 24), matWhiteFur);
    belly.scale.set(1.06, 0.92, 0.95);
    belly.castShadow = true;
    registerHit(belly, 'giggle');
    bodyGroup.add(belly);

    // Soft rounded lower tummy cushion for baby-panda plumpness
    const tummyPlump = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 18), matWhiteFur);
    tummyPlump.scale.set(1.05, 0.85, 0.78);
    tummyPlump.position.set(0, -0.1, 0.22);
    registerHit(tummyPlump, 'giggle');
    bodyGroup.add(tummyPlump);

    // Classic dark panda shoulder saddle band
    const chestBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.135, 14, 28),
      matDarkFur
    );
    chestBand.rotation.x = Math.PI / 2;
    chestBand.scale.set(1.03, 0.88, 1.0);
    chestBand.position.set(0, 0.29, -0.01);
    registerHit(chestBand, 'giggle');
    bodyGroup.add(chestBand);

    // Adorable fluffy round panda tail peeking out in back
    const tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14), matDarkFur);
    tailMesh.position.set(0, -0.18, -0.52);
    bodyGroup.add(tailMesh);

    // Articulated Stubby Chibi Arms with Cute Pink Paw Pads & Articulated Finger Nubs
    const buildArm = (side: -1 | 1) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.51, 0.22, 0.08);

      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.26, 10, 18), matDarkFur);
      limb.position.set(side * 0.07, -0.16, 0.04);
      limb.rotation.z = side * 0.42;
      limb.castShadow = true;
      registerHit(limb, 'dance');
      arm.add(limb);

      // Soft pink palm pad at paw tip
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), matPawPink);
      palm.scale.set(1.0, 0.85, 0.45);
      palm.position.set(side * 0.14, -0.31, 0.12);
      arm.add(palm);

      // Articulated finger cluster for cute clutching/fidgeting animation
      const fingerGroup = new THREE.Group();
      fingerGroup.position.set(side * 0.14, -0.34, 0.11);
      [-0.046, 0, 0.046].forEach((fx, idx) => {
        const finger = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), matDarkFur);
        finger.scale.set(0.85, 1.25, 0.85);
        finger.position.set(fx, idx === 1 ? -0.022 : -0.012, 0.035);
        fingerGroup.add(finger);
      });
      arm.add(fingerGroup);

      bodyGroup.add(arm);
      return { arm, fingerGroup };
    };
    const leftArmRig = buildArm(-1);
    const rightArmRig = buildArm(1);
    const leftArm = leftArmRig.arm;
    const rightArm = rightArmRig.arm;
    const leftFingers = leftArmRig.fingerGroup;
    const rightFingers = rightArmRig.fingerGroup;

    // Articulated Hip-Pivoted Chubby Legs & Feet (Supports smooth Standing Upright <-> Sitting Down!)
    // When leg.rotation.x === 0: Panda stands tall with feet flat on the floor.
    // When leg.rotation.x === -1.42: Panda sits down cozily with feet folded forward showing pink paw beans!
    const buildLeg = (side: -1 | 1) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.26, 0.48, 0.02);

      // Chubby dark plush thigh / leg pillar
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.17, 10, 16), matDarkFur);
      thigh.position.set(0, -0.15, 0.01);
      thigh.castShadow = true;
      registerHit(thigh, 'hop');
      leg.add(thigh);

      // Rounded chubby foot planted at bottom of leg
      const foot = new THREE.Group();
      foot.position.set(0, -0.34, 0.06);

      const base = new THREE.Mesh(new THREE.SphereGeometry(0.195, 20, 16), matDarkFur);
      base.scale.set(0.98, 0.72, 1.24);
      base.castShadow = true;
      registerHit(base, 'hop');
      foot.add(base);

      // Pink paw pad + 3 tiny toe beans placed cleanly on the SOLE (-Y) so they rest flat when standing
      // and face right toward the camera when the panda sits down with legs tucked forward!
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), matPawPink);
      pad.scale.set(1.05, 0.42, 0.88);
      pad.position.set(0, -0.135, -0.02);
      registerHit(pad, 'hop');
      foot.add(pad);

      [-0.068, 0, 0.068].forEach((tx, idx) => {
        const bean = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), matPawPink);
        bean.scale.set(1.0, 0.52, 1.0);
        bean.position.set(tx, -0.13, idx === 1 ? 0.115 : 0.095);
        foot.add(bean);
      });

      leg.add(foot);
      pandaRig.add(leg);
      return leg;
    };
    const leftLeg = buildLeg(-1);
    const rightLeg = buildLeg(1);

    // Articulated Large Chibi Head Group (height smoothly follows stand <-> sit posture)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.56, 0.05);
    pandaRig.add(headGroup);

    // Round, slightly wide baby-panda cranium
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 26), matWhiteFur);
    headMesh.scale.set(1.1, 0.94, 0.98);
    headMesh.castShadow = true;
    registerHit(headMesh, 'pet');
    headGroup.add(headMesh);

    // Chubby plush lower cheek puffs for adorable squishable silhouette
    const cheekPuffGeo = new THREE.SphereGeometry(0.28, 18, 14);
    const leftCheekPuff = new THREE.Mesh(cheekPuffGeo, matWhiteFur);
    leftCheekPuff.scale.set(1.12, 0.84, 0.88);
    leftCheekPuff.position.set(-0.4, -0.17, 0.28);
    registerHit(leftCheekPuff, 'pet');
    headGroup.add(leftCheekPuff);

    const rightCheekPuff = new THREE.Mesh(cheekPuffGeo, matWhiteFur);
    rightCheekPuff.scale.set(1.12, 0.84, 0.88);
    rightCheekPuff.position.set(0.4, -0.17, 0.28);
    registerHit(rightCheekPuff, 'pet');
    headGroup.add(rightCheekPuff);

    // Cute tiny head fur tuft
    const tuft1 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), matWhiteFur);
    tuft1.scale.set(0.75, 1.35, 0.75);
    tuft1.position.set(-0.04, 0.61, 0.14);
    tuft1.rotation.z = 0.28;
    headGroup.add(tuft1);
    const tuft2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), matWhiteFur);
    tuft2.scale.set(0.75, 1.25, 0.75);
    tuft2.position.set(0.05, 0.6, 0.16);
    tuft2.rotation.z = -0.32;
    headGroup.add(tuft2);

    // Tiny Default Bamboo Sprout on top of head
    const sproutGroup = new THREE.Group();
    sproutGroup.position.set(0, 0.61, 0.02);
    const sLeaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), matBamboo);
    sLeaf1.scale.set(1.4, 0.35, 0.55);
    sLeaf1.position.set(0.09, 0.08, 0);
    sLeaf1.rotation.z = 0.55;
    sproutGroup.add(sLeaf1);
    const sLeaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), matBambooLeaf);
    sLeaf2.scale.set(1.3, 0.35, 0.55);
    sLeaf2.position.set(-0.08, 0.07, 0);
    sLeaf2.rotation.z = -0.5;
    sproutGroup.add(sLeaf2);
    headGroup.add(sproutGroup);

    // Articulated Fluffy Round Ears with Soft Inner Dimple
    const buildEar = (side: -1 | 1) => {
      const ear = new THREE.Group();
      ear.position.set(side * 0.55, 0.47, -0.03);
      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.235, 20, 16), matDarkFur);
      outer.scale.set(1.04, 0.98, 0.68);
      outer.castShadow = true;
      registerHit(outer, 'pet');
      ear.add(outer);

      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), matInnerEar);
      inner.scale.set(1.0, 0.95, 0.38);
      inner.position.set(side * -0.02, -0.02, 0.11);
      ear.add(inner);

      headGroup.add(ear);
      return ear;
    };
    const leftEar = buildEar(-1);
    const rightEar = buildEar(1);

    // Soft Rounded Baby-Panda Teardrop Eye Patches (gentle cuddly outward droop)
    const eyePatchGeo = new THREE.SphereGeometry(0.195, 22, 18);
    const leftPatch = new THREE.Mesh(eyePatchGeo, matDarkFur);
    leftPatch.scale.set(0.98, 1.12, 0.34);
    leftPatch.position.set(-0.265, -0.015, 0.568);
    leftPatch.rotation.set(0.06, -0.22, -0.22);
    headGroup.add(leftPatch);

    const rightPatch = new THREE.Mesh(eyePatchGeo, matDarkFur);
    rightPatch.scale.set(0.98, 1.12, 0.34);
    rightPatch.position.set(0.265, -0.015, 0.568);
    rightPatch.rotation.set(0.06, 0.22, 0.22);
    headGroup.add(rightPatch);

    // Bright glowing gold material for excited Star Eyes & Dizzy Spirals
    const matStarEyeGold = new THREE.MeshStandardMaterial({
      color: 0xffd53d,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.7,
      roughness: 0.22,
      metalness: 0.25,
    });
    const matTeethWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
    });

    // Shared 5-pointed star geometry for sparkling excited Star Eyes (belly_drum, super_star, victory dance!)
    const eyeStarShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.095 : 0.044;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) eyeStarShape.moveTo(px, py);
      else eyeStarShape.lineTo(px, py);
    }
    eyeStarShape.closePath();
    const eyeStarGeo = new THREE.ExtrudeGeometry(eyeStarShape, {
      depth: 0.018,
      bevelEnabled: false,
    });
    eyeStarGeo.center();

    // Cute Soft Plush Panda Eyes with Unique Expressive Modes:
    // open | happy (^ ^) | sleepy (u u) | dizzy (@ @) | star (★ ★) | angry (\ /) | cool (half-lid)
    const buildEye = (side: -1 | 1) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.245, 0.015, 0.618);
      eyeGroup.rotation.y = side * 0.16;

      const openGroup = new THREE.Group();
      // Soft small classic teddy-bear button eye (warm & gentle, never staring!)
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.062, 20, 16), matGlossEye);
      ball.scale.set(1.02, 0.94, 0.5);
      openGroup.add(ball);

      // Gentle single soft catchlight dot (not giant glossy anime orbs)
      const glintBig = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), matEyeSparkle);
      glintBig.scale.set(1.0, 1.0, 0.36);
      glintBig.position.set(-0.018, 0.02, 0.032);
      openGroup.add(glintBig);

      // Soft gentle lower smile cheek-lift curve under the eye for an always-friendly warmth
      const warmRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.068, 0.009, 8, 18, Math.PI * 0.75),
        matEyeArcCream
      );
      warmRim.rotation.z = Math.PI * 0.125;
      warmRim.position.set(0, -0.02, 0.028);
      openGroup.add(warmRim);

      // Sleek cool upper eyelid hood (visible only in 'cool' moonwalk mode)
      const coolLid = new THREE.Mesh(
        new THREE.BoxGeometry(0.165, 0.065, 0.045),
        matDarkFur
      );
      coolLid.position.set(0, 0.044, 0.032);
      coolLid.rotation.z = side * -0.06;
      coolLid.visible = false;
      openGroup.add(coolLid);

      eyeGroup.add(openGroup);

      // Super-cute expressive (^ ^) happy squint eyes in warm cream for animations & smiles!
      const happyArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.072, 0.016, 10, 22, Math.PI),
        matEyeArcCream
      );
      happyArc.position.set(0, -0.018, 0.044);
      happyArc.visible = false;
      eyeGroup.add(happyArc);

      // Peaceful cozy (u u) sleeping/zen eyes
      const sleepyArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.068, 0.015, 10, 22, Math.PI),
        matEyeArcCream
      );
      sleepyArc.rotation.z = Math.PI;
      sleepyArc.position.set(0, 0.016, 0.044);
      sleepyArc.visible = false;
      eyeGroup.add(sleepyArc);

      // Spinning Dizzy Spiral Eyes (@ @) for post-spin dizzy wobble!
      const dizzyGroup = new THREE.Group();
      dizzyGroup.position.set(0, 0, 0.046);
      const spiralOuter = new THREE.Mesh(
        new THREE.TorusGeometry(0.076, 0.013, 8, 20, Math.PI * 1.55),
        matEyeArcCream
      );
      dizzyGroup.add(spiralOuter);
      const spiralInner = new THREE.Mesh(
        new THREE.TorusGeometry(0.042, 0.012, 8, 16, Math.PI * 1.45),
        matStarEyeGold
      );
      spiralInner.rotation.z = Math.PI * 0.85;
      dizzyGroup.add(spiralInner);
      const spiralCenter = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), matEyeArcCream);
      dizzyGroup.add(spiralCenter);
      dizzyGroup.visible = false;
      eyeGroup.add(dizzyGroup);

      // Sparkling Golden Star Eyes (★ ★) for Super Excited Drum Solo, Superstar & Celebrations!
      const starGroup = new THREE.Group();
      starGroup.position.set(0, 0, 0.048);
      const starMesh = new THREE.Mesh(eyeStarGeo, matStarEyeGold);
      starGroup.add(starMesh);
      const starCore = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), matEyeSparkle);
      starCore.position.set(0, 0, 0.012);
      starGroup.add(starCore);
      starGroup.visible = false;
      eyeGroup.add(starGroup);

      // Fierce Focused Kung-Fu Eye (sharp glowing narrowed eye with fierce brow slant!)
      const angryGroup = new THREE.Group();
      angryGroup.position.set(0, -0.008, 0.046);
      const angryIris = new THREE.Mesh(new THREE.SphereGeometry(0.056, 16, 12), matEyeArcCream);
      angryIris.scale.set(1.18, 0.62, 0.42);
      angryGroup.add(angryIris);
      const angryPupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), matGlossEye);
      angryPupil.position.set(side * -0.012, -0.004, 0.022);
      angryGroup.add(angryPupil);
      const angrySlash = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.042, 0.04),
        matDarkFur
      );
      angrySlash.position.set(0, 0.036, 0.018);
      angrySlash.rotation.z = side * 0.34;
      angryGroup.add(angrySlash);
      angryGroup.visible = false;
      eyeGroup.add(angryGroup);

      // Cute Cartoon Injured / Wincing (> <) Eyes for Duel Loser!
      const hurtGroup = new THREE.Group();
      hurtGroup.position.set(0, 0, 0.048);
      const barGeo = new THREE.CapsuleGeometry(0.015, 0.095, 6, 10);
      const hurtTop = new THREE.Mesh(barGeo, matEyeArcCream);
      hurtTop.position.set(0, 0.028, 0);
      hurtTop.rotation.z = side === -1 ? 1.12 : -1.12;
      hurtGroup.add(hurtTop);
      const hurtBot = new THREE.Mesh(barGeo, matEyeArcCream);
      hurtBot.position.set(0, -0.028, 0);
      hurtBot.rotation.z = side === -1 ? -1.12 : 1.12;
      hurtGroup.add(hurtBot);
      hurtGroup.visible = false;
      eyeGroup.add(hurtGroup);

      // Expressive 3D Eyebrow above each eye patch (hidden when idle; animates for Kung Fu, Drum, Moonwalk, Surprised, Hurt!)
      const brow = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.024, 0.145, 6, 12),
        matDarkFur
      );
      brow.rotation.z = Math.PI / 2;
      brow.position.set(side * 0.245, 0.195, 0.628);
      brow.rotation.y = side * 0.16;
      brow.visible = false;
      headGroup.add(brow);

      headGroup.add(eyeGroup);
      return {
        eyeGroup,
        openGroup,
        coolLid,
        happyArc,
        sleepyArc,
        dizzyGroup,
        starGroup,
        angryGroup,
        hurtGroup,
        brow,
      };
    };
    const leftEye = buildEye(-1);
    const rightEye = buildEye(1);

    // Cute Plush Snout, Tiny Button Nose & Multi-Expression Mouth Rig
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.175, 18, 14), matWhiteFur);
    snout.scale.set(1.22, 0.84, 0.68);
    snout.position.set(0, -0.145, 0.585);
    registerHit(snout, 'boop');
    headGroup.add(snout);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.072, 16, 14), matGlossEye);
    nose.scale.set(1.28, 0.82, 0.72);
    nose.position.set(0, -0.075, 0.688);
    registerHit(nose, 'boop');
    headGroup.add(nose);

    // 1. Default Adorable ':3' W-shaped smile arcs under nose
    const smileGroup = new THREE.Group();
    smileGroup.position.set(0, -0.145, 0.672);
    const smileL = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.012, 8, 16, Math.PI),
      matMouthDark
    );
    smileL.rotation.z = Math.PI;
    smileL.position.set(-0.048, 0, 0);
    smileGroup.add(smileL);
    const smileR = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.012, 8, 16, Math.PI),
      matMouthDark
    );
    smileR.rotation.z = Math.PI;
    smileR.position.set(0.048, 0, 0);
    smileGroup.add(smileR);
    headGroup.add(smileGroup);

    // 2. Open happy laughing/munching/cheering mouth with cute pink tongue
    const openMouthGroup = new THREE.Group();
    openMouthGroup.position.set(0, -0.185, 0.665);
    const mouthCavity = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), matMouthDark);
    mouthCavity.scale.set(1.15, 0.95, 0.45);
    openMouthGroup.add(mouthCavity);
    const tongueMesh = new THREE.Mesh(new THREE.SphereGeometry(0.054, 12, 10), matTongue);
    tongueMesh.scale.set(1.1, 0.68, 0.45);
    tongueMesh.position.set(0, -0.032, 0.018);
    openMouthGroup.add(tongueMesh);
    openMouthGroup.scale.setScalar(0.001);
    openMouthGroup.visible = false;
    headGroup.add(openMouthGroup);

    // 3. Cute Surprised / Snoozing 'O' Mouth (Backflip, Boop, Hop, Sleepy Nap, Juggle!)
    const oMouthGroup = new THREE.Group();
    oMouthGroup.position.set(0, -0.185, 0.675);
    const oOuter = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.014, 8, 20), matMouthDark);
    oMouthGroup.add(oOuter);
    const oInner = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), matTongue);
    oInner.scale.set(1, 1, 0.35);
    oInner.position.set(0, 0, -0.008);
    oMouthGroup.add(oInner);
    oMouthGroup.visible = false;
    headGroup.add(oMouthGroup);

    // 4. Fierce Kung-Fu Shout / Grit-Teeth Mouth ("HI-YAH!")
    const fierceMouthGroup = new THREE.Group();
    fierceMouthGroup.position.set(0, -0.185, 0.672);
    const fierceCavity = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.085, 0.032), matMouthDark);
    fierceMouthGroup.add(fierceCavity);
    const fierceTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.032, 0.038), matTeethWhite);
    fierceTeeth.position.set(0, 0.018, 0.004);
    fierceMouthGroup.add(fierceTeeth);
    const fierceTongue = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.036), matTongue);
    fierceTongue.position.set(0, -0.022, 0.003);
    fierceMouthGroup.add(fierceTongue);
    fierceMouthGroup.visible = false;
    headGroup.add(fierceMouthGroup);

    // 5. Silly Dizzy Wobbly Tongue-Out Mouth (post-spin daze!)
    const dizzyMouthGroup = new THREE.Group();
    dizzyMouthGroup.position.set(0, -0.185, 0.674);
    const dizzyLine = new THREE.Mesh(
      new THREE.TorusGeometry(0.056, 0.013, 8, 18, Math.PI),
      matMouthDark
    );
    dizzyLine.position.set(0, -0.015, 0);
    dizzyMouthGroup.add(dizzyLine);
    const dizzyTongue = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 10), matTongue);
    dizzyTongue.scale.set(0.85, 1.15, 0.45);
    dizzyTongue.position.set(0.042, -0.028, 0.016);
    dizzyTongue.rotation.z = -0.35;
    dizzyMouthGroup.add(dizzyTongue);
    dizzyMouthGroup.visible = false;
    headGroup.add(dizzyMouthGroup);

    // 6. Cute Injured Pout + Big Goofy Pink Tongue Sticking Out (Duel Loser on floor!)
    const injuredMouthGroup = new THREE.Group();
    injuredMouthGroup.position.set(0, -0.175, 0.674);
    const injuredCavity = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), matMouthDark);
    injuredCavity.scale.set(1.22, 0.68, 0.42);
    injuredMouthGroup.add(injuredCavity);
    const injuredLipL = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.013, 8, 16, Math.PI),
      matMouthDark
    );
    injuredLipL.position.set(-0.04, 0.008, 0.01);
    injuredLipL.rotation.z = 0.22;
    injuredMouthGroup.add(injuredLipL);
    const injuredLipR = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.013, 8, 16, Math.PI),
      matMouthDark
    );
    injuredLipR.position.set(0.04, 0.008, 0.01);
    injuredLipR.rotation.z = -0.22;
    injuredMouthGroup.add(injuredLipR);
    // Big adorable pink tongue sticking out downward & slightly to the side!
    const injuredTonguePivot = new THREE.Group();
    injuredTonguePivot.position.set(0.025, -0.015, 0.022);
    const injuredTongue = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.054, 0.088, 10, 16),
      matTongue
    );
    injuredTongue.scale.set(1.06, 1.08, 0.46);
    injuredTongue.position.set(0.028, -0.068, 0.032);
    injuredTongue.rotation.set(0.42, 0, -0.34);
    injuredTonguePivot.add(injuredTongue);
    const tongueCrease = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.007, 0.064, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0xd94b6b, roughness: 0.45 })
    );
    tongueCrease.position.set(0.026, -0.062, 0.055);
    tongueCrease.rotation.set(0.42, 0, -0.34);
    injuredTonguePivot.add(tongueCrease);
    injuredMouthGroup.add(injuredTonguePivot);
    injuredMouthGroup.visible = false;
    headGroup.add(injuredMouthGroup);

    // Cute soft pink dizzy blush cheeks for injured loser face
    const blushGroup = new THREE.Group();
    const matBlush = new THREE.MeshStandardMaterial({
      color: 0xff8fab,
      roughness: 0.72,
      transparent: true,
      opacity: 0.72,
    });
    [-1, 1].forEach((side) => {
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), matBlush);
      blush.scale.set(1.15, 0.65, 0.25);
      blush.position.set(side * 0.36, -0.135, 0.565);
      blush.rotation.y = side * 0.38;
      blushGroup.add(blush);
    });
    blushGroup.visible = false;
    headGroup.add(blushGroup);

    // =========================================================================
    // 10 MULTI-PART 3D ACCESSORIES (Calibrated to the cuter chibi head & neck)
    // =========================================================================
    const accessoryMeshes: Record<AccessoryId, THREE.Group> = {} as Record<AccessoryId, THREE.Group>;

    // 1. Bamboo Bandana (neck)
    {
      const g = new THREE.Group();
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.072, 10, 24), matBamboo);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.34, 0.02);
      g.add(collar);
      const bib = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 4), matBambooLeaf);
      bib.position.set(0, 0.2, 0.42);
      bib.rotation.x = Math.PI;
      bib.rotation.y = Math.PI / 4;
      bib.scale.set(1.1, 1.0, 0.35);
      g.add(bib);
      g.visible = false;
      bodyGroup.add(g);
      accessoryMeshes.leaf_bandana = g;
    }

    // 2. Dapper Bowtie (neck)
    {
      const g = new THREE.Group();
      g.position.set(0, 0.32, 0.46);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), matCrimson);
      g.add(knot);
      const leftWing = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 12), matCrimson);
      leftWing.rotation.z = -Math.PI / 2;
      leftWing.scale.set(0.85, 1, 0.45);
      leftWing.position.set(-0.12, 0, 0);
      g.add(leftWing);
      const rightWing = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 12), matCrimson);
      rightWing.rotation.z = Math.PI / 2;
      rightWing.scale.set(0.85, 1, 0.45);
      rightWing.position.set(0.12, 0, 0);
      g.add(rightWing);
      g.visible = false;
      bodyGroup.add(g);
      accessoryMeshes.red_bowtie = g;
    }

    // 3. Cool Shades (face)
    {
      const g = new THREE.Group();
      g.position.set(0, 0.03, 0.675);
      const lensGeo = new THREE.BoxGeometry(0.28, 0.16, 0.045);
      const leftLens = new THREE.Mesh(lensGeo, matShadesFrame);
      leftLens.position.set(-0.23, 0, 0);
      g.add(leftLens);
      const rightLens = new THREE.Mesh(lensGeo, matShadesFrame);
      rightLens.position.set(0.23, 0, 0);
      g.add(rightLens);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.04), matGold);
      bridge.position.set(0, 0.03, 0.005);
      g.add(bridge);
      const glintL = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.01), matEyeSparkle);
      glintL.position.set(-0.28, 0.035, 0.026);
      glintL.rotation.z = 0.45;
      g.add(glintL);
      const glintR = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.01), matEyeSparkle);
      glintR.position.set(0.18, 0.035, 0.026);
      glintR.rotation.z = 0.45;
      g.add(glintR);
      g.visible = false;
      headGroup.add(g);
      accessoryMeshes.cool_shades = g;
    }

    // 4. Sakura Blossom (head — beside right ear)
    {
      const g = new THREE.Group();
      g.position.set(0.4, 0.49, 0.27);
      g.rotation.set(-0.2, 0.35, -0.35);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.088, 10, 8), matSakura);
        petal.scale.set(1.0, 0.65, 0.35);
        petal.position.set(Math.cos(ang) * 0.1, Math.sin(ang) * 0.1, 0);
        g.add(petal);
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), matGold);
      center.position.set(0, 0, 0.02);
      g.add(center);
      g.visible = false;
      headGroup.add(g);
      accessoryMeshes.flower_clip = g;
    }

    // 5. Party Cone Hat (head)
    {
      const g = new THREE.Group();
      g.position.set(0, 0.56, 0.03);
      g.rotation.z = -0.14;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.56, 20), matAmberCloth);
      cone.position.y = 0.28;
      g.add(cone);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 10, 22), matCrimson);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.02;
      g.add(rim);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), matChefWhite);
      pom.position.y = 0.58;
      g.add(pom);
      g.visible = false;
      headGroup.add(g);
      accessoryMeshes.party_hat = g;
    }

    // 6. Bamboo Chef Hat (head)
    {
      const g = new THREE.Group();
      g.position.set(0, 0.55, 0.02);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.22, 22), matChefWhite);
      band.position.y = 0.11;
      g.add(band);
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.022, 8, 24), matBamboo);
      trim.rotation.x = Math.PI / 2;
      trim.position.y = 0.03;
      g.add(trim);
      const puffCoords: Array<[number, number, number, number]> = [
        [0, 0.36, 0, 0.26],
        [-0.2, 0.31, 0.08, 0.2],
        [0.2, 0.31, 0.08, 0.2],
        [0, 0.32, -0.18, 0.2],
      ];
      puffCoords.forEach(([px, py, pz, r]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), matChefWhite);
        puff.position.set(px, py, pz);
        g.add(puff);
      });
      g.visible = false;
      headGroup.add(g);
      accessoryMeshes.chef_toque = g;
    }

    // 7. Cozy Winter Scarf (neck)
    {
      const g = new THREE.Group();
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.1, 12, 26), matAmberCloth);
      wrap.rotation.x = Math.PI / 2;
      wrap.position.set(0, 0.34, 0.02);
      g.add(wrap);
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 26), matCrimson);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.set(0, 0.34, 0.02);
      g.add(stripe);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.08), matAmberCloth);
      tail.position.set(0.24, 0.11, 0.42);
      tail.rotation.z = 0.18;
      g.add(tail);
      g.visible = false;
      bodyGroup.add(g);
      accessoryMeshes.golden_scarf = g;
    }

    // 8. Starlight Wizard Hat (head)
    {
      const g = new THREE.Group();
      g.position.set(0, 0.56, 0.0);
      g.rotation.z = 0.1;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.05, 26), matIndigo);
      g.add(brim);
      const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 22), matGold);
      hatBand.rotation.x = Math.PI / 2;
      hatBand.position.y = 0.07;
      g.add(hatBand);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.68, 22), matIndigo);
      cone.position.set(-0.04, 0.37, -0.02);
      cone.rotation.z = 0.16;
      g.add(cone);
      const tipStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), matGold);
      tipStar.position.set(-0.1, 0.71, -0.02);
      g.add(tipStar);
      g.visible = false;
      headGroup.add(g);
      accessoryMeshes.wizard_hat = g;
    }

    // 9. Jade Magic Staff (prop — held in right arm)
    {
      const g = new THREE.Group();
      g.position.set(0.17, -0.12, 0.16);
      g.rotation.z = -0.26;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 1.25, 12), matBamboo);
      shaft.position.y = 0.15;
      g.add(shaft);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.022, 8, 16), matGold);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.72;
      g.add(collar);
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.125, 1), matEmeraldCrystal);
      orb.position.y = 0.85;
      g.add(orb);
      g.visible = false;
      rightArm.add(g);
      accessoryMeshes.bamboo_staff = g;
    }

    // 10. Royal Crown (head)
    {
      const g = new THREE.Group();
      g.position.set(0, 0.58, 0.02);
      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.18, 24), matGold);
      baseRing.position.y = 0.09;
      g.add(baseRing);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 6), matGold);
        spire.position.set(Math.cos(ang) * 0.26, 0.24, Math.sin(ang) * 0.26);
        g.add(spire);
        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 10, 8),
          i % 2 === 0 ? matCrimson : matEmeraldCrystal
        );
        pearl.position.set(Math.cos(ang) * 0.26, 0.34, Math.sin(ang) * 0.26);
        g.add(pearl);
      }
      const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), matCrimson);
      centerGem.position.set(0, 0.1, 0.3);
      g.add(centerGem);
      g.visible = false;
      headGroup.add(g);
      accessoryMeshes.royal_crown = g;
    }

    // =========================================================================
    // TRICK-SPECIFIC 3D PROPS (Drum & Drumsticks, Bamboo Snack, Berries,
    // Sleep Bubble & Pillow, Kung Fu Headband, Dizzy/Superstar Stars, Zen Orbs)
    // =========================================================================

    // A. 3D Festival Taiko Drum on Wooden Stand + 2 Bachi Drumsticks ('belly_drum')
    const drumPropGroup = new THREE.Group();
    drumPropGroup.position.set(0, 0, 0.86);
    {
      // Crossed wooden A-frame drum stand grounded flush at y = 0
      const standBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.56, 0.07), matWood);
      standBar1.position.set(-0.22, 0.25, 0);
      standBar1.rotation.z = -0.34;
      standBar1.castShadow = true;
      drumPropGroup.add(standBar1);

      const standBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.56, 0.07), matWood);
      standBar2.position.set(0.22, 0.25, 0);
      standBar2.rotation.z = 0.34;
      standBar2.castShadow = true;
      drumPropGroup.add(standBar2);

      const standCross = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.08), matWood);
      standCross.position.set(0, 0.16, 0);
      drumPropGroup.add(standCross);
    }

    const drumBarrelGroup = new THREE.Group();
    drumBarrelGroup.position.set(0, 0.52, 0);
    // Tilt slightly toward camera & panda so the painted drumhead & strikes read clearly
    drumBarrelGroup.rotation.x = 0.26;
    drumPropGroup.add(drumBarrelGroup);
    {
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.39, 0.34, 28),
        matDrumShell
      );
      shell.castShadow = true;
      drumBarrelGroup.add(shell);

      const headTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.415, 0.415, 0.03, 28),
        matDrumHead
      );
      headTop.position.y = 0.17;
      drumBarrelGroup.add(headTop);

      const topRim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.028, 10, 28), matGold);
      topRim.rotation.x = Math.PI / 2;
      topRim.position.y = 0.165;
      drumBarrelGroup.add(topRim);

      const botRim = new THREE.Mesh(new THREE.TorusGeometry(0.395, 0.025, 10, 28), matGold);
      botRim.rotation.x = Math.PI / 2;
      botRim.position.y = -0.155;
      drumBarrelGroup.add(botRim);

      // Decorative golden drum tacks around upper band
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const tack = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), matGold);
        tack.position.set(Math.cos(ang) * 0.425, 0.11, Math.sin(ang) * 0.425);
        drumBarrelGroup.add(tack);
      }
    }

    // Expanding soundwave ring over drumhead on each beat
    const drumWaveMat = new THREE.MeshBasicMaterial({
      color: 0xf5b014,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const drumWaveRing = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.33, 28), drumWaveMat);
    drumWaveRing.rotation.x = -Math.PI / 2;
    drumWaveRing.position.set(0, 0.205, 0);
    drumBarrelGroup.add(drumWaveRing);

    drumPropGroup.visible = false;
    scene.add(drumPropGroup);

    // Pair of Wooden Drumsticks attached to Panda's paws (visible during 'belly_drum')
    const buildDrumstick = (side: -1 | 1) => {
      const g = new THREE.Group();
      g.position.set(side * 0.12, -0.3, 0.1);
      // Point stick outward from the paw toward the drumhead
      g.rotation.set(0.35, 0, side * -0.22);
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.024, 0.44, 10),
        matLightWood
      );
      shaft.position.y = -0.18;
      g.add(shaft);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 10), matCrimson);
      tip.position.y = -0.41;
      g.add(tip);
      g.visible = false;
      return g;
    };
    const leftDrumstick = buildDrumstick(-1);
    leftArm.add(leftDrumstick);
    const rightDrumstick = buildDrumstick(1);
    rightArm.add(rightDrumstick);

    // B. 3D Bamboo Snack Prop (held in paws during 'munch')
    const snackBamboo = new THREE.Group();
    const snackCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.68, 12),
      matBamboo
    );
    snackCyl.rotation.z = Math.PI / 2;
    snackBamboo.add(snackCyl);
    const snackRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 14), matBambooLeaf);
    snackRing1.rotation.y = Math.PI / 2;
    snackRing1.position.x = -0.16;
    snackBamboo.add(snackRing1);
    const snackRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 14), matBambooLeaf);
    snackRing2.rotation.y = Math.PI / 2;
    snackRing2.position.x = 0.16;
    snackBamboo.add(snackRing2);
    const snackLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), matBambooLeaf);
    snackLeaf.scale.set(1.5, 0.3, 0.55);
    snackLeaf.position.set(0.36, 0.07, 0);
    snackLeaf.rotation.z = 0.45;
    snackBamboo.add(snackLeaf);
    snackBamboo.position.set(0, 1.06, 0.68);
    snackBamboo.visible = false;
    pandaRig.add(snackBamboo);

    // C. 3D Glossy Juggling Berries with Cute Green Leaves ('juggle')
    const juggleGroup = new THREE.Group();
    const berryColors = [0xf43f5e, 0xf59e0b, 0x10b981];
    const juggleBerries = berryColors.map((hex) => {
      const bg = new THREE.Group();
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.115, 16, 14),
        new THREE.MeshPhysicalMaterial({
          color: hex,
          roughness: 0.18,
          metalness: 0.05,
          clearcoat: 0.85,
        })
      );
      bg.add(sphere);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), matBambooLeaf);
      leaf.scale.set(1.5, 0.35, 0.65);
      leaf.position.set(0.03, 0.115, 0);
      leaf.rotation.z = 0.45;
      bg.add(leaf);
      juggleGroup.add(bg);
      return bg;
    });
    juggleGroup.visible = false;
    scene.add(juggleGroup);

    // D. Cozy Sleep Bubble & Plush Pillow ('sleepy_nap')
    const sleepBubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8f3ff,
      transparent: true,
      opacity: 0.58,
      roughness: 0.06,
      metalness: 0.05,
      clearcoat: 1.0,
    });
    const sleepBubble = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 14), sleepBubbleMat);
    sleepBubble.position.set(0.07, -0.1, 0.78);
    sleepBubble.visible = false;
    headGroup.add(sleepBubble);

    const napPillow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.72, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.88 })
    );
    napPillow.scale.set(1.15, 1, 0.92);
    napPillow.position.set(0, 0.08, -0.04);
    napPillow.visible = false;
    scene.add(napPillow);

    // E. Kung Fu Crimson Headband + Flying Impact Shock Ring ('kung_fu')
    const kungFuBand = new THREE.Group();
    const kfRing = new THREE.Mesh(new THREE.TorusGeometry(0.61, 0.055, 10, 28), matCrimson);
    kfRing.rotation.x = Math.PI / 2;
    kfRing.position.set(0, 0.25, 0.02);
    kungFuBand.add(kfRing);
    const kfTail1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.025), matCrimson);
    kfTail1.position.set(0.58, 0.12, -0.22);
    kfTail1.rotation.z = 0.48;
    kungFuBand.add(kfTail1);
    const kfTail2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.025), matCrimson);
    kfTail2.position.set(0.52, 0.06, -0.28);
    kfTail2.rotation.z = 0.72;
    kungFuBand.add(kfTail2);
    kungFuBand.visible = false;
    headGroup.add(kungFuBand);

    // E2. Crisp White Cartoon Head Bandage Wrap (Duel Loser on floor!)
    const headBandageGroup = new THREE.Group();
    const matBandageWhite = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0.0,
      sheen: 0.28,
      sheenColor: new THREE.Color(0xf1f5f9),
    });
    const matBandageTrim = new THREE.MeshStandardMaterial({
      color: 0xdbe5ec,
      roughness: 0.78,
    });
    // Main thick white gauze band wrapped around the forehead
    const bandMain = new THREE.Mesh(
      new THREE.TorusGeometry(0.615, 0.095, 12, 32),
      matBandageWhite
    );
    bandMain.rotation.x = Math.PI / 2;
    bandMain.rotation.y = -0.14;
    bandMain.scale.set(1.11, 0.99, 1.32);
    bandMain.position.set(0, 0.24, 0.03);
    headBandageGroup.add(bandMain);

    // Subtle wrapped-layer seam ring so it reads as layered gauze cloth
    const bandSeam = new THREE.Mesh(
      new THREE.TorusGeometry(0.645, 0.016, 8, 32),
      matBandageTrim
    );
    bandSeam.rotation.x = Math.PI / 2;
    bandSeam.rotation.y = -0.08;
    bandSeam.scale.set(1.1, 0.99, 1.0);
    bandSeam.position.set(0, 0.21, 0.04);
    headBandageGroup.add(bandSeam);

    // Diagonal over-the-crown gauze wrap (classic cute cartoon bonked bandage!)
    const bandCrown = new THREE.Mesh(
      new THREE.TorusGeometry(0.635, 0.082, 12, 30),
      matBandageWhite
    );
    bandCrown.position.set(0.02, 0.08, 0.02);
    bandCrown.rotation.set(0.18, 0.36, 0.42);
    bandCrown.scale.set(1.07, 0.96, 1.01);
    headBandageGroup.add(bandCrown);

    // Second crossing cap wrap over the top
    const bandCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.56, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
      matBandageWhite
    );
    bandCap.scale.set(1.08, 0.95, 0.99);
    bandCap.position.set(0, 0.17, 0.01);
    bandCap.rotation.z = -0.14;
    headBandageGroup.add(bandCap);

    // Cute side knot + floppy tied gauze tails on the left temple
    const bandageKnotGroup = new THREE.Group();
    bandageKnotGroup.position.set(-0.62, 0.33, 0.14);
    const knotBall = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), matBandageWhite);
    bandageKnotGroup.add(knotBall);
    const tieTail1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.17, 6, 10), matBandageWhite);
    tieTail1.scale.set(1.0, 1.0, 0.45);
    tieTail1.position.set(-0.11, 0.09, 0);
    tieTail1.rotation.z = 0.85;
    bandageKnotGroup.add(tieTail1);
    const tieTail2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.14, 6, 10), matBandageWhite);
    tieTail2.scale.set(1.0, 1.0, 0.45);
    tieTail2.position.set(-0.12, -0.05, 0.02);
    tieTail2.rotation.z = 1.65;
    bandageKnotGroup.add(tieTail2);
    headBandageGroup.add(bandageKnotGroup);

    // Tiny cute red first-aid cross emblem on the front bandage forehead for instant 5yo readability
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.024), matCrimson);
    crossV.position.set(0.18, 0.29, 0.655);
    crossV.rotation.set(-0.24, 0.25, -0.1);
    headBandageGroup.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.045, 0.024), matCrimson);
    crossH.position.set(0.18, 0.29, 0.655);
    crossH.rotation.set(-0.24, 0.25, -0.1);
    headBandageGroup.add(crossH);

    headBandageGroup.visible = false;
    headGroup.add(headBandageGroup);

    const impactRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const impactRing = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 24), impactRingMat);
    impactRing.position.set(0.45, 0.85, 0.9);
    impactRing.visible = false;
    scene.add(impactRing);

    // F. Orbiting 3D Golden Stars ('dizzy_spin' & 'super_star')
    const orbitStarsGroup = new THREE.Group();
    const orbitStars = Array.from({ length: 5 }, () => {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), matGold);
      orbitStarsGroup.add(star);
      return star;
    });
    orbitStarsGroup.visible = false;
    scene.add(orbitStarsGroup);

    // G. Orbiting Glowing Jade Zen Orbs ('levitate')
    const zenOrbsGroup = new THREE.Group();
    const zenOrbs = Array.from({ length: 4 }, () => {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), matEmeraldCrystal);
      zenOrbsGroup.add(orb);
      return orb;
    });
    zenOrbsGroup.visible = false;
    scene.add(zenOrbsGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer Interaction
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      gazeTargetRef.current = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      soundFx.unlockAudio();
      const rect = canvas.getBoundingClientRect();
      _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_ndc, camera);
      const hits = _raycaster.intersectObjects(hitMeshes, false);
      if (hits.length > 0) {
        const zone = hits[0].object.userData.zone as Exclude<BasePandaAction, 'idle'> | undefined;
        triggerActionRef.current(zone ?? 'giggle', false, true);
      } else {
        triggerActionRef.current('giggle', false, true);
      }
    };

    canvas.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvas.addEventListener('pointerdown', handlePointerDown);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(120, Math.floor(entry.contentRect.width));
        const h = Math.max(120, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let frameHandle = 0;
    let frameIsTimeout = false;
    let disposed = false;
    let nextBlinkAt = 2.6;
    let nextGlanceAt = 3.2;
    let idleEyeGazeX = 0;
    let idleEyeGazeY = 0;

    // Autonomous idle micro-behaviors (non-user-initiated, ~every 30s)
    type AutoIdleType =
      | 'wink_left'
      | 'wink_right'
      | 'head_shake'
      | 'clutch_fingers'
      | 'ear_twitch'
      | 'yawn_stretch'
      | 'look_around'
      | 'belly_pat'
      | 'foot_tap';

    const AUTO_IDLE_POOL: AutoIdleType[] = [
      'wink_left',
      'wink_right',
      'head_shake',
      'clutch_fingers',
      'ear_twitch',
      'yawn_stretch',
      'look_around',
      'belly_pat',
      'foot_tap',
    ];
    const AUTO_IDLE_DURATION: Record<AutoIdleType, number> = {
      wink_left: 1.35,
      wink_right: 1.35,
      head_shake: 1.5,
      clutch_fingers: 2.35,
      ear_twitch: 1.25,
      yawn_stretch: 2.4,
      look_around: 2.3,
      belly_pat: 1.85,
      foot_tap: 2.1,
    };

    let autoIdle: { type: AutoIdleType; startedAt: number; duration: number } | null = null;
    let lastAutoIdleType: AutoIdleType | null = null;
    // First autonomous action arrives slightly sooner (~10-14s), then roughly every ~24-34s (~30s avg)
    let nextAutoIdleAt = 10 + Math.random() * 4;

    // Smooth Standing (0) <-> Sitting (1) idle posture alternation so the Panda naturally stands & sits!
    let sitBlend = 0; // Start standing upright so legs are clearly visible standing tall
    let idleWantsSit = false;
    let nextPostureToggleAt = 13 + Math.random() * 7;

    const HEAD_HATS = new Set<AccessoryId>([
      'party_hat',
      'chef_toque',
      'wizard_hat',
      'royal_crown',
    ]);

    const animate = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.getElapsedTime();
      const nowSec = performance.now() / 1000;

      // Sync equipped accessories without rebuilding scene
      const eq = equippedRef.current;
      const activeIds = new Set<AccessoryId | null>([eq.head, eq.face, eq.neck, eq.prop]);
      const outcomeMode = duelOutcomeRef.current;
      (Object.keys(accessoryMeshes) as AccessoryId[]).forEach((id) => {
        let vis = activeIds.has(id);
        // On Duel Loser, hide head hats & shades so the white head bandage & cute injured face shine clearly!
        if (outcomeMode === 'loser' && (HEAD_HATS.has(id) || id === 'cool_shades' || id === 'flower_clip')) {
          vis = false;
        }
        // On Duel Winner, award a golden Royal Crown automatically if they aren't wearing another head hat!
        if (outcomeMode === 'winner' && id === 'royal_crown' && !eq.head) {
          vis = true;
        }
        accessoryMeshes[id].visible = vis;
      });
      sproutGroup.visible =
        outcomeMode !== 'loser' &&
        !(outcomeMode === 'winner' && !eq.head) &&
        (!eq.head || !HEAD_HATS.has(eq.head));

      // Keep stage props synced cleanly
      const hideProps = hideStagePropsRef.current;
      meadow.visible = !hideProps;
      bambooGroups.forEach((b, idx) => {
        b.visible = !hideProps;
        if (!hideProps) {
          b.rotation.z = (idx === 0 ? 0.06 : -0.05) + Math.sin(t * 1.4 + idx * 1.7) * 0.035;
        }
      });

      const act = actionRef.current;
      let activeType: PandaAction = act.type;
      let p = 0;
      if (activeType !== 'idle') {
        // Yield any autonomous idle behavior when user interacts
        if (autoIdle) {
          autoIdle = null;
          nextAutoIdleAt = t + 24 + Math.random() * 12;
        }
        p = (nowSec - act.startedAt) / Math.max(0.1, act.duration);
        if (p >= 1) {
          act.type = 'idle';
          activeType = 'idle';
          p = 0;
          nextAutoIdleAt = t + 24 + Math.random() * 12;
        }
      }

      // Lively continuous idle micro-movements across body, ears, hands, fingers, legs & tail
      let targetSitBlend = idleWantsSit ? 1 : 0;
      let targetRootX = Math.sin(t * 0.85) * 0.016;
      let targetRootY = Math.sin(t * 2.3) * 0.024;
      let targetFlipRotX = 0;
      let targetRootRotX = Math.sin(t * 1.4) * 0.014;
      let targetRootRotY = gazeTargetRef.current.x * 0.24 + Math.sin(t * 0.65) * 0.04;
      let targetRootRotZ = Math.sin(t * 0.9) * 0.022;
      let targetScaleX = 1 - Math.sin(t * 2.3) * 0.01;
      let targetScaleY = 1 + Math.sin(t * 2.3) * 0.02;
      let targetHeadRotZ = Math.sin(t * 1.15) * 0.045;
      let targetHeadRotX = -gazeTargetRef.current.y * 0.14 + Math.sin(t * 1.7) * 0.025;
      let targetHeadRotY = Math.sin(t * 0.72) * 0.055;
      let targetLeftArmZ = -0.04 + Math.sin(t * 1.55) * 0.065;
      let targetRightArmZ = 0.04 - Math.sin(t * 1.55 + 0.6) * 0.065;
      let targetLeftArmX = -0.04 + Math.sin(t * 1.1 + 0.4) * 0.055;
      let targetRightArmX = -0.04 + Math.cos(t * 1.1) * 0.055;
      let targetLeftFingerCurl = Math.sin(t * 2.2) * 0.14;
      let targetRightFingerCurl = Math.cos(t * 2.2) * 0.14;
      let targetLeftEarZ = Math.sin(t * 1.9) * 0.075 + Math.sin(t * 4.3) * 0.025;
      let targetRightEarZ = -Math.sin(t * 1.9 + 0.7) * 0.075 - Math.cos(t * 3.9) * 0.025;
      // Extra leg swing offsets added on top of the smooth stand <-> sit base pose
      let targetLeftLegDeltaRotX = Math.sin(t * 1.35) * 0.04;
      let targetRightLegDeltaRotX = Math.sin(t * 1.35 + Math.PI) * 0.04;
      let targetLeftLegDeltaRotZ = 0;
      let targetRightLegDeltaRotZ = 0;
      let targetTailRotY = Math.sin(t * 3.4) * 0.16;
      let leftEyeScaleY = 1;
      let rightEyeScaleY = 1;
      type EyeExprMode = 'open' | 'happy' | 'sleepy' | 'dizzy' | 'star' | 'angry' | 'cool' | 'hurt';
      type BrowMode = 'none' | 'angry' | 'excited' | 'surprised' | 'cool' | 'sad';
      type MouthMode = 'smile' | 'open' | 'o_mouth' | 'fierce' | 'dizzy' | 'injured';
      let leftEyeMode: EyeExprMode = 'open';
      let rightEyeMode: EyeExprMode = 'open';
      let browMode: BrowMode = 'none';
      let mouthMode: MouthMode = 'smile';
      let targetEyeOffsetX = 0;
      let targetEyeOffsetY = 0;
      let crossEyeOffset = 0;
      let openMouthAmount = 0;

      const setBothEyesMode = (mode: EyeExprMode) => {
        leftEyeMode = mode;
        rightEyeMode = mode;
      };
      const setBothEyesScale = (s: number) => {
        leftEyeScaleY = s;
        rightEyeScaleY = s;
      };

      // Toggle trick props cleanly
      const isDrumming = activeType === 'belly_drum';
      const isMunching = activeType === 'munch';
      const isJuggling = activeType === 'juggle';
      const isNapping = activeType === 'sleepy_nap';
      const isKungFu = activeType === 'kung_fu';
      const isDuelReady = duelReadyRef.current && activeType === 'idle';
      const isDuelWinner = outcomeMode === 'winner' && activeType === 'idle';
      const isDuelLoser = outcomeMode === 'loser' && activeType === 'idle';
      const isLevitate = activeType === 'levitate';
      const isSuperStar = activeType === 'super_star';
      const isMoonwalk = activeType === 'moonwalk';

      drumPropGroup.visible = isDrumming;
      leftDrumstick.visible = isDrumming;
      rightDrumstick.visible = isDrumming;
      snackBamboo.visible = isMunching;
      juggleGroup.visible = isJuggling;
      sleepBubble.visible = isNapping;
      napPillow.visible = isNapping;
      kungFuBand.visible = isKungFu || isDuelReady;
      headBandageGroup.visible = outcomeMode === 'loser';
      blushGroup.visible = outcomeMode === 'loser';
      impactRing.visible = false;
      orbitStarsGroup.visible = false;
      zenOrbsGroup.visible = isLevitate;
      auraRing.visible = isLevitate || isSuperStar || isMoonwalk || isDuelWinner;
      auraInnerRing.visible = isLevitate || isSuperStar || isDuelWinner;

      // Hide staff temporarily while holding drumsticks so they don't overlap
      if (isDrumming && accessoryMeshes.bamboo_staff.visible) {
        accessoryMeshes.bamboo_staff.visible = false;
      }

      // Base Talking-Tom actions
      if (activeType === 'giggle') {
        targetSitBlend = 1; // Sit & wiggle chubby feet while giggling!
        const wave = Math.sin(p * Math.PI * 4);
        targetScaleX = 1 + wave * 0.09;
        targetScaleY = 1 - wave * 0.08;
        targetHeadRotZ = wave * 0.16;
        targetLeftArmZ = -1.25 + wave * 0.32;
        targetRightArmZ = 1.25 - wave * 0.32;
        targetLeftEarZ = -0.2 + wave * 0.15;
        targetRightEarZ = 0.2 + wave * 0.15;
        targetLeftLegDeltaRotX = wave * 0.24;
        targetRightLegDeltaRotX = -wave * 0.24;
        setBothEyesMode('happy');
        mouthMode = 'open';
        openMouthAmount = 0.85 + Math.abs(wave) * 0.25;
      } else if (activeType === 'pet') {
        targetSitBlend = 1; // Cozy happy sit during head pats
        const sway = Math.sin(p * Math.PI * 2);
        targetHeadRotZ = sway * 0.22;
        targetHeadRotX = 0.08;
        targetScaleY = 0.96 + Math.abs(sway) * 0.04;
        targetLeftEarZ = -0.35 + sway * 0.22;
        targetRightEarZ = 0.35 + sway * 0.22;
        setBothEyesMode('happy');
        mouthMode = 'smile';
      } else if (activeType === 'boop') {
        targetSitBlend = 0; // Stand alert when booped!
        const tilt = Math.sin(p * Math.PI * 2) * (1 - p * 0.45);
        targetHeadRotZ = tilt * 0.24;
        targetRootRotY = tilt * 0.3;
        targetScaleX = 1.07 - p * 0.07;
        targetScaleY = 0.93 + p * 0.07;
        targetLeftEarZ = -0.25 * (1 - p);
        targetRightEarZ = 0.25 * (1 - p);
        setBothEyesScale(1.22);
        browMode = 'surprised';
        crossEyeOffset = 0.015 * Math.sin(p * Math.PI);
        mouthMode = p < 0.72 ? 'o_mouth' : 'smile';
      } else if (activeType === 'hop') {
        targetSitBlend = 0; // Stand & leap off both legs!
        const jump = Math.abs(Math.sin(p * Math.PI * 2));
        targetRootY = jump * 0.46;
        targetScaleY = 1 + (jump - 0.3) * 0.14;
        targetScaleX = 1 - (jump - 0.3) * 0.09;
        targetLeftLegDeltaRotX = Math.sin(p * Math.PI * 4) * 0.36;
        targetRightLegDeltaRotX = -Math.sin(p * Math.PI * 4) * 0.36;
        targetLeftArmZ = -1.1;
        targetRightArmZ = 1.1;
        if (jump > 0.55) {
          setBothEyesMode('star');
          browMode = 'excited';
          mouthMode = 'o_mouth';
        } else {
          setBothEyesMode('happy');
          mouthMode = 'open';
          openMouthAmount = 0.7;
        }
      } else if (activeType === 'dance') {
        targetSitBlend = 0; // Stand tall & groove with stepping legs!
        const beat = Math.sin(p * Math.PI * 6);
        const hop = Math.abs(Math.sin(p * Math.PI * 4));
        targetRootY = hop * 0.28;
        targetRootRotZ = beat * 0.13;
        // Mid-dance joyful 360 twirl
        if (p > 0.35 && p < 0.78) {
          const spinP = (p - 0.35) / 0.43;
          targetRootRotY = spinP * Math.PI * 2;
        }
        targetHeadRotZ = -beat * 0.2;
        targetLeftArmZ = -1.65 + beat * 0.45;
        targetRightArmZ = 1.65 + beat * 0.45;
        targetLeftLegDeltaRotX = -Math.max(0, beat) * 0.42;
        targetRightLegDeltaRotX = -Math.max(0, -beat) * 0.42;
        targetLeftEarZ = beat * 0.25;
        targetRightEarZ = beat * 0.25;
        setBothEyesMode(Math.sin(p * Math.PI * 3) > 0.15 ? 'star' : 'happy');
        browMode = 'excited';
        mouthMode = 'open';
        openMouthAmount = 0.82;
      } else if (activeType === 'munch') {
        targetSitBlend = 1; // Sit down happily to munch crunchy bamboo!
        const chomp = Math.sin(p * Math.PI * 8);
        targetHeadRotX = 0.14 + chomp * 0.1;
        targetScaleY = 0.98 + Math.abs(chomp) * 0.04;
        // Bring both front paws inward & forward to hold the bamboo stalk
        targetLeftArmZ = 0.32;
        targetRightArmZ = -0.32;
        targetLeftArmX = -1.12;
        targetRightArmX = -1.12;
        snackBamboo.position.y = 1.07 + chomp * 0.035;
        snackBamboo.rotation.z = chomp * 0.09;
        setBothEyesMode('happy');
        mouthMode = 'open';
        openMouthAmount = Math.max(0, chomp) * 0.95;
      }
      // =======================================================================
      // 10 OVERHAULED UNLOCKABLE TRICK ANIMATIONS WITH UNIQUE FACIAL EXPRESSIONS
      // =======================================================================
      else if (activeType === 'wave') {
        targetSitBlend = 0; // Stand tall & wave!
        const w = Math.sin(p * Math.PI * 7);
        targetHeadRotZ = -0.2;
        targetRightArmZ = 2.25 + w * 0.42;
        targetRightArmX = -0.35;
        targetLeftArmZ = -0.28;
        targetRootY = Math.abs(Math.sin(p * Math.PI * 2)) * 0.09;
        targetLeftEarZ = -0.15;
        targetRightEarZ = 0.22 + w * 0.1;
        leftEyeMode = 'happy';
        rightEyeMode = 'open';
        rightEyeScaleY = 1.1;
        browMode = 'excited';
        mouthMode = 'open';
        openMouthAmount = 0.68;
      } else if (activeType === 'belly_drum') {
        targetSitBlend = 1; // Sit cozily behind the Taiko drum!
        const intro = Math.min(1, p / 0.12);
        const outro = Math.min(1, (1 - p) / 0.12);
        const drumEnv = Math.sin(Math.min(intro, outro) * (Math.PI / 2));
        drumPropGroup.scale.setScalar(Math.max(0.001, drumEnv));

        // 8 rhythmic alternating drum strikes (L-R-L-R-L-R-L-R + grand double hit finale!)
        const isFinale = p > 0.8 && p < 0.94;
        const strikePhase = p * Math.PI * 8;
        const leftWave = Math.sin(strikePhase);
        const rightWave = -leftWave;

        // Sharp strike curve: arms lift high (-1.82) then snap down onto the drumhead (-1.02)
        const leftHit = isFinale
          ? Math.max(0, Math.sin(((p - 0.8) / 0.14) * Math.PI))
          : Math.pow(Math.max(0, leftWave), 2.2);
        const rightHit = isFinale
          ? Math.max(0, Math.sin(((p - 0.8) / 0.14) * Math.PI))
          : Math.pow(Math.max(0, rightWave), 2.2);

        const anyHit = Math.max(leftHit, rightHit);

        // Position arms inward & forward right over the drumhead
        targetLeftArmZ = 0.26;
        targetRightArmZ = -0.26;
        targetLeftArmX = -1.78 + leftHit * 0.74;
        targetRightArmX = -1.78 + rightHit * 0.74;

        // Lean forward happily over the drum & groove to the beat
        targetRootRotX = 0.09;
        targetHeadRotZ = Math.sin(strikePhase * 0.5) * 0.18;
        targetHeadRotX = 0.12 + anyHit * 0.06;
        targetLeftEarZ = -0.15 + leftHit * 0.25;
        targetRightEarZ = 0.15 - rightHit * 0.25;
        targetScaleY = 0.98 + anyHit * 0.04;

        // Drumhead squash bounce + expanding golden soundwave ring on every beat!
        drumBarrelGroup.scale.set(
          1 + anyHit * 0.09,
          1 - anyHit * 0.12,
          1 + anyHit * 0.09
        );
        drumWaveRing.scale.setScalar(0.65 + anyHit * 0.85);
        drumWaveMat.opacity = anyHit * 0.75 * drumEnv;

        setBothEyesMode('star');
        browMode = 'excited';
        mouthMode = 'open';
        openMouthAmount = 0.78 + anyHit * 0.36;
      } else if (activeType === 'backflip') {
        targetSitBlend = 0; // Stand tall & leap into a full backflip!
        if (p < 0.18) {
          // Focused anticipation crouch
          const crouch = p / 0.18;
          targetScaleY = 1 - crouch * 0.22;
          targetScaleX = 1 + crouch * 0.15;
          targetLeftArmX = 0.45 * crouch;
          targetRightArmX = 0.45 * crouch;
          setBothEyesMode('angry');
          browMode = 'angry';
          mouthMode = 'smile';
        } else if (p < 0.84) {
          // Thrilled mid-air "WHOA!" wide open eyes + surprised brows + 'O' mouth!
          const air = (p - 0.18) / 0.66;
          targetRootY = Math.sin(air * Math.PI) * 0.72;
          targetFlipRotX = -air * Math.PI * 2;
          targetLeftArmZ = -1.65;
          targetRightArmZ = 1.65;
          targetLeftLegDeltaRotX = -0.65;
          targetRightLegDeltaRotX = -0.65;
          setBothEyesMode('open');
          setBothEyesScale(1.26);
          browMode = 'surprised';
          mouthMode = 'o_mouth';
        } else {
          // Superhero landing with proud golden Star Eyes & cheering smile!
          const land = (p - 0.84) / 0.16;
          const squash = Math.sin(land * Math.PI);
          targetScaleY = 1 - squash * 0.18;
          targetScaleX = 1 + squash * 0.14;
          targetLeftArmZ = -1.1 * (1 - land);
          targetRightArmZ = 1.1 * (1 - land);
          setBothEyesMode('star');
          browMode = 'excited';
          mouthMode = 'open';
          openMouthAmount = 0.75 * (1 - land * 0.4);
        }
      } else if (activeType === 'dizzy_spin') {
        targetSitBlend = 0; // Stand & spin!
        if (p < 0.65) {
          // High-speed spin with thrilled wide eyes + 'O' mouth!
          const sp = p / 0.65;
          targetRootRotY = sp * Math.PI * 6;
          targetRootY = Math.sin(sp * Math.PI) * 0.22;
          targetLeftArmZ = -1.6;
          targetRightArmZ = 1.6;
          setBothEyesMode('open');
          setBothEyesScale(1.22);
          browMode = 'surprised';
          mouthMode = 'o_mouth';
        } else {
          // Post-spin HEAD-SPINNING DIZZY expression: swirling @ @ spiral eyes + wobbly silly tongue + orbiting stars!
          const wob = (p - 0.65) / 0.35;
          const fade = Math.sin(Math.min(1, wob * 4) * (Math.PI / 2)) * (1 - Math.max(0, (wob - 0.7) / 0.3));
          targetHeadRotZ = Math.sin(wob * Math.PI * 4) * 0.38 * (1 - wob * 0.35);
          targetHeadRotY = Math.cos(wob * Math.PI * 3) * 0.22 * (1 - wob * 0.35);
          targetRootRotZ = Math.sin(wob * Math.PI * 2) * 0.14 * (1 - wob * 0.4);
          setBothEyesMode('dizzy');
          mouthMode = 'dizzy';
          orbitStarsGroup.visible = true;
          orbitStars.forEach((star, idx) => {
            if (idx >= 3) {
              star.visible = false;
              return;
            }
            star.visible = true;
            const ang = wob * Math.PI * 5 + (idx * Math.PI * 2) / 3;
            star.position.set(Math.cos(ang) * 0.72, 2.2 + Math.sin(ang * 2) * 0.06, Math.sin(ang) * 0.48);
            star.rotation.y = t * 5;
            star.scale.setScalar(Math.max(0.01, fade * 0.9));
          });
        }
      } else if (activeType === 'sleepy_nap') {
        targetSitBlend = 1; // Sit & curl up cozily on the nap pillow!
        const settle =
          Math.sin(Math.min(1, p * 4.5) * (Math.PI / 2)) *
          Math.sin(Math.min(1, (1 - p) * 4.5) * (Math.PI / 2));
        const breath = Math.sin(p * Math.PI * 4);
        napPillow.scale.set(1.15 * settle, settle, 0.92 * settle);
        targetRootY = -0.04 * settle;
        targetHeadRotX = 0.24 * settle;
        targetHeadRotZ = (0.24 + breath * 0.07) * settle;
        targetScaleY = 1 - 0.07 * settle + breath * 0.032 * settle;
        targetScaleX = 1 + 0.06 * settle - breath * 0.02 * settle;
        targetLeftArmZ = 0.2 * settle;
        targetRightArmZ = -0.2 * settle;
        targetLeftArmX = -0.35 * settle;
        targetRightArmX = -0.35 * settle;
        setBothEyesMode(settle > 0.25 ? 'sleepy' : 'open');
        mouthMode = settle > 0.3 ? 'o_mouth' : 'smile';
        // Cute expanding/contracting translucent sleep bubble on nose!
        const bubbleSize = Math.max(0.001, settle * (0.65 + (breath + 1) * 0.38));
        sleepBubble.scale.setScalar(bubbleSize);
      } else if (activeType === 'kung_fu') {
        targetSitBlend = 0; // Stand in a powerful Kung-Fu martial arts stance!
        setBothEyesMode('angry');
        browMode = 'angry';
        mouthMode = 'fierce';

        // Flutter headband ribbons
        kfTail1.rotation.z = 0.48 + Math.sin(t * 16) * 0.22;
        kfTail2.rotation.z = 0.72 + Math.cos(t * 18) * 0.24;

        if (p < 0.22) {
          // Crisp low martial arts guard stance
          const a = p / 0.22;
          targetScaleY = 1 - 0.12 * a;
          targetScaleX = 1 + 0.08 * a;
          targetLeftArmX = -1.2 * a;
          targetRightArmX = -0.95 * a;
          targetLeftArmZ = -0.55 * a;
          targetRightArmZ = 0.55 * a;
          targetLeftLegDeltaRotZ = -0.24 * a;
          targetRightLegDeltaRotZ = 0.24 * a;
        } else if (p < 0.48) {
          // Snappy Left Palm Strike!
          const a = (p - 0.22) / 0.26;
          const strike = Math.sin(a * Math.PI);
          targetRootRotY = -0.48 * strike;
          targetLeftArmX = -1.55 * strike;
          targetLeftArmZ = -0.25 * strike;
          targetRightArmX = -0.55;
          targetRightArmZ = 0.85;
          targetLeftLegDeltaRotX = -0.28 * strike;
          targetRightLegDeltaRotX = 0.25 * strike;
          openMouthAmount = strike * 0.85;
        } else if (p < 0.72) {
          // Snappy Right Palm Strike!
          const a = (p - 0.48) / 0.24;
          const strike = Math.sin(a * Math.PI);
          targetRootRotY = 0.48 * strike;
          targetRightArmX = -1.55 * strike;
          targetRightArmZ = 0.25 * strike;
          targetLeftArmX = -0.55;
          targetLeftArmZ = -0.85;
          targetRightLegDeltaRotX = -0.28 * strike;
          targetLeftLegDeltaRotX = 0.25 * strike;
          openMouthAmount = strike * 0.85;
        } else {
          // High Flying Side Kick + Impact Ring Flash!
          const a = (p - 0.72) / 0.28;
          const kick = Math.sin(a * Math.PI);
          targetRootY = kick * 0.42;
          targetRootRotZ = -0.24 * kick;
          targetRightLegDeltaRotX = -1.35 * kick;
          targetRightLegDeltaRotZ = 0.35 * kick;
          targetLeftLegDeltaRotX = 0.24 * kick;
          targetLeftArmZ = -1.55 * kick;
          targetRightArmZ = 1.55 * kick;
          openMouthAmount = 0.55 + kick * 0.55;
          impactRing.visible = true;
          impactRing.scale.setScalar(0.5 + a * 1.9);
          impactRingMat.opacity = Math.max(0, (1 - a) * 0.85);
        }
      } else if (activeType === 'juggle') {
        targetSitBlend = 0; // Stand steady while juggling!
        const cycles = 3.0;
        const phaseBase = p * Math.PI * 2 * cycles;
        const scoop = Math.sin(phaseBase);
        targetLeftArmX = -0.95 - Math.max(0, scoop) * 0.45;
        targetRightArmX = -0.95 - Math.max(0, -scoop) * 0.45;
        targetLeftArmZ = -0.35 - Math.max(0, scoop) * 0.25;
        targetRightArmZ = 0.35 + Math.max(0, -scoop) * 0.25;
        targetHeadRotZ = scoop * 0.12;
        targetHeadRotX = -0.2;
        targetHeadRotY = scoop * 0.16;
        setBothEyesMode('open');
        setBothEyesScale(1.14);
        targetEyeOffsetX = scoop * 0.036;
        targetEyeOffsetY = 0.028;
        browMode = 'surprised';
        mouthMode = 'o_mouth';

        const env =
          Math.sin(Math.min(1, p * 6) * (Math.PI / 2)) *
          Math.sin(Math.min(1, (1 - p) * 6) * (Math.PI / 2));
        juggleBerries.forEach((berry, idx) => {
          const ph = (p * cycles + idx / 3) % 1;
          // Smooth cascade figure-8 arc from Left Paw (-0.6, 0.96) over top (0, 2.08) to Right Paw (+0.6, 0.96)
          const theta = ph * Math.PI * 2;
          const bx = Math.sin(theta) * 0.64;
          const by = 0.94 + Math.abs(Math.cos(theta)) * 1.12;
          const bz = 0.56 + Math.sin(theta * 2) * 0.08;
          berry.position.set(bx, by, bz);
          berry.rotation.z = theta * 2;
          berry.rotation.y = t * 3 + idx;
          berry.scale.setScalar(Math.max(0.01, env));
        });
      } else if (activeType === 'moonwalk') {
        targetSitBlend = 0; // Stand tall & glide-step across the stage!
        const env =
          Math.sin(Math.min(1, p * 5) * (Math.PI / 2)) *
          Math.sin(Math.min(1, (1 - p) * 5) * (Math.PI / 2));
        const glide = Math.sin(p * Math.PI * 2);
        const dir = Math.cos(p * Math.PI * 2) >= 0 ? 1 : -1;
        targetRootX = glide * 0.62;
        targetRootRotY = -dir * 0.72; // Face opposite direction of glide for authentic moonwalk illusion!
        targetRootRotZ = -dir * 0.1;
        const step = Math.sin(p * Math.PI * 10);
        // Alternating smooth walking leg stride
        targetLeftLegDeltaRotX = step * 0.52;
        targetRightLegDeltaRotX = -step * 0.52;
        // Cool pop-star arm pose
        targetLeftArmZ = -1.45 * env;
        targetRightArmZ = 0.65 * env;
        targetRightArmX = -0.85 * env;
        targetHeadRotZ = dir * 0.12;
        auraMat.color.setHex(0x818cf8);
        auraMat.opacity = 0.45 * env;
        auraRing.position.x = pandaRoot.position.x;
        auraRing.scale.setScalar(0.95);
        setBothEyesMode('cool');
        browMode = 'cool';
        mouthMode = 'smile';
      } else if (activeType === 'levitate') {
        targetSitBlend = 1; // Sit in peaceful lotus meditation!
        const env = Math.sin(p * Math.PI);
        targetRootY = env * 0.46 + Math.sin(p * Math.PI * 6) * 0.045 * env;
        // Peaceful lotus meditation pose (arms gently cupped inward, feet tucked inward)
        targetLeftArmZ = 0.22 * env;
        targetRightArmZ = -0.22 * env;
        targetLeftArmX = -0.78 * env;
        targetRightArmX = -0.78 * env;
        targetLeftLegDeltaRotZ = 0.28 * env;
        targetRightLegDeltaRotZ = -0.28 * env;
        targetHeadRotX = -0.06 * env;
        setBothEyesMode(env > 0.2 ? 'sleepy' : 'open');
        mouthMode = 'smile';
        auraMat.color.setHex(0x2dd4bf);
        auraMat.opacity = 0.58 * env;
        auraRing.position.x = 0;
        auraRing.scale.setScalar(0.88 + env * 0.36);
        auraRing.rotation.z = t * 2.2;
        auraInnerMat.color.setHex(0x99f6e4);
        auraInnerMat.opacity = 0.5 * env;
        auraInnerRing.scale.setScalar(0.82 + env * 0.26);
        auraInnerRing.rotation.z = -t * 3.1;
        zenOrbs.forEach((orb, idx) => {
          const ang = t * 2.4 + (idx * Math.PI) / 2;
          orb.position.set(
            Math.cos(ang) * (0.95 + env * 0.15),
            0.78 + env * 0.42 + Math.sin(t * 3.2 + idx) * 0.14,
            Math.sin(ang) * 0.72
          );
          orb.scale.setScalar(Math.max(0.01, env));
        });
      } else if (activeType === 'super_star') {
        targetSitBlend = 0; // Stand tall & leap as a Super Star!
        const env = Math.sin(p * Math.PI);
        const hops = Math.abs(Math.sin(p * Math.PI * 3));
        targetRootY = hops * 0.48;
        targetRootRotY = p < 0.8 ? (p / 0.8) * Math.PI * 4 : 0;
        targetLeftArmZ = -2.15 + Math.sin(p * Math.PI * 8) * 0.22;
        targetRightArmZ = 2.15 - Math.sin(p * Math.PI * 8) * 0.22;
        targetLeftLegDeltaRotX = Math.sin(p * Math.PI * 6) * 0.32;
        targetRightLegDeltaRotX = -Math.sin(p * Math.PI * 6) * 0.32;
        targetScaleY = 1 + (hops - 0.3) * 0.14;
        setBothEyesMode('star');
        browMode = 'excited';
        mouthMode = 'open';
        openMouthAmount = 0.98;
        auraMat.color.setHex(0xf5b014);
        auraMat.opacity = 0.68 * env;
        auraRing.position.x = 0;
        auraRing.scale.setScalar(1.0 + hops * 0.45);
        auraRing.rotation.z = -t * 4.0;
        auraInnerMat.color.setHex(0xfef08a);
        auraInnerMat.opacity = 0.58 * env;
        auraInnerRing.scale.setScalar(0.85 + hops * 0.35);
        auraInnerRing.rotation.z = t * 5.0;
        // 5 Rising Orbiting Golden Stars!
        orbitStarsGroup.visible = true;
        orbitStars.forEach((star, idx) => {
          star.visible = true;
          const ang = p * Math.PI * 6 + (idx * Math.PI * 2) / 5;
          const radius = 0.95 + env * 0.25;
          star.position.set(
            Math.cos(ang) * radius,
            0.5 + ((p * 1.8 + idx * 0.2) % 1) * 1.75,
            Math.sin(ang) * radius * 0.65
          );
          star.rotation.y = t * 6 + idx;
          star.rotation.z = t * 4;
          star.scale.setScalar(Math.max(0.01, env * 1.15));
        });
      } else if (duelReadyRef.current) {
        // =====================================================================
        // 1v1 DUEL READY-TO-FIGHT ATTACK STANCE (Facing right toward Shadow Panda!)
        // =====================================================================
        targetSitBlend = 0; // Standing wide in martial arts combat stance!
        const bounce = Math.abs(Math.sin(t * 5.0));
        const guardSway = Math.sin(t * 2.5);
        // Periodic energetic practice jab every ~2.8 seconds
        const jabPhase = (t * 0.36) % 1;
        const jab = jabPhase > 0.72 && jabPhase < 0.88
          ? Math.sin(((jabPhase - 0.72) / 0.16) * Math.PI)
          : 0;

        targetRootY = bounce * 0.09;
        targetRootRotY = 0.54 + jab * 0.22; // Angled right toward the Shadow Panda!
        targetRootRotX = 0.08 + jab * 0.08; // Determined forward combat lean
        targetRootRotZ = -0.05 + guardSway * 0.04;
        targetScaleY = 0.96 + bounce * 0.05;
        targetScaleX = 1.03 - bounce * 0.03;

        // Wide agile martial arts leg stance
        targetLeftLegDeltaRotX = -0.26 - bounce * 0.08;
        targetRightLegDeltaRotX = 0.26 + bounce * 0.08;
        targetLeftLegDeltaRotZ = -0.18;
        targetRightLegDeltaRotZ = 0.18;

        // Raised Kung-Fu fighting fists with snappy right-hand jab bursts
        targetLeftArmX = -1.28 + guardSway * 0.1;
        targetLeftArmZ = -0.32;
        targetRightArmX = -1.15 - jab * 0.68 - guardSway * 0.1;
        targetRightArmZ = 0.42 - jab * 0.22;

        // Intense forward stare & fluttering headband
        targetHeadRotY = 0.08;
        targetHeadRotX = -0.06;
        targetHeadRotZ = -0.05;
        targetLeftEarZ = -0.14 - bounce * 0.08;
        targetRightEarZ = 0.14 + bounce * 0.08;
        kfTail1.rotation.z = 0.52 + Math.sin(t * 14) * 0.2;
        kfTail2.rotation.z = 0.76 + Math.cos(t * 16) * 0.22;

        // Fierce ready-to-fight facial expression!
        setBothEyesMode('angry');
        browMode = 'angry';
        mouthMode = 'fierce';
        openMouthAmount = 0.24 + jab * 0.65;
      } else if (duelOutcomeRef.current === 'winner') {
        // =====================================================================
        // 1v1 DUEL WINNER: Standing tall with BOTH arms raised high in Victory!
        // =====================================================================
        targetSitBlend = 0; // Standing proud on both feet!
        const cheerBeat = Math.sin(t * 6.2);
        const proudHop = Math.abs(Math.sin(t * 3.1));
        const facingYaw =
          duelFacingRef.current === 'right'
            ? 0.22
            : duelFacingRef.current === 'left'
              ? -0.22
              : 0;

        targetRootY = proudHop * 0.24;
        targetRootRotY = facingYaw + Math.sin(t * 2.1) * 0.14;
        targetRootRotZ = Math.sin(t * 3.1) * 0.08;
        targetScaleY = 1 + (proudHop - 0.25) * 0.09;
        targetScaleX = 1 - (proudHop - 0.25) * 0.05;

        // BOTH ARMS RAISED HIGH UP IN TRIUMPHANT VICTORY POSE!
        targetLeftArmZ = -2.38 + cheerBeat * 0.18;
        targetRightArmZ = 2.38 - cheerBeat * 0.18;
        targetLeftArmX = -0.18;
        targetRightArmX = -0.18;

        // Cheerful proud stepping stance
        targetLeftLegDeltaRotZ = -0.1;
        targetRightLegDeltaRotZ = 0.1;
        targetLeftLegDeltaRotX = -Math.max(0, cheerBeat) * 0.14;
        targetRightLegDeltaRotX = -Math.max(0, -cheerBeat) * 0.14;

        targetHeadRotZ = -Math.sin(t * 3.1) * 0.1;
        targetHeadRotX = -0.06;
        targetLeftEarZ = -0.24 + cheerBeat * 0.12;
        targetRightEarZ = 0.24 - cheerBeat * 0.12;

        setBothEyesMode(Math.sin(t * 2.4) > -0.15 ? 'star' : 'happy');
        browMode = 'excited';
        mouthMode = 'open';
        openMouthAmount = 0.88;

        // Golden champion aura beneath the winner!
        auraMat.color.setHex(0xf5b014);
        auraMat.opacity = 0.58;
        auraRing.scale.setScalar(0.95 + proudHop * 0.22);
        auraRing.rotation.z = t * 2.2;
        auraInnerMat.color.setHex(0xfef08a);
        auraInnerMat.opacity = 0.48;
        auraInnerRing.scale.setScalar(0.84 + proudHop * 0.18);
        auraInnerRing.rotation.z = -t * 3.0;
      } else if (duelOutcomeRef.current === 'loser') {
        // =====================================================================
        // 1v1 DUEL LOSER: Sitting slumped on the floor, white head bandage,
        // cute injured wincing/dizzy face with pink tongue sticking out!
        // =====================================================================
        targetSitBlend = 1; // Slumped flat on the floor with splayed paws!
        const wobble = Math.sin(t * 2.4);
        const sigh = Math.sin(t * 1.8);
        const facingYaw =
          duelFacingRef.current === 'left'
            ? -0.24
            : duelFacingRef.current === 'right'
              ? 0.24
              : 0;

        targetRootY = -0.06 + sigh * 0.015;
        targetRootRotX = -0.16; // Slightly leaned back on the floor ("oof!")
        targetRootRotY = facingYaw + wobble * 0.08;
        targetRootRotZ = 0.14 + wobble * 0.06; // Adorable dizzy sideways slump
        targetScaleY = 0.96 + sigh * 0.025;
        targetScaleX = 1.04 - sigh * 0.02;

        // Legs splayed wide & helplessly on the floor with tiny dizzy foot twitches
        targetLeftLegDeltaRotZ = -0.26;
        targetRightLegDeltaRotZ = 0.26;
        targetLeftLegDeltaRotX = Math.sin(t * 3.2) * 0.08;
        targetRightLegDeltaRotX = -Math.sin(t * 3.2) * 0.08;

        // Left arm flopped weakly onto floor; right paw gently holding its bandaged sore head!
        targetLeftArmZ = -0.58;
        targetLeftArmX = -0.18;
        targetRightArmZ = 1.72 + Math.sin(t * 4.2) * 0.1;
        targetRightArmX = -0.55;

        // Dizzy head tilt & droopy floppy ears
        targetHeadRotZ = 0.22 + wobble * 0.14;
        targetHeadRotX = 0.08;
        targetHeadRotY = Math.cos(t * 1.7) * 0.1;
        targetLeftEarZ = 0.28 + wobble * 0.08;
        targetRightEarZ = -0.28 + wobble * 0.08;

        // Alternate between cute wincing > < injured eyes and spinning @ @ dizzy spirals!
        const dizzyCycle = (t * 0.35) % 1;
        setBothEyesMode(dizzyCycle > 0.62 ? 'dizzy' : 'hurt');
        browMode = 'sad';
        mouthMode = 'injured';

        // Gentle bobbing on the white bandage knot
        bandageKnotGroup.rotation.z = Math.sin(t * 4.0) * 0.15;

        // 3 Golden cartoon dizzy stars orbiting slowly around the white head bandage!
        orbitStarsGroup.visible = true;
        orbitStars.forEach((star, idx) => {
          if (idx >= 3) {
            star.visible = false;
            return;
          }
          star.visible = true;
          const ang = t * 2.6 + (idx * Math.PI * 2) / 3;
          star.position.set(
            Math.cos(ang) * 0.72 + 0.08,
            1.88 + Math.sin(ang * 2) * 0.06,
            Math.sin(ang) * 0.45
          );
          star.rotation.y = t * 4;
          star.rotation.z = t * 2.5;
          star.scale.setScalar(0.82);
        });
      } else if (duelOutcomeRef.current === 'tie') {
        // =====================================================================
        // 1v1 DUEL TIE: Friendly side-by-side happy wave & hop!
        // =====================================================================
        targetSitBlend = 0;
        const wave = Math.sin(t * 6.5);
        const hop = Math.abs(Math.sin(t * 2.8));
        targetRootY = hop * 0.14;
        targetRootRotY = duelFacingRef.current === 'right' ? 0.2 : duelFacingRef.current === 'left' ? -0.2 : 0;
        targetRightArmZ = 2.1 + wave * 0.28;
        targetRightArmX = -0.25;
        targetLeftArmZ = -0.32;
        targetHeadRotZ = Math.sin(t * 2.8) * 0.12;
        setBothEyesMode('happy');
        browMode = 'excited';
        mouthMode = 'open';
        openMouthAmount = 0.72;
      } else if (victoryModeRef.current === 'dance') {
        targetSitBlend = 0; // Stand tall & dance!
        // Continuous celebratory Victory Dance using the exact same 3D Home Panda!
        const beat = Math.sin(t * 7.2);
        const hop = Math.abs(Math.sin(t * 3.6));
        const twirlCycle = (t * 0.32) % 1;
        targetRootY = hop * 0.26;
        targetRootRotZ = beat * 0.12;
        if (twirlCycle > 0.72 && twirlCycle < 0.95) {
          targetRootRotY = ((twirlCycle - 0.72) / 0.23) * Math.PI * 2;
        } else {
          targetRootRotY = Math.sin(t * 2.1) * 0.22;
        }
        targetScaleY = 1 + (hop - 0.3) * 0.09;
        targetScaleX = 1 - (hop - 0.3) * 0.06;
        targetHeadRotZ = -beat * 0.18;
        targetLeftArmZ = -1.7 + beat * 0.42;
        targetRightArmZ = 1.7 + beat * 0.42;
        targetLeftLegDeltaRotX = -Math.max(0, beat) * 0.4;
        targetRightLegDeltaRotX = -Math.max(0, -beat) * 0.4;
        targetLeftEarZ = beat * 0.24;
        targetRightEarZ = beat * 0.24;
        setBothEyesMode(Math.sin(t * 2.2) > 0.1 ? 'star' : 'happy');
        browMode = 'excited';
        mouthMode = 'open';
        openMouthAmount = 0.84;
      } else if (victoryModeRef.current === 'tip') {
        targetSitBlend = 0; // Stand encouragingly!
        // Warm encouraging pose when explaining how to earn an empty star
        const sway = Math.sin(t * 2.8);
        targetRootY = Math.abs(Math.sin(t * 1.6)) * 0.05;
        targetHeadRotZ = 0.18 + sway * 0.06;
        targetHeadRotY = 0.14;
        targetRightArmZ = 1.45 + sway * 0.25;
        targetRightArmX = -0.3;
        targetLeftArmZ = -0.18;
        targetLeftEarZ = -0.14;
        targetRightEarZ = 0.18 + sway * 0.08;
        setBothEyesMode('open');
        browMode = 'excited';
        mouthMode = 'smile';
      } else {
        // =====================================================================
        // IDLE MODE: Natural Stand <-> Sit cycling, blinking, & micro-actions
        // =====================================================================
        if (!autoIdle && t >= nextPostureToggleAt) {
          idleWantsSit = !idleWantsSit;
          nextPostureToggleAt = t + 14 + Math.random() * 10;
        }
        targetSitBlend = idleWantsSit ? 1 : 0;
        // Periodic subtle eye dart / gaze shift
        if (t >= nextGlanceAt) {
          if (Math.random() < 0.45) {
            idleEyeGazeX = 0;
            idleEyeGazeY = 0;
          } else {
            idleEyeGazeX = (Math.random() - 0.5) * 0.042;
            idleEyeGazeY = (Math.random() - 0.45) * 0.028;
          }
          nextGlanceAt = t + 2.2 + Math.random() * 2.8;
        }
        targetEyeOffsetX = idleEyeGazeX;
        targetEyeOffsetY = idleEyeGazeY;

        // Trigger a random autonomous idle action roughly every ~30 seconds
        if (!autoIdle && t >= nextAutoIdleAt) {
          const candidates = AUTO_IDLE_POOL.filter((item) => item !== lastAutoIdleType);
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          lastAutoIdleType = picked;
          autoIdle = {
            type: picked,
            startedAt: t,
            duration: AUTO_IDLE_DURATION[picked],
          };
        }

        if (autoIdle) {
          const ap = (t - autoIdle.startedAt) / autoIdle.duration;
          if (ap >= 1) {
            autoIdle = null;
            // Schedule next autonomous idle action in ~24–36s (avg 30s)
            nextAutoIdleAt = t + 24 + Math.random() * 12;
          } else {
            const env = Math.sin(ap * Math.PI);
            const at = autoIdle.type;

            if (at === 'wink_left' || at === 'wink_right') {
              // Playful 1-eye close (wink!) with cute head tilt & ear perk
              const isLeft = at === 'wink_left';
              if (ap > 0.15 && ap < 0.85) {
                if (isLeft) leftEyeMode = 'happy';
                else rightEyeMode = 'happy';
              }
              targetHeadRotZ = (isLeft ? 0.16 : -0.16) * env;
              targetHeadRotY = (isLeft ? -0.1 : 0.1) * env;
              if (isLeft) targetLeftEarZ = -0.26 * env;
              else targetRightEarZ = 0.26 * env;
              targetLeftArmZ = isLeft ? -0.22 * env : targetLeftArmZ;
              targetRightArmZ = !isLeft ? 0.22 * env : targetRightArmZ;
              openMouthAmount = env * 0.32;
            } else if (at === 'head_shake') {
              // Playful side-to-side head shake with floppy ears following through
              const shake = Math.sin(ap * Math.PI * 5) * Math.sin(ap * Math.PI);
              targetHeadRotY = shake * 0.38;
              targetHeadRotZ = -shake * 0.12;
              targetLeftEarZ = -shake * 0.32;
              targetRightEarZ = -shake * 0.32;
              targetEyeOffsetX = -shake * 0.024;
            } else if (at === 'clutch_fingers') {
              // Shyly bringing paws together in front of tummy & clutching/fidgeting fingers!
              const hold =
                Math.sin(Math.min(1, ap * 5) * (Math.PI / 2)) *
                Math.sin(Math.min(1, (1 - ap) * 5) * (Math.PI / 2));
              const fidget = Math.sin(ap * Math.PI * 8);
              targetLeftArmZ = 0.42 * hold + fidget * 0.05 * hold;
              targetRightArmZ = -0.42 * hold - fidget * 0.05 * hold;
              targetLeftArmX = -0.92 * hold + Math.max(0, fidget) * 0.12 * hold;
              targetRightArmX = -0.92 * hold + Math.max(0, -fidget) * 0.12 * hold;
              targetLeftFingerCurl = (0.48 + fidget * 0.28) * hold;
              targetRightFingerCurl = (0.48 - fidget * 0.28) * hold;
              targetHeadRotZ = 0.14 * hold;
              targetHeadRotX = 0.1 * hold;
              targetLeftLegDeltaRotX = Math.max(0, fidget) * 0.18 * hold;
              targetRightLegDeltaRotX = Math.max(0, -fidget) * 0.18 * hold;
              targetEyeOffsetY = 0.015 * hold;
            } else if (at === 'ear_twitch') {
              // Alert alternating ear flicks
              if (ap < 0.48) {
                const flick = Math.sin((ap / 0.48) * Math.PI * 2);
                targetLeftEarZ = -0.34 * flick;
                targetHeadRotZ = 0.08 * Math.abs(flick);
                targetEyeOffsetX = -0.025;
              } else {
                const flick = Math.sin(((ap - 0.48) / 0.52) * Math.PI * 2);
                targetRightEarZ = 0.34 * flick;
                targetHeadRotZ = -0.08 * Math.abs(flick);
                targetEyeOffsetX = 0.025;
              }
            } else if (at === 'yawn_stretch') {
              targetSitBlend = 1; // Cozy sit during yawn stretch
              const hold =
                Math.sin(Math.min(1, ap * 3.8) * (Math.PI / 2)) *
                Math.sin(Math.min(1, (1 - ap) * 3.8) * (Math.PI / 2));
              targetHeadRotX = -0.16 * hold;
              targetScaleY = 1 + 0.055 * hold;
              targetScaleX = 1 - 0.03 * hold;
              targetLeftArmZ = -0.82 * hold;
              targetRightArmZ = 0.82 * hold;
              targetLeftArmX = -0.25 * hold;
              targetRightArmX = -0.25 * hold;
              targetLeftEarZ = -0.24 * hold;
              targetRightEarZ = 0.24 * hold;
              if (hold > 0.3) setBothEyesMode('sleepy');
              openMouthAmount = hold * 0.92;
            } else if (at === 'look_around') {
              targetSitBlend = 0; // Stand tall & look around curiously
              const sweep = Math.sin(ap * Math.PI * 2);
              targetHeadRotY = sweep * 0.42;
              targetHeadRotZ = -sweep * 0.09;
              targetRootRotY = sweep * 0.14;
              targetEyeOffsetX = sweep * 0.035;
              targetLeftEarZ = sweep > 0 ? -0.16 * sweep : targetLeftEarZ;
              targetRightEarZ = sweep < 0 ? -0.16 * sweep : targetRightEarZ;
            } else if (at === 'belly_pat') {
              targetSitBlend = 1; // Sit & happily pat tummy
              const hold =
                Math.sin(Math.min(1, ap * 5) * (Math.PI / 2)) *
                Math.sin(Math.min(1, (1 - ap) * 5) * (Math.PI / 2));
              const pat = Math.abs(Math.sin(ap * Math.PI * 4));
              targetLeftArmZ = 0.36 * hold;
              targetRightArmZ = -0.36 * hold;
              targetLeftArmX = (-0.76 - pat * 0.22) * hold;
              targetRightArmX = (-0.76 - pat * 0.22) * hold;
              targetScaleX = 1 + pat * 0.045 * hold;
              targetScaleY = 1 - pat * 0.035 * hold;
              targetHeadRotZ = Math.sin(ap * Math.PI * 2) * 0.1 * hold;
              if (hold > 0.35) setBothEyesMode('happy');
            } else if (at === 'foot_tap') {
              targetSitBlend = 0; // Stand & tap foot to a happy beat
              const sway = Math.sin(ap * Math.PI * 4);
              const tap = Math.max(0, Math.sin(ap * Math.PI * 8));
              targetRootRotZ = sway * 0.07 * env;
              targetHeadRotZ = -sway * 0.1 * env;
              targetRightLegDeltaRotX = -tap * 0.38 * env;
              targetLeftArmZ = -0.16 * env + sway * 0.08 * env;
              targetRightArmZ = 0.16 * env + sway * 0.08 * env;
              targetTailRotY = sway * 0.42;
            }
          }
        }

        // Natural cozy idle blinking (only when eyes are open)
        if (t >= nextBlinkAt) {
          if (t < nextBlinkAt + 0.13) {
            if (leftEyeMode === 'open') leftEyeScaleY = 0.1;
            if (rightEyeMode === 'open') rightEyeScaleY = 0.1;
          } else {
            nextBlinkAt = t + 2.3 + Math.random() * 2.4;
          }
        }
      }

      if (!isMoonwalk) {
        auraRing.position.x = 0;
      }

      // Smoothly damp all transforms
      const k = 15;
      pandaRoot.position.x = THREE.MathUtils.damp(pandaRoot.position.x, targetRootX, k, dt);
      pandaRoot.position.y = THREE.MathUtils.damp(pandaRoot.position.y, targetRootY, k, dt);
      flipPivot.rotation.x =
        activeType === 'backflip'
          ? targetFlipRotX
          : THREE.MathUtils.damp(flipPivot.rotation.x, 0, k, dt);
      pandaRoot.rotation.x = THREE.MathUtils.damp(pandaRoot.rotation.x, targetRootRotX, k, dt);
      pandaRoot.rotation.y =
        (activeType === 'dance' && p > 0.35 && p < 0.78) ||
        (activeType === 'dizzy_spin' && p < 0.65) ||
        (activeType === 'super_star' && p < 0.8)
          ? targetRootRotY
          : THREE.MathUtils.damp(pandaRoot.rotation.y, targetRootRotY, 11, dt);
      pandaRoot.rotation.z = THREE.MathUtils.damp(pandaRoot.rotation.z, targetRootRotZ, k, dt);
      pandaRoot.scale.x = THREE.MathUtils.damp(pandaRoot.scale.x, targetScaleX, k, dt);
      pandaRoot.scale.y = THREE.MathUtils.damp(pandaRoot.scale.y, targetScaleY, k, dt);
      pandaRoot.scale.z = THREE.MathUtils.damp(pandaRoot.scale.z, targetScaleX, k, dt);

      headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, targetHeadRotZ, k, dt);
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, targetHeadRotX, k, dt);
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, targetHeadRotY, k, dt);

      const armK = isDrumming ? 26 : k;
      leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, targetLeftArmZ, armK, dt);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, targetRightArmZ, armK, dt);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, targetLeftArmX, armK, dt);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, targetRightArmX, armK, dt);
      leftFingers.rotation.x = THREE.MathUtils.damp(leftFingers.rotation.x, targetLeftFingerCurl, 16, dt);
      rightFingers.rotation.x = THREE.MathUtils.damp(rightFingers.rotation.x, targetRightFingerCurl, 16, dt);

      leftEar.rotation.z = THREE.MathUtils.damp(leftEar.rotation.z, targetLeftEarZ, k, dt);
      rightEar.rotation.z = THREE.MathUtils.damp(rightEar.rotation.z, targetRightEarZ, k, dt);
      tailMesh.rotation.y = THREE.MathUtils.damp(tailMesh.rotation.y, targetTailRotY, 12, dt);

      // Smooth Stand (0) <-> Sit (1) posture transition across torso, head, and hip-pivoted legs!
      sitBlend = THREE.MathUtils.damp(sitBlend, targetSitBlend, 8.5, dt);
      const standBodyY = 0.78;
      const sitBodyY = 0.56;
      const curBodyY = THREE.MathUtils.lerp(standBodyY, sitBodyY, sitBlend);
      bodyGroup.position.y = curBodyY;
      headGroup.position.y = curBodyY + 0.78;

      const hipY = THREE.MathUtils.lerp(0.47, 0.27, sitBlend);
      const hipX = THREE.MathUtils.lerp(0.25, 0.31, sitBlend);
      const hipZ = THREE.MathUtils.lerp(0.02, 0.12, sitBlend);
      const baseSitRotX = -1.42 * sitBlend;
      const baseSitSplayZ = 0.22 * sitBlend;

      leftLeg.position.set(-hipX, hipY, hipZ);
      rightLeg.position.set(hipX, hipY, hipZ);
      leftLeg.rotation.x = THREE.MathUtils.damp(
        leftLeg.rotation.x,
        baseSitRotX + targetLeftLegDeltaRotX,
        k,
        dt
      );
      rightLeg.rotation.x = THREE.MathUtils.damp(
        rightLeg.rotation.x,
        baseSitRotX + targetRightLegDeltaRotX,
        k,
        dt
      );
      leftLeg.rotation.z = THREE.MathUtils.damp(
        leftLeg.rotation.z,
        -baseSitSplayZ + targetLeftLegDeltaRotZ,
        k,
        dt
      );
      rightLeg.rotation.z = THREE.MathUtils.damp(
        rightLeg.rotation.z,
        baseSitSplayZ + targetRightLegDeltaRotZ,
        k,
        dt
      );

      // Update independent expressive kawaii eyes + dynamic eyebrows + multi-expression mouth!
      const clampedEyeX = Math.max(-0.018, Math.min(0.018, targetEyeOffsetX * 0.55));
      const clampedEyeY = Math.max(-0.014, Math.min(0.014, targetEyeOffsetY * 0.55));

      const applyEyeExpr = (
        eye: typeof leftEye,
        mode: EyeExprMode,
        scaleY: number,
        side: -1 | 1
      ) => {
        const showOpen = mode === 'open' || mode === 'cool';
        eye.openGroup.visible = showOpen;
        eye.coolLid.visible = mode === 'cool';
        eye.happyArc.visible = mode === 'happy';
        eye.sleepyArc.visible = mode === 'sleepy';
        eye.dizzyGroup.visible = mode === 'dizzy';
        eye.starGroup.visible = mode === 'star';
        eye.angryGroup.visible = mode === 'angry';
        eye.hurtGroup.visible = mode === 'hurt';

        eye.openGroup.scale.y = THREE.MathUtils.damp(eye.openGroup.scale.y, scaleY, 24, dt);
        const eyeX = clampedEyeX - side * crossEyeOffset;
        eye.openGroup.position.x = THREE.MathUtils.damp(eye.openGroup.position.x, eyeX, 14, dt);
        eye.openGroup.position.y = THREE.MathUtils.damp(eye.openGroup.position.y, clampedEyeY, 14, dt);

        if (mode === 'dizzy') {
          eye.dizzyGroup.rotation.z = side * t * 10.5;
        }
        if (mode === 'hurt') {
          const squeeze = 1 + Math.sin(t * 6.5) * 0.08;
          eye.hurtGroup.scale.set(squeeze, 1 / squeeze, 1);
        }
        if (mode === 'star') {
          const pulse = 1 + Math.sin(t * 14 + side) * 0.14;
          eye.starGroup.scale.setScalar(pulse);
          eye.starGroup.rotation.z = Math.sin(t * 7) * 0.18 * side;
        }

        // Dynamic expressive eyebrows
        if (browMode === 'none') {
          eye.brow.visible = false;
        } else {
          eye.brow.visible = true;
          if (browMode === 'angry') {
            // Bold inward-slanted fierce \ / martial-arts brows
            eye.brow.position.y = 0.145;
            eye.brow.rotation.z = Math.PI / 2 + side * 0.42;
          } else if (browMode === 'sad') {
            // Cute worried upturned / \ brows for injured loser face
            eye.brow.position.y = 0.19;
            eye.brow.rotation.z = Math.PI / 2 - side * 0.34;
          } else if (browMode === 'excited') {
            // Perky raised happy brows
            eye.brow.position.y = 0.215 + Math.sin(t * 12) * 0.01;
            eye.brow.rotation.z = Math.PI / 2 - side * 0.14;
          } else if (browMode === 'surprised') {
            // High arched surprised brows
            eye.brow.position.y = 0.235;
            eye.brow.rotation.z = Math.PI / 2 - side * 0.2;
          } else if (browMode === 'cool') {
            // Confident pop-star asymmetrical cocked eyebrow
            eye.brow.position.y = side === -1 ? 0.22 : 0.165;
            eye.brow.rotation.z = Math.PI / 2 + (side === -1 ? 0.12 : -0.08);
          }
        }
      };

      applyEyeExpr(leftEye, leftEyeMode, leftEyeScaleY, -1);
      applyEyeExpr(rightEye, rightEyeMode, rightEyeScaleY, 1);

      // Update multi-expression mouth rig
      const isOpenActive = (mouthMode === 'open' && openMouthAmount > 0.08) || (mouthMode === 'smile' && openMouthAmount > 0.08);
      const isOActive = mouthMode === 'o_mouth';
      const isFierceActive = mouthMode === 'fierce';
      const isDizzyActive = mouthMode === 'dizzy';
      const isInjuredActive = mouthMode === 'injured';

      smileGroup.visible = !isOActive && !isFierceActive && !isDizzyActive && !isInjuredActive;

      openMouthGroup.visible = isOpenActive;
      if (isOpenActive) {
        const s = THREE.MathUtils.damp(openMouthGroup.scale.y, openMouthAmount, 22, dt);
        openMouthGroup.scale.set(0.9 + s * 0.25, Math.max(0.05, s), 1);
      } else {
        openMouthGroup.scale.setScalar(0.001);
      }

      oMouthGroup.visible = isOActive;
      if (isOActive) {
        const oPulse = 1 + Math.sin(t * 10) * 0.1;
        oMouthGroup.scale.set(oPulse, oPulse * 1.12, 1);
      }

      fierceMouthGroup.visible = isFierceActive;
      if (isFierceActive) {
        const shoutScale = 0.85 + Math.max(0, openMouthAmount) * 0.55;
        fierceMouthGroup.scale.set(1.05, shoutScale, 1);
      }

      dizzyMouthGroup.visible = isDizzyActive;
      if (isDizzyActive) {
        dizzyMouthGroup.rotation.z = Math.sin(t * 11) * 0.22;
      }

      injuredMouthGroup.visible = isInjuredActive;
      if (isInjuredActive) {
        injuredTonguePivot.rotation.z = Math.sin(t * 5.2) * 0.14;
        injuredTonguePivot.rotation.x = Math.sin(t * 3.4) * 0.08;
      }

      sproutGroup.rotation.z = Math.sin(t * 3.1) * 0.14;

      // Shrink contact shadow subtly as panda rises into the air
      const shadowScale = Math.max(0.55, 1 - Math.max(0, pandaRoot.position.y) * 0.35);
      shadowPlane.scale.set(shadowScale, shadowScale, 1);
      shadowPlane.position.x = pandaRoot.position.x;

      renderer.render(scene, camera);
      scheduleNextFrame(renderer, isSoftwareGl, animate, (id, isTo) => {
        frameHandle = id;
        frameIsTimeout = isTo;
      });
    };

    animate();

    return () => {
      disposed = true;
      if (frameIsTimeout) clearTimeout(frameHandle);
      else cancelAnimationFrame(frameHandle);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else m.material.dispose();
        }
      });
      drumHeadTex.dispose();
      envTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
    };
  }, []);

  const speechWords = speechState.text.split(' ');

  if (duelReady) {
    return (
      <div
        className={`relative shrink-0 flex items-center justify-center select-none ${
          duelCompact ? 'w-[104px] h-[106px]' : 'w-[138px] h-[142px]'
        }`}
      >
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: p.x * 0.2, y: 4, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: p.x * 0.65 + 14,
                  y: p.y - 28,
                  scale: [0.5, 1.15, 0.85],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="absolute"
              >
                <Sparkles className="w-4 h-4 text-[#FFD93D]" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div ref={mountRef} className="w-full h-full" />
      </div>
    );
  }

  if (isDuelOutcome) {
    return (
      <div className="relative w-[152px] h-[156px] shrink-0 flex items-center justify-center select-none">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: p.x * 0.25, y: 6, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: p.x * 0.6,
                  y: p.y - 34,
                  scale: [0.5, 1.15, 0.85],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute"
              >
                <Star className="w-4 h-4 fill-[#F5B014] text-[#D98A00]" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div ref={mountRef} className="w-full h-full" />
      </div>
    );
  }

  if (isVictoryMini) {
    return (
      <div className="relative w-[108px] h-[112px] shrink-0 flex items-center justify-center select-none">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: p.x * 0.25, y: 6, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: p.x * 0.6,
                  y: p.y - 34,
                  scale: [0.5, 1.1, 0.8],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
                className="absolute"
              >
                <Star className="w-4 h-4 fill-[#F5B014] text-[#D98A00]" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div ref={mountRef} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center w-full select-none">
      {/* 3D WebGL Talking-Tom Panda Stage — Perfectly Centered & Viewport-Responsive! */}
      <div
        className={`relative w-full max-w-[390px] flex items-center justify-center ${
          compact ? 'h-[clamp(172px,26dvh,228px)]' : 'h-[clamp(168px,30dvh,256px)]'
        }`}
      >
        {/* Classic Children's Comic Thought Bubble floating neatly top-right of the centered Panda */}
        <div
          className={`absolute right-2 z-20 pointer-events-none ${
            compact ? 'top-2 max-w-[144px]' : 'top-2 max-w-[146px]'
          }`}
        >
          <AnimatePresence mode="wait">
            {speechState.visible && speechState.text && (
              <motion.button
                key={speechState.seq}
                type="button"
                onClick={() => {
                  if (speechState.isShopHint && onOpenStudio) {
                    soundFx.buttonTap();
                    onOpenStudio();
                  }
                }}
                initial={{ opacity: 0, scale: 0.72, x: -10, y: 6 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.82, x: -8, y: 4 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className={`pointer-events-auto relative text-left px-3 py-2 bg-white text-[#18201C] text-[12px] leading-snug font-extrabold rounded-[20px] border-[2.5px] border-[#18201C] shadow-[3px_3px_0_#18201C] ${
                  speechState.isShopHint && onOpenStudio ? 'cursor-pointer active:scale-95' : 'cursor-default'
                }`}
              >
                <span className="flex flex-wrap gap-x-1 gap-y-0.5">
                  {speechWords.map((word, idx) => (
                    <motion.span
                      key={`${speechState.seq}-${idx}`}
                      initial={{ opacity: 0, y: 5, scale: 0.82 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: 0.08 + idx * 0.055,
                        type: 'spring',
                        stiffness: 460,
                        damping: 24,
                      }}
                      className="inline-block"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>

                {/* Comic Thought-Cloud Trail Dots pointing toward Panda's head on the left */}
                <motion.span
                  aria-hidden="true"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.04, type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute -left-2.5 bottom-3 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#18201C]"
                />
                <motion.span
                  aria-hidden="true"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.0, type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute -left-5 bottom-1.5 w-2 h-2 rounded-full bg-white border-2 border-[#18201C]"
                />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: p.x * 0.4, y: 12, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: p.x,
                  y: p.y - 64,
                  scale: [0.5, 1.2, 0.9],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="absolute"
              >
                {p.kind === 'heart' && <Heart className="w-5 h-5 fill-[#E85D75] text-[#E85D75]" />}
                {p.kind === 'sparkle' && <Sparkles className="w-5 h-5 text-[#D9911A]" />}
                {p.kind === 'note' && <Music className="w-5 h-5 text-[#1B7A4E]" />}
                {p.kind === 'bamboo' && <Sprout className="w-5 h-5 text-[#1B7A4E]" />}
                {p.kind === 'star' && <Star className="w-5 h-5 fill-[#F5B014] text-[#D98A00]" />}
                {p.kind === 'zzz' && (
                  <span className="font-display font-bold text-base text-[#3B82F6]">Z</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div ref={mountRef} className="w-full h-full" />

        {webglLost && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EEF5EF] rounded-2xl text-xs font-semibold text-[#56635B]">
            Restoring 3D Panda…
          </div>
        )}
      </div>

      {/* Category 3: Calm Storybook Ivory Toy Tiles — Fluidly Sized Across All Mobile Heights */}
      {!compact && (
        <div className="mt-1 grid grid-cols-3 gap-2 min-[380px]:gap-2.5 w-full max-w-[356px] px-0.5">
          {homeTricks.map((trickId, slotIndex) => {
            const item = ALL_TRICKS_MAP.get(trickId);
            const label = item?.shortLabel ?? trickId;
            // Subtle cohesive ink/accent whisper instead of loud clashing rainbow boxes
            const textAccent =
              slotIndex === 0
                ? { ink: 'text-[#145C39]', bar: 'bg-[#34C776]' }
                : slotIndex === 1
                  ? { ink: 'text-[#8F284E]', bar: 'bg-[#F2749E]' }
                  : { ink: 'text-[#9A5306]', bar: 'bg-[#F5AE2F]' };

            return (
              <motion.button
                key={`${trickId}-${slotIndex}`}
                type="button"
                whileHover={{ y: -3, scale: 1.04 }}
                whileTap={{ y: 3, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                onClick={() => triggerAction(trickId, true)}
                className="relative min-h-[clamp(66px,10dvh,86px)] flex flex-col items-center justify-center gap-0.5 min-[380px]:gap-1 px-1.5 min-[380px]:px-2 py-1.5 min-[380px]:py-2 rounded-[20px] min-[380px]:rounded-[24px] bg-gradient-to-b from-[#FFFFFF] via-[#FFFDF8] to-[#F3EEE2] shadow-[0_4.5px_0_#D2C7B0,0_8px_16px_rgba(24,62,40,0.13),inset_0_2px_0_#FFFFFF] cursor-pointer select-none"
              >
                {/* Soft porcelain sheen along top rim */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3.5 top-[3px] h-[22%] rounded-full bg-white/80"
                />

                {/* Expressive Animated Icon floating cleanly over warm cream */}
                <motion.span
                  className="relative z-10 inline-flex items-center justify-center drop-shadow-[0_3px_4px_rgba(24,52,36,0.16)] shrink-0"
                  animate={{ y: [0, -2.5, 0], rotate: [-2, 2, -2] }}
                  transition={{
                    duration: 2.3,
                    delay: slotIndex * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <TrickIcon id={trickId} className="w-[clamp(32px,4.8dvh,44px)] h-[clamp(32px,4.8dvh,44px)] shrink-0" />
                </motion.span>

                {/* Emphasized Storybook Cartoon Typography with playful sculpted underline */}
                <span className="relative z-10 flex flex-col items-center max-w-full">
                  <span
                    className={`max-w-full truncate font-display text-[clamp(13px,1.9dvh,15.5px)] font-black leading-[1.16] tracking-[0.02em] ${textAccent.ink}`}
                    style={{
                      textShadow: '0 1.5px 0 #FFFFFF',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-[2px] h-[3px] w-6 rounded-full opacity-85 ${textAccent.bar}`}
                  />
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
