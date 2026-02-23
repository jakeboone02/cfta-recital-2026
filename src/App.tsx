import { useEffect, useMemo, useState } from 'react';
import type {
  ComboPair,
  DanceRow,
  GroupOrders,
  RecitalDanceInstance,
  RecitalGroupRow,
} from './types';
import { SHOW_STRUCTURE, buildComboSiblingMap } from './types';
import { WorkingArea } from './WorkingArea';
import { ReportArea } from './ReportArea';
import {
  buildDanceMap,
  buildDancerLookup,
  computeShowOrder,
  exportCSV,
  exportGroupOrdersCSV,
  loadGroupOrders,
  parseGroupOrdersCSV,
  saveGroupOrders,
} from './utils';

export const App = () => {
  const [dances, setDances] = useState<DanceRow[]>([]);
  const [reportData, setReportData] = useState<RecitalDanceInstance[]>([]);
  const [groups, setGroups] = useState<GroupOrders | null>(null);
  const [comboPairs, setComboPairs] = useState<ComboPair[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importCopied, setImportCopied] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/dances').then(r => r.json()) as Promise<DanceRow[]>,
      fetch('/api/groups').then(r => r.json()) as Promise<RecitalGroupRow[]>,
      fetch('/api/data').then(r => r.json()) as Promise<RecitalDanceInstance[]>,
      fetch('/api/combo-pairs').then(r => r.json()) as Promise<ComboPair[]>,
    ]).then(([dances, apiGroups, data, pairs]) => {
      setDances(dances);
      setReportData(data);
      setComboPairs(pairs);

      const saved = loadGroupOrders();
      if (saved) {
        setGroups(saved);
      } else {
        const initial: GroupOrders = { A: [], B: [], C: [] };
        for (const g of apiGroups) initial[g.recital_group] = g.show_order;
        setGroups(initial);
      }
    });
  }, []);

  const danceMap = useMemo(() => buildDanceMap(dances), [dances]);
  const dancerLookup = useMemo(() => buildDancerLookup(reportData), [reportData]);
  const comboSiblingMap = useMemo(() => buildComboSiblingMap(comboPairs), [comboPairs]);

  const shows = useMemo(
    () => (groups ? computeShowOrder(groups, danceMap, dancerLookup, SHOW_STRUCTURE) : []),
    [groups, danceMap, dancerLookup]
  );

  const handleGroupChange = (newGroups: GroupOrders) => {
    setGroups(newGroups);
    saveGroupOrders(newGroups);
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

  const handleReset = () => {
    localStorage.removeItem('cfta-recital-2026-group-orders');
    location.reload();
  };

  if (!groups) return <div>Loading…</div>;

  return (
    <div className="app-layout">
      <div className="left-panel">
        <WorkingArea
          groups={groups}
          danceMap={danceMap}
          comboSiblingMap={comboSiblingMap}
          onChange={handleGroupChange}
          actions={
            <button
                onClick={handleReset}
                className="btn-reset"
                title="Reset dance order to original database order">
                ↺ Reset
              </button>
          }
        />
      </div>
      <div className="right-panel">
        <ReportArea
          shows={shows}
          actions={
            <div className="header-actions">
              <button onClick={handleExportCSV} title="Download show order as CSV file">
                💾 Download Show Order (CSV)
              </button>
              <button onClick={handleOpenImport} title="Import/export group orders as CSV">
                📥 Import/Export
              </button>
            </div>
          }
        />
      </div>
      {importOpen && (
        <div className="modal-overlay" onClick={() => setImportOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Import / Export Group Orders</h3>
            <textarea
              rows={8}
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportError(''); }}
            />
            {importError && <div className="import-error">{importError}</div>}
            <div className="modal-actions">
              <button onClick={handleApplyImport}>Apply</button>
              <button onClick={handleCopyImport}>
                {importCopied ? '✓ Copied' : '📋 Copy'}
              </button>
              <button onClick={() => setImportOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
