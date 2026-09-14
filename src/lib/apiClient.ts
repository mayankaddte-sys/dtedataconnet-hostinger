/**
 * Drop-in replacement for the Supabase client, built to match ONLY the
 * query patterns this app actually uses in storage.ts / emailPasswordReset.ts
 * / emailReminderEngine.ts:
 *
 *   supabase.from(table).select('*')
 *   supabase.from(table).select('*').order(col, { ascending })
 *   supabase.from(table).upsert(rows, { onConflict: 'id' })
 *   supabase.from(table).delete().eq(col, val)
 *   supabase.from(table).delete().neq(col, val)
 *   supabase.rpc(fnName, params)
 *   supabase.functions.invoke(fnName, { body })
 *
 * It is NOT a general Supabase client — it doesn't support .single(),
 * .in(), joins, realtime, storage, or auth. If you add a new query
 * pattern to storage.ts later, extend QueryBuilder to match.
 *
 * TO SWITCH: in storage.ts, emailPasswordReset.ts, and
 * emailReminderEngine.ts, replace:
 *     import { supabase } from './supabaseClient';
 * with:
 *     import { apiClient as supabase } from './apiClient';
 * That's the only change needed in those files.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error('Missing VITE_API_KEY. Set it in your .env to match the backend\'s API_KEY.');
}

type ApiResult<T = any> = { data: T | null; error: { message: string } | null };

async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...(options.headers as Record<string, string> | undefined)
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Network error' } };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    return { data: null, error: { message: json?.error || res.statusText } };
  }
  return { data: (json?.data ?? json) as T, error: null };
}

type Filter = { col: string; type: 'eq' | 'neq'; val: any };

class QueryBuilder {
  private table: string;
  private op: 'select' | 'upsert' | 'delete' = 'select';
  private payload: any[] | null = null;
  private filters: Filter[] = [];
  private orderCol?: string;
  private orderAsc = true;

  constructor(table: string) {
    this.table = table;
  }

  select(_cols: string = '*') {
    this.op = 'select';
    return this;
  }

  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderCol = col;
    this.orderAsc = opts.ascending !== false;
    return this;
  }

  upsert(rows: any | any[], _opts: { onConflict?: string } = {}) {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, type: 'eq', val });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, type: 'neq', val });
    return this;
  }

  private buildQuery(): string {
    const params = new URLSearchParams();
    this.filters.forEach((f) => params.append(f.col, `${f.type}.${f.val}`));
    if (this.orderCol) {
      params.append('order', `${this.orderCol}.${this.orderAsc ? 'asc' : 'desc'}`);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  // Makes the builder awaitable, mirroring supabase-js's thenable query builders.
  then(resolve: (value: ApiResult) => void, reject: (reason?: any) => void) {
    (async () => {
      try {
        if (this.op === 'select') {
          resolve(await apiFetch(`/${this.table}${this.buildQuery()}`, { method: 'GET' }));
        } else if (this.op === 'upsert') {
          resolve(
            await apiFetch(`/${this.table}/upsert`, {
              method: 'POST',
              body: JSON.stringify({ rows: this.payload })
            })
          );
        } else if (this.op === 'delete') {
          resolve(await apiFetch(`/${this.table}${this.buildQuery()}`, { method: 'DELETE' }));
        }
      } catch (err) {
        reject(err);
      }
    })();
  }
}

export const apiClient = {
  from(table: string) {
    return new QueryBuilder(table);
  },

  rpc(fnName: string, params: Record<string, any> = {}) {
    return apiFetch(`/rpc/${fnName}`, { method: 'POST', body: JSON.stringify(params) });
  },

  functions: {
    invoke(fnName: string, opts: { body?: any } = {}) {
      return apiFetch(`/functions/${fnName}`, {
        method: 'POST',
        body: JSON.stringify(opts.body || {})
      });
    }
  }
};
