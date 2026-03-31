import type {
  DanceData,
  ScoreBreakdown,
  ScoreResult,
  ShowPart,
  ShowScoreDetail,
  Solution,
} from './types';
import { COMBO_MIN_GAP, COMBO_PREFERRED_GAP } from './types';

// Penalty weights
const W_INVALID_SIZE = 100_000; // hard constraint: groups must be 10-11
const W_CONSECUTIVE = 1000;
const W_NEAR_CONSECUTIVE = 200;
const W_SAME_STYLE = 50;
const W_BABY_ADJACENT = 100; // any baby (PLACEHOLDER or combo) adjacent to another baby
const W_BABY_AT_END = 80; // baby dance (PLACEHOLDER or combo) at the end of a group
const W_COMBO_TOO_CLOSE = 25;
const W_FAMILY_IMBALANCE = 5;
const W_PLACEHOLDER_TOO_CLOSE = 50; // two PLACEHOLDER entries in same group < 2 dances apart
const W_STYLE_IMBALANCE = 100; // uneven distribution of styles across groups

/** Precomputed data needed for scoring */
export interface ScoringContext {
  /** dance_id → set of dancer names */
  dancerSets: Map<number, Set<string>>;
  /** dance_id → DanceData */
  danceInfo: Map<number, DanceData>;
  /** combo sibling map: dance_id → sibling dance_id */
  comboSiblings: Map<number, number>;
  /** Set of combo dance IDs */
  comboDanceIds: Set<number>;
  /** Combo pairs for gap checking */
  comboPairs: [number, number][];
  /** Group names that participate in optimization (has_fixed_order = 0) */
  editableGroupNames: string[];
  /** All group names */
  groupNames: string[];
  /** Show structure: which groups compose each show */
  showParts: ShowPart[];
  /** Dance IDs that should skip overlap checks */
  skipOverlapDances: Set<number>;
}

export const buildScoringContext = (
  dances: DanceData[],
  dancersByDance: Map<number, string[]>,
  groupNames: string[],
  showParts: ShowPart[],
  comboPairs: [number, number][],
  fixedOrderGroups: Set<string>
): ScoringContext => {
  const dancerSets = new Map<number, Set<string>>();
  for (const [id, dancers] of dancersByDance) {
    dancerSets.set(id, new Set(dancers));
  }

  const danceInfo = new Map<number, DanceData>();
  for (const d of dances) danceInfo.set(d.danceId, d);

  const comboSiblings = new Map<number, number>();
  const comboDanceIds = new Set<number>();
  for (const [a, b] of comboPairs) {
    comboSiblings.set(a, b);
    comboSiblings.set(b, a);
    comboDanceIds.add(a);
    comboDanceIds.add(b);
  }

  const skipOverlapDances = new Set<number>();
  for (const d of dances) {
    if (d.skipOverlapChecks) skipOverlapDances.add(d.danceId);
  }

  const editableGroupNames = groupNames.filter(g => !fixedOrderGroups.has(g));

  return {
    dancerSets,
    danceInfo,
    comboSiblings,
    comboDanceIds,
    comboPairs,
    editableGroupNames,
    groupNames,
    showParts,
    skipOverlapDances,
  };
};

/** Get the style of a dance entry */
const getStyle = (id: number | 'PLACEHOLDER', ctx: ScoringContext): string => {
  if (id === 'PLACEHOLDER') return 'PLACEHOLDER';
  return ctx.danceInfo.get(id)?.danceStyle ?? 'Unknown';
};

const getName = (id: number | 'PLACEHOLDER', ctx: ScoringContext): string => {
  if (id === 'PLACEHOLDER') return 'PLACEHOLDER';
  return ctx.danceInfo.get(id)?.danceName ?? `Dance ${id}`;
};

/** Check how many dancers overlap between two dance IDs */
const dancerOverlap = (
  a: number | 'PLACEHOLDER',
  b: number | 'PLACEHOLDER',
  ctx: ScoringContext
): string[] => {
  if (a === 'PLACEHOLDER' || b === 'PLACEHOLDER') return [];
  const setA = ctx.dancerSets.get(a);
  const setB = ctx.dancerSets.get(b);
  if (!setA || !setB) return [];
  const overlap: string[] = [];
  for (const d of setA) {
    if (setB.has(d)) overlap.push(d);
  }
  return overlap;
};

