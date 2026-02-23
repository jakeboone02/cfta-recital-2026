import type { GroupName } from '../types';

/** A candidate solution: group assignments + orderings */
export interface Solution {
  /** Ordered dance IDs (or 'PRE') for each group */
  A: (number | 'PRE')[];
  B: (number | 'PRE')[];
  C: (number | 'PRE')[];
}

/** Per-constraint breakdown of penalty scores */
export interface ScoreBreakdown {
  invalidGroupSize: number;
  consecutiveDancers: number;
  nearConsecutiveDancers: number;
  sameStyleAdjacent: number;
  babyAdjacent: number;
  babyAtGroupEnd: number;
  comboPairTooClose: number;
  familyImbalance: number;
}

/** Full scoring result */
export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
  /** Per-show details for debugging */
  details: ShowScoreDetail[];
}

export interface ShowScoreDetail {
  recitalId: number;
  consecutivePairs: { dance1: string; dance2: string; dancers: string[] }[];
  nearConsecutivePairs: { dance1: string; dance3: string; dancers: string[] }[];
  sameStylePairs: { dance1: string; dance2: string; style: string }[];
}

/** Dance data loaded from the database */
export interface DanceData {
  danceId: number;
  danceName: string;
  danceStyle: string;
  choreography: string;
}

/** Simulated annealing configuration */
export interface AnnealConfig {
  initialTemp: number;
  coolingRate: number;
  iterations: number;
  /** Number of restarts with best-so-far as seed */
  restarts: number;
}

/** Show structure: which groups compose each show */
export const SHOW_PARTS: { recitalId: number; part1: GroupName; part2: GroupName }[] = [
  { recitalId: 1, part1: 'A', part2: 'B' },
  { recitalId: 2, part1: 'C', part2: 'A' },
  { recitalId: 3, part1: 'B', part2: 'C' },
];

/** Fixed dances that appear in every show */
export const FIXED = {
  SPECTAPULAR: 1,
  HIPHOP: 2,
  FINALE: 41,
} as const;

/** Hard group constraints: dance_id → required group */
export const FIXED_GROUP: Partial<Record<number, GroupName>> = {
  11: 'C', // Adult Tap 1
  17: 'B', // Adult Tap 2
};

/** Combo pairs: dances from the same class that must stay in the same group */
export const COMBO_PAIRS: [number, number][] = [
  [7, 8],   // Combo Ballet/Tap Mon 4:15
  [22, 23], // Combo Ballet/Tap Tue 5:15
  [25, 26], // Combo Ballet/Tap Wed 11am
  [12, 13], // Combo Ballet/Tap Wed 2:30
];

/** Min required gap between combo pair siblings within a group */
export const COMBO_MIN_GAP = 2;
export const COMBO_PREFERRED_GAP = 3;
