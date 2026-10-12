import { useEffect, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Route, RiskLevel } from "../types";
import { fetchHeatmap as fetchHeatmapApi } from "../api";
import RiskBadge from "./RiskBadge";

interface HeatmapPointHour {
  time: string;
  wind_mph: number;
  rain_inph: number;
  snow_inph: number;
  risk_index: number;
  risk_level: RiskLevel;
}

interface HeatmapPoint {
  lat: number;
  lon: number;
  hours: HeatmapPointHour[];
}

interface WeatherHeatmapProps {
  route: Route;
  departure: string;
  loadLbs: number;
}

const RISK_COLORS: Record<string, string> = {
  Low: "#10b981",
  Moderate: "#f59e0b",
  High: "#f97316",
  Severe: "#ef4444",
  "No Travel": "#7f1d1d",
};

function FitBounds({ geometry }: { geometry: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (geometry.length === 0) return;
    const bounds = L.latLngBounds(geometry);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [geometry, map]);
  return null;
}

export default function WeatherHeatmap({
  route,
  departure,
  loadLbs,
}: WeatherHeatmapProps) {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [hour, setHour] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHeatmapApi(route.geometry, departure, loadLbs);
      setPoints(data.points ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load heatmap");
    } finally {
      setLoading(false);
    }
  }, [route.geometry, departure, loadLbs]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  const sliderTime = points[0]?.hours[hour]?.time
    ? new Date(points[0].hours[hour].time).toLocaleString()
    : `+${hour}h`;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          Weather Heatmap — {sliderTime}
        </h3>
        {loading && (
          <span className="text-xs text-slate-500">Loading forecast…</span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs text-slate-600">0h</span>
        <input
          type="range"
          min={0}
          max={47}
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="text-xs text-slate-600">48h</span>
        <span className="w-12 text-right text-xs font-medium text-slate-700">
          +{hour}h
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(RISK_COLORS) as RiskLevel[]).map((lvl) => (
          <span
            key={lvl}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-slate-700"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: RISK_COLORS[lvl] }}
            />
            {lvl}
          </span>
        ))}
      </div>

      {error ? (
        <div className="flex flex-1 items-center justify-center rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200">
          <MapContainer
            center={[route.geometry[0][0], route.geometry[0][1]]}
            zoom={6}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds geometry={route.geometry} />
            <Polyline
              positions={route.geometry}
              pathOptions={{ color: "#94a3b8", weight: 3, opacity: 0.6 }}
            />
            {points.map((p, i) => {
              const h = p.hours[hour];
              if (!h) return null;
              const color = RISK_COLORS[h.risk_level] ?? "#64748b";
              return (
                <CircleMarker
                  key={i}
                  center={[p.lat, p.lon]}
                  radius={9}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="mb-1">
                        <RiskBadge level={h.risk_level} size="sm" />
                      </div>
                      <div>
                        <strong>Time:</strong>{" "}
                        {new Date(h.time).toLocaleString()}
                      </div>
                      <div>
                        <strong>Wind:</strong> {h.wind_mph.toFixed(1)} mph
                      </div>
                      <div>
                        <strong>Rain:</strong> {h.rain_inph.toFixed(2)} in/hr
                      </div>
                      <div>
                        <strong>Snow:</strong> {h.snow_inph.toFixed(2)} in/hr
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
