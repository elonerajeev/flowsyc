type AppEnv = {
  appEnv: string;
  apiBaseUrl: string;
  socketUrl: string;
  useRemoteApi: boolean;
  enableAnalytics: boolean;
  analyticsEndpoint: string;
  sentryDsn: string;
};

function readEnv(key: string, fallback = "") {
  if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env) {
    return String(import.meta.env[key as keyof ImportMetaEnv] ?? fallback);
  }
  return fallback;
}

function requireEnv(key: string): string {
  const value = readEnv(key).trim();
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const appEnv: AppEnv = {
  appEnv: readEnv("VITE_APP_ENV", "development"),
  apiBaseUrl: requireEnv("VITE_API_BASE_URL"),
  socketUrl: readEnv("VITE_SOCKET_URL", ""),
  useRemoteApi: readEnv("VITE_USE_REMOTE_API", "false") === "true",
  enableAnalytics: readEnv("VITE_ENABLE_ANALYTICS", "false") === "true",
  analyticsEndpoint: readEnv("VITE_ANALYTICS_ENDPOINT", ""),
  sentryDsn: readEnv("VITE_SENTRY_DSN", ""),
};

export const isProduction = appEnv.appEnv === "production";

export function getEnvWarnings() {
  const warnings: string[] = [];

  if (appEnv.enableAnalytics && !appEnv.analyticsEndpoint.trim()) {
    warnings.push("VITE_ENABLE_ANALYTICS is enabled but VITE_ANALYTICS_ENDPOINT is empty.");
  }

  return warnings;
}
