# Weather-Aware Truck Routing

A React + Django web application that helps truck drivers choose the safest
route based on weather conditions, load weight, and travel time.

## Features

- **Route generation**: Produces up to 3 driving route alternatives (OSRM).
- **Weather sampling**: Fetches hourly forecasts (Open-Meteo) at checkpoints
  spaced every 10 / 25 / 50 miles along each route, using the truck's
  estimated arrival time at each checkpoint.
- **Risk classification**: Classifies each checkpoint as Low / Moderate / High
  / Severe / No Travel using wind, rain, and snow thresholds, with load-weight
  escalation rules.
- **Smart recommendation**: Ranks routes by fewest Severe miles, then fewest
  High miles, then lowest average risk, then shortest travel time.
- **Interactive map**: Displays all routes, checkpoints colored by risk, ETAs,
  and route summaries on a Leaflet map.
- **Weather heatmap**: Shows a 0–48 hour forecast slider over the trip
  corridor, with risk-colored points that update as you scrub through time.

## Risk Rules

| Condition   | Low       | Moderate  | High      | Severe    | No Travel  |
|-------------|-----------|-----------|-----------|-----------|------------|
| Wind (mph)  | <25       | 25–34     | 35–44     | 45–54     | ≥55        |
| Rain (in/hr)| <0.10     | 0.10–0.25 | 0.25–0.50 | 0.50–1.00 | >1.00      |
| Snow (in/hr)| <0.5      | 0.5–1.0   | 1.0–2.0   | 2.0–3.0   | >3.0       |

**Load rules:**
- ≥55 mph wind → No Travel for any load
- 45–54 mph wind + >30,000 lb → No Travel
- 35–44 mph wind + >40,000 lb → Severe

## Tech Stack

- **Backend**: Django 4.2 + Django REST Framework
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Maps**: Leaflet (react-leaflet)
- **Routing**: OSRM (public demo API, no key required)
- **Geocoding**: Nominatim (OpenStreetMap)
- **Weather**: Open-Meteo (free, no key required)

## Project Structure

```
.
├── backend/
│   ├── manage.py
│   ├── weatherapp/          # Django project settings
│   └── routes/              # Routes app (API + logic)
│       ├── risk.py          # Risk classification rules
│       ├── services.py      # Routing, geocoding, weather integrations
│       ├── orchestrator.py  # Route analysis & recommendation logic
│       ├── weather_cache.py # In-memory weather cache
│       ├── views.py         # REST API endpoints
│       └── urls.py
└── frontend/
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── types.ts
        └── components/
            ├── RouteForm.tsx
            ├── RouteMap.tsx
            ├── RouteList.tsx
            ├── WeatherHeatmap.tsx
            └── RiskBadge.tsx
```

## Local Development

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

The backend runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies `/api` requests to
the backend.

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and adjust as needed. The app
works without API keys by default (uses free public APIs).

## API Endpoints

### `POST /api/analyze/`

Analyze routes between an origin and destination.

**Request body:**
```json
{
  "origin": "Chicago, IL",
  "destination": "Indianapolis, IN",
  "departure": "2026-10-12T18:00:00Z",
  "load_lbs": 40000
}
```

**Response:** Returns origin, destination, departure, load, and an array of
routes. Each route includes geometry, distance, duration, checkpoints (with
weather & risk), and a summary (severe miles, high miles, avg risk, no_travel
flag). Routes are ranked with the recommended route first.

### `POST /api/heatmap/`

Return a 48-hour hourly weather risk grid along a route corridor.

**Request body:**
```json
{
  "geometry": [[lat, lon], ...],
  "departure": "2026-10-12T18:00:00Z",
  "load_lbs": 40000
}
```

**Response:** Returns points sampled along the route, each with 48 hours of
hourly weather and risk data.

### `GET /api/health/`

Health check.

## Deployment

The backend is configured to serve static files via WhiteNoise. Build the
frontend (`npm run build`) and serve `dist/` or deploy the frontend to a
static host (Vercel/Netlify) and the backend to a Python host (Render/Heroku).

For a single-service deployment, set `VITE_API_BASE` to the backend URL and
build the frontend before deploying.
