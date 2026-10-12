import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  CircleMarker,
  useMap,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import type { Route, Checkpoint, GeoPoint } from "../types";
import RiskBadge from "./RiskBadge";

interface RouteMapProps {
  routes: Route[];
  origin: GeoPoint;
  destination: GeoPoint;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const RISK_COLORS: Record<string, string> = {
  Low: "#10b981",
  Moderate: "#f59e0b",
  High: "#f97316",
  Severe: "#ef4444",
  "No Travel": "#7f1d1d",
};

const ROUTE_COLORS = ["#2563eb", "#64748b", "#a16207"];

function originIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="background:#16a34a;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,.5)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function destIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="background:#dc2626;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,.5)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitBounds({ routes }: { routes: Route[] }) {
  const map = useMap();
  useEffect(() => {
    if (routes.length === 0) return;
    const bounds = L.latLngBounds(routes.flatMap((r) => r.geometry));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [routes, map]);
  return null;
}

function CheckpointPopup({ c }: { c: Checkpoint }) {
  return (
    <Popup>
      <div className="text-xs text-slate-800">
        <div className="mb-1">
          <RiskBadge level={c.risk_level} size="sm" />
        </div>
        <div>
          <strong>Arrival:</strong>{" "}
          {new Date(c.arrival_time).toLocaleString()}
        </div>
        <div>
          <strong>Wind:</strong> {c.wind_mph.toFixed(1)} mph
        </div>
        <div>
          <strong>Rain:</strong> {c.rain_inph.toFixed(2)} in/hr
        </div>
        <div>
          <strong>Snow:</strong> {c.snow_inph.toFixed(2)} in/hr
        </div>
        {c.temp_c != null && (
          <div>
            <strong>Temp:</strong> {c.temp_c.toFixed(1)} °C
          </div>
        )}
      </div>
    </Popup>
  );
}

export default function RouteMap({
  routes,
  origin,
  destination,
  selectedIndex,
  onSelect,
}: RouteMapProps) {
  const center: [number, number] = useMemo(
    () => [
      (origin.lat + destination.lat) / 2,
      (origin.lon + destination.lon) / 2,
    ],
    [origin, destination]
  );

  return (
    <MapContainer
      center={center}
      zoom={6}
      className="h-full w-full rounded-xl"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds routes={routes} />

      {routes.map((route, idx) => {
        const color =
          idx === selectedIndex ? ROUTE_COLORS[0] : ROUTE_COLORS[idx] ?? "#94a3b8";
        const opacity = idx === selectedIndex ? 0.9 : 0.5;
        const weight = idx === selectedIndex ? 6 : 4;
        return (
          <Polyline
            key={idx}
            positions={route.geometry}
            pathOptions={{ color, weight, opacity }}
            eventHandlers={{
              click: () => onSelect(idx),
            }}
          >
            <Tooltip sticky>
              Route {idx + 1}
              {route.recommended ? " (Recommended)" : ""} —{" "}
              {route.distance_miles.toFixed(1)} mi
            </Tooltip>
          </Polyline>
        );
      })}

      {routes[selectedIndex]?.checkpoints.map((c, i) => (
        <CircleMarker
          key={i}
          center={[c.lat, c.lon]}
          radius={c.interval_miles <= 10 ? 3 : c.interval_miles <= 25 ? 4 : 5}
          pathOptions={{
            color: RISK_COLORS[c.risk_level] ?? "#64748b",
            fillColor: RISK_COLORS[c.risk_level] ?? "#64748b",
            fillOpacity: 0.8,
            weight: 1,
          }}
        >
          <CheckpointPopup c={c} />
        </CircleMarker>
      ))}

      <Marker position={[origin.lat, origin.lon]} icon={originIcon()}>
        <Popup>{origin.text}</Popup>
      </Marker>
      <Marker position={[destination.lat, destination.lon]} icon={destIcon()}>
        <Popup>{destination.text}</Popup>
      </Marker>
    </MapContainer>
  );
}
