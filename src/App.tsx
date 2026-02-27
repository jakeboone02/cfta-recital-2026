import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { GroupOrders } from './types';
import { buildComboSiblingMap } from './types';
import { WORKER_CODE } from './optimizer-worker-code.generated';
import { WorkingArea } from './WorkingArea';
import { ReportArea } from './ReportArea';
import {
  buildDanceMap,
  computeShowOrder,
  exportCSV,
  exportExcel,
  exportGroupOrdersCSV,
  parseGroupOrdersCSV,
  initUndoSession,
  pushUndo,
  canUndo,
  canRedo,
  undo,
  redo,
} from './utils';
import type { Bookmark } from './utils';
import type { AnnealConfig } from './optimizer/types';
import {
  useInstances,
  useCreateInstance,
  useLogin,
  useInstanceData,
  useOrder,
  useSaveOrder,
  useSaveBookmark,
  useDeleteBookmark,
  useRenameBookmark,
  queryKeys,
} from './queries';

const OPTIMIZE_CONFIG: AnnealConfig = {
  initialTemp: 5000,
  coolingRate: 0.9997,
  iterations: 200_000,
  restarts: 3,
};

// Simple hash-based router
const getRoute = () => window.location.hash.replace('#', '') || '/';

export const App = () => {
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Auth check: if instances query succeeds, user is authenticated
  const { isSuccess: authed, isError: notAuthed, isLoading: authLoading } = useInstances();

  if (authLoading) return <div className="loading">Loading…</div>;
  if (notAuthed || route === '/login') return <LoginPage onLogin={() => window.location.hash = '#/'} />;

  const instanceMatch = route.match(/^\/instances\/(\d+)/);
  if (instanceMatch) {
    const id = parseInt(instanceMatch[1], 10);
    if (route.endsWith('/setup')) return <SetupPage instanceId={id} />;
    return <PlannerPage instanceId={id} />;
  }

  return <InstanceListPage />;
};

// ── Login Page ───────────────────────────────────────────────────────────

const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(password, { onSuccess: onLogin });
  };

  return (
    <div className="login-page">
      <h1>CFTA Dance Recital</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => { setPassword(e.target.value); loginMutation.reset(); }}
          autoFocus
        />
        <button type="submit">Log In</button>
        {loginMutation.isError && <div className="login-error">Invalid password</div>}
      </form>
    </div>
  );
};

// ── Instance List Page ───────────────────────────────────────────────────

const InstanceListPage = () => {
  const { data: instances, isLoading: loading } = useInstances();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const createMutation = useCreateInstance();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), year: newYear }, {
      onSuccess: (inst) => {
        setShowCreate(false);
        setNewName('');
        window.location.hash = `#/instances/${inst.id}/setup`;
      },
    });
  };

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="instance-list-page">
      <h1>CFTA Dance Recitals</h1>
      <button className="btn-create" onClick={() => setShowCreate(true)}>+ New Dance Recital</button>
      {showCreate && (
        <form className="create-form" onSubmit={handleCreate}>
          <input placeholder="Name (e.g., 2027 Spring Dance Recital)" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          <input type="number" placeholder="Year" value={newYear} onChange={e => setNewYear(parseInt(e.target.value, 10))} />
          <button type="submit">Create</button>
          <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
        </form>
      )}
      <ul className="instance-list">
        {(instances ?? []).map(inst => (
          <li key={inst.id}>
            <a href={`#/instances/${inst.id}`}>
              <strong>{inst.name}</strong>
              <span className="instance-year">{inst.year}</span>
              {inst.is_archived ? <span className="badge-archived">Archived</span> : null}
            </a>
          </li>
        ))}
        {(instances ?? []).length === 0 && <li className="empty">No dance recitals yet. Create one to get started.</li>}
      </ul>
    </div>
  );
};

// ── CSV Setup Page ──────────────────────────────────────────────────────

import type { ColumnOverride } from './DataGrid';

