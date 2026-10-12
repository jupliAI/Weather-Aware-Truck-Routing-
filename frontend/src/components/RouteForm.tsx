import { useState } from "react";

interface RouteFormProps {
  onSubmit: (data: {
    origin: string;
    destination: string;
    departure: string;
    load_lbs: number;
  }) => void;
  loading: boolean;
}

function defaultDeparture(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function RouteForm({ onSubmit, loading }: RouteFormProps) {
  const [origin, setOrigin] = useState("Chicago, IL");
  const [destination, setDestination] = useState("Indianapolis, IN");
  const [departure, setDeparture] = useState(defaultDeparture());
  const [loadLbs, setLoadLbs] = useState(40000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      origin,
      destination,
      departure: new Date(departure).toISOString(),
      load_lbs: Number(loadLbs),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-800">Trip Details</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Origin
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="City, State"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="City, State"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Departure Date & Time
          </label>
          <input
            type="datetime-local"
            value={departure}
            onChange={(e) => setDeparture(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Load Weight (lb)
          </label>
          <input
            type="number"
            min={0}
            step={1000}
            value={loadLbs}
            onChange={(e) => setLoadLbs(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Analyzing routes..." : "Find Safest Route"}
      </button>
    </form>
  );
}
