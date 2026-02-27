import type { ScoringContext } from './score';
import { scoreSolution } from './score';
import type { AnnealConfig, Solution } from './types';
import { COMBO_PAIRS, FIXED, FIXED_GROUP } from './types';

/** Deep-clone a solution */
const cloneSolution = (s: Solution, groupNames: string[]): Solution => {
  const out: Solution = {};
  for (const g of groupNames) out[g] = [...s[g]];
  return out;
};

/** Set of dance IDs that are fixed to a specific group */
const fixedDanceIds = new Set(Object.keys(FIXED_GROUP).map(Number));

/** Map from combo dance → its sibling */
const comboSiblingMap = new Map<number, number>();
for (const [a, b] of COMBO_PAIRS) {
  comboSiblingMap.set(a, b);
  comboSiblingMap.set(b, a);
}

/** Check if moving a dance out of its group would violate hard constraints */
const canLeaveGroup = (danceId: number | 'PRE'): boolean => {
  if (danceId === 'PRE') return false; // PRE placeholders stay in their group
  return !fixedDanceIds.has(danceId);
};

/** Get the fixed group for a dance ID, if any */
const getFixedGroup = (id: number | 'PRE'): string | undefined =>
  typeof id === 'number' ? FIXED_GROUP[id] : undefined;

/** Pick a random int in [0, max) */
const randInt = (max: number): number => Math.floor(Math.random() * max);

/** Pick a random element from an array */
const randPick = <T>(arr: T[]): T => arr[randInt(arr.length)];

/**
 * Generate a neighbor solution via random perturbation.
 * Moves:
 * 1. Swap two dances within the same group (most common)
 * 2. Swap dances between two groups (maintains group sizes)
 * 3. Reverse a small segment within a group
 * 4. Insert: remove and reinsert within same group
 */
const generateNeighbor = (current: Solution, ctx: ScoringContext): Solution => {
  const GROUPS = ctx.groupNames;
  const next = cloneSolution(current, GROUPS);
  const moveType = Math.random();

  if (moveType < 0.55) {
    // Within-group swap
    const g = randPick(GROUPS);
    const arr = next[g];
    if (arr.length < 2) return next;
    const i = randInt(arr.length);
    let j = randInt(arr.length - 1);
    if (j >= i) j++;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  } else if (moveType < 0.8) {
    // Cross-group swap (1-for-1) to maintain group sizes
    const g1 = randPick(GROUPS);
    const remaining = GROUPS.filter(g => g !== g1);
    const g2 = randPick(remaining);
    const arr1 = next[g1];
    const arr2 = next[g2];

    // Pick movable dances from each group (not PRE, not fixed to this group)
    const movable1 = arr1
      .map((id, idx) => ({ id, idx }))
      .filter(
        ({ id }) =>
          canLeaveGroup(id) &&
          !(getFixedGroup(id) === g2
            ? false
            : getFixedGroup(id) != null && getFixedGroup(id) !== g2)
      );
    const movable2 = arr2
      .map((id, idx) => ({ id, idx }))
      .filter(
        ({ id }) =>
          canLeaveGroup(id) &&
          !(getFixedGroup(id) === g1
            ? false
            : getFixedGroup(id) != null && getFixedGroup(id) !== g1)
      );

    // Filter: can move to the other group (check fixed group constraints)
    const canMoveTo = (id: number | 'PRE', targetGroup: string): boolean => {
      if (id === 'PRE') return false;
      if (typeof id === 'number' && FIXED_GROUP[id] && FIXED_GROUP[id] !== targetGroup)
        return false;
      const sib = comboSiblingMap.get(id);
      if (sib != null && FIXED_GROUP[sib] && FIXED_GROUP[sib] !== targetGroup) return false;
      if (sib !== undefined && FIXED_GROUP[sib] && FIXED_GROUP[sib] !== targetGroup) return false;
      return true;
    };

    const valid1 = movable1.filter(({ id }) => canMoveTo(id, g2));
    const valid2 = movable2.filter(({ id }) => canMoveTo(id, g1));

    if (valid1.length === 0 || valid2.length === 0) return next;

    const pick1 = randPick(valid1);
    const pick2 = randPick(valid2);

    // Swap the two dances
    arr1[pick1.idx] = pick2.id;
    arr2[pick2.idx] = pick1.id;

    // Handle combo siblings: if either dance has a sibling, move it too
    if (typeof pick1.id === 'number') {
      const sib = comboSiblingMap.get(pick1.id);
      if (sib !== undefined) {
        const sibIdx = arr1.indexOf(sib);
        if (sibIdx !== -1) {
          // Need to find a non-combo dance in g2 to swap with
          const swapCandidates = arr2
            .map((id, idx) => ({ id, idx }))
            .filter(
              ({ id, idx }) =>
                idx !== pick2.idx && canMoveTo(id, g1) && !comboSiblingMap.has(id as number)
            );
          if (swapCandidates.length > 0) {
            const swap2 = randPick(swapCandidates);
            arr1[sibIdx] = swap2.id;
            arr2[swap2.idx] = sib;
          }
        }
      }
    }
    if (typeof pick2.id === 'number') {
      const sib = comboSiblingMap.get(pick2.id);
      if (sib !== undefined) {
        const sibIdx = arr2.indexOf(sib);
        if (sibIdx !== -1) {
          const swapCandidates = arr1
            .map((id, idx) => ({ id, idx }))
            .filter(
              ({ id, idx }) =>
                idx !== pick1.idx && canMoveTo(id, g2) && !comboSiblingMap.has(id as number)
            );
          if (swapCandidates.length > 0) {
            const swap1 = randPick(swapCandidates);
            arr2[sibIdx] = swap1.id;
            arr1[swap1.idx] = sib;
          }
        }
      }
    }
  } else if (moveType < 0.92) {
    // Reverse a small segment within a group
    const g = randPick(GROUPS);
    const arr = next[g];
    if (arr.length < 3) return next;
    const len = 2 + randInt(Math.min(4, arr.length - 1));
    const start = randInt(arr.length - len + 1);
    const segment = arr.slice(start, start + len);
    segment.reverse();
    for (let i = 0; i < len; i++) arr[start + i] = segment[i];
  } else {
    // Insert: remove a dance and reinsert at a different position
    const g = randPick(GROUPS);
    const arr = next[g];
    if (arr.length < 2) return next;
    const fromIdx = randInt(arr.length);
    const [item] = arr.splice(fromIdx, 1);
    const toIdx = randInt(arr.length + 1);
    arr.splice(toIdx, 0, item);
  }

  return next;
};

