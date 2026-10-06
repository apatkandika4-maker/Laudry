const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

const TOKEN_KEY = "laundry_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server. Pastikan backend berjalan.");
  }

  // Sesi habis → kembali ke halaman masuk
  if (res.status === 401 && auth) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Sesi berakhir. Silakan masuk kembali.");
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.message ?? "Terjadi kesalahan pada server.", data.errors);
  }

  return data as T;
}

/** Pesan error ramah untuk ditampilkan di toast. */
export function errorMessage(err: unknown, fallback = "Terjadi kesalahan."): string {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined;
    return first ?? err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

/** Error per field dari validasi Laravel (422). */
export function fieldErrors(err: unknown): Record<string, string[]> {
  return err instanceof ApiError && err.errors ? err.errors : {};
}
