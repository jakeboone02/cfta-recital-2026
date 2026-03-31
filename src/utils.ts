import Papa from 'papaparse';
import type {
  DanceMap,
  DanceRow,
  GroupOrders,
  ShowDanceInstance,
  ShowStructureEntry,
} from './types';

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
export const buildDancerLookup = (reportData: ShowDanceInstance[]): Record<number, string[]> => {
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
  show_id: number;
  part: number;
  dancers: string[];
  common_with_next: string[];
  common_with_next2: string[];
  skip_overlap_checks: boolean;
}

export interface ShowData {
  show_id: number;
  label: string;
  dances: ShowDance[];
}

type FamilyCue = '' | 'performing' | 'beside-stage' | 'kitchen';

interface FamilyReportRow {
  showLabel: string;
  order: number;
  danceName: string;
  songArtist: string;
  familyDancers: string[];
  cue: FamilyCue;
  cueLabel: string;
}

interface FamilyReportSection {
  family: string;
  members: string[];
  rows: FamilyReportRow[];
}

/** Compute the full show order from current group assignments */
export const computeShowOrder = (
  groups: GroupOrders,
  danceMap: DanceMap,
  dancerLookup: Record<number, string[]>,
  showStructure: ShowStructureEntry[],
  placeholderDances?: number[] | null
): ShowData[] => {
  const makeDance = (id: number | null, group: string, showId: number, part: number): ShowDance => {
    const d = id != null ? danceMap[id] : null;
    return {
      dance_id: id,
      dance_name: d?.dance_name ?? 'PLACEHOLDER',
      dance_style: d?.dance_style ?? 'PLACEHOLDER',
      choreography: d?.choreography ?? '???',
      song: d?.song ?? '???',
      artist: d?.artist ?? '???',
      group,
      show_id: showId,
      part,
      dancers: id != null ? (dancerLookup[id] ?? []) : [],
      common_with_next: [],
      common_with_next2: [],
      skip_overlap_checks: d?.skip_overlap_checks === 1,
    };
  };

  let preIdx = 0;

  return showStructure.map(show => {
    const dances: ShowDance[] = show.parts.flatMap((g, partIdx) =>
      (groups[g] ?? []).map(id => {
        if (id === 'PLACEHOLDER') {
          const actualId =
            placeholderDances && preIdx < placeholderDances.length
              ? placeholderDances[preIdx++]
              : null;
          return makeDance(actualId, g, show.show_id, partIdx);
        }
        return makeDance(id, g, show.show_id, partIdx);
      })
    );

    // Compute dancer overlap (skip dances flagged with skip_overlap_checks)
    for (let i = 0; i < dances.length; i++) {
      const curr = dances[i];
      // Find next dance that doesn't skip overlap checks
      const next = dances[i + 1] && !dances[i + 1].skip_overlap_checks ? dances[i + 1] : undefined;
      const next2 = (() => {
        let idx = i + 2;
        while (idx < dances.length && dances[idx]?.skip_overlap_checks) idx++;
        return idx < dances.length ? dances[idx] : undefined;
      })();
      if (next && !curr.skip_overlap_checks) {
        curr.common_with_next = curr.dancers.filter(d => next.dancers.includes(d));
      }
      if (next2 && !curr.skip_overlap_checks) {
        curr.common_with_next2 = curr.dancers.filter(d => next2.dancers.includes(d));
      }
    }

    return { show_id: show.show_id, label: show.label, dances };
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
      groups[g] = arr.map(v => (v === 'PLACEHOLDER' ? 'PLACEHOLDER' : Number(v)));
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

const compareText = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { sensitivity: 'base' });

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatSongArtist = (song: string, artist: string): string =>
  [song, artist].filter(part => part && part !== '???').join(' — ');

const getFamilyDancers = (dance: ShowDance, familyMembers: Set<string>): string[] =>
  dance.dancers.filter(dancer => familyMembers.has(dancer));

const buildFamilyReportSections = (
  shows: ShowData[],
  dancerFamilies: Record<string, string>
): FamilyReportSection[] => {
  const families = new Map<string, Set<string>>();

  for (const show of shows) {
    for (const dance of show.dances) {
      for (const dancer of dance.dancers) {
        const family = dancerFamilies[dancer];
        if (!family) continue;
        let members = families.get(family);
        if (!members) {
          members = new Set<string>();
          families.set(family, members);
        }
        members.add(dancer);
      }
    }
  }

  return [...families.entries()]
    .filter(([, members]) => members.size > 1)
    .sort(([familyA], [familyB]) => compareText(familyA, familyB))
    .map(([family, members]) => {
      const familyMembers = new Set(members);
      const rows = shows.flatMap(show =>
        show.dances.map((dance, index) => {
          const currentPerformers = getFamilyDancers(dance, familyMembers);
          const nextPerformers =
            index + 1 < show.dances.length
              ? getFamilyDancers(show.dances[index + 1], familyMembers)
              : [];
          const next2Performers =
            index + 2 < show.dances.length
              ? getFamilyDancers(show.dances[index + 2], familyMembers)
              : [];

          let cue: FamilyCue = '';
          let cueLabel = '';
          let familyDancers: string[] = [];

          if (currentPerformers.length > 0) {
            cue = 'performing';
            cueLabel = 'Performing';
            familyDancers = currentPerformers;
          } else if (nextPerformers.length > 0) {
            cue = 'beside-stage';
            cueLabel = 'Beside stage';
            familyDancers = nextPerformers;
          } else if (next2Performers.length > 0) {
            cue = 'kitchen';
            cueLabel = 'In the kitchen';
            familyDancers = next2Performers;
          }

          return {
            showLabel: show.label,
            order: index + 1,
            danceName: dance.dance_name,
            songArtist: formatSongArtist(dance.song, dance.artist),
            familyDancers,
            cue,
            cueLabel,
          };
        })
      );

      return {
        family,
        members: [...members].sort(compareText),
        rows,
      };
    });
};

/** Map dance-style slugs to {bg, text} colours matching main.css */
const STYLE_COLORS: Record<string, { bg: string; text: string }> = {
  ballet: { bg: '#e056a0', text: '#fff' },
  'hip-hop': { bg: '#ddd', text: '#222' },
  jazz: { bg: '#f39c12', text: '#fff' },
  'modern-lyrical': { bg: '#2e86de', text: '#fff' },
  'musical-theater': { bg: '#8854d0', text: '#fff' },
  tap: { bg: '#20bf6b', text: '#fff' },
  predance: { bg: '#999', text: '#fff' },
  placeholder: { bg: '#999', text: '#fff' },
  all: { bg: '#667', text: '#fff' },
};

/** Export show order as a styled HTML table that Excel can open (.xls) */
export const exportExcel = (shows: ShowData[]): string => {
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
      .map(h => `<th style="background:#333;color:#fff;font-weight:bold">${escapeHtml(h)}</th>`)
      .join('') +
    '</tr>';

  for (const show of shows) {
    // show separator row
    html += `<tr><td colspan="${headers.length}" style="background:#2d6a4f;color:#fff;font-weight:bold;font-size:13pt">${escapeHtml(show.label)}</td></tr>`;

    show.dances.forEach((d, di) => {
      const slug = styleSlug(d.dance_style);
      const c = STYLE_COLORS[slug] ?? { bg: '#eee', text: '#222' };
      const cellStyle = `background:${c.bg};color:${c.text}`;
      const plainStyle = `background:#fff;color:#222`;

      html +=
        '<tr>' +
        [
          `<td style="${plainStyle}">${escapeHtml(show.label)}</td>`,
          `<td style="${plainStyle}" align="center">${di + 1}</td>`,
          `<td style="${plainStyle}">${escapeHtml(d.group)}</td>`,
          `<td style="${plainStyle}" align="center">${d.part}</td>`,
          `<td style="${cellStyle};font-weight:bold">${escapeHtml(d.dance_name)}</td>`,
          `<td style="${cellStyle}">${escapeHtml(d.dance_style)}</td>`,
          `<td style="${plainStyle}">${escapeHtml(d.choreography)}</td>`,
          `<td style="${plainStyle}">${escapeHtml(d.song)}</td>`,
          `<td style="${plainStyle}">${escapeHtml(d.artist)}</td>`,
          `<td style="${plainStyle}" align="center">${d.dancers.length}</td>`,
          `<td style="${plainStyle}">${escapeHtml(d.dancers.join(', '))}</td>`,
        ].join('') +
        '</tr>';
    });
  }

  html += '</table></body></html>';
  return html;
};

/** Export a family-oriented show-order report as styled HTML that Excel can open (.xls) */
export const exportFamilyReportExcel = (
  shows: ShowData[],
  dancerFamilies: Record<string, string>
): string => {
  const headers = ['Show', '#', 'Dance Name', 'Song / Artist', 'Family Dancers', 'Cue'];
  const sections = buildFamilyReportSections(shows, dancerFamilies);

  let html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"/></head><body>' +
    '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Calibri,sans-serif;font-size:11pt">' +
    '<col width="220"/><col width="50"/><col width="240"/><col width="260"/><col width="260"/><col width="140"/>';

  html +=
    `<tr><td colspan="${headers.length}" style="background:#264653;color:#fff;font-weight:bold;font-size:14pt">Family Show Order Report</td></tr>` +
    `<tr><td colspan="${headers.length}" style="background:#f8f9fa;color:#555">Highlight legend: <strong style="color:#7a5c00">Performing</strong> &middot; <span style="color:#9c5700">Beside stage</span> &middot; <span style="color:#666">In the kitchen</span></td></tr>`;

  if (sections.length === 0) {
    html += `<tr><td colspan="${headers.length}" style="background:#fff;color:#444">No families with multiple dancers were found in the current show order.</td></tr>`;
    html += '</table></body></html>';
    return html;
  }

  for (const section of sections) {
    html +=
      `<tr><td colspan="${headers.length}" style="background:#1d3557;color:#fff;font-weight:bold;font-size:12pt">Family: ${escapeHtml(section.family)}</td></tr>` +
      `<tr><td colspan="${headers.length}" style="background:#eef4ff;color:#1d3557">Dancers: ${escapeHtml(section.members.join(', '))}</td></tr>` +
      '<tr>' +
      headers
        .map(
          header =>
            `<th style="background:#333;color:#fff;font-weight:bold">${escapeHtml(header)}</th>`
        )
        .join('') +
      '</tr>';

    section.rows.forEach((row, index) => {
      const previousRow = index > 0 ? section.rows[index - 1] : null;
      const showBreak = !previousRow || previousRow.showLabel !== row.showLabel;
      const borderTop = showBreak ? 'border-top:2px solid #9aa0a6;' : '';
      const rowBg =
        row.cue === 'performing'
          ? '#fff2cc'
          : row.cue === 'beside-stage'
            ? '#fce5cd'
            : row.cue === 'kitchen'
              ? '#f3f3f3'
              : '#fff';
      const rowColor = row.cue === 'kitchen' ? '#666' : '#222';
      const baseStyle = `background:${rowBg};color:${rowColor};${borderTop}`;
      const danceStyle = row.cue === 'performing' ? `${baseStyle}font-weight:bold;` : baseStyle;
      const familyDancersStyle =
        row.cue === 'performing'
          ? `${baseStyle}font-weight:bold;color:#7a5c00;`
          : row.cue === 'beside-stage'
            ? `${baseStyle}color:#9c5700;`
            : row.cue === 'kitchen'
              ? `${baseStyle}color:#666;font-style:italic;`
              : baseStyle;
      const cueStyle =
        row.cue === 'performing'
          ? `${baseStyle}font-weight:bold;color:#7a5c00;`
          : row.cue === 'beside-stage'
            ? `${baseStyle}color:#9c5700;`
            : row.cue === 'kitchen'
              ? `${baseStyle}color:#666;font-style:italic;`
              : baseStyle;

      html +=
        '<tr>' +
        [
          `<td style="${baseStyle}">${escapeHtml(row.showLabel)}</td>`,
          `<td style="${baseStyle}" align="center">${row.order}</td>`,
          `<td style="${danceStyle}">${escapeHtml(row.danceName)}</td>`,
          `<td style="${baseStyle}">${escapeHtml(row.songArtist)}</td>`,
          `<td style="${familyDancersStyle}">${escapeHtml(row.familyDancers.join(', '))}</td>`,
          `<td style="${cueStyle}">${escapeHtml(row.cueLabel)}</td>`,
        ].join('') +
        '</tr>';
    });

    html += `<tr><td colspan="${headers.length}" style="border:none;height:12px;background:#fff"></td></tr>`;
  }

  html += '</table></body></html>';
  return html;
};
