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
  const [sqlCopied, setSqlCopied] = useState(false);

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

  const handleCopySQL = () => {
    if (!groups) return;
    navigator.clipboard.writeText(exportSQL(groups)).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 1500);
    });
  };

  const handleReset = () => {
    localStorage.removeItem('cfta-recital-2026-group-orders');
    location.reload();
  };

  if (!groups) return <div>Loading…</div>;

  return (
    <div className="app-layout">
      <div className="toolbar">
        <button onClick={handleExportCSV} title="Download show order as CSV file">💾 CSV</button>
        <button onClick={handleExportSQL} title="Download SQL UPDATE statements to sync database">💾 SQL</button>
        <button onClick={handleCopySQL} title="Copy SQL UPDATE statements to clipboard">
          {sqlCopied ? '✓ Copied' : '📋 SQL'}
        </button>
        <button onClick={handleReset} className="btn-reset" title="Reset dance order to original database order">↺ Reset</button>
      </div>
      <div className="left-panel">
        <WorkingArea groups={groups} danceMap={danceMap} onChange={handleGroupChange} />
      </div>
      <div className="right-panel">
        <ReportArea shows={shows} />
      </div>
    </div>
  );
};
