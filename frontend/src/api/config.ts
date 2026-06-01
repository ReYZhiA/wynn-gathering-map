export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const USE_STATIC_DATA = import.meta.env.VITE_STATIC_DATA === "true";

export function staticDataUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}data/${fileName}`;
}
