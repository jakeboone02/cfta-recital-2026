import { useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { upsertTableRow, type TableData } from './api-client';
import { useTableRows, useDeleteRow, queryKeys } from './queries';

// ── Column override types ────────────────────────────────────────────────

interface SelectConfig {
  table: string; // lookup table to fetch options from
  labelColumn: string; // column to display as option label
  labelFn?: (row: Record<string, any>) => string; // custom label formatter (overrides labelColumn)
  valueColumn?: string; // column to use as value (defaults to labelColumn)
  saveTo?: string; // column to actually save to (for virtual columns)
}

export interface ColumnOverride {
  type?: 'checkbox' | 'select' | 'datetime-local';
  readOnly?: boolean;
  select?: SelectConfig;
  // Virtual column support (column not in original data)
  virtual?: boolean;
  header?: string;
  deriveFrom?: string; // derive value by looking up this column
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

  useEffect(() => {
    setValue(initialValue ?? '');
  }, [initialValue]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

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
        if (e.key === 'Escape') {
          setValue(initialValue ?? '');
          setEditing(false);
        }
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
  loading,
}: {
  value: any;
  rowIndex: number;
  columnId: string;
  onSave: (rowIndex: number, columnId: string, value: any) => void;
  options: string[];
  labels?: string[];
  loading?: boolean;
}) => (
  <select
    className={`dg-cell-select${loading ? ' dg-cell-select--loading' : ''}`}
    value={value ?? ''}
    onChange={e => onSave(rowIndex, columnId, e.target.value)}
    disabled={loading}>
    <option value="">{loading ? 'Loading…' : '--'}</option>
    {options.map((opt, i) => (
      <option key={opt} value={opt}>
        {labels ? labels[i] : opt}
      </option>
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
  useEffect(() => {
    setValue(toLocal(initialValue));
  }, [initialValue]);

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
  const queryClient = useQueryClient();
  const {
    data: tableData,
    isLoading: loading,
    error: queryError,
  } = useTableRows(instanceId, tableName);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterText, setFilterText] = useState('');
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const filterTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce filter input
  const handleFilterChange = useCallback((value: string) => {
    setFilterText(value);
    clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => setGlobalFilter(value), 200);
  }, []);

  const data = tableData?.rows ?? [];
  const meta = tableData
    ? { columns: tableData.columns, pk: tableData.pk, editableColumns: tableData.editableColumns }
    : null;
  const error = queryError?.message ?? '';

  // Collect lookup table names from overrides
  const lookupTableNames = useMemo(() => {
    if (!columnOverrides) return [] as string[];
    const tables = new Set<string>();
    for (const override of Object.values(columnOverrides)) {
      if (override.select?.table) tables.add(override.select.table);
    }
    return Array.from(tables).sort();
  }, [columnOverrides]);

  // Fetch each lookup table via shared query cache
  const lookupQueries = lookupTableNames.map(t => useTableRows(instanceId, t));
  const lookupsLoading = lookupQueries.some(q => q.isLoading);
  const lookupData = useMemo(() => {
    const result: Record<string, Record<string, any>[]> = {};
    lookupTableNames.forEach((t, i) => {
      if (lookupQueries[i].data) result[t] = lookupQueries[i].data!.rows;
    });
    return result;
  }, [lookupTableNames, ...lookupQueries.map(q => q.data)]);

  // Pre-build value→label maps for fast lookup in accessorFn, sorting, and filtering
  const lookupMaps = useMemo(() => {
    const overrides = columnOverrides ?? {};
    const maps: Record<string, Record<string, string>> = {};
    for (const [colId, ov] of Object.entries(overrides)) {
      if (!ov.select) continue;
      const rows = lookupData[ov.select.table] ?? [];
      const valueCol = ov.select.valueColumn ?? ov.select.labelColumn;
      const getLabel = ov.select.labelFn
        ? (r: Record<string, any>) => ov.select!.labelFn!(r)
        : (r: Record<string, any>) => String(r[ov.select!.labelColumn] ?? '');
      const map: Record<string, string> = {};
      for (const r of rows) map[String(r[valueCol])] = getLabel(r);
      maps[colId] = map;
    }
    return maps;
  }, [columnOverrides, lookupData]);

  const deleteMutation = useDeleteRow(instanceId, tableName);

  const handleSave = useCallback(
    async (rowIndex: number, columnId: string, value: any) => {
      if (!meta) return;
      const row = data[rowIndex];
      const pkValue = row[meta.pk];
      setSavingCell(`${rowIndex}-${columnId}`);
      try {
        await upsertTableRow(instanceId, tableName, { [meta.pk]: pkValue, [columnId]: value });
        // Optimistic update in cache
        queryClient.setQueryData<TableData>(queryKeys.table(instanceId, tableName), old => {
          if (!old) return old;
          return {
            ...old,
            rows: old.rows.map((r, i) => (i === rowIndex ? { ...r, [columnId]: value } : r)),
          };
        });
      } catch (e: any) {
        // Error will show via queryError on next refetch
      } finally {
        setSavingCell(null);
      }
    },
    [data, meta, instanceId, tableName, queryClient]
  );

  const handleDelete = useCallback(
    async (rowIndex: number) => {
      if (!meta) return;
      const row = data[rowIndex];
      const pkValue = row[meta.pk];
      deleteMutation.mutate(pkValue);
    },
    [data, meta, deleteMutation]
  );

  const handleAddRow = useCallback(async () => {
    if (!meta) return;
    const newRow: Record<string, any> = {};
    for (const col of meta.editableColumns) newRow[col] = '';
    try {
      await upsertTableRow(instanceId, tableName, newRow);
      // Refetch to get generated columns (like dancer_name)
      queryClient.invalidateQueries({ queryKey: queryKeys.table(instanceId, tableName) });
    } catch (e: any) {
      // Error handled by query refetch
    }
  }, [meta, instanceId, tableName, queryClient]);

  const columns: ColumnDef<Record<string, any>, any>[] = useMemo(() => {
    if (!meta) return [];
    const overrides = columnOverrides ?? {};
    const getLabel = (sel: SelectConfig, row: Record<string, any>) =>
      sel.labelFn ? sel.labelFn(row) : String(row[sel.labelColumn] ?? '');

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
            return (
              <CheckboxCell
                value={info.getValue()}
                rowIndex={info.row.index}
                columnId={col}
                onSave={handleSave}
              />
            );
          }
          if (ov?.type === 'select' && ov.select) {
            const opts = lookupData[ov.select.table] ?? [];
            const options = [...new Set(opts.map(r => r[ov.select!.labelColumn]).filter(Boolean))];
            const optLabels = ov.select.labelFn
              ? opts.map(r => getLabel(ov.select!, r))
              : undefined;
            return (
              <SelectCell
                value={info.getValue()}
                rowIndex={info.row.index}
                columnId={col}
                onSave={handleSave}
                options={options}
                labels={optLabels}
                loading={lookupsLoading}
              />
            );
          }
          if (ov?.type === 'datetime-local') {
            return (
              <DateTimeLocalCell
                value={info.getValue()}
                rowIndex={info.row.index}
                columnId={col}
                onSave={handleSave}
              />
            );
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
        accessorFn: row => {
          if (ov.deriveFrom) {
            const map = lookupMaps[colId] ?? {};
            return map[String(row[ov.deriveFrom])] ?? '';
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
          const labels = lookup.map(item => getLabel(ov.select!, item));

          return (
            <SelectCell
              value={currentValue ?? ''}
              rowIndex={info.row.index}
              columnId={saveTo}
              onSave={(rowIdx, colName, v) => {
                // Match the type of the existing value
                const typed = v === '' ? '' : typeof currentValue === 'number' ? Number(v) : v;
                handleSave(rowIdx, colName, typed);
              }}
              options={options}
              labels={labels}
              loading={lookupsLoading}
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
          title="Delete row">
          ✕
        </button>
      ),
    });

    return cols;
  }, [meta, columnOverrides, lookupData, lookupMaps, lookupsLoading, handleSave, handleDelete]);

  const globalFilterFn = useCallback(
    (row: any, _columnId: string, filterValue: string) => {
      const search = filterValue.toLowerCase();
      // Search raw column values
      if (
        Object.values(row.original).some(
          (v: any) => v != null && String(v).toLowerCase().includes(search)
        )
      )
        return true;
      // Search resolved lookup labels
      for (const [colId, map] of Object.entries(lookupMaps)) {
        const sourceCol = columnOverrides?.[colId]?.deriveFrom ?? colId;
        const rawVal = row.original[sourceCol];
        if (rawVal != null) {
          const label = map[String(rawVal)];
          if (label && label.toLowerCase().includes(search)) return true;
        }
      }
      return false;
    },
    [lookupMaps, columnOverrides]
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
          value={filterText}
          onChange={e => handleFilterChange(e.target.value)}
        />
        <span className="dg-count">
          {table.getFilteredRowModel().rows.length} of {data.length} rows
        </span>
        <button className="dg-add-btn" onClick={handleAddRow}>
          + Add Row
        </button>
        <button
          className="dg-refresh-btn"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: queryKeys.table(instanceId, tableName) })
          }
          title="Refresh">
          ↻
        </button>
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
                    onClick={header.column.getToggleSortingHandler()}>
                    <span className="dg-header-content">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span
                          className={`dg-sort-icon${header.column.getIsSorted() ? ' dg-sort-active' : ''}`}>
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
                  <td
                    key={cell.id}
                    className={savingCell === `${row.index}-${cell.column.id}` ? 'dg-saving' : ''}>
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
