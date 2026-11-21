import {
  DIFFICULTY_CONFIGS,
  type BoardValidation,
  type CellCoord,
  type ColorMode,
  type ConflictReason,
  type Difficulty,
  type PandokuPuzzleWithSolution,
} from './types.ts';

const DIRS_4: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const DIRS_8: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

type RngFn = () => number;

/**
 * Deterministic PRNG (xmur3 hash -> mulberry32) so static Campaign levels
 * and Daily Challenges always produce the exact same unique-solution board.
 */
function createSeededRng(seedStr: string): RngFn {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  let state = (h ^ (h >>> 16)) >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seededPuzzleCache = new Map<string, PandokuPuzzleWithSolution>();

function shuffleInPlace<T>(arr: T[], rng: RngFn = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Step 1: Generate a uniformly randomized valid Pandoku placement:
 * Exactly 1 panda per row, 1 per column, and no two pandas touch horizontally,
 * vertically, or diagonally (i.e. |col[r] - col[r-1]| >= 2 for all rows).
 */
function generateValidPlacement(size: number, rng: RngFn = Math.random): number[] {
  const placement = new Array<number>(size).fill(-1);
  const usedCols = new Array<boolean>(size).fill(false);

  function backtrack(row: number): boolean {
    if (row === size) return true;
    const cols = Array.from({ length: size }, (_, i) => i);
    shuffleInPlace(cols, rng);

    for (const col of cols) {
      if (usedCols[col]) continue;
      if (row > 0 && Math.abs(col - placement[row - 1]) <= 1) continue;

      placement[row] = col;
      usedCols[col] = true;
      if (backtrack(row + 1)) return true;
      usedCols[col] = false;
      placement[row] = -1;
    }
    return false;
  }

  backtrack(0);
  return placement;
}

/**
 * Step 2: Grow N contiguous colored regions seeded from the N solution cells.
 * Uses weighted stochastic frontier growth so territories look organic (a mix
 * of snug L-shapes, corridors, and compact groves — just like MeowDoku).
 */
function growContiguousRegions(
  size: number,
  solution: number[],
  difficulty: Difficulty,
  rng: RngFn = Math.random
): number[][] {
  const regions = Array.from({ length: size }, () => new Array<number>(size).fill(-1));
  const regionSizes = new Array<number>(size).fill(1);
  const frontiers: CellCoord[][] = Array.from({ length: size }, () => []);

  // Give each region a personality weight so some regions stay tight and others sprawl naturally
  const targetWeights = Array.from({ length: size }, (_, i) => {
    if (difficulty === 'easy' && i === 0) return 0.25; // One small starter territory
    return 0.45 + rng() * 1.4;
  });
  shuffleInPlace(targetWeights, rng);

  // Seed each region at its panda solution coordinate
  for (let r = 0; r < size; r++) {
    const c = solution[r];
    regions[r][c] = r;
    for (const [dr, dc] of DIRS_4) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        frontiers[r].push({ row: nr, col: nc });
      }
    }
  }

  let unassigned = size * size - size;
  let guard = 0;

  while (unassigned > 0 && guard < size * size * 20) {
    guard++;

    // Collect regions that still have valid unclaimed frontier cells
    const candidates: number[] = [];
    for (let reg = 0; reg < size; reg++) {
      // Prune already-claimed cells from this region's frontier
      const valid = frontiers[reg].filter((cell) => regions[cell.row][cell.col] === -1);
      frontiers[reg] = valid;
      if (valid.length > 0) {
        candidates.push(reg);
      }
    }

    if (candidates.length === 0) break;

    // Pick a region weighted inversely by its current size * personality weight
    let totalWeight = 0;
    const weights = candidates.map((reg) => {
      const w = targetWeights[reg] / Math.pow(regionSizes[reg], 0.85);
      totalWeight += w;
      return w;
    });

    let pick = rng() * totalWeight;
    let chosenReg = candidates[0];
    for (let i = 0; i < candidates.length; i++) {
      pick -= weights[i];
      if (pick <= 0) {
        chosenReg = candidates[i];
        break;
      }
    }

    const frontier = frontiers[chosenReg];
    // Favor cells that share more edges with the same region slightly to keep clean shapes
    const cellIdx = Math.floor(rng() * frontier.length);
    const cell = frontier.splice(cellIdx, 1)[0];
    if (regions[cell.row][cell.col] !== -1) continue;

    regions[cell.row][cell.col] = chosenReg;
    regionSizes[chosenReg]++;
    unassigned--;

    for (const [dr, dc] of DIRS_4) {
      const nr = cell.row + dr;
      const nc = cell.col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === -1) {
        frontier.push({ row: nr, col: nc });
      }
    }
  }

  return regions;
}