/** Fisher-Yates shuffle in place */
const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Generate a fully randomized solution that respects hard constraints:
 * - FIXED_GROUP dances go to their required group
 * - Combo pairs stay together
 * - Each group gets the same number of PRE placeholders as the original
 * - Group sizes match the original distribution
 */
const randomizeSolution = (original: Solution, groupNames: string[]): Solution => {
  const groupSizes: Record<string, number> = {};
  const preCounts: Record<string, number> = {};
  for (const g of groupNames) {
    groupSizes[g] = original[g].length;
    preCounts[g] = original[g].filter(id => id === 'PRE').length;
  }

  // Collect all non-PRE dance IDs
  const allDances: number[] = [];
  for (const g of groupNames) {
    for (const id of original[g]) {
      if (id !== 'PRE') allDances.push(id);
    }
  }

  // Group combo pairs as units; track which dances are part of a pair
  const pairedDances = new Set<number>();
  const comboUnits: [number, number][] = [];
  for (const [a, b] of COMBO_PAIRS) {
    if (allDances.includes(a) && allDances.includes(b)) {
      comboUnits.push([a, b]);
      pairedDances.add(a);
      pairedDances.add(b);
    }
  }

  // Separate fixed and free dances (excluding combo-paired ones handled separately)
  const fixedDances: { id: number; group: string }[] = [];
  const freeDances: number[] = [];
  for (const id of allDances) {
    if (pairedDances.has(id)) continue; // handled as combo unit
    const fg = FIXED_GROUP[id];
    if (fg) {
      fixedDances.push({ id, group: fg });
    } else {
      freeDances.push(id);
    }
  }

  // Start building groups with PREs and fixed dances
  const result: Solution = {};
  for (const g of groupNames) result[g] = [];
  for (const g of groupNames) {
    for (let i = 0; i < preCounts[g]; i++) result[g].push('PRE');
  }
  for (const { id, group } of fixedDances) {
    result[group].push(id);
  }

  // Remaining capacity per group
  const capacity: Record<string, number> = {};
  for (const g of groupNames) capacity[g] = groupSizes[g] - result[g].length;

  // Place combo units randomly (need 2 slots in same group)
  shuffle(comboUnits);
  for (const [a, b] of comboUnits) {
    // Check if either dance has a fixed group
    const fgA = FIXED_GROUP[a];
    const fgB = FIXED_GROUP[b];
    const forced = fgA ?? fgB;
    const candidates = forced ? [forced] : shuffle([...groupNames]).filter(g => capacity[g] >= 2);
    if (candidates.length === 0) {
      // Fallback: put in group with most capacity
      candidates.push(
        groupNames.reduce((best, g) => (capacity[g] > capacity[best] ? g : best), groupNames[0])
      );
    }
    const g = candidates[0];
    result[g].push(a, b);
    capacity[g] -= 2;
  }

  // Distribute remaining free dances randomly across groups with capacity
  shuffle(freeDances);
  for (const id of freeDances) {
    const candidates = groupNames.filter(g => capacity[g] > 0);
    if (candidates.length === 0) {
      // Overflow: pick group with most capacity (shouldn't happen with correct sizes)
      const g = groupNames.reduce(
        (best, g) => (capacity[g] > capacity[best] ? g : best),
        groupNames[0]
      );
      result[g].push(id);
      capacity[g]--;
    } else {
      const g = randPick(candidates);
      result[g].push(id);
      capacity[g]--;
    }
  }

  // Shuffle the order within each group
  for (const g of groupNames) shuffle(result[g]);

  return result;
};

