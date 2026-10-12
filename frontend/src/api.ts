import type { AnalysisRequest, AnalysisResult } from "./types";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export async function analyzeRoute(
  req: AnalysisRequest
): Promise<AnalysisResult> {
  const resp = await fetch(`${API_BASE}/analyze/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error ?? `Request failed (${resp.status})`);
  }
  return resp.json();
}

export async function fetchHeatmap(
  geometry: [number, number][],
  departure: string,
  loadLbs: number
): Promise<{ points: any[] }> {
  const resp = await fetch(`${API_BASE}/heatmap/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry, departure, load_lbs: loadLbs }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error ?? `Request failed (${resp.status})`);
  }
  return resp.json();
}