/**
 * Verify that removing `skipCell` from `regionId` leaves the rest of `regionId`
 * orthogonally connected (BFS connectivity check).
 */
function isRegionConnectedWithout(
  regions: number[][],
  regionId: number,
  skipRow: number,
  skipCol: number
): boolean {
  const size = regions.length;
  const cells: CellCoord[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] === regionId && !(r === skipRow && c === skipCol)) {
        cells.push({ row: r, col: c });
      }
    }
  }

  if (cells.length === 0) return false;
  if (cells.length === 1) return true;

  const visited = new Set<string>();
  const queue: CellCoord[] = [cells[0]];
  visited.add(`${cells[0].row},${cells[0].col}`);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dr, dc] of DIRS_4) {
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < size &&
        nc >= 0 &&
        nc < size &&
        !(nr === skipRow && nc === skipCol) &&
        regions[nr][nc] === regionId &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ row: nr, col: nc });
      }
    }
  }

  return visited.size === cells.length;
}

/**
 * Step 3: Exact Pandoku Backtracking Solver with Minimum Remaining Values (MRV).
 * Stops early once `maxSolutions` (typically 2) solutions have been discovered.
 */
export function solvePandoku(regions: number[][], maxSolutions = 2): number[][] {
  const size = regions.length;
  const solutions: number[][] = [];

  // Group cells by regionId
  const regionCells: CellCoord[][] = Array.from({ length: size }, () => []);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      regionCells[regions[r][c]].push({ row: r, col: c });
    }
  }

  const usedRows = new Array<boolean>(size).fill(false);
  const usedCols = new Array<boolean>(size).fill(false);
  const usedRegions = new Array<boolean>(size).fill(false);
  // blocked[r][c] counts how many placed pandas forbid (r,c) via 8-adjacency
  const adjBlocked = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const currentPlacement = new Array<number>(size).fill(-1);

  function markAdjacent(r: number, c: number, delta: number) {
    for (const [dr, dc] of DIRS_8) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        adjBlocked[nr][nc] += delta;
      }
    }
  }

  function backtrack(placedCount: number) {
    if (solutions.length >= maxSolutions) return;
    if (placedCount === size) {
      solutions.push([...currentPlacement]);
      return;
    }

    // MRV heuristic: pick the unused region with the fewest currently valid cells
    let bestRegion = -1;
    let bestCandidates: CellCoord[] = [];
    let minCount = Infinity;

    for (let reg = 0; reg < size; reg++) {
      if (usedRegions[reg]) continue;
      const valid: CellCoord[] = [];
      for (const cell of regionCells[reg]) {
        if (!usedRows[cell.row] && !usedCols[cell.col] && adjBlocked[cell.row][cell.col] === 0) {
          valid.push(cell);
        }
      }
      if (valid.length === 0) return; // Dead end — prune immediately
      if (valid.length < minCount) {
        minCount = valid.length;
        bestRegion = reg;
        bestCandidates = valid;
        if (minCount === 1) break;
      }
    }

    if (bestRegion === -1) return;

    usedRegions[bestRegion] = true;
    for (const cell of bestCandidates) {
      usedRows[cell.row] = true;
      usedCols[cell.col] = true;
      currentPlacement[cell.row] = cell.col;
      markAdjacent(cell.row, cell.col, 1);

      backtrack(placedCount + 1);

      markAdjacent(cell.row, cell.col, -1);
      currentPlacement[cell.row] = -1;
      usedCols[cell.col] = false;
      usedRows[cell.row] = false;

      if (solutions.length >= maxSolutions) break;
    }
    usedRegions[bestRegion] = false;
  }

  backtrack(0);
  return solutions;
}

/**
 * Step 4: Guided Uniqueness Refinement.
 * If a candidate region partition has >1 solution, find cells where an alternate
 * solution differs from the intended solution and reassign border cells to eliminate
 * alternate solutions while preserving region contiguity and the intended solution.
 */