const CSV_TABLES = [
  { name: 'dancers', label: 'Dancers', cols: 'first_name, last_name, is_teacher' },
  { name: 'classes', label: 'Classes', cols: 'class_id, teacher, class_name, class_time' },
  { name: 'dances', label: 'Dances', cols: 'dance_id, dance_style, dance_name, choreography, song, artist' },
  { name: 'class_dances', label: 'Class→Dance', cols: 'class_id, dance_id' },
  { name: 'dancer_classes', label: 'Dancer→Class', cols: 'class_id, dancer_name' },
  { name: 'recitals', label: 'Recitals', cols: 'recital_id, recital_group_part_1, recital_group_part_2, recital_description, recital_time' },
  { name: 'recital_groups', label: 'Recital Groups', cols: 'recital_group, show_order' },
];

const TABLE_COLUMN_OVERRIDES: Record<string, Record<string, ColumnOverride>> = {
  dancers: {
    is_teacher: { type: 'checkbox' },
  },
  dancer_classes: {
    class_id: { readOnly: true },
    class_name: {
      type: 'select',
      virtual: true,
      header: 'Class Name',
      deriveFrom: 'class_id',
      insertAfter: 'class_id',
      select: {
        table: 'classes',
        labelColumn: 'class_name',
        labelFn: (r) => `${r.class_name} (${r.teacher})`,
        valueColumn: 'class_id',
        saveTo: 'class_id',
      },
    },
    dancer_name: {
      type: 'select',
      select: { table: 'dancers', labelColumn: 'dancer_name' },
    },
  },
  class_dances: {
    class_id: { readOnly: true },
    class_name: {
      type: 'select',
      virtual: true,
      header: 'Class Name',
      deriveFrom: 'class_id',
      insertAfter: 'class_id',
      select: {
        table: 'classes',
        labelColumn: 'class_name',
        labelFn: (r) => `${r.class_name} (${r.teacher})`,
        valueColumn: 'class_id',
        saveTo: 'class_id',
      },
    },
    dance_id: { readOnly: true },
    dance_name: {
      type: 'select',
      virtual: true,
      header: 'Dance Name',
      deriveFrom: 'dance_id',
      insertAfter: 'dance_id',
      select: {
        table: 'dances',
        labelColumn: 'dance_name',
        labelFn: (r) => `${r.dance_name} (${r.choreography})`,
        valueColumn: 'dance_id',
        saveTo: 'dance_id',
      },
    },
  },
  recitals: {
    recital_time: { type: 'datetime-local' },
  },
};

