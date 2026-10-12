import type { Route } from "../types";
import RiskBadge from "./RiskBadge";

interface RouteListProps {
  routes: Route[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export default function RouteList({
  routes,
  selectedIndex,
  onSelect,
}: RouteListProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">
        Route Options ({routes.length})
      </h2>
      {routes.map((route, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`w-full rounded-xl border p-4 text-left transition ${
              isSelected
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    Route {idx + 1}
                  </span>
                  {route.recommended && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Recommended
                    </span>
                  )}
                  {route.summary.no_travel && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      No Travel
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {route.distance_miles.toFixed(1)} mi ·{" "}
                  {formatDuration(route.duration_hours)}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                Rank #{route.rank}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="font-semibold text-slate-700">
                  {route.summary.severe_miles}
                </div>
                <div className="text-slate-500">Severe</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="font-semibold text-slate-700">
                  {route.summary.high_miles}
                </div>
                <div className="text-slate-500">High</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="font-semibold text-slate-700">
                  {route.summary.avg_risk.toFixed(2)}
                </div>
                <div className="text-slate-500">Avg Risk</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