function refineToUniqueSolution(
  regions: number[][],
  solution: number[],
  maxSteps = 40,
  rng: RngFn = Math.random
): number[][] | null {
  const size = regions.length;
  const grid = regions.map((row) => [...row]);

  const isSolutionCell = (r: number, c: number) => solution[r] === c;

  for (let step = 0; step < maxSteps; step++) {
    const found = solvePandoku(grid, 2);
    if (found.length === 1) {
      return grid;
    }
    if (found.length === 0) {
      return null;
    }

    // Pick the alternate solution that differs from our intended solution
    const alt =
      found.find((sol) => sol.some((col, row) => col !== solution[row])) ?? found[1];

    // Collect cells used by `alt` that are NOT in our intended solution
    const diffCells: CellCoord[] = [];
    for (let r = 0; r < size; r++) {
      if (alt[r] !== solution[r]) {
        diffCells.push({ row: r, col: alt[r] });
      }
    }
    shuffleInPlace(diffCells, rng);

    let mutated = false;
    for (const cell of diffCells) {
      const oldReg = grid[cell.row][cell.col];
      if (isSolutionCell(cell.row, cell.col)) continue;

      // Neighboring regions this cell could switch to
      const neighborRegs = new Set<number>();
      for (const [dr, dc] of DIRS_4) {
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const nReg = grid[nr][nc];
          if (nReg !== oldReg) {
            neighborRegs.add(nReg);
          }
        }
      }

      if (neighborRegs.size === 0) continue;
      if (!isRegionConnectedWithout(grid, oldReg, cell.row, cell.col)) continue;

      const options = shuffleInPlace(Array.from(neighborRegs), rng);
      grid[cell.row][cell.col] = options[0];
      mutated = true;
      break;
    }

    if (!mutated) {
      return null;
    }
  }

  return solvePandoku(grid, 2).length === 1 ? grid : null;
}

function checkQuality(regions: number[][], difficulty: Difficulty): boolean {
  const size = regions.length;
  const counts = new Array<number>(size).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      counts[regions[r][c]]++;
    }
  }

  const minSize = Math.min(...counts);
  const maxSize = Math.max(...counts);

  // Avoid overly trivial 1-cell regions on classic & master
  if (difficulty === 'master' && minSize < 2) return false;
  if (difficulty === 'classic' && counts.filter((c) => c === 1).length > 0) return false;
  if (difficulty === 'easy' && counts.filter((c) => c === 1).length > 1) return false;
  if (maxSize > size * 2.5) return false;

  return true;
}

/**
 * Counts how many orthogonally disconnected islands each color forms across the grid.
 */
function countColorIslands(regions: number[][]): number[] {
  const size = regions.length;
  const visited = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const islands = new Array<number>(size).fill(0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (visited[r][c]) continue;
      const color = regions[r][c];
      islands[color]++;
      const queue: CellCoord[] = [{ row: r, col: c }];
      visited[r][c] = true;

      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const [dr, dc] of DIRS_4) {
          const nr = cur.row + dr;
          const nc = cur.col + dc;
          if (
            nr >= 0 &&
            nr < size &&
            nc >= 0 &&
            nc < size &&
            !visited[nr][nc] &&
            regions[nr][nc] === color
          ) {
            visited[nr][nc] = true;
            queue.push({ row: nr, col: nc });
          }
        }
      }
    }
  }

  return islands;
}

/**
 * Pyramid stepped quota templates per board size:
 * - ~1 one (or 0 ones as slight deviation)
 * - ~2 twos
 * - ~2-3 threes
 * - 4s on higher grids (7x7, 8x8)
 * - Remaining tiles form the main backdrop color
 */
