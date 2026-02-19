export interface Dance {
  id: number;
  recital_group: 1 | 2 | 3 | 'T' | 'B' | null;
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
  recital_id: 'A' | 'B' | 'C' | null;
  dance_id: number;
  follows_dance_id: number | null;
}

export interface Recital {
  id: 'A' | 'B' | 'C';
  recital_group_part_1: 1 | 2 | 3 | null;
  recital_group_part_2: 1 | 2 | 3 | null;
}

export interface RecitalDanceInstance {
  recital: 'A' | 'B' | 'C' | null;
  recital_description: string;
  part: 1 | 2 | null;
  recital_group: 1 | 2 | 3 | 'T' | 'B' | null;
  dance_style:
    | 'Acro'
    | 'Ballet'
    | 'Lyrical/Modern'
    | 'Jazz'
    | 'Musical Theater'
    | 'Tap'
    | 'BABY DANCE';
  dance: string;
  song: string;
  artist: string;
  dancers: string[];
  choreography: `Ms. ${string}`;
  id: number | null;
  follows_dance_id: number | null;
  dancer_count: number | null;
  level: number;
}
