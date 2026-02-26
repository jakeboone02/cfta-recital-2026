import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  login as apiLogin,
  getInstances,
  createInstance as apiCreateInstance,
  getInstanceData,
  getOrder,
  saveOrder as apiSaveOrder,
  saveBookmark as apiSaveBookmark,
  deleteBookmarkApi,
  renameBookmarkApi,
  getTableRows,
  upsertTableRow,
  deleteTableRow,
  type RecitalInstance,
  type InstanceData,
  type OrderData,
  type TableData,
} from './api-client';
import type { GroupOrders } from './types';
import type { Bookmark } from './utils';
import { useCallback, useRef } from 'react';

// ── Query key factory ────────────────────────────────────────────────────

export const queryKeys = {
  instances: ['instances'] as const,
  instanceData: (id: number) => ['instance-data', id] as const,
  order: (id: number) => ['order', id] as const,
  table: (instanceId: number, tableName: string) => ['table', instanceId, tableName] as const,
};

// ── Query hooks ──────────────────────────────────────────────────────────

export const useInstances = () =>
  useQuery({
    queryKey: queryKeys.instances,
    queryFn: getInstances,
  });

export const useInstanceData = (instanceId: number) =>
  useQuery({
    queryKey: queryKeys.instanceData(instanceId),
    queryFn: () => getInstanceData(instanceId),
  });

export const useOrder = (instanceId: number) =>
  useQuery({
    queryKey: queryKeys.order(instanceId),
    queryFn: () => getOrder(instanceId),
  });

export const useTableRows = (instanceId: number, tableName: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.table(instanceId, tableName),
    queryFn: () => getTableRows(instanceId, tableName),
    enabled,
  });

// ── Mutation hooks ───────────────────────────────────────────────────────

export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => apiLogin(password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.instances }); },
  });
};

export const useCreateInstance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, year }: { name: string; year: number }) => apiCreateInstance(name, year),
    onSuccess: (inst) => {
      qc.setQueryData<RecitalInstance[]>(queryKeys.instances, prev => prev ? [inst, ...prev] : [inst]);
    },
  });
};

export const useSaveOrder = (instanceId: number) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mutation = useMutation({
    mutationFn: (groups: GroupOrders) => apiSaveOrder(instanceId, groups),
  });

  const debouncedSave = useCallback((groups: GroupOrders) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => mutation.mutate(groups), 500);
  }, [mutation]);

  return debouncedSave;
};

export const useSaveBookmark = (instanceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, groups }: { name: string; groups: GroupOrders }) =>
      apiSaveBookmark(instanceId, name, groups),
    onSuccess: (_data, { name, groups }) => {
      qc.setQueryData<OrderData>(queryKeys.order(instanceId), prev => {
        if (!prev) return prev;
        const newBookmark: Bookmark = { name, groups, savedAt: new Date().toISOString() };
        return { ...prev, bookmarks: [...prev.bookmarks, newBookmark] };
      });
    },
  });
};

export const useDeleteBookmark = (instanceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteBookmarkApi(instanceId, name),
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: queryKeys.order(instanceId) });
      const prev = qc.getQueryData<OrderData>(queryKeys.order(instanceId));
      qc.setQueryData<OrderData>(queryKeys.order(instanceId), old => {
        if (!old) return old;
        return { ...old, bookmarks: old.bookmarks.filter(b => b.name !== name) };
      });
      return { prev };
    },
    onError: (_err, _name, context) => {
      if (context?.prev) qc.setQueryData(queryKeys.order(instanceId), context.prev);
    },
  });
};

export const useRenameBookmark = (instanceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      renameBookmarkApi(instanceId, oldName, newName),
    onMutate: async ({ oldName, newName }) => {
      await qc.cancelQueries({ queryKey: queryKeys.order(instanceId) });
      const prev = qc.getQueryData<OrderData>(queryKeys.order(instanceId));
      qc.setQueryData<OrderData>(queryKeys.order(instanceId), old => {
        if (!old) return old;
        return { ...old, bookmarks: old.bookmarks.map(b => b.name === oldName ? { ...b, name: newName } : b) };
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(queryKeys.order(instanceId), context.prev);
    },
  });
};

export const useUpsertRow = (instanceId: number, tableName: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Record<string, any>) => upsertTableRow(instanceId, tableName, row),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.table(instanceId, tableName) });
    },
  });
};

export const useDeleteRow = (instanceId: number, tableName: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pkValue: string | number) => deleteTableRow(instanceId, tableName, pkValue),
    onMutate: async (pkValue) => {
      await qc.cancelQueries({ queryKey: queryKeys.table(instanceId, tableName) });
      const prev = qc.getQueryData<TableData>(queryKeys.table(instanceId, tableName));
      qc.setQueryData<TableData>(queryKeys.table(instanceId, tableName), old => {
        if (!old) return old;
        return { ...old, rows: old.rows.filter(r => r[old.pk] !== pkValue) };
      });
      return { prev };
    },
    onError: (_err, _pk, context) => {
      if (context?.prev) qc.setQueryData(queryKeys.table(instanceId, tableName), context.prev);
    },
  });
};