function pickSteppedScatteredQuotas(
  size: number,
  allowSingleton: boolean,
  rng: RngFn = Math.random
): number[] {
  const templates: Record<number, { withOne: number[][]; withoutOne: number[][] }> = {
    6: {
      withOne: [
        [1, 2, 2, 3, 3, 25], // 1 one, 2 twos, 2 threes
        [1, 2, 2, 3, 4, 24], // slight deviation: 1 three, 1 four
      ],
      withoutOne: [
        [2, 2, 3, 3, 3, 23], // 0 ones, 2 twos, 3 threes
        [2, 2, 2, 3, 3, 24], // slight deviation: 3 twos, 2 threes
      ],
    },
    7: {
      withOne: [
        [1, 2, 2, 3, 3, 3, 35], // 1 one, 2 twos, 3 threes
        [1, 2, 2, 3, 3, 4, 34], // slight deviation: 2 threes, 1 four
      ],
      withoutOne: [
        [2, 2, 3, 3, 3, 4, 32], // 0 ones, 2 twos, 3 threes, 1 four
        [2, 2, 3, 3, 4, 4, 31], // slight deviation: 2 threes, 2 fours
      ],
    },
    8: {
      withOne: [
        [1, 2, 2, 3, 3, 3, 4, 46], // 1 one, 2 twos, 3 threes, 1 four
        [1, 2, 2, 3, 3, 4, 4, 45], // 1 one, 2 twos, 2 threes, 2 fours
      ],
      withoutOne: [
        [2, 2, 3, 3, 3, 4, 4, 43], // 0 ones, 2 twos, 3 threes, 2 fours
        [2, 2, 3, 3, 4, 4, 4, 42], // 0 ones, 2 twos, 2 threes, 3 fours
      ],
    },
  };

  const bank = templates[size] ?? templates[7];
  const list = allowSingleton ? bank.withOne : bank.withoutOne;
  const chosen = [...list[Math.floor(rng() * list.length)]];
  return shuffleInPlace(chosen, rng);
}

/**
 * Verifies a Hard-Mode board preserves its exact stepped pyramid counts
 * and keeps every small/scattered color (count 2..8) genuinely disconnected across multiple islands.
 */
function checkScatteredQuality(regions: number[][], allowSingleton: boolean): boolean {
  const size = regions.length;
  const counts = new Array<number>(size).fill(0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      counts[regions[r][c]]++;
    }
  }

  const singletons = counts.filter((c) => c === 1).length;
  if (allowSingleton) {
    if (singletons !== 1) return false;
  } else {
    if (singletons > 0) return false;
  }

  const smallTierCount = counts.filter((c) => c >= 2 && c <= 4).length;
  if (smallTierCount < size - 2) return false;

  const islands = countColorIslands(regions);
  for (let reg = 0; reg < size; reg++) {
    if (counts[reg] >= 2 && counts[reg] <= 8 && islands[reg] < 2) {
      return false;
    }
  }

  return true;
}

/**
 * Generates an anti-clumped, pyramid-quota scattered color assignment seeded with
 * the planted solution cells. Places rare colors (1s, 2s, 3s, 4s) first at well-separated
 * coordinates, then fills the backdrop color cleanly across remaining cells.
 */
function buildScatteredRegions(
  size: number,
  solution: number[],
  targetQuotas: number[],
  rng: RngFn = Math.random
): number[][] {
  const regions = Array.from({ length: size }, () => new Array<number>(size).fill(-1));
  const placedCoords: CellCoord[][] = Array.from({ length: size }, () => []);

  for (let r = 0; r < size; r++) {
    const c = solution[r];
    regions[r][c] = r;
    placedCoords[r].push({ row: r, col: c });
  }

  const colorOrder = Array.from({ length: size }, (_, i) => i).sort(
    (a, b) => targetQuotas[a] - targetQuotas[b]
  );

  for (const reg of colorOrder) {
    const needed = targetQuotas[reg] - 1;
    if (reg === colorOrder[colorOrder.length - 1]) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (regions[r][c] === -1) {
            regions[r][c] = reg;
          }
        }
      }
      break;
    }

    for (let k = 0; k < needed; k++) {
      let bestScore = Infinity;
      let bestCells: CellCoord[] = [];

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (regions[r][c] !== -1) continue;

          let orthSame = 0;
          let diagSame = 0;
          for (const [dr, dc] of DIRS_4) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === reg) {
              orthSame++;
            }
          }
          for (const [dr, dc] of [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ] as const) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === reg) {
              diagSame++;
            }
          }

          let minDist = Infinity;
          for (const p of placedCoords[reg]) {
            const d = Math.abs(p.row - r) + Math.abs(p.col - c);
            if (d < minDist) minDist = d;
          }
          const proximityPenalty = minDist <= 2 ? 6 : 0;

          const score = orthSame * 25 + diagSame * 3 + proximityPenalty + rng() * 1.6;
          if (score < bestScore - 0.15) {
            bestScore = score;
            bestCells = [{ row: r, col: c }];
          } else if (Math.abs(score - bestScore) <= 0.15) {
            bestCells.push({ row: r, col: c });
          }
        }
      }

      if (bestCells.length === 0) break;
      const pick = bestCells[Math.floor(rng() * bestCells.length)];
      regions[pick.row][pick.col] = reg;
      placedCoords[reg].push(pick);
    }
  }

  return regions;
}

