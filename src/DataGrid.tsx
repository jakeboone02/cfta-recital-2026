import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  getTableRows,
  upsertTableRow,
  deleteTableRow,
  type TableData,
} from './api-client';

interface Props {
  instanceId: number;
  tableName: string;
}

// Editable cell component
const EditableCell = ({
  value: initialValue,
  rowIndex,
  columnId,
  onSave,
  isEditable,
}: {
  value: any;
  rowIndex: number;
  columnId: string;
  onSave: (rowIndex: number, columnId: string, value: any) => void;
  isEditable: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(initialValue ?? ''); }, [initialValue]);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (!isEditable) return <span className="dg-cell-readonly">{String(initialValue ?? '')}</span>;

  if (!editing) {
    return (
      <span className="dg-cell-display" onClick={() => setEditing(true)}>
        {String(value) || '\u00A0'}
      </span>
    );
  }

  const commit = () => {
    setEditing(false);
    if (value !== initialValue) onSave(rowIndex, columnId, value);
  };

  return (
    <input
      ref={inputRef}
      className="dg-cell-input"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { setValue(initialValue ?? ''); setEditing(false); }
      }}
    />
  );
};

export const DataGrid = ({ instanceId, tableName }: Props) => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [meta, setMeta] = useState<Omit<TableData, 'rows'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      const result = await getTableRows(instanceId, tableName);
      setData(result.rows);
      setMeta({ columns: result.columns, pk: result.pk, editableColumns: result.editableColumns });
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [instanceId, tableName]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = useCallback(async (rowIndex: number, columnId: string, value: any) => {
    if (!meta) return;
    const row = data[rowIndex];
    const pkValue = row[meta.pk];
    setSaving(`${rowIndex}-${columnId}`);
    try {
      await upsertTableRow(instanceId, tableName, { [meta.pk]: pkValue, [columnId]: value });
      setData(prev => prev.map((r, i) => i === rowIndex ? { ...r, [columnId]: value } : r));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }, [data, meta, instanceId, tableName]);

  const handleDelete = useCallback(async (rowIndex: number) => {
    if (!meta) return;
    const row = data[rowIndex];
    const pkValue = row[meta.pk];
    try {
      await deleteTableRow(instanceId, tableName, pkValue);
      setData(prev => prev.filter((_, i) => i !== rowIndex));
    } catch (e: any) {
      setError(e.message);
    }
  }, [data, meta, instanceId, tableName]);

  const handleAddRow = useCallback(async () => {
    if (!meta) return;
    // Insert a row with empty values for editable columns
    const newRow: Record<string, any> = {};
    for (const col of meta.editableColumns) newRow[col] = '';
    try {
      const result = await upsertTableRow(instanceId, tableName, newRow);
      newRow[meta.pk] = result.id;
      // Reload to get generated columns (like dancer_name)
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  }, [meta, instanceId, tableName, loadData]);

  const columns: ColumnDef<Record<string, any>, any>[] = useMemo(() => meta
    ? [
        ...meta.columns.map(col => ({
          id: col,
          accessorKey: col,
          header: col,
          enableSorting: true,
          cell: (info: any) => (
            <EditableCell
              value={info.getValue()}
              rowIndex={info.row.index}
              columnId={col}
              onSave={handleSave}
              isEditable={meta.editableColumns.includes(col)}
            />
          ),
        })),
        {
          id: '_actions',
          header: '',
          enableSorting: false,
          cell: (info: any) => (
            <button
              className="dg-delete-btn"
              onClick={() => handleDelete(info.row.index)}
              title="Delete row"
            >✕</button>
          ),
        },
      ]
    : [], [meta, handleSave, handleDelete]);

  const globalFilterFn = useCallback(
    (row: any, _columnId: string, filterValue: string) => {
      const search = filterValue.toLowerCase();
      return Object.values(row.original).some(
        v => v != null && String(v).toLowerCase().includes(search)
      );
    },
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) return <div className="dg-loading">Loading…</div>;
  if (error) return <div className="dg-error">{error}</div>;
  if (!meta) return null;

  return (
    <div className="dg-container">
      <div className="dg-toolbar">
        <input
          className="dg-filter-input"
          type="text"
          placeholder="Filter…"
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
        />
        <span className="dg-count">{table.getFilteredRowModel().rows.length} of {data.length} rows</span>
        <button className="dg-add-btn" onClick={handleAddRow}>+ Add Row</button>
        <button className="dg-refresh-btn" onClick={loadData} title="Refresh">↻</button>
      </div>
      <div className="dg-table-wrapper">
        <table className="dg-table">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className={header.column.getCanSort() ? 'dg-sortable' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="dg-header-content">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className={`dg-sort-icon${header.column.getIsSorted() ? ' dg-sort-active' : ''}`}>
                          {{ asc: '▲', desc: '▼' }[header.column.getIsSorted() as string] ?? '⇅'}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={saving === `${row.index}-${cell.column.id}` ? 'dg-saving' : ''}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
