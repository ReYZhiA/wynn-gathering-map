const DEFAULT_API_BASE_URL =
  typeof window === "undefined"
    ? "http://localhost:8000"
    : `${window.location.protocol}//${window.location.hostname}:8000`;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
export const USE_STATIC_DATA = import.meta.env.VITE_STATIC_DATA === "true";

export function staticDataUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}data/${fileName}`;
}
