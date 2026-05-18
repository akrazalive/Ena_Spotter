import requests
import math
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .hos_calculator import calculate_trip


def geocode_location(location_str):
    """Geocode a location string using Nominatim (free, no key needed)."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        'q': location_str,
        'format': 'json',
        'limit': 1,
    }
    headers = {'User-Agent': 'ELDTripPlanner/1.0'}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        data = resp.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon']), data[0].get('display_name', location_str)
    except Exception:
        pass
    return None, None, location_str


def haversine_miles(lat1, lon1, lat2, lon2):
    R = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))


def get_osrm_route(coords):
    """Get route from OSRM (free routing, no key needed)."""
    coord_str = ';'.join([f"{lon},{lat}" for lat, lon in coords])
    url = f"http://router.project-osrm.org/route/v1/driving/{coord_str}"
    params = {
        'overview': 'full',
        'geometries': 'geojson',
        'steps': 'true',
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        data = resp.json()
        if data.get('code') == 'Ok':
            route = data['routes'][0]
            distance_meters = route['distance']
            distance_miles = distance_meters * 0.000621371
            geometry = route['geometry']
            return distance_miles, geometry
    except Exception:
        pass
    return None, None


class TripPlanView(APIView):
    def post(self, request):
        data = request.data
        current_location = data.get('current_location', '').strip()
        pickup_location = data.get('pickup_location', '').strip()
        dropoff_location = data.get('dropoff_location', '').strip()
        cycle_used = float(data.get('cycle_used_hrs', 0))

        if not all([current_location, pickup_location, dropoff_location]):
            return Response({'error': 'All location fields are required.'}, status=400)

        if cycle_used < 0 or cycle_used > 70:
            return Response({'error': 'Cycle used must be between 0 and 70 hours.'}, status=400)

        # Geocode all locations
        cur_lat, cur_lon, cur_display = geocode_location(current_location)
        pick_lat, pick_lon, pick_display = geocode_location(pickup_location)
        drop_lat, drop_lon, drop_display = geocode_location(dropoff_location)

        if not all([cur_lat, pick_lat, drop_lat]):
            return Response({'error': 'Could not geocode one or more locations. Please be more specific.'}, status=400)

        # Get routes
        dist_to_pickup, geom1 = get_osrm_route([(cur_lat, cur_lon), (pick_lat, pick_lon)])
        dist_pickup_to_drop, geom2 = get_osrm_route([(pick_lat, pick_lon), (drop_lat, drop_lon)])

        if dist_to_pickup is None:
            dist_to_pickup = haversine_miles(cur_lat, cur_lon, pick_lat, pick_lon)
        if dist_pickup_to_drop is None:
            dist_pickup_to_drop = haversine_miles(pick_lat, pick_lon, drop_lat, drop_lon)

        total_distance = dist_to_pickup + dist_pickup_to_drop

        # Full route geometry
        full_route_geom = None
        _, full_geom = get_osrm_route([(cur_lat, cur_lon), (pick_lat, pick_lon), (drop_lat, drop_lon)])
        if full_geom:
            full_route_geom = full_geom

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
                'geometry': full_route_geom,
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
