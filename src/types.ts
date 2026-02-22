export type DanceStyle = 'All' | 'Ballet' | 'Hip Hop' | 'Jazz' | 'Modern/Lyrical' | 'Musical Theater' | 'Tap' | 'PREDANCE';
export type GroupName = 'A' | 'B' | 'C';

export interface DanceRow {
  dance_id: number;
  dance_style: DanceStyle;
  dance_name: string;
  choreography: string;
  song: string;
  artist: string;
}

export interface RecitalGroupRow {
  recital_group: GroupName;
  show_order: (number | 'PRE')[];
}

export interface RecitalDanceInstance {
  overall_show_order: number;
  recital_id: 1 | 2 | 3;
  recital_part: 1 | 2;
  recital_group: GroupName | 'Finale' | 'Hip Hop' | 'SpecTAPular';
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

export interface GroupOrders {
  A: (number | 'PRE')[];
  B: (number | 'PRE')[];
  C: (number | 'PRE')[];
}

// Show structure: which groups are in each show
export const SHOW_STRUCTURE: { recital_id: number; label: string; parts: [GroupName, GroupName] }[] = [
  { recital_id: 1, label: 'Friday Evening', parts: ['A', 'B'] },
  { recital_id: 2, label: 'Saturday Morning', parts: ['C', 'A'] },
  { recital_id: 3, label: 'Saturday Afternoon', parts: ['B', 'C'] },
];

// Fixed dance IDs
export const SPECTAPULAR_ID = 1;
export const HIPHOP_ID = 2;
export const FINALE_ID = 41;
