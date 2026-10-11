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
  // A FormData body (a file upload) goes as it is: the browser sets the
  // multipart Content-Type itself, boundary included.
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.error?.message || `Request failed (${res.status})`, res.status, json?.error);
  }
  return json;
}

// Thin fetch wrapper: always sends the session cookie, speaks JSON (or sends a
// FormData body as multipart), throws an Error carrying the HTTP status so
// callers can branch on 401/402.
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

// For the endpoints that answer with a file's bytes instead of JSON. An error
// still arrives as the usual JSON envelope.
export async function apiBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include' });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(json?.error?.message || `Request failed (${res.status})`, res.status, json?.error);
  }
  return res.blob();
}