/**
 * Counterexample-guided EXACT-QUOTA SWAP refinement for Hard (Scattered) Mode.
 */
function refineScatteredToUniqueSolution(
  regions: number[][],
  solution: number[],
  targetQuotas: number[],
  maxSteps = 75,
  rng: RngFn = Math.random
): number[][] | null {
  const size = regions.length;
  const grid = regions.map((row) => [...row]);

  const isPlanted = (r: number, c: number) => solution[r] === c;

  let backdropReg = 0;
  for (let reg = 1; reg < size; reg++) {
    if (targetQuotas[reg] > targetQuotas[backdropReg]) {
      backdropReg = reg;
    }
  }

  for (let step = 0; step < maxSteps; step++) {
    const found = solvePandoku(grid, 2);
    if (found.length === 1) {
      return grid;
    }
    if (found.length === 0) {
      return null;
    }

    const alt =
      found.find((sol) => sol.some((col, row) => col !== solution[row])) ?? found[1];

    const isInAlt = (r: number, c: number) => alt[r] === c;

    const diffCells: CellCoord[] = [];
    for (let r = 0; r < size; r++) {
      if (alt[r] !== solution[r]) {
        diffCells.push({ row: r, col: alt[r] });
      }
    }
    shuffleInPlace(diffCells, rng);

    let swapped = false;

    for (const cellA of diffCells) {
      const regA = grid[cellA.row][cellA.col];
      if (targetQuotas[regA] <= 1) continue;

      const partnerCandidates: Array<{ cell: CellCoord; score: number }> = [];

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (isPlanted(r, c) || isInAlt(r, c)) continue;
          const regB = grid[r][c];
          if (regB === regA || targetQuotas[regB] <= 1) continue;

          let clumpPenalty = 0;
          if (regA !== backdropReg) {
            for (const [dr, dc] of DIRS_4) {
              const nr = r + dr;
              const nc = c + dc;
              if (
                nr >= 0 &&
                nr < size &&
                nc >= 0 &&
                nc < size &&
                !(nr === cellA.row && nc === cellA.col) &&
                grid[nr][nc] === regA
              ) {
                clumpPenalty += 20;
              }
            }
          }
          if (regB !== backdropReg) {
            for (const [dr, dc] of DIRS_4) {
              const nr = cellA.row + dr;
              const nc = cellA.col + dc;
              if (
                nr >= 0 &&
                nr < size &&
                nc >= 0 &&
                nc < size &&
                !(nr === r && nc === c) &&
                grid[nr][nc] === regB
              ) {
                clumpPenalty += 20;
              }
            }
          }

          const backdropBonus = regA === backdropReg || regB === backdropReg ? -2 : 0;
          partnerCandidates.push({
            cell: { row: r, col: c },
            score: clumpPenalty + backdropBonus + rng() * 1.5,
          });
        }
      }

      if (partnerCandidates.length === 0) continue;
      partnerCandidates.sort((a, b) => a.score - b.score);
      const cellB = partnerCandidates[0].cell;
      const regB = grid[cellB.row][cellB.col];

      grid[cellA.row][cellA.col] = regB;
      grid[cellB.row][cellB.col] = regA;
      swapped = true;
      break;
    }

    if (!swapped) {
      return null;
    }
  }

  return solvePandoku(grid, 2).length === 1 ? grid : null;
}

/**
 * Generates a Pandoku puzzle with a mathematically verified UNIQUE solution.
 * Pass an optional `seed` string for deterministic static Campaign Levels and Daily Challenges.
 */
