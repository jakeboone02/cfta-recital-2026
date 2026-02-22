import Papa from 'papaparse';
import type { DanceMap, DanceRow, GroupName, GroupOrders, RecitalDanceInstance, SHOW_STRUCTURE } from './types';
import { SPECTAPULAR_ID, HIPHOP_ID, FINALE_ID } from './types';

const LS_KEY = 'cfta-recital-2026-group-orders';

export const loadGroupOrders = (): GroupOrders | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveGroupOrders = (orders: GroupOrders) => {
  localStorage.setItem(LS_KEY, JSON.stringify(orders));
};

export const buildDanceMap = (dances: DanceRow[]): DanceMap =>
  Object.fromEntries(dances.map(d => [d.dance_id, d]));

/** Build a lookup: dance_id → dancer_list from the API report data */
export const buildDancerLookup = (reportData: RecitalDanceInstance[]): Record<number, string[]> => {
  const map: Record<number, string[]> = {};
  for (const d of reportData) {
    if (d.dance_id != null && !map[d.dance_id]) {
      map[d.dance_id] = d.dancer_list ?? [];
    }
  }
  return map;
};

export interface ShowDance {
  dance_id: number | null;
  dance_name: string;
  dance_style: string;
  choreography: string;
  song: string;
  artist: string;
  group: GroupName | 'SpecTAPular' | 'Hip Hop' | 'Finale';
  recital_id: number;
  part: 1 | 2;
  dancers: string[];
  common_with_next: string[];
  common_with_next2: string[];
}

export interface ShowData {
  recital_id: number;
  label: string;
  dances: ShowDance[];
}

/** Compute the full show order from current group assignments */
export const computeShowOrder = (
  groups: GroupOrders,
  danceMap: DanceMap,
  dancerLookup: Record<number, string[]>,
  showStructure: typeof SHOW_STRUCTURE,
): ShowData[] => {
  const makeDance = (
    id: number | null,
    group: ShowDance['group'],
    recitalId: number,
    part: 1 | 2,
  ): ShowDance => {
    const d = id != null ? danceMap[id] : null;
    return {
      dance_id: id,
      dance_name: d?.dance_name ?? 'PREDANCE',
      dance_style: d?.dance_style ?? 'PREDANCE',
      choreography: d?.choreography ?? '???',
      song: d?.song ?? '???',
      artist: d?.artist ?? '???',
      group,
      recital_id: recitalId,
      part,
      dancers: id != null ? (dancerLookup[id] ?? []) : [],
      common_with_next: [],
      common_with_next2: [],
    };
  };

  return showStructure.map(show => {
    const [g1, g2] = show.parts;
    const dances: ShowDance[] = [
      makeDance(SPECTAPULAR_ID, 'SpecTAPular', show.recital_id, 1),
      ...groups[g1].map(id => makeDance(id === 'PRE' ? null : id, g1, show.recital_id, 1)),
      ...groups[g2].map(id => makeDance(id === 'PRE' ? null : id, g2, show.recital_id, 2)),
      makeDance(HIPHOP_ID, 'Hip Hop', show.recital_id, 2),
      makeDance(FINALE_ID, 'Finale', show.recital_id, 2),
    ];

    // Compute dancer overlap (Finale excluded from "next" calculations)
    for (let i = 0; i < dances.length; i++) {
      const curr = dances[i];
      // Find next non-Finale dance
      const next = dances[i + 1]?.dance_name !== 'Finale' ? dances[i + 1] : undefined;
      const next2 = (() => {
        let idx = i + 2;
        while (idx < dances.length && dances[idx]?.dance_name === 'Finale') idx++;
        return idx < dances.length ? dances[idx] : undefined;
      })();
      if (next) {
        curr.common_with_next = curr.dancers.filter(d => next.dancers.includes(d));
      }
      if (next2) {
        curr.common_with_next2 = curr.dancers.filter(d => next2.dancers.includes(d));
      }
    }

    return { recital_id: show.recital_id, label: show.label, dances };
  });
};

/** Export show order as CSV using papaparse */
export const exportCSV = (shows: ShowData[]): string => {
  const rows = shows.flatMap((show, _si) =>
    show.dances.map((d, di) => ({
      show: show.label,
      order: di + 1,
      group: d.group,
      part: d.part,
      dance_name: d.dance_name,
      dance_style: d.dance_style,
      choreography: d.choreography,
      song: d.song,
      artist: d.artist,
      dancer_count: d.dancers.length,
      dancers: d.dancers.join(', '),
    })),
  );
  return Papa.unparse(rows);
};

/** Generate SQL UPDATE statements for syncing group orders back to the database */
export const exportSQL = (groups: GroupOrders): string => {
  return (['A', 'B', 'C'] as GroupName[])
    .map(g => {
      const order = JSON.stringify(groups[g]);
      return `UPDATE recital_groups SET show_order = '${order}' WHERE recital_group = '${g}';`;
    })
    .join('\n');
};

/** Style colors — chosen for maximum contrast on white, easy to distinguish */
export const styleColors: Record<string, string> = {
  Ballet: '#e056a0',
  'Hip Hop': '#e74c3c',
  Jazz: '#f39c12',
  'Modern/Lyrical': '#2e86de',
  'Musical Theater': '#8854d0',
  Tap: '#20bf6b',
  PREDANCE: '#999',
  All: '#666',
};
