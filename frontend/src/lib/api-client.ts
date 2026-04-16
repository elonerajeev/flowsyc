import { appEnv } from "@/lib/env";

export class ApiError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

type NetworkErrorDetail = {
  endpoint: string;
  status?: number;
  message: string;
};

function emitNetworkError(detail: NetworkErrorDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("crm:network-error", { detail }));
}

function getStoredAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("crm-auth-token") ?? "";
}

function buildUrl(endpoint: string) {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  // If using relative URL (/api), prepend /api to the endpoint for the proxy
  if (!appEnv.apiBaseUrl.startsWith("http")) {
    // Prepend /api for all endpoints when using proxy mode
    return `/api${normalizedEndpoint}`;
  }
  // Otherwise use absolute URL
  if (appEnv.apiBaseUrl.startsWith("http")) {
    return new URL(normalizedEndpoint, appEnv.apiBaseUrl).toString();
  }
  return `${appEnv.apiBaseUrl.replace(/\/$/, "")}${normalizedEndpoint}`;
}

export async function requestJson<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const authToken = getStoredAuthToken();
  const response = await fetch(buildUrl(endpoint), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = body || response.statusText || "Request failed";
    emitNetworkError({ endpoint, status: response.status, message });
    throw new ApiError(message, response.status, endpoint);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function requestVoid(endpoint: string, init?: RequestInit): Promise<void> {
  const authToken = getStoredAuthToken();
  const response = await fetch(buildUrl(endpoint), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = body || response.statusText || "Request failed";
    emitNetworkError({ endpoint, status: response.status, message });
    throw new ApiError(message, response.status, endpoint);
  }
}

export function isRemoteApiEnabled() {
  return appEnv.useRemoteApi && Boolean(appEnv.apiBaseUrl.trim());
}

export async function uploadFile<T>(endpoint: string, file: File, fieldName = "file"): Promise<T> {
  const authToken = getStoredAuthToken();
  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetch(buildUrl(endpoint), {
    method: "POST",
    credentials: "include",
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = body || response.statusText || "Upload failed";
    emitNetworkError({ endpoint, status: response.status, message });
    throw new ApiError(message, response.status, endpoint);
  }

  return (await response.json()) as T;
}
