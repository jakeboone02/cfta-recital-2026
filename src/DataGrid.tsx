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

// ── Column override types ────────────────────────────────────────────────

interface SelectConfig {
  table: string;        // lookup table to fetch options from
  labelColumn: string;  // column to display as option label
  valueColumn?: string; // column to use as value (defaults to labelColumn)
  saveTo?: string;      // column to actually save to (for virtual columns)
}

export interface ColumnOverride {
  type?: 'checkbox' | 'select' | 'datetime-local';
  readOnly?: boolean;
  select?: SelectConfig;
  // Virtual column support (column not in original data)
  virtual?: boolean;
  header?: string;
  deriveFrom?: string;  // derive value by looking up this column
  insertAfter?: string; // position after this column
}

interface Props {
  instanceId: number;
  tableName: string;
  columnOverrides?: Record<string, ColumnOverride>;
}

// ── Editable cell component (text) ───────────────────────────────────────

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

// ── Checkbox cell (0/1) ──────────────────────────────────────────────────

const CheckboxCell = ({
  value,
  rowIndex,
  columnId,
  onSave,
}: {
  value: any;
  rowIndex: number;
  columnId: string;
  onSave: (rowIndex: number, columnId: string, value: any) => void;
}) => (
  <input
    type="checkbox"
    className="dg-cell-checkbox"
    checked={value == 1}
    onChange={e => onSave(rowIndex, columnId, e.target.checked ? 1 : 0)}
  />
);

// ── Select cell ──────────────────────────────────────────────────────────

const SelectCell = ({
  value,
  rowIndex,
  columnId,
  onSave,
  options,
  labels,
}: {
  value: any;
  rowIndex: number;
  columnId: string;
  onSave: (rowIndex: number, columnId: string, value: any) => void;
  options: string[];
  labels?: string[];
}) => (
  <select
    className="dg-cell-select"
    value={value ?? ''}
    onChange={e => onSave(rowIndex, columnId, e.target.value)}
  >
    <option value="">--</option>
    {options.map((opt, i) => (
      <option key={opt} value={opt}>{labels ? labels[i] : opt}</option>
    ))}
  </select>
);

// ── DateTime-local cell (ISO 8601) ───────────────────────────────────────

