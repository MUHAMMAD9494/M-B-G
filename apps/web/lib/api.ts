function resolveApiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === 'production' && !url) {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be set when building/running in production.',
    );
  }
  return url ?? 'http://localhost:4000/api/v1';
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${resolveApiBase()}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: ApiEnvelope<T> | ApiErrorBody | null = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }

  if (!res.ok) {
    const err = (payload as ApiErrorBody | null)?.error;
    throw new ApiError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? `Request failed (${res.status})`,
      res.status,
      err?.details,
    );
  }

  return (payload as ApiEnvelope<T>).data;
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: unknown, token?: string) => request<T>('POST', path, body, token),
  patch: <T>(path: string, body?: unknown, token?: string) => request<T>('PATCH', path, body, token),
  del: <T>(path: string, token?: string) => request<T>('DELETE', path, undefined, token),
};

// ---- Device ID (used by attendance check-in) ----

const DEVICE_ID_KEY = 'nexora_device_id';

function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateDeviceId();
  try {
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
 return id;
  }
  return id;
}
