import { useEffect, useMemo, useState } from 'react';
import type { DanceRow, GroupOrders } from './types';
import { SHOW_STRUCTURE, buildComboSiblingMap } from './types';
import {
  DANCES,
  GROUPS,
  COMBO_PAIRS_DATA,
  DANCERS_BY_DANCE,
  DANCER_LAST_NAMES,
} from './data.generated';
import { WORKER_CODE } from './optimizer-worker-code.generated';
import { WorkingArea } from './WorkingArea';
import { ReportArea } from './ReportArea';
import {
  addBookmark,
  buildDanceMap,
  canRedo,
  canUndo,
  computeShowOrder,
  deleteBookmark,
  exportCSV,
  exportGroupOrdersCSV,
  initUndoSession,
  loadBookmarks,
  loadGroupOrders,
  parseGroupOrdersCSV,
  pushUndo,
  redo,
  saveGroupOrders,
  undo,
} from './utils';
import type { Bookmark } from './utils';
import type { AnnealConfig } from './optimizer/types';

const OPTIMIZE_CONFIG: AnnealConfig = {
  initialTemp: 5000,
  coolingRate: 0.9997,
  iterations: 200_000,
  restarts: 3,
};

export const App = () => {
  const [groups, setGroups] = useState<GroupOrders | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importCopied, setImportCopied] = useState(false);
  const [importError, setImportError] = useState('');
  const [undoVer, setUndoVer] = useState(0);
  const [optimizing, setOptimizing] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [bookmarkError, setBookmarkError] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);
  const [compareBookmark, setCompareBookmark] = useState<string | null>(null);

  const initialGroups = useMemo<GroupOrders>(() => {
    const g: GroupOrders = { A: [], B: [], C: [] };
    for (const row of GROUPS) g[row.recital_group] = row.show_order;
    return g;
  }, []);

  useEffect(() => {
    initUndoSession();
    const saved = loadGroupOrders();
    setGroups(saved ?? initialGroups);
  }, []);

  const danceMap = useMemo(() => buildDanceMap(DANCES), []);
  const comboSiblingMap = useMemo(() => buildComboSiblingMap(COMBO_PAIRS_DATA), []);

  const shows = useMemo(
    () => (groups ? computeShowOrder(groups, danceMap, DANCERS_BY_DANCE, SHOW_STRUCTURE) : []),
    [groups, danceMap]
  );

  const compareData = useMemo(() => {
    if (!compareBookmark) return null;
    const bm = bookmarks.find(b => b.name === compareBookmark);
    if (!bm) return null;
    return computeShowOrder(bm.groups, danceMap, DANCERS_BY_DANCE, SHOW_STRUCTURE);
  }, [compareBookmark, bookmarks, danceMap]);

  const handleGroupChange = (newGroups: GroupOrders) => {
    if (groups) pushUndo(groups);
    setGroups(newGroups);
    saveGroupOrders(newGroups);
    setUndoVer(v => v + 1);
  };

  const handleExportCSV = () => {
    const csv = exportCSV(shows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recital-order-2026.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenImport = () => {
    if (groups) setImportText(exportGroupOrdersCSV(groups));
    setImportError('');
    setImportCopied(false);
    setImportOpen(true);
  };

  const handleApplyImport = () => {
    const parsed = parseGroupOrdersCSV(importText);
    if (!parsed) {
      setImportError('Invalid CSV format. Expected recital_group,show_order columns.');
      return;
    }
    handleGroupChange(parsed);
    setImportOpen(false);
  };

  const handleCopyImport = () => {
    navigator.clipboard.writeText(importText).then(() => {
      setImportCopied(true);
      setTimeout(() => setImportCopied(false), 1500);
    });
  };

  const handleUndo = () => {
    if (!groups) return;
    const prev = undo(groups);
    if (prev) {
      setGroups(prev);
      saveGroupOrders(prev);
      setUndoVer(v => v + 1);
    }
  };

  const handleRedo = () => {
    if (!groups) return;
    const next = redo(groups);
    if (next) {
      setGroups(next);
      saveGroupOrders(next);
      setUndoVer(v => v + 1);
    }
  };

  const handleReset = () => {
    if (!groups || !initialGroups) return;
    handleGroupChange(initialGroups);
  };

  const handleOptimize = () => {
    if (!groups || optimizing) return;
    setOptimizing(true);
    const blob = new Blob([WORKER_CODE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'result') {
        handleGroupChange(e.data.groups);
      }
      setOptimizing(false);
      worker.terminate();
      URL.revokeObjectURL(url);
    };
    worker.onerror = () => {
      setOptimizing(false);
      worker.terminate();
      URL.revokeObjectURL(url);
    };
    worker.postMessage({ groups, config: OPTIMIZE_CONFIG });
  };

  const handleSaveBookmark = () => {
    const name = bookmarkName.trim();
    if (!name) {
      setBookmarkError('Name is required.');
      return;
    }
    if (!groups) return;
    if (!addBookmark(name, groups)) {
      setBookmarkError('A bookmark with that name already exists.');
      return;
    }
    setBookmarks(loadBookmarks());
    setBookmarkName('');
    setBookmarkError('');
  };

  const handleLoadBookmark = (b: Bookmark) => {
    handleGroupChange(b.groups);
  };

  const handleDeleteBookmark = (name: string) => {
    if (compareBookmark === name) setCompareBookmark(null);
    deleteBookmark(name);
    setBookmarks(loadBookmarks());
  };

  /** Compute per-show family counts for a bookmark */
  const bookmarkStats = (b: Bookmark): string => {
    const showOrders = computeShowOrder(b.groups, danceMap, DANCERS_BY_DANCE, SHOW_STRUCTURE);
    return (
      'Families: ' +
      showOrders
        .map(show => {
          const lastNames = new Set<string>();
          for (const d of show.dances) {
            for (const dancer of d.dancers) {
              const ln = DANCER_LAST_NAMES[dancer];
              if (ln) lastNames.add(ln);
            }
          }
          return lastNames.size;
        })
        .join(' · ')
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((mod && e.key === 'y') || (e.metaKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!groups) return <div>Loading…</div>;

  return (
    <div className={`app-layout ${bookmarkOpen ? 'app-layout--bookmarks' : ''}`}>
      <div className="left-panel">
        <WorkingArea
          groups={groups}
          danceMap={danceMap}
          comboSiblingMap={comboSiblingMap}
          onChange={handleGroupChange}
          actions={
            <>
              <button onClick={handleOptimize} disabled={optimizing} title="Run optimizer">
                {optimizing ? '⏳ Optimizing…' : '⚡ Optimize'}
              </button>
              <button onClick={handleUndo} disabled={!canUndo()} title="Undo">
                ↶
              </button>
              <button onClick={handleRedo} disabled={!canRedo()} title="Redo">
                ↷
              </button>
              <button
                onClick={handleReset}
                className="btn-reset"
                title="Reset dance order to original database order">
                Reset
              </button>
            </>
          }
        />
      </div>
      <div className={`right-panel ${compareData ? 'right-panel--split' : ''}`}>
        <div className="report-pane">
          <ReportArea
            shows={shows}
            dancerLastNames={DANCER_LAST_NAMES}
            compact={!!compareData}
            label="Current"
            actions={
              <div className="header-actions">
                <button onClick={handleExportCSV} title="Download show order as CSV file">
                  💾 Download Show Order (CSV)
                </button>
                <button onClick={handleOpenImport} title="Import/export group orders as CSV">
                  📥 Import/Export
                </button>
                <button
                  onClick={() => setBookmarkOpen(o => !o)}
                  className={bookmarkOpen ? 'btn-bookmark-active' : ''}
                  title="Bookmarks">
                  ⭐
                </button>
              </div>
            }
          />
        </div>
        {compareData && (
          <div className="report-pane report-pane--compare">
            <ReportArea
              shows={compareData}
              dancerLastNames={DANCER_LAST_NAMES}
              compact
              label={compareBookmark ?? 'Bookmark'}
            />
          </div>
        )}
      </div>
      {bookmarkOpen && (
        <div className="bookmark-sidebar">
          <div className="bookmark-sidebar-header">
            <h3>Bookmarks</h3>
            <button onClick={() => setBookmarkOpen(false)} title="Close">
              ✕
            </button>
          </div>
          <div className="bookmark-save">
            <input
              type="text"
              placeholder="Bookmark name"
              value={bookmarkName}
              onChange={e => {
                setBookmarkName(e.target.value);
                setBookmarkError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveBookmark();
              }}
            />
            <button onClick={handleSaveBookmark}>Save</button>
          </div>
          {bookmarkError && <div className="import-error">{bookmarkError}</div>}
          <ul className="bookmark-list">
            {bookmarks.toReversed().map(b => (
              <li key={b.name} className="bookmark-item">
                <input
                  type="checkbox"
                  className="bookmark-compare"
                  checked={compareBookmark === b.name}
                  onChange={() => setCompareBookmark(compareBookmark === b.name ? null : b.name)}
                  title="Compare"
                />
                <div className="bookmark-info">
                  <button
                    className="bookmark-name"
                    onClick={() => handleLoadBookmark(b)}
                    title="Load this bookmark">
                    {b.name}
                  </button>
                  <span className="bookmark-stats">{bookmarkStats(b)}</span>
                </div>
                <button
                  className="bookmark-delete"
                  onClick={() => handleDeleteBookmark(b.name)}
                  title="Delete">
                  ✕
                </button>
              </li>
            ))}
            {bookmarks.length === 0 && <li className="bookmark-empty">No bookmarks yet</li>}
          </ul>
        </div>
      )}
      {importOpen && (
        <div className="modal-overlay" onClick={() => setImportOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Import / Export Group Orders</h3>
            <textarea
              rows={8}
              value={importText}
              onChange={e => {
                setImportText(e.target.value);
                setImportError('');
              }}
            />
            {importError && <div className="import-error">{importError}</div>}
            <div className="modal-actions">
              <button onClick={handleApplyImport}>Apply</button>
              <button onClick={handleCopyImport}>{importCopied ? '✓ Copied' : '📋 Copy'}</button>
              <button onClick={() => setImportOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
