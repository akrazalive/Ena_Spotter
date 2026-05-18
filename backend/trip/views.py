import requests
import math
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from .hos_calculator import calculate_trip

SERPAPI_KEY = settings.SERPAPI_KEY


def serpapi_autocomplete(query):
    """Return place suggestions using Nominatim autocomplete (free, worldwide, no key needed)."""
    try:
        resp = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={
                'q': query,
                'format': 'json',
                'limit': 7,
                'addressdetails': 1,
            },
            headers={'User-Agent': 'ELDTripPlanner/1.0'},
            timeout=6,
        )
        data = resp.json()
        suggestions = []
        for item in data:
            addr = item.get('address', {})
            # Build a clean label
            parts = []
            for key in ('city', 'town', 'village', 'county', 'state', 'country'):
                if addr.get(key):
                    parts.append(addr[key])
            label = parts[0] if parts else item.get('display_name', query).split(',')[0]
            subtext = ', '.join(parts[1:4]) if len(parts) > 1 else item.get('display_name', '').split(',', 1)[-1].strip()
            suggestions.append({
                'label': label,
                'subtext': subtext[:60],
                'lat': float(item['lat']),
                'lon': float(item['lon']),
            })
        return suggestions
    except Exception:
        return []


def serpapi_geocode(location_str):
    """Geocode a location string via SerpAPI Google Maps search. Returns (lat, lon, display_name)."""
    try:
        resp = requests.get(
            'https://serpapi.com/search',
            params={
                'engine': 'google_maps',
                'q': location_str,
                'type': 'search',
                'api_key': SERPAPI_KEY,
            },
            timeout=10,
        )
        data = resp.json()
        # Try place_results first (most accurate)
        place = data.get('place_results')
        if place and place.get('gps_coordinates'):
            coords = place['gps_coordinates']
            return coords['latitude'], coords['longitude'], place.get('title', location_str)
        # Fall back to first local result
        local = data.get('local_results', [])
        if local:
            first = local[0]
            coords = first.get('gps_coordinates', {})
            if coords.get('latitude'):
                return coords['latitude'], coords['longitude'], first.get('title', location_str)
    except Exception:
        pass

    # Final fallback: Nominatim
    return nominatim_geocode(location_str)


def nominatim_geocode(location_str):
    """Fallback geocoder using Nominatim."""
    try:
        resp = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={'q': location_str, 'format': 'json', 'limit': 1},
            headers={'User-Agent': 'ELDTripPlanner/1.0'},
            timeout=8,
        )
        data = resp.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon']), data[0].get('display_name', location_str)
    except Exception:
        pass
    return None, None, location_str


def haversine_miles(lat1, lon1, lat2, lon2):
    R = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def get_osrm_route(coords):
    """Get route from OSRM (free, no key needed)."""
    coord_str = ';'.join([f"{lon},{lat}" for lat, lon in coords])
    url = f"http://router.project-osrm.org/route/v1/driving/{coord_str}"
    try:
        resp = requests.get(url, params={'overview': 'full', 'geometries': 'geojson'}, timeout=15)
        data = resp.json()
        if data.get('code') == 'Ok':
            route = data['routes'][0]
            return route['distance'] * 0.000621371, route['geometry']
    except Exception:
        pass
    return None, None


class AutocompleteView(APIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        if len(q) < 2:
            return Response({'suggestions': []})
        suggestions = serpapi_autocomplete(q)
        return Response({'suggestions': suggestions})


class TripPlanView(APIView):
    def post(self, request):
        data = request.data
        current_location = data.get('current_location', '').strip()
        pickup_location = data.get('pickup_location', '').strip()
        dropoff_location = data.get('dropoff_location', '').strip()
        cycle_used = float(data.get('cycle_used_hrs', 0))

        # Accept pre-resolved coords from frontend autocomplete selection
        cur_lat = data.get('current_lat')
        cur_lon = data.get('current_lon')
        pick_lat = data.get('pickup_lat')
        pick_lon = data.get('pickup_lon')
        drop_lat = data.get('dropoff_lat')
        drop_lon = data.get('dropoff_lon')

        if not all([current_location, pickup_location, dropoff_location]):
            return Response({'error': 'All location fields are required.'}, status=400)
        if cycle_used < 0 or cycle_used > 70:
            return Response({'error': 'Cycle used must be between 0 and 70 hours.'}, status=400)

        # Geocode only if coords not already provided
        cur_display = current_location
        pick_display = pickup_location
        drop_display = dropoff_location

        if not (cur_lat and cur_lon):
            cur_lat, cur_lon, cur_display = serpapi_geocode(current_location)
        if not (pick_lat and pick_lon):
            pick_lat, pick_lon, pick_display = serpapi_geocode(pickup_location)
        if not (drop_lat and drop_lon):
            drop_lat, drop_lon, drop_display = serpapi_geocode(dropoff_location)

        if not all([cur_lat, pick_lat, drop_lat]):
            return Response({'error': 'Could not find one or more locations. Please try a more specific address.'}, status=400)

        cur_lat, cur_lon = float(cur_lat), float(cur_lon)
        pick_lat, pick_lon = float(pick_lat), float(pick_lon)
        drop_lat, drop_lon = float(drop_lat), float(drop_lon)

        dist_to_pickup, geom1 = get_osrm_route([(cur_lat, cur_lon), (pick_lat, pick_lon)])
        dist_pickup_to_drop, geom2 = get_osrm_route([(pick_lat, pick_lon), (drop_lat, drop_lon)])

        if dist_to_pickup is None:
            dist_to_pickup = haversine_miles(cur_lat, cur_lon, pick_lat, pick_lon)
        if dist_pickup_to_drop is None:
            dist_pickup_to_drop = haversine_miles(pick_lat, pick_lon, drop_lat, drop_lon)

        total_distance = dist_to_pickup + dist_pickup_to_drop

        _, full_geom = get_osrm_route([(cur_lat, cur_lon), (pick_lat, pick_lon), (drop_lat, drop_lon)])

        route_data = {
            'total_distance_miles': total_distance,
            'dist_to_pickup_miles': dist_to_pickup,
            'dist_pickup_to_dropoff_miles': dist_pickup_to_drop,
            'waypoints': [
                {'lat': cur_lat, 'lon': cur_lon, 'label': cur_display, 'type': 'current'},
                {'lat': pick_lat, 'lon': pick_lon, 'label': pick_display, 'type': 'pickup'},
                {'lat': drop_lat, 'lon': drop_lon, 'label': drop_display, 'type': 'dropoff'},
            ],
        }

        trip_result = calculate_trip(
            current_location, pickup_location, dropoff_location,
            cycle_used, route_data
        )

        return Response({
            'route': {
                'waypoints': route_data['waypoints'],
                'geometry': full_geom,
                'total_distance_miles': round(total_distance, 1),
                'dist_to_pickup_miles': round(dist_to_pickup, 1),
                'dist_pickup_to_dropoff_miles': round(dist_pickup_to_drop, 1),
            },
            'logs': trip_result['logs'],
            'stops': trip_result['stops'],
            'summary': {
                'total_miles': trip_result['total_miles'],
                'total_days': trip_result['total_days'],
                'cycle_hours_used': trip_result['cycle_hours_used'],
                'current_location': cur_display,
                'pickup_location': pick_display,
                'dropoff_location': drop_display,
            }
        })
