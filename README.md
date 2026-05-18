# ELD Trip Planner

A full-stack web application for truck drivers to plan trips and automatically generate ELD (Electronic Logging Device) daily log sheets that comply with FMCSA Hours of Service (HOS) regulations.

Built as part of the EnaSpotter AI technical assessment.

---

## What It Does

A truck driver enters four inputs:

- **Current Location** — where they are right now
- **Pickup Location** — where they need to collect the load
- **Dropoff Location** — where the load needs to be delivered
- **Current Cycle Used (hrs)** — how many of their 70-hour weekly allowance they have already used

The app then produces two outputs:

1. **Route Map** — an interactive map showing the full driving route, pickup and dropoff markers, fuel stops, and rest stops
2. **ELD Daily Log Sheets** — one log sheet per day of the trip, each with a visual 24-hour grid showing exactly when the driver was Off Duty, in the Sleeper Berth, Driving, or On Duty (not driving)

---

## HOS Rules Applied Automatically

The app enforces all FMCSA property-carrier rules:

| Rule | Value |
|------|-------|
| Max driving per shift | 11 hours |
| Max on-duty per shift | 14 hours |
| Mandatory break | 30 min after 8 hrs driving |
| Required rest between shifts | 10 hours off duty |
| Weekly cycle limit | 70 hours / 8 days |
| Cycle restart (if limit hit) | 34-hour off-duty reset |
| Fuel stops | Every 1,000 miles |
| Pickup / Dropoff time | 1 hour each |
| Average speed assumed | 55 mph |

---

## Tech Stack

### Backend
- **Django 4.2** + **Django REST Framework** — API server
- **Python 3.11**
- **Gunicorn** — production WSGI server
- **Whitenoise** — static file serving

### Frontend
- **React 18** — UI framework
- **Leaflet / react-leaflet** — interactive map (OpenStreetMap tiles, free)
- **HTML5 Canvas** — ELD log grid drawing
- **Space Grotesk + Inter** — typography (Google Fonts)

### APIs Used (all free / no billing required)
- **SerpAPI Google Maps Autocomplete** — location search suggestions as you type (worldwide)
- **SerpAPI Google Maps Search** — geocoding typed addresses to lat/lon coordinates
- **OSRM (Open Source Routing Machine)** — turn-by-turn routing and distance calculation, no API key needed
- **Nominatim (OpenStreetMap)** — geocoding fallback

---

## Project Structure

```
├── backend/
│   ├── config/              # Django settings, URLs, WSGI
│   ├── trip/
│   │   ├── views.py         # REST endpoints: /api/trip/plan/ and /api/trip/autocomplete/
│   │   ├── hos_calculator.py # Full HOS rules engine
│   │   └── urls.py
│   ├── requirements.txt
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── App.js           # Main layout, tab switching
│   │   ├── components/
│   │   │   ├── TripForm.js       # Input form
│   │   │   ├── LocationInput.js  # Autocomplete address input
│   │   │   ├── RouteMap.js       # Leaflet map with route + stops
│   │   │   ├── TripSummary.js    # Distance / days / fuel stop cards
│   │   │   ├── ELDLogs.js        # Log sheet list + print button
│   │   │   └── ELDLogSheet.js    # Single day log with canvas grid
│   │   └── api.js           # API base URL config
│   └── package.json
│
├── start.bat                # One-click local dev launcher (opens both servers)
├── nixpacks.toml            # Railway.app deployment config
└── Procfile                 # Gunicorn start command
```

---

## Running Locally

**One command** — double-click `start.bat` from the project root. It opens two terminals automatically:
- Django backend on `http://localhost:8000`
- React frontend on `http://localhost:3000`

Or manually:

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
npm start
```

---

## Deployment

The app is configured for **Railway.app** (backend) + **Vercel** (frontend), or as a single deployment where Django serves the React build.

### Single deployment (Railway)
Railway auto-detects `nixpacks.toml` which:
1. Installs Python and Node
2. Runs `npm run build` to compile the React app
3. Runs `collectstatic`
4. Starts Gunicorn — Django serves both the API and the React frontend

Set one environment variable in Railway:
```
SECRET_KEY=<any random string>
```

### Separate deployment
- Deploy `backend/` to Railway or Render
- Deploy `frontend/` to Vercel
- Set `REACT_APP_API_URL=https://your-backend-url` in Vercel environment variables

---

## Test Addresses

| Field | Short Trip | Long Trip |
|-------|-----------|-----------|
| Current Location | Chicago, IL | Los Angeles, CA |
| Pickup Location | Indianapolis, IN | Phoenix, AZ |
| Dropoff Location | Cincinnati, OH | Denver, CO |
| Cycle Used | 0 | 10 |

To test the 34-hour cycle reset logic, set Cycle Used to **65** or higher.
