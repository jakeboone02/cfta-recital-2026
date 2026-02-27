import Papa from 'papaparse';
import type {
  DanceMap,
  DanceRow,
  GroupOrders,
  RecitalDanceInstance,
  ShowStructureEntry,
} from './types';
import { SPECTAPULAR_ID, HIPHOP_ID, FINALE_ID } from './types';

export interface Bookmark {
  name: string;
  groups: GroupOrders;
  savedAt: string;
}

// ── Undo/Redo history (session-scoped, stored in localStorage) ──────────

const LS_UNDO_KEY = 'cfta-recital-2026-undo';
const LS_REDO_KEY = 'cfta-recital-2026-redo';
const LS_SESSION_KEY = 'cfta-recital-2026-session-id';

/** Get or create a session ID so history is scoped to this browser session */
const getSessionId = (): string => {
  let id = sessionStorage.getItem(LS_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(LS_SESSION_KEY, id);
    // Clear stale history from a previous session
    localStorage.removeItem(LS_UNDO_KEY);
    localStorage.removeItem(LS_REDO_KEY);
  }
  return id;
};

const loadStack = (key: string): GroupOrders[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStack = (key: string, stack: GroupOrders[]) => {
  localStorage.setItem(key, JSON.stringify(stack));
};

/** Initialize session (call once on app load) */
export const initUndoSession = () => {
  getSessionId();
};

/** Push current state onto undo stack before applying a change, clear redo */
export const pushUndo = (current: GroupOrders) => {
  getSessionId();
  const stack = loadStack(LS_UNDO_KEY);
  stack.push(current);
  saveStack(LS_UNDO_KEY, stack);
  saveStack(LS_REDO_KEY, []);
};

/** Undo: pop from undo stack, push current onto redo, return previous state */
export const undo = (current: GroupOrders): GroupOrders | null => {
  const undoStack = loadStack(LS_UNDO_KEY);
  if (undoStack.length === 0) return null;
  const prev = undoStack.pop()!;
  saveStack(LS_UNDO_KEY, undoStack);
  const redoStack = loadStack(LS_REDO_KEY);
  redoStack.push(current);
  saveStack(LS_REDO_KEY, redoStack);
  return prev;
};

/** Redo: pop from redo stack, push current onto undo, return next state */
export const redo = (current: GroupOrders): GroupOrders | null => {
  const redoStack = loadStack(LS_REDO_KEY);
  if (redoStack.length === 0) return null;
  const next = redoStack.pop()!;
  saveStack(LS_REDO_KEY, redoStack);
  const undoStack = loadStack(LS_UNDO_KEY);
  undoStack.push(current);
  saveStack(LS_UNDO_KEY, undoStack);
  return next;
};

/** Check if undo/redo are available */
export const canUndo = (): boolean => loadStack(LS_UNDO_KEY).length > 0;
export const canRedo = (): boolean => loadStack(LS_REDO_KEY).length > 0;

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
  group: string;
  recital_id: number;
  part: number;
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
  showStructure: ShowStructureEntry[]
): ShowData[] => {
  const makeDance = (
    id: number | null,
    group: string,
    recitalId: number,
    part: number
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
    const dances: ShowDance[] = [
      makeDance(SPECTAPULAR_ID, 'SpecTAPular', show.recital_id, 0),
      ...show.parts.flatMap((g, partIdx) =>
        (groups[g] ?? []).map(id =>
          makeDance(id === 'PRE' ? null : id, g, show.recital_id, partIdx + 1)
        )
      ),
      makeDance(HIPHOP_ID, 'Hip Hop', show.recital_id, show.parts.length),
      makeDance(FINALE_ID, 'Finale', show.recital_id, show.parts.length),
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
    }))
  );
  return Papa.unparse(rows);
};

