import type { DanceRow, RecitalGroupRow, ComboPair, GroupOrders } from './types';
import type { Bookmark } from './utils';

const API_BASE = '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 401) {
    // Redirect to login
    window.location.hash = '#/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `API error ${res.status}`);
  }
  return res.json();
}

// Auth
export const login = (password: string) =>
  apiFetch<{ ok: boolean }>('/auth', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

// Instances
export interface RecitalInstance {
  id: number;
  name: string;
  year: number;
  is_archived: number;
  created_at: string;
  config: string | null;
}

export const getInstances = () => apiFetch<RecitalInstance[]>('/instances');

export const createInstance = (name: string, year: number) =>
  apiFetch<RecitalInstance>('/instances', {
    method: 'POST',
    body: JSON.stringify({ name, year }),
  });

// Instance data
export interface InstanceData {
  dances: DanceRow[];
  groups: RecitalGroupRow[];
  comboPairs: ComboPair[];
  dancersByDance: Record<number, string[]>;
  dancerLastNames: Record<string, string>;
  config: any | null;
}

export const getInstanceData = (id: number) => apiFetch<InstanceData>(`/instances/${id}/data`);

// CSV upload
export const uploadCsv = (id: number, table: string, csv: string) =>
  apiFetch<{ ok: boolean; rows: number }>(`/instances/${id}/csv`, {
    method: 'POST',
    body: JSON.stringify({ table, csv }),
  });

export const uploadAllCsvs = (id: number, tables: Record<string, string>) =>
  apiFetch<{ ok: boolean }>(`/instances/${id}/csv`, {
    method: 'POST',
    body: JSON.stringify({ tables }),
  });

// Orders
export interface OrderData {
  groupOrders: GroupOrders | null;
  bookmarks: Bookmark[];
}

export const getOrder = (id: number) => apiFetch<OrderData>(`/instances/${id}/order`);

export const saveOrder = (id: number, groupOrders: GroupOrders) =>
  apiFetch<{ ok: boolean }>(`/instances/${id}/order`, {
    method: 'PUT',
    body: JSON.stringify({ groupOrders }),
  });

export const saveBookmark = (id: number, name: string, groupOrders: GroupOrders) =>
  apiFetch<{ ok: boolean }>(`/instances/${id}/order`, {
    method: 'POST',
    body: JSON.stringify({ name, groupOrders }),
  });

export const renameBookmarkApi = (id: number, oldName: string, newName: string) =>
  apiFetch<{ ok: boolean }>(`/instances/${id}/order`, {
    method: 'PATCH',
    body: JSON.stringify({ oldName, newName }),
  });

export const deleteBookmarkApi = (id: number, name: string) =>
  apiFetch<{ ok: boolean }>(`/instances/${id}/order?name=${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });

// Table CRUD
export interface TableData {
  rows: Record<string, any>[];
  columns: string[];
  pk: string;
  editableColumns: string[];
}

export const getTableRows = (instanceId: number, table: string) =>
  apiFetch<TableData>(`/instances/${instanceId}/tables/${table}`);

export const upsertTableRow = (instanceId: number, table: string, row: Record<string, any>) =>
  apiFetch<{ ok: boolean; id?: number }>(`/instances/${instanceId}/tables/${table}`, {
    method: 'PUT',
    body: JSON.stringify(row),
  });

export const deleteTableRow = (instanceId: number, table: string, id: string | number) =>
  apiFetch<{ ok: boolean }>(`/instances/${instanceId}/tables/${table}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