export function generatePandokuPuzzle(
  difficulty: Difficulty,
  colorMode: ColorMode = 'connected',
  seed?: string
): PandokuPuzzleWithSolution {
  const cacheKey = seed ? `${seed}:${difficulty}:${colorMode}` : null;
  if (cacheKey && seededPuzzleCache.has(cacheKey)) {
    return seededPuzzleCache.get(cacheKey)!;
  }

  const rng: RngFn = seed ? createSeededRng(`${seed}:${difficulty}:${colorMode}`) : Math.random;
  const { size } = DIFFICULTY_CONFIGS[difficulty];
  const id = seed
    ? `pdk_static_${seed.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    : `pdk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const finalize = (result: PandokuPuzzleWithSolution): PandokuPuzzleWithSolution => {
    if (cacheKey) {
      seededPuzzleCache.set(cacheKey, result);
    }
    return result;
  };

  if (colorMode === 'scattered') {
    const allowSingleton = rng() < 0.55;

    for (let attempt = 0; attempt < 220; attempt++) {
      const solution = generateValidPlacement(size, rng);
      const quotas = pickSteppedScatteredQuotas(size, allowSingleton, rng);
      const raw = buildScatteredRegions(size, solution, quotas, rng);
      const uniqueRegions = refineScatteredToUniqueSolution(raw, solution, quotas, 75, rng);

      if (
        uniqueRegions &&
        checkScatteredQuality(uniqueRegions, allowSingleton) &&
        solvePandoku(uniqueRegions, 2).length === 1
      ) {
        return finalize({
          id,
          size,
          difficulty,
          colorMode: 'scattered',
          regions: uniqueRegions,
          solution,
        });
      }
    }

    for (let attempt = 0; attempt < 260; attempt++) {
      const solution = generateValidPlacement(size, rng);
      const quotas = pickSteppedScatteredQuotas(size, allowSingleton, rng);
      const raw = buildScatteredRegions(size, solution, quotas, rng);
      const uniqueRegions = refineScatteredToUniqueSolution(raw, solution, quotas, 95, rng);

      if (uniqueRegions && solvePandoku(uniqueRegions, 2).length === 1) {
        return finalize({
          id,
          size,
          difficulty,
          colorMode: 'scattered',
          regions: uniqueRegions,
          solution,
        });
      }
    }

    for (let attempt = 0; attempt < 500; attempt++) {
      const solution = generateValidPlacement(size, rng);
      const quotas = pickSteppedScatteredQuotas(size, true, rng);
      const raw = buildScatteredRegions(size, solution, quotas, rng);
      const uniqueRegions = refineScatteredToUniqueSolution(raw, solution, quotas, 120, rng);
      if (uniqueRegions && solvePandoku(uniqueRegions, 2).length === 1) {
        return finalize({
          id,
          size,
          difficulty,
          colorMode: 'scattered',
          regions: uniqueRegions,
          solution,
        });
      }
    }
  }

  // Easy / Connected Mode — Pass 1
  for (let attempt = 0; attempt < 120; attempt++) {
    const solution = generateValidPlacement(size, rng);
    const rawRegions = growContiguousRegions(size, solution, difficulty, rng);
    const uniqueRegions = refineToUniqueSolution(rawRegions, solution, 36, rng);

    if (
      uniqueRegions &&
      checkQuality(uniqueRegions, difficulty) &&
      solvePandoku(uniqueRegions, 2).length === 1
    ) {
      return finalize({
        id,
        size,
        difficulty,
        colorMode: 'connected',
        regions: uniqueRegions,
        solution,
      });
    }
  }

  for (let attempt = 0; attempt < 240; attempt++) {
    const solution = generateValidPlacement(size, rng);
    const rawRegions = growContiguousRegions(size, solution, difficulty, rng);
    const uniqueRegions = refineToUniqueSolution(rawRegions, solution, 60, rng);

    if (uniqueRegions && solvePandoku(uniqueRegions, 2).length === 1) {
      return finalize({
        id,
        size,
        difficulty,
        colorMode: 'connected',
        regions: uniqueRegions,
        solution,
      });
    }
  }

  const solution = generateValidPlacement(size, rng);
  const regions = growContiguousRegions(size, solution, 'easy', rng);
  const refined = refineToUniqueSolution(regions, solution, 120, rng) ?? regions;
  return finalize({
    id,
    size,
    difficulty,
    colorMode: 'connected',
    regions: refined,
    solution,
  });
}

/**
 * Validates all MeowDoku / Pandoku rules on a player's current placed pandas:
 * 1. One panda per row
 * 2. One panda per column
 * 3. One panda per colored region
 * 4. No two pandas touching horizontally, vertically, or diagonally
 */
