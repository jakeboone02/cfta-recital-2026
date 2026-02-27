export type DanceStyle =
  | 'All'
  | 'Ballet'
  | 'Hip Hop'
  | 'Jazz'
  | 'Modern/Lyrical'
  | 'Musical Theater'
  | 'Tap'
  | 'PREDANCE';

export interface DanceRow {
  dance_id: number;
  dance_style: DanceStyle;
  dance_name: string;
  choreography: string;
  song: string;
  artist: string;
}

export interface RecitalGroupRow {
  recital_group: string;
  show_order: (number | 'PRE')[];
}

export interface RecitalRow {
  recital_id: number;
  group_order: string[];
  recital_description: string;
  recital_time: string;
}

export interface RecitalDanceInstance {
  overall_show_order: number;
  recital_id: number;
  recital_part: number;
  recital_group: string;
  order_in_group: number;
  dance_id: number | null;
  dance_style: DanceStyle;
  dance_name: string;
  choreography: string;
  song: string;
  artist: string;
  next_dance_id: number | null;
  next2_dance_id: number | null;
  dancer_list: string[];
  common_with_next: string[];
  common_with_next2: string[];
}

export type DanceMap = Record<number, DanceRow>;

export type GroupOrders = Record<string, (number | 'PRE')[]>;

export interface ShowStructureEntry {
  recital_id: number;
  label: string;
  parts: string[];
}

// Fixed dance IDs
export const SPECTAPULAR_ID = 1;
export const HIPHOP_ID = 2;
export const FINALE_ID = 41;

export interface ComboPair {
  dance_id_1: number;
  dance_id_2: number;
}

/** Build a map: dance_id → sibling dance_id for combo classes */
export const buildComboSiblingMap = (pairs: ComboPair[]): Record<number, number> => {
  const map: Record<number, number> = {};
  for (const p of pairs) {
    map[p.dance_id_1] = p.dance_id_2;
    map[p.dance_id_2] = p.dance_id_1;
  }
  return map;
};
