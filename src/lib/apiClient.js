const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? 0;
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {string} path
 * @param {{ method?: string; body?: unknown; signal?: AbortSignal; headers?: Record<string, string> }} [options]
 */
export async function apiRequest(path, { method = "GET", body, signal, headers: extraHeaders } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = { Accept: "application/json" };
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }
  const init = {
    method,
    headers,
    signal,
    credentials: "same-origin",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : null;

  if (!response.ok) {
    throw new ApiError(payload?.error || `Request failed (${response.status})`, {
      status: response.status,
      code: payload?.code,
      details: payload,
    });
  }

  return payload;
}

export function recordReviewVisit(payload) {
  return apiRequest("/api/reviews/visit", { method: "POST", body: payload });
}

export function submitReviewFeedback(payload) {
  return apiRequest("/api/reviews/feedback", { method: "POST", body: payload });
}

export function fetchAdminSession(accessToken) {
  return apiRequest("/api/admin/session", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function fetchAdminOverview(accessToken) {
  return apiRequest("/api/admin/overview", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
