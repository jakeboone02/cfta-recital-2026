export type DanceStyle =
  | 'All'
  | 'Ballet'
  | 'Hip Hop'
  | 'Jazz'
  | 'Modern/Lyrical'
  | 'Musical Theater'
  | 'Tap'
  | 'PLACEHOLDER';

export interface DanceRow {
  dance_id: number;
  dance_style: DanceStyle;
  dance_name: string;
  choreography: string;
  song: string;
  artist: string;
  skip_overlap_checks: number;
  exclude_teachers: number;
}

export interface RecitalGroupRow {
  recital_group: string;
  show_order: (number | 'PLACEHOLDER')[];
  has_fixed_order: number;
}

export interface ShowRow {
  show_id: number;
  group_order: string[];
  show_description: string;
  show_time: string;
}

export interface ShowDanceInstance {
  overall_show_order: number;
  show_id: number;
  show_part: number;
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

export type GroupOrders = Record<string, (number | 'PLACEHOLDER')[]>;

export interface ShowStructureEntry {
  show_id: number;
  label: string;
  parts: string[];
}

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
