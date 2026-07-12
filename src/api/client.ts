const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
}

async function request(path: string, { method = 'GET', body }: ApiOptions): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.error?.message || `Request failed (${res.status})`, res.status, json?.error);
  }
  return json;
}

// Thin fetch wrapper: always sends the session cookie, always speaks JSON,
// throws an Error carrying the HTTP status so callers can branch on 401/402.
export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const json = await request(path, opts);
  return json?.data as T;
}

// Like api<T>, but keeps the response envelope so callers get `meta` too
// (list endpoints return { data, meta: { total, take, skip } }).
export async function apiWithMeta<T, M>(
  path: string,
  opts: ApiOptions = {},
): Promise<{ data: T; meta: M }> {
  const json = await request(path, opts);
  return { data: json?.data as T, meta: json?.meta as M };
}
