export interface Dance {
  id: number;
  recital_group: 'A' | 'B' | 'C' | 'T' | 'B' | null;
  class_time: string;
  dance: string;
  choreography: string;
  song: string;
  artist: string;
  spectapular: 0 | 1;
}

export interface Dancer {
  name: string;
}

export interface DanceDancer {
  dance_id: number;
  dancer: string;
}

export interface RecitalGroupOrder {
  recital_id: 1 | 2 | 3 | null;
  dance_id: number;
  follows_dance_id: number | null;
}

export interface Recital {
  id: 1 | 2 | 3;
  recital_group_part_1: 'A' | 'B' | 'C' | null;
  recital_group_part_2: 'A' | 'B' | 'C' | null;
}

export interface RecitalDanceInstance {
  overall_show_order: number;
  recital_id: 1 | 2 | 3;
  recital_description: string;
  recital_part: 1 | 2;
  recital_group: 'A' | 'B' | 'C' | 'Finale' | 'Hip Hop' | 'SpecTAPular';
  dacne_id: number;
  dance_style:
    | 'All'
    | 'Ballet'
    | 'Hip Hop'
    | 'Jazz'
    | 'Modern/Lyrical'
    | 'Musical Theater'
    | 'Tap'
    | 'PREDANCE';
  dance_name: string;
  choreography: `M${'r' | 's'}. ${string}`;
  song: string;
  artist: string;
  dancer_list: string[];
  common_with_next: string[];
  common_with_next2: string[];
  next_dance_id: number | 'PRE' | null;
  next2_dance_id: number | 'PRE' | null;
  dancer_count: number | null;
}