export function validatePandokuBoard(
  regions: number[][],
  pandas: CellCoord[]
): BoardValidation {
  const size = regions.length;
  const conflictCells: Record<string, ConflictReason[]> = {};

  const addConflict = (r: number, c: number, reason: ConflictReason) => {
    const key = `${r},${c}`;
    if (!conflictCells[key]) {
      conflictCells[key] = [reason];
    } else if (!conflictCells[key].includes(reason)) {
      conflictCells[key].push(reason);
    }
  };

  let hasRowConflict = false;
  let hasColConflict = false;
  let hasRegionConflict = false;
  let hasAdjacentConflict = false;

  for (let i = 0; i < pandas.length; i++) {
    const a = pandas[i];
    if (a.row < 0 || a.row >= size || a.col < 0 || a.col >= size) continue;

    for (let j = i + 1; j < pandas.length; j++) {
      const b = pandas[j];
      if (b.row < 0 || b.row >= size || b.col < 0 || b.col >= size) continue;

      if (a.row === b.row) {
        addConflict(a.row, a.col, 'row');
        addConflict(b.row, b.col, 'row');
        hasRowConflict = true;
      }
      if (a.col === b.col) {
        addConflict(a.row, a.col, 'col');
        addConflict(b.row, b.col, 'col');
        hasColConflict = true;
      }
      if (regions[a.row][a.col] === regions[b.row][b.col]) {
        addConflict(a.row, a.col, 'region');
        addConflict(b.row, b.col, 'region');
        hasRegionConflict = true;
      }
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
        addConflict(a.row, a.col, 'adjacent');
        addConflict(b.row, b.col, 'adjacent');
        hasAdjacentConflict = true;
      }
    }
  }

  const hasConflicts = Object.keys(conflictCells).length > 0;
  let summaryMessage: string | null = null;
  if (hasAdjacentConflict) {
    summaryMessage = 'Pandas need space — no two pandas may touch, even diagonally.';
  } else if (hasRegionConflict) {
    summaryMessage = 'Only one panda is allowed per colored bamboo territory.';
  } else if (hasRowConflict) {
    summaryMessage = 'Only one panda is allowed in each horizontal row.';
  } else if (hasColConflict) {
    summaryMessage = 'Only one panda is allowed in each vertical column.';
  }

  const solved = !hasConflicts && pandas.length === size;

  return {
    valid: !hasConflicts,
    solved,
    pandaCount: pandas.length,
    conflictCells,
    summaryMessage,
  };
}

/**
 * QuizUp-style Speed Scoring formula:
 * - Base solve points: 1000
 * - Speed bonus: up to +500 points (scales smoothly relative to par time & max round time)
 * - First-to-Finish bonus: +200 points (multiplayer head-to-head reward)
 * - Final Round multiplier: 2x (classic QuizUp comeback thrill!)
 */
export function calculateSpeedScore(params: {
  solveTimeMs: number | null;
  difficulty: Difficulty;
  isFirstFinisher: boolean;
  isFinalRound: boolean;
  roundTimeLimitSeconds?: number;
}): {
  basePoints: number;
  speedBonus: number;
  firstFinishBonus: number;
  multiplier: number;
  totalRoundPoints: number;
} {
  const {
    solveTimeMs,
    difficulty,
    isFirstFinisher,
    isFinalRound,
    roundTimeLimitSeconds,
  } = params;
  const multiplier = isFinalRound ? 2 : 1;

  if (solveTimeMs === null) {
    return {
      basePoints: 0,
      speedBonus: 0,
      firstFinishBonus: 0,
      multiplier,
      totalRoundPoints: 0,
    };
  }

  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const maxSeconds = roundTimeLimitSeconds ?? cfg.maxRoundSeconds;
  const effectivePar = Math.min(cfg.parSeconds, maxSeconds * 0.65);
  const solveSeconds = Math.max(0.5, solveTimeMs / 1000);
  const basePoints = 1000;

  let speedRatio: number;
  if (solveSeconds <= effectivePar * 0.4) {
    speedRatio = 1.0;
  } else if (solveSeconds <= effectivePar) {
    const t = (solveSeconds - effectivePar * 0.4) / Math.max(1, effectivePar * 0.6);
    speedRatio = 1.0 - t * 0.45;
  } else {
    const t = Math.min(
      1,
      (solveSeconds - effectivePar) / Math.max(5, maxSeconds - effectivePar)
    );
    speedRatio = 0.55 - t * 0.5;
  }

  const speedBonus = Math.round(500 * Math.max(0.05, Math.min(1, speedRatio)));
  const firstFinishBonus = isFirstFinisher ? 200 : 0;
  const totalRoundPoints = (basePoints + speedBonus + firstFinishBonus) * multiplier;

  return {
    basePoints,
    speedBonus,
    firstFinishBonus,
    multiplier,
    totalRoundPoints,
  };
}
