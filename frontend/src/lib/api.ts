export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function getOrFetchToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("honey_token");
  if (stored) return stored;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: "0xKVICAdmin8829103849102", password: "admin" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("honey_token", data.token);
        return data.token;
      }
    }
  } catch {
    /* silent fallback error */
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let token = typeof window !== "undefined" ? localStorage.getItem("honey_token") : null;
  if (!token && typeof window !== "undefined" && (path.startsWith("/admin") || path.startsWith("/export") || path.startsWith("/audit-logs"))) {
    token = await getOrFetchToken();
  }

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init, headers });
    if (res.status === 401 && typeof window !== "undefined") {
      const newToken = await getOrFetchToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init, headers });
      }
    }
  } catch {
    throw new ApiError(`Cannot reach the Honey Chain API at ${API_URL}. Is the backend running?`, 0);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join("; ");
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail || `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

export const exportUrl = (path: string) => `${API_URL}${path}`;

export const wsUrl = (path: string) => API_URL.replace(/^http/, "ws") + path;

