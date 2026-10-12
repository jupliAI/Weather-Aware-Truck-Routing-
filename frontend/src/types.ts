export type RiskLevel = "Low" | "Moderate" | "High" | "Severe" | "No Travel";

export interface Checkpoint {
  interval_miles: number;
  index: number;
  lat: number;
  lon: number;
  arrival_time: string;
  wind_mph: number;
  rain_inph: number;
  snow_inph: number;
  risk_index: number;
  risk_level: RiskLevel;
  temp_c: number | null;
  humidity: number | null;
  weathercode: number | null;
}

export interface RouteSummary {
  severe_miles: number;
  high_miles: number;
  avg_risk: number;
  no_travel: boolean;
  total_checkpoints: number;
}

export interface Route {
  route_index: number;
  rank: number;
  recommended: boolean;
  distance_miles: number;
  duration_hours: number;
  geometry: [number, number][];
  checkpoints: Checkpoint[];
  checkpoints_by_interval: Checkpoint[][];
  summary: RouteSummary;
}

export interface GeoPoint {
  text: string;
  lat: number;
  lon: number;
}

export interface AnalysisResult {
  origin: GeoPoint;
  destination: GeoPoint;
  departure_time: string;
  load_lbs: number;
  routes: Route[];
}

export interface AnalysisRequest {
  origin: string;
  destination: string;
  departure: string;
  load_lbs: number;
}
