export function readStoredJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStoredJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readStoredString(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;

  return window.localStorage.getItem(key) ?? fallback;
}

export function writeStoredString(key: string, value: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, value);
}

export function removeStoredValue(key: string) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(key);
}