const DateTimeLocalCell = ({
  value: initialValue,
  rowIndex,
  columnId,
  onSave,
}: {
  value: any;
  rowIndex: number;
  columnId: string;
  onSave: (rowIndex: number, columnId: string, value: any) => void;
}) => {
  const toLocal = (v: any): string => {
    if (!v) return '';
    const s = String(v);
    try {
      const date = new Date(s);
      if (isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${mo}-${d}T${h}:${mi}`;
    } catch {
      return '';
    }
  };

  const initial = toLocal(initialValue);
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(toLocal(initialValue)); }, [initialValue]);

  return (
    <input
      type="datetime-local"
      className="dg-cell-datetime"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) {
          const iso = value ? value + ':00' : '';
          onSave(rowIndex, columnId, iso);
        }
      }}
    />
  );
};

// ── DataGrid component ───────────────────────────────────────────────────

export const DataGrid = ({ instanceId, tableName, columnOverrides }: Props) => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [meta, setMeta] = useState<Omit<TableData, 'rows'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [lookupData, setLookupData] = useState<Record<string, Record<string, any>[]>>({});

  // Determine which lookup tables need to be fetched (stable key to avoid unnecessary refetches)
  const lookupKey = useMemo(() => {
    if (!columnOverrides) return '';
    const tables = new Set<string>();
    for (const override of Object.values(columnOverrides)) {
      if (override.select?.table) tables.add(override.select.table);
    }
    return Array.from(tables).sort().join(',');
  }, [columnOverrides]);

  const lookupTables = useMemo(() => lookupKey ? lookupKey.split(',') : [], [lookupKey]);

  // Fetch lookup data with cleanup for stale requests
  useEffect(() => {
    if (lookupTables.length === 0) return;
    let cancelled = false;
    for (const table of lookupTables) {
      getTableRows(instanceId, table)
        .then(result => {
          if (!cancelled) setLookupData(prev => ({ ...prev, [table]: result.rows }));
        })
        .catch(e => {
          if (!cancelled) {
            console.error(`Failed to load lookup table "${table}":`, e);
            setError(`Failed to load lookup data for ${table}`);
          }
        });
    }
    return () => { cancelled = true; };
  }, [lookupTables, instanceId]);

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

  const columns: ColumnDef<Record<string, any>, any>[] = useMemo(() => {
    if (!meta) return [];
    const overrides = columnOverrides ?? {};

    // Build columns from meta
    const cols: ColumnDef<Record<string, any>, any>[] = meta.columns.map(col => {
      const ov = overrides[col];
      const isEditable = !ov?.readOnly && meta.editableColumns.includes(col);

      return {
        id: col,
        accessorKey: col,
        header: ov?.header ?? col,
        enableSorting: true,
        cell: (info: any) => {
          if (ov?.type === 'checkbox') {
            return <CheckboxCell value={info.getValue()} rowIndex={info.row.index} columnId={col} onSave={handleSave} />;
          }
          if (ov?.type === 'select' && ov.select) {
            const opts = lookupData[ov.select.table] ?? [];
            const options = [...new Set(opts.map(r => r[ov.select!.labelColumn]).filter(Boolean))];
            return <SelectCell value={info.getValue()} rowIndex={info.row.index} columnId={col} onSave={handleSave} options={options} />;
          }
          if (ov?.type === 'datetime-local') {
            return <DateTimeLocalCell value={info.getValue()} rowIndex={info.row.index} columnId={col} onSave={handleSave} />;
          }
          return (
            <EditableCell
              value={info.getValue()}
              rowIndex={info.row.index}
              columnId={col}
              onSave={handleSave}
              isEditable={isEditable}
            />
          );
        },
      };
    });

    // Insert virtual columns
    for (const [colId, ov] of Object.entries(overrides)) {
      if (!ov.virtual) continue;

      const virtualCol: ColumnDef<Record<string, any>, any> = {
        id: colId,
        header: ov.header ?? colId,
        enableSorting: true,
        accessorFn: (row) => {
          if (ov.select && ov.deriveFrom) {
            const lookup = lookupData[ov.select.table] ?? [];
            const valueCol = ov.select.valueColumn ?? ov.select.labelColumn;
            const match = lookup.find(r => r[valueCol] == row[ov.deriveFrom!]);
            return match ? match[ov.select.labelColumn] : '';
          }
          return '';
        },
        cell: (info: any) => {
          if (!ov.select) return null;
          const lookup = lookupData[ov.select.table] ?? [];
          const valueCol = ov.select.valueColumn ?? ov.select.labelColumn;
          const saveTo = ov.select.saveTo ?? colId;
          const currentValue = info.row.original[saveTo];

          const options = lookup.map(item => String(item[valueCol]));
          const labels = lookup.map(item => String(item[ov.select!.labelColumn]));

          return (
            <SelectCell
              value={currentValue ?? ''}
              rowIndex={info.row.index}
              columnId={saveTo}
              onSave={(rowIdx, colName, v) => {
                // Match the type of the existing value
                const typed = v === '' ? '' : (typeof currentValue === 'number' ? Number(v) : v);
                handleSave(rowIdx, colName, typed);
              }}
              options={options}
              labels={labels}
            />
          );
        },
      };

      if (ov.insertAfter) {
        const idx = cols.findIndex(c => c.id === ov.insertAfter);
        cols.splice(idx >= 0 ? idx + 1 : cols.length, 0, virtualCol);
      } else {
        cols.push(virtualCol);
      }
    }

    // Delete action column
    cols.push({
      id: '_actions',
      header: '',
      enableSorting: false,
      cell: (info: any) => (
        <button
          className="dg-delete-btn"
          onClick={() => handleDelete(info.row.index)}
          title="Delete row"
        >&#10005;</button>
      ),
    });

    return cols;
  }, [meta, columnOverrides, lookupData, handleSave, handleDelete]);

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

  if (loading) return <div className="dg-loading">Loading...</div>;
  if (error) return <div className="dg-error">{error}</div>;
  if (!meta) return null;

  return (
    <div className="dg-container">
      <div className="dg-toolbar">
        <input
          className="dg-filter-input"
          type="text"
          placeholder="Filter..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
        />
        <span className="dg-count">{table.getFilteredRowModel().rows.length} of {data.length} rows</span>
        <button className="dg-add-btn" onClick={handleAddRow}>+ Add Row</button>
        <button className="dg-refresh-btn" onClick={loadData} title="Refresh">&#8635;</button>
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
                          {{ asc: '\u25B2', desc: '\u25BC' }[header.column.getIsSorted() as string] ?? '\u21C5'}
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
