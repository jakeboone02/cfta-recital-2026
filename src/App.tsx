import { useEffect, useMemo, useState } from 'react';
import type { DanceRow, GroupOrders, RecitalDanceInstance, RecitalGroupRow } from './types';
import { SHOW_STRUCTURE } from './types';
import { WorkingArea } from './WorkingArea';
import { ReportArea } from './ReportArea';
import {
  buildDanceMap,
  buildDancerLookup,
  computeShowOrder,
  exportCSV,
  exportSQL,
  loadGroupOrders,
  saveGroupOrders,
} from './utils';

export const App = () => {
  const [dances, setDances] = useState<DanceRow[]>([]);
  const [reportData, setReportData] = useState<RecitalDanceInstance[]>([]);
  const [groups, setGroups] = useState<GroupOrders | null>(null);
  const [showSQL, setShowSQL] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/dances').then(r => r.json()) as Promise<DanceRow[]>,
      fetch('/api/groups').then(r => r.json()) as Promise<RecitalGroupRow[]>,
      fetch('/api/data').then(r => r.json()) as Promise<RecitalDanceInstance[]>,
    ]).then(([dances, apiGroups, data]) => {
      setDances(dances);
      setReportData(data);

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

  const shows = useMemo(
    () => (groups ? computeShowOrder(groups, danceMap, dancerLookup, SHOW_STRUCTURE) : []),
    [groups, danceMap, dancerLookup],
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

  const handleExportSQL = () => {
    if (!groups) return;
    const sql = exportSQL(groups);
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recital-groups-update.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    localStorage.removeItem('cfta-recital-2026-group-orders');
    location.reload();
  };

  if (!groups) return <div>Loading…</div>;

  const sqlText = exportSQL(groups);

  return (
    <div className="app-layout">
      <div className="left-panel">
        <WorkingArea groups={groups} danceMap={danceMap} onChange={handleGroupChange} />
        <div className="export-bar">
          <button onClick={handleExportCSV}>⬇ CSV</button>
          <button onClick={handleExportSQL}>⬇ SQL</button>
          <button onClick={() => setShowSQL(s => !s)}>📋 SQL</button>
          <button onClick={handleReset} className="btn-reset">↺ Reset</button>
        </div>
        {showSQL && (
          <div className="sql-modal">
            <textarea readOnly value={sqlText} rows={6} onClick={e => (e.target as HTMLTextAreaElement).select()} />
          </div>
        )}
      </div>
      <div className="right-panel">
        <ReportArea shows={shows} />
      </div>
    </div>
  );
};