const SetupPage = ({ instanceId }: { instanceId: number }) => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [editingTable, setEditingTable] = useState<string | null>(null);

  const handleFile = (tableName: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => setFiles(prev => ({ ...prev, [tableName]: reader.result as string }));
    reader.readAsText(file);
  };

  const handleUploadAll = async () => {
    setUploading(true);
    setStatus({});
    for (const table of CSV_TABLES) {
      const csv = files[table.name];
      if (!csv) { setStatus(prev => ({ ...prev, [table.name]: 'skipped' })); continue; }
      try {
        const { uploadCsv } = await import('./api-client');
        const result = await uploadCsv(instanceId, table.name, csv);
        setStatus(prev => ({ ...prev, [table.name]: `✓ ${result.rows} rows` }));
      } catch (e: any) {
        setStatus(prev => ({ ...prev, [table.name]: `✗ ${e.message}` }));
      }
    }
    setUploading(false);
  };

  // Lazy-load DataGrid only when needed
  const [DataGrid, setDataGrid] = useState<React.ComponentType<{ instanceId: number; tableName: string; columnOverrides?: Record<string, ColumnOverride> }> | null>(null);
  useEffect(() => {
    if (editingTable && !DataGrid) {
      import('./DataGrid').then(m => setDataGrid(() => m.DataGrid));
    }
  }, [editingTable, DataGrid]);

  return (
    <div className="setup-page">
      <div className="setup-header">
        <h2>Manage Data</h2>
        <a href={`#/instances/${instanceId}`} className="setup-back">← Back to planner</a>
      </div>
      <div className="csv-upload-grid">
        {CSV_TABLES.map(table => (
          <div key={table.name} className={`csv-upload-card ${editingTable === table.name ? 'csv-upload-card--editing' : ''}`}>
            <div className="csv-upload-row">
              <div className="csv-upload-info">
                <strong>{table.label}</strong>
                <span className="csv-cols">{table.cols}</span>
              </div>
              <div className="csv-upload-actions">
                <label className="csv-file-label">
                  📁 CSV
                  <input type="file" accept=".csv" onChange={e => e.target.files?.[0] && handleFile(table.name, e.target.files[0])} />
                </label>
                {files[table.name] && <span className="csv-ready">Ready</span>}
                {status[table.name] && <span className={status[table.name].startsWith('✗') ? 'csv-error' : 'csv-ok'}>{status[table.name]}</span>}
                <button
                  className={`btn-edit-table ${editingTable === table.name ? 'btn-edit-table--active' : ''}`}
                  onClick={() => setEditingTable(editingTable === table.name ? null : table.name)}
                >
                  {editingTable === table.name ? '▲ Close' : '✏️ Edit'}
                </button>
              </div>
            </div>
            {editingTable === table.name && DataGrid && (
              <div className="csv-upload-editor">
                <DataGrid instanceId={instanceId} tableName={table.name} columnOverrides={TABLE_COLUMN_OVERRIDES[table.name]} />
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn-upload-all" onClick={handleUploadAll} disabled={uploading || Object.keys(files).length === 0}>
        {uploading ? 'Uploading…' : '⬆ Upload All CSVs'}
      </button>
    </div>
  );
};

// ── Planner Page (main working area) ─────────────────────────────────────

const PlannerPage = ({ instanceId }: { instanceId: number }) => {
  const { data: instanceData, isLoading: dataLoading, error: dataError } = useInstanceData(instanceId);
  const { data: orderData, isLoading: orderLoading, error: orderError } = useOrder(instanceId);
  const queryClient = useQueryClient();

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
  const [compareBookmark, setCompareBookmark] = useState<string | null>(null);
  const [renamingBookmark, setRenamingBookmark] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Initialize groups from query data
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!instanceData || !orderData || initialized) return;
    initUndoSession();
    const initialGroups: GroupOrders = { A: [], B: [], C: [] };
    for (const row of instanceData.groups) initialGroups[row.recital_group] = row.show_order;
    setGroups(orderData.groupOrders ?? initialGroups);
    setInitialized(true);
  }, [instanceData, orderData, initialized]);

  // Derive bookmarks from query cache
  const bookmarks = orderData?.bookmarks ?? [];

  const debouncedSave = useSaveOrder(instanceId);
  const saveBookmarkMutation = useSaveBookmark(instanceId);
  const deleteBookmarkMutation = useDeleteBookmark(instanceId);
  const renameBookmarkMutation = useRenameBookmark(instanceId);

  const data = instanceData ?? null;
  const danceMap = useMemo(() => (data ? buildDanceMap(data.dances) : {}), [data]);
  const comboSiblingMap = useMemo(() => (data ? buildComboSiblingMap(data.comboPairs) : {}), [data]);
  const dancersByDance = data?.dancersByDance ?? {};
  const dancerLastNames = data?.dancerLastNames ?? {};

  // TODO: make this configurable via instance config (Phase 5)
  const showStructure = useMemo(() => [
    { recital_id: 1, label: 'Friday Evening', parts: ['A', 'B'] as ['A', 'B'] },
    { recital_id: 2, label: 'Saturday Morning', parts: ['C', 'A'] as ['C', 'A'] },
    { recital_id: 3, label: 'Saturday Afternoon', parts: ['B', 'C'] as ['B', 'C'] },
  ], []);

  const shows = useMemo(
    () => (groups && data ? computeShowOrder(groups, danceMap, dancersByDance, showStructure) : []),
    [groups, danceMap, dancersByDance, showStructure, data]
  );

  const compareData = useMemo(() => {
    if (!compareBookmark || !data) return null;
    const bm = bookmarks.find(b => b.name === compareBookmark);
    if (!bm) return null;
    return computeShowOrder(bm.groups, danceMap, dancersByDance, showStructure);
  }, [compareBookmark, bookmarks, danceMap, dancersByDance, showStructure, data]);

  const handleGroupChange = (newGroups: GroupOrders) => {
    if (groups) pushUndo(groups);
    setGroups(newGroups);
    debouncedSave(newGroups);
    setUndoVer(v => v + 1);
  };

  const handleExportCSV = () => {
    const csv = exportCSV(shows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recital-order.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const html = exportExcel(shows);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recital-order.xls';
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
    if (!parsed) { setImportError('Invalid CSV format. Expected recital_group,show_order columns.'); return; }
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
    if (prev) { setGroups(prev); debouncedSave(prev); setUndoVer(v => v + 1); }
  };

  const handleRedo = () => {
    if (!groups) return;
    const next = redo(groups);
    if (next) { setGroups(next); debouncedSave(next); setUndoVer(v => v + 1); }
  };

  const handleReset = () => {
    if (!groups || !data) return;
    const initial: GroupOrders = { A: [], B: [], C: [] };
    for (const row of data.groups) initial[row.recital_group] = row.show_order;
    handleGroupChange(initial);
  };

  const handleOptimize = () => {
    if (!groups || !data || optimizing) return;
    setOptimizing(true);
    const blob = new Blob([WORKER_CODE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'result') {
        const newGroups = e.data.groups;
        handleGroupChange(newGroups);
        const now = new Date();
        const base = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
          now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        saveBookmarkMutation.mutate({ name: base, groups: newGroups });
      }
      setOptimizing(false);
      worker.terminate();
      URL.revokeObjectURL(url);
    };
    worker.onerror = () => { setOptimizing(false); worker.terminate(); URL.revokeObjectURL(url); };
    worker.postMessage({
      groups,
      config: OPTIMIZE_CONFIG,
      dances: data.dances,
      dancersByDance: data.dancersByDance,
    });
  };

  const handleSaveBookmark = () => {
    const name = bookmarkName.trim();
    if (!name) { setBookmarkError('Name is required.'); return; }
    if (!groups) return;
    saveBookmarkMutation.mutate({ name, groups }, {
      onSuccess: () => { setBookmarkName(''); setBookmarkError(''); },
      onError: (e) => setBookmarkError(e.message),
    });
  };

  const handleLoadBookmark = (b: Bookmark) => handleGroupChange(b.groups);

  const handleDeleteBookmark = (name: string) => {
    if (compareBookmark === name) setCompareBookmark(null);
    deleteBookmarkMutation.mutate(name);
  };

  const handleRenameBookmark = (oldName: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) { setRenamingBookmark(null); return; }
    renameBookmarkMutation.mutate({ oldName, newName }, {
      onSuccess: () => {
        if (compareBookmark === oldName) setCompareBookmark(newName);
        setRenamingBookmark(null);
      },
      onError: () => setBookmarkError('Name already exists'),
    });
  };

  const bookmarkStats = (b: Bookmark): string => {
    if (!data) return '';
    const showOrders = computeShowOrder(b.groups, danceMap, dancersByDance, showStructure);
    return 'Families: ' + showOrders.map(show => {
      const lastNames = new Set<string>();
      for (const d of show.dances) for (const dancer of d.dancers) {
        const ln = dancerLastNames[dancer];
        if (ln) lastNames.add(ln);
      }
      return lastNames.size;
    }).join(' · ');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((mod && e.key === 'y') || (e.metaKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const loading = dataLoading || orderLoading;
  const error = dataError?.message || orderError?.message || '';

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="error">Error: {error} <a href={`#/instances/${instanceId}/setup`}>Upload data</a></div>;
  if (!groups || !data) return <div className="loading">Loading…</div>;

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
              <a href="#/" className="btn-nav" title="All recitals">🏠</a>
              <a href={`#/instances/${instanceId}/setup`} className="btn-nav" title="Upload/manage data">📂</a>
              <span style={{ marginRight: 'auto'}}>{`\u00A0`}</span>
              <button onClick={handleUndo} disabled={!canUndo()} title="Undo">↶</button>
              <button onClick={handleRedo} disabled={!canRedo()} title="Redo">↷</button>
              <span style={{ marginRight: 'auto'}}>{`\u00A0`}</span>
              <button onClick={handleOptimize} disabled={optimizing} title="Run optimizer">
                {optimizing ? '⏳ Optimizing…' : '⚡ Optimize'}
              </button>
              <button onClick={handleReset} className="btn-reset" title="Reset dance order to original database order">Reset</button>
            </>
          }
        />
      </div>
      <div className={`right-panel ${compareData ? 'right-panel--split' : ''}`}>
        <div className="report-pane">
          <ReportArea
            shows={shows}
            dancerLastNames={dancerLastNames}
            compact={!!compareData}
            label="Current"
            actions={
              <div className="header-actions">
                <button onClick={handleExportCSV} title="Download show order as CSV file">💾 CSV</button>
                <button onClick={handleExportExcel} title="Download show order as formatted Excel file">📊 Excel</button>
                <button onClick={handleOpenImport} title="Import/export group orders as CSV">📥 Import/Export</button>
                <button onClick={() => setBookmarkOpen(o => !o)} className={bookmarkOpen ? 'btn-bookmark-active' : ''} title="Bookmarks">⭐</button>
              </div>
            }
          />
        </div>
        {compareData && (
          <div className="report-pane report-pane--compare">
            <ReportArea shows={compareData} dancerLastNames={dancerLastNames} compact label={compareBookmark ?? 'Bookmark'} />
          </div>
        )}
      </div>
      {bookmarkOpen && (
        <div className="bookmark-sidebar">
          <div className="bookmark-sidebar-header">
            <h3>Bookmarks</h3>
            <button onClick={() => setBookmarkOpen(false)} title="Close">✕</button>
          </div>
          <div className="bookmark-save">
            <input type="text" placeholder="Bookmark name" value={bookmarkName}
              onChange={e => { setBookmarkName(e.target.value); setBookmarkError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveBookmark(); }} />
            <button onClick={handleSaveBookmark}>Save</button>
          </div>
          {bookmarkError && <div className="import-error">{bookmarkError}</div>}
          <ul className="bookmark-list">
            {bookmarks.toReversed().map(b => (
              <li key={b.name} className="bookmark-item">
                <input type="checkbox" className="bookmark-compare"
                  checked={compareBookmark === b.name}
                  onChange={() => setCompareBookmark(compareBookmark === b.name ? null : b.name)} title="Compare" />
                <div className="bookmark-info">
                  {renamingBookmark === b.name ? (
                    <input className="bookmark-rename-input" autoFocus value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameBookmark(b.name); if (e.key === 'Escape') setRenamingBookmark(null); }}
                      onBlur={() => handleRenameBookmark(b.name)} />
                  ) : (
                    <button className="bookmark-name" onClick={() => handleLoadBookmark(b)} title="Load this bookmark">{b.name}</button>
                  )}
                  <span className="bookmark-stats">{bookmarkStats(b)}</span>
                </div>
                <button className="bookmark-rename" onClick={() => { setRenamingBookmark(b.name); setRenameValue(b.name); }} title="Rename">✏️</button>
                <button className="bookmark-delete" onClick={() => handleDeleteBookmark(b.name)} title="Delete">✕</button>
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
            <textarea rows={8} value={importText} onChange={e => { setImportText(e.target.value); setImportError(''); }} />
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
