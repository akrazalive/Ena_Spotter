# ELD Trip Planner

A full-stack Django + React app for truck drivers to plan trips and generate ELD (Electronic Logging Device) log sheets compliant with HOS (Hours of Service) regulations.

## Features
- Route planning with map visualization (OpenStreetMap + OSRM)
- Automatic HOS calculation (70 hrs/8 days, property carrier)
- ELD daily log sheet generation with visual grid
- Fuel stop planning (every 1,000 miles)
- Multi-day trip support with rest break scheduling

## Tech Stack
- **Backend**: Django + Django REST Framework
- **Frontend**: React + Leaflet maps
- **Routing**: OSRM (free, no API key needed)
- **Geocoding**: Nominatim (free, no API key needed)

## Local Development

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Deployment
- Backend: Railway.app or Render.com
- Frontend: Vercel.app

Update `frontend/vercel.json` with your backend URL before deploying.
