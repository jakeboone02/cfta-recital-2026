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
  recital: 1 | 2 | 3 | null;
  recital_description: string;
  part: 1 | 2 | null;
  recital_group: 'A' | 'B' | 'C' | null;
  dance_style:
    | 'Ballet'
    | 'Hip Hop'
    | 'Jazz'
    | 'Modern/Lyrical'
    | 'Musical Theater'
    | 'Tap'
    | 'PREDANCE';
  dance: string;
  song: string;
  artist: string;
  dancers: string[];
  choreography: `M${'r' | 's'}. ${string}`;
  id: number | null;
  follows_dance_id: number | null;
  dancer_count: number | null;
  level: number;
}