/** A scored solution for the top-N leaderboard */
export interface RankedSolution {
  solution: Solution;
  score: number;
}

/** Serialize a solution for deduplication */
const solutionKey = (s: Solution, groupNames: string[]): string =>
  JSON.stringify(groupNames.map(g => s[g]));

/** Run simulated annealing, tracking top-N unique solutions */
export const anneal = (
  initial: Solution,
  ctx: ScoringContext,
  config: AnnealConfig,
  topN: number = 10
): { topSolutions: RankedSolution[]; history: number[] } => {
  const groupNames = ctx.groupNames;
  // Start from a fully randomized solution for diversity
  let current = randomizeSolution(initial, groupNames);
  let currentScore = scoreSolution(current, ctx).total;
  let best = cloneSolution(current, groupNames);
  let bestScore = currentScore;
  const history: number[] = [currentScore];

  // Top-N tracking
  const topSolutions: RankedSolution[] = [
    { solution: cloneSolution(current, groupNames), score: currentScore },
  ];
  const seenKeys = new Set<string>([solutionKey(current, groupNames)]);

  const maybeAddToTop = (s: Solution, score: number) => {
    const key = solutionKey(s, groupNames);
    if (seenKeys.has(key)) return;
    // Only add if it's better than the worst in the list, or list isn't full
    if (topSolutions.length < topN || score < topSolutions[topSolutions.length - 1].score) {
      seenKeys.add(key);
      topSolutions.push({ solution: cloneSolution(s, groupNames), score });
      topSolutions.sort((a, b) => a.score - b.score);
      // Trim to topN
      while (topSolutions.length > topN) {
        const removed = topSolutions.pop()!;
        seenKeys.delete(solutionKey(removed.solution, groupNames));
      }
    }
  };

  let globalBest = cloneSolution(best, groupNames);
  let globalBestScore = bestScore;

  for (let restart = 0; restart <= config.restarts; restart++) {
    let temp = config.initialTemp;

    if (restart > 0) {
      // Each restart gets a fresh random solution for maximum diversity
      current = randomizeSolution(initial, groupNames);
      currentScore = scoreSolution(current, ctx).total;
      best = cloneSolution(current, groupNames);
      bestScore = currentScore;
    }

    for (let i = 0; i < config.iterations; i++) {
      const neighbor = generateNeighbor(current, ctx);
      const neighborScore = scoreSolution(neighbor, ctx).total;
      const delta = neighborScore - currentScore;

      if (delta <= 0 || Math.random() < Math.exp(-delta / temp)) {
        current = neighbor;
        currentScore = neighborScore;

        if (currentScore < bestScore) {
          best = cloneSolution(current, groupNames);
          bestScore = currentScore;
        }

        maybeAddToTop(current, currentScore);
      }

      temp *= config.coolingRate;

      if (i % 10000 === 0) {
        history.push(bestScore);
      }
    }

    if (bestScore < globalBestScore) {
      globalBest = cloneSolution(best, groupNames);
      globalBestScore = bestScore;
    }
  }

  return { topSolutions, history };
};