const isBaby = (id: number | 'PLACEHOLDER'): boolean => {
  return id === 'PLACEHOLDER';
};

const isCombo = (id: number | 'PLACEHOLDER', ctx: ScoringContext): boolean => {
  return typeof id === 'number' && ctx.comboDanceIds.has(id);
};

/** Build full show dance sequence for one show */
const buildShowSequence = (solution: Solution, groups: string[]): (number | 'PLACEHOLDER')[] => {
  return groups.flatMap(g => solution[g] ?? []);
};

/** Score a solution against all constraints */
export const scoreSolution = (solution: Solution, ctx: ScoringContext): ScoreResult => {
  const breakdown: ScoreBreakdown = {
    invalidGroupSize: 0,
    consecutiveDancers: 0,
    nearConsecutiveDancers: 0,
    sameStyleAdjacent: 0,
    babyAdjacent: 0,
    babyAtGroupEnd: 0,
    comboPairTooClose: 0,
    familyImbalance: 0,
    placeholderTooClose: 0,
    styleImbalance: 0,
  };
  const details: ShowScoreDetail[] = [];

  // --- Group size constraint (hard: 10-11 dances per group, only for editable groups) ---
  for (const g of ctx.editableGroupNames) {
    const size = solution[g]?.length ?? 0;
    if (size < 10 || size > 11) {
      breakdown.invalidGroupSize += Math.abs(size < 10 ? 10 - size : size - 11);
    }
  }

  // --- Per-show constraints (consecutive dancers, style adjacency) ---
  for (const show of ctx.showParts) {
    const seq = buildShowSequence(solution, show.groups);
    const detail: ShowScoreDetail = {
      showId: show.showId,
      consecutivePairs: [],
      nearConsecutivePairs: [],
      sameStylePairs: [],
    };

    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i];
      const b = seq[i + 1];

      // Skip overlap checks for dances flagged with skip_overlap_checks
      if (typeof a === 'number' && ctx.skipOverlapDances.has(a)) continue;
      if (typeof b === 'number' && ctx.skipOverlapDances.has(b)) continue;

      // Constraint 1: Consecutive dancer overlap
      const overlap = dancerOverlap(a, b, ctx);
      if (overlap.length > 0) {
        breakdown.consecutiveDancers += overlap.length;
        detail.consecutivePairs.push({
          dance1: getName(a, ctx),
          dance2: getName(b, ctx),
          dancers: overlap,
        });
      }

      // Constraint 3: Same style adjacent
      const styleA = getStyle(a, ctx);
      const styleB = getStyle(b, ctx);
      if (styleA === styleB && styleA !== 'PLACEHOLDER' && styleA !== 'All') {
        breakdown.sameStyleAdjacent++;
        detail.sameStylePairs.push({
          dance1: getName(a, ctx),
          dance2: getName(b, ctx),
          style: styleA,
        });
      }
    }

    // Constraint 2: Near-consecutive (gap of 1)
    for (let i = 0; i < seq.length - 2; i++) {
      const a = seq[i];
      const c = seq[i + 2];
      if (typeof a === 'number' && ctx.skipOverlapDances.has(a)) continue;
      if (typeof c === 'number' && ctx.skipOverlapDances.has(c)) continue;
      const overlap = dancerOverlap(a, c, ctx);
      if (overlap.length > 0) {
        breakdown.nearConsecutiveDancers += overlap.length;
        detail.nearConsecutivePairs.push({
          dance1: getName(a, ctx),
          dance3: getName(c, ctx),
          dancers: overlap,
        });
      }
    }

    details.push(detail);
  }

  // --- Per-group constraints (only for editable groups) ---
  for (const g of ctx.editableGroupNames) {
    const order = solution[g] ?? [];

    // Constraint 4a: Any baby dance (PLACEHOLDER or combo) adjacent to another baby dance
    for (let i = 0; i < order.length - 1; i++) {
      const aIsBaby = isBaby(order[i]) || isCombo(order[i], ctx);
      const bIsBaby = isBaby(order[i + 1]) || isCombo(order[i + 1], ctx);
      if (aIsBaby && bIsBaby) {
        breakdown.babyAdjacent++;
      }
    }

    // Constraint 4b: Baby dance (PLACEHOLDER or combo) at group end
    if (order.length > 0) {
      const last = order[order.length - 1];
      if (isBaby(last) || isCombo(last, ctx)) {
        breakdown.babyAtGroupEnd++;
      }
    }

    // Constraint 4c: Combo pair distance within group
    for (const [ca, cb] of ctx.comboPairs) {
      const idxA = order.indexOf(ca);
      const idxB = order.indexOf(cb);
      if (idxA === -1 || idxB === -1) continue; // not both in this group
      const gap = Math.abs(idxA - idxB) - 1; // number of dances between them
      if (gap < COMBO_MIN_GAP) {
        breakdown.comboPairTooClose += COMBO_MIN_GAP - gap;
      } else if (gap < COMBO_PREFERRED_GAP) {
        // Smaller penalty for being below preferred but above minimum
        breakdown.comboPairTooClose += 0.5 * (COMBO_PREFERRED_GAP - gap);
      }
    }
    // Constraint 4d: PLACEHOLDER entries must be ≥2 dances apart
    const placeholderIndices = order.reduce<number[]>((acc, id, idx) => {
      if (id === 'PLACEHOLDER') acc.push(idx);
      return acc;
    }, []);
    for (let i = 0; i < placeholderIndices.length - 1; i++) {
      const gap = placeholderIndices[i + 1] - placeholderIndices[i] - 1;
      if (gap < 2) {
        breakdown.placeholderTooClose += 2 - gap;
      }
    }
  }

  // --- Constraint 5: Family balance (only editable groups) ---
  const familyCounts: Record<string, Set<string>> = Object.fromEntries(
    ctx.editableGroupNames.map(g => [g, new Set<string>()])
  );
  for (const g of ctx.editableGroupNames) {
    for (const id of solution[g] ?? []) {
      if (id === 'PLACEHOLDER') continue;
      const dancers = ctx.dancerSets.get(id);
      if (!dancers) continue;
      for (const name of dancers) {
        const parts = name.split(' ');
        if (parts.length > 1) familyCounts[g].add(parts[parts.length - 1]);
      }
    }
  }
  if (ctx.editableGroupNames.length > 0) {
    const sizes = ctx.editableGroupNames.map(g => familyCounts[g].size);
    breakdown.familyImbalance = Math.max(...sizes) - Math.min(...sizes);
  }

  // --- Constraint 7: Style distribution across editable groups ---
  const numGroups = ctx.editableGroupNames.length;
  if (numGroups > 0) {
    const styleCounts: Record<string, number[]> = {};
    for (let gi = 0; gi < numGroups; gi++) {
      const g = ctx.editableGroupNames[gi];
      for (const id of solution[g] ?? []) {
        if (id === 'PLACEHOLDER') continue;
        const style = ctx.danceInfo.get(id)?.danceStyle;
        if (!style || style === 'PLACEHOLDER' || style === 'All') continue;
        if (!styleCounts[style]) styleCounts[style] = new Array(numGroups).fill(0);
        styleCounts[style][gi]++;
      }
    }
    for (const counts of Object.values(styleCounts)) {
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      if (max - min > 1) {
        breakdown.styleImbalance += max - min - 1;
      }
    }
  }

  const total =
    breakdown.invalidGroupSize * W_INVALID_SIZE +
    breakdown.consecutiveDancers * W_CONSECUTIVE +
    breakdown.nearConsecutiveDancers * W_NEAR_CONSECUTIVE +
    breakdown.sameStyleAdjacent * W_SAME_STYLE +
    breakdown.babyAdjacent * W_BABY_ADJACENT +
    breakdown.babyAtGroupEnd * W_BABY_AT_END +
    breakdown.comboPairTooClose * W_COMBO_TOO_CLOSE +
    breakdown.familyImbalance * W_FAMILY_IMBALANCE +
    breakdown.placeholderTooClose * W_PLACEHOLDER_TOO_CLOSE +
    breakdown.styleImbalance * W_STYLE_IMBALANCE;

  return { total, breakdown, details };
};
