import { useState } from "react";
import { analyzeRoute } from "./api";
import type { AnalysisResult } from "./types";
import RouteForm from "./components/RouteForm";
import RouteList from "./components/RouteList";
import RouteMap from "./components/RouteMap";
import WeatherHeatmap from "./components/WeatherHeatmap";

type Tab = "map" | "heatmap";

export default function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("map");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: {
    origin: string;
    destination: string;
    departure: string;
    load_lbs: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeRoute(data);
      setResult(res);
      setSelectedIndex(0);
    } catch (e: any) {
      setError(e.message ?? "Analysis failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Weather-Aware Truck Routing
            </h1>
            <p className="text-xs text-slate-500">
              Choose the safest route based on weather, load weight & travel time
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-96 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <RouteForm onSubmit={handleSubmit} loading={loading} />
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {result && (
            <RouteList
              routes={result.routes}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          )}
          {result && result.routes[selectedIndex] && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Checkpoint Details
              </h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {result.routes[selectedIndex].checkpoints
                  .filter((c) => c.interval_miles === 25)
                  .map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-700">
                          #{c.index + 1} ·{" "}
                          {new Date(c.arrival_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-slate-500">
                          {c.wind_mph.toFixed(0)} mph wind ·{" "}
                          {c.rain_inph.toFixed(2)} in/hr rain
                        </div>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{
                          backgroundColor:
                            c.risk_level === "Low"
                              ? "#10b981"
                              : c.risk_level === "Moderate"
                              ? "#f59e0b"
                              : c.risk_level === "High"
                              ? "#f97316"
                              : c.risk_level === "Severe"
                              ? "#ef4444"
                              : "#7f1d1d",
                        }}
                      >
                        {c.risk_level}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-hidden p-4">
          {result ? (
            <div className="flex h-full flex-col">
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setTab("map")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    tab === "map"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Routes & Checkpoints
                </button>
                <button
                  onClick={() => setTab("heatmap")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    tab === "heatmap"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Weather Heatmap (0–48h)
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {tab === "map" ? (
                  <RouteMap
                    routes={result.routes}
                    origin={result.origin}
                    destination={result.destination}
                    selectedIndex={selectedIndex}
                    onSelect={setSelectedIndex}
                  />
                ) : (
                  <WeatherHeatmap
                    route={result.routes[selectedIndex]}
                    departure={result.departure_time}
                    loadLbs={result.load_lbs}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white">
              <div className="text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto mb-3 h-12 w-12 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <p className="text-sm text-slate-500">
                  Enter your trip details to see weather-aware route options
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
