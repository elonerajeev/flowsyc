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

function extractApiErrorMessage(body: string, fallback: string) {
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    const message = parsed?.error?.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  } catch {
    // not JSON
  }
  return body;
}

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
    const message = extractApiErrorMessage(body, response.statusText || "Request failed");
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
    const message = extractApiErrorMessage(body, response.statusText || "Request failed");
    emitNetworkError({ endpoint, status: response.status, message });
    throw new ApiError(message, response.status, endpoint);
  }
}

export function isRemoteApiEnabled() {
  return appEnv.useRemoteApi && Boolean(appEnv.apiBaseUrl.trim());
}

type UploadFileOptions = {
  onProgress?: (percent: number) => void;
};

export async function uploadFile<T>(endpoint: string, file: File, fieldName = "file", options?: UploadFileOptions): Promise<T> {
  const authToken = getStoredAuthToken();
  const formData = new FormData();
  formData.append(fieldName, file);

  if (options?.onProgress) {
    return await new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", buildUrl(endpoint), true);
      xhr.withCredentials = true;

      if (authToken) {
        xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        options.onProgress?.(Math.min(100, Math.max(0, percent)));
      };

      xhr.onload = () => {
        const status = xhr.status;
        const responseText = xhr.responseText || "";

        if (status < 200 || status >= 300) {
          const message = responseText || xhr.statusText || "Upload failed";
          emitNetworkError({ endpoint, status, message });
          reject(new ApiError(message, status, endpoint));
          return;
        }

        try {
          const parsed = JSON.parse(responseText) as T;
          resolve(parsed);
        } catch {
          reject(new ApiError("Invalid upload response", status, endpoint));
        }
      };

      xhr.onerror = () => {
        const message = "Network error during upload";
        emitNetworkError({ endpoint, message });
        reject(new ApiError(message, 0, endpoint));
      };

      xhr.send(formData);
    });
  }

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
    const message = extractApiErrorMessage(body, response.statusText || "Upload failed");
    emitNetworkError({ endpoint, status: response.status, message });
    throw new ApiError(message, response.status, endpoint);
  }

  return (await response.json()) as T;
}