/** Export group orders as CSV in the same format as recital_groups.csv */
export const exportGroupOrdersCSV = (groups: GroupOrders): string => {
  const rows = Object.keys(groups)
    .sort()
    .map(g => ({
      recital_group: g,
      show_order: JSON.stringify(groups[g]).replace(/"/g, '""'),
    }));
  return (
    'recital_group,show_order\n' +
    rows.map(r => `${r.recital_group},"${r.show_order}"`).join('\n') +
    '\n'
  );
};

/** Parse CSV in recital_groups.csv format back to GroupOrders */
export const parseGroupOrdersCSV = (csv: string): GroupOrders | null => {
  try {
    const result = Papa.parse<{ recital_group: string; show_order: string }>(csv.trim(), {
      header: true,
      skipEmptyLines: true,
    });
    const groups: GroupOrders = {};
    for (const row of result.data) {
      const g = row.recital_group?.trim();
      if (!g) continue;
      const arr = JSON.parse(row.show_order) as (number | string)[];
      groups[g] = arr.map(v => (v === 'PRE' ? 'PRE' : Number(v)));
    }
    if (Object.keys(groups).length === 0) return null;
    return groups;
  } catch {
    return null;
  }
};

/** Generate SQL UPDATE statements for syncing group orders back to the database */
export const exportSQL = (groups: GroupOrders): string => {
  return Object.keys(groups)
    .sort()
    .map(g => {
      const order = JSON.stringify(groups[g]);
      return `UPDATE recital_groups SET show_order = '${order}' WHERE recital_group = '${g}';`;
    })
    .join('\n');
};

/** Convert a dance style name to a CSS class suffix (e.g. 'Hip Hop' → 'hip-hop') */
export const styleSlug = (danceStyle: string): string =>
  danceStyle.toLowerCase().replace(/[/ ]+/g, '-');

/** Map dance-style slugs to {bg, text} colours matching main.css */
const STYLE_COLORS: Record<string, { bg: string; text: string }> = {
  ballet: { bg: '#e056a0', text: '#fff' },
  'hip-hop': { bg: '#ddd', text: '#222' },
  jazz: { bg: '#f39c12', text: '#fff' },
  'modern-lyrical': { bg: '#2e86de', text: '#fff' },
  'musical-theater': { bg: '#8854d0', text: '#fff' },
  tap: { bg: '#20bf6b', text: '#fff' },
  predance: { bg: '#999', text: '#fff' },
  all: { bg: '#667', text: '#fff' },
};

/** Export show order as a styled HTML table that Excel can open (.xls) */
export const exportExcel = (shows: ShowData[]): string => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const headers = [
    'Show',
    '#',
    'Group',
    'Part',
    'Dance Name',
    'Style',
    'Choreography',
    'Song',
    'Artist',
    'Count',
    'Dancers',
  ];

  let html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"/></head><body>' +
    '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Calibri,sans-serif;font-size:11pt;white-space:nowrap">' +
    `<col/>`.repeat(headers.length - 1) +
    `<col width="500"/>`;

  // header row
  html +=
    '<tr>' +
    headers
      .map(h => `<th style="background:#333;color:#fff;font-weight:bold">${esc(h)}</th>`)
      .join('') +
    '</tr>';

  for (const show of shows) {
    // show separator row
    html += `<tr><td colspan="${headers.length}" style="background:#2d6a4f;color:#fff;font-weight:bold;font-size:13pt">${esc(show.label)}</td></tr>`;

    show.dances.forEach((d, di) => {
      const slug = styleSlug(d.dance_style);
      const c = STYLE_COLORS[slug] ?? { bg: '#eee', text: '#222' };
      const cellStyle = `background:${c.bg};color:${c.text}`;
      const plainStyle = `background:#fff;color:#222`;

      html +=
        '<tr>' +
        [
          `<td style="${plainStyle}">${esc(show.label)}</td>`,
          `<td style="${plainStyle}" align="center">${di + 1}</td>`,
          `<td style="${plainStyle}">${esc(d.group)}</td>`,
          `<td style="${plainStyle}" align="center">${d.part}</td>`,
          `<td style="${cellStyle};font-weight:bold">${esc(d.dance_name)}</td>`,
          `<td style="${cellStyle}">${esc(d.dance_style)}</td>`,
          `<td style="${plainStyle}">${esc(d.choreography)}</td>`,
          `<td style="${plainStyle}">${esc(d.song)}</td>`,
          `<td style="${plainStyle}">${esc(d.artist)}</td>`,
          `<td style="${plainStyle}" align="center">${d.dancers.length}</td>`,
          `<td style="${plainStyle}">${esc(d.dancers.join(', '))}</td>`,
        ].join('') +
        '</tr>';
    });
  }

  html += '</table></body></html>';
  return html;
};
