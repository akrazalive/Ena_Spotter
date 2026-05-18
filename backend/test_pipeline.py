"""Test each step of the pipeline independently."""
import requests, time, json

KEY = 'd195df3012a19bc5bdb52e20d1610a879240f525ba11187b61768faac562c903'

def test_serpapi_geocode(q):
    t = time.time()
    r = requests.get('https://serpapi.com/search', params={
        'engine': 'google_maps', 'q': q, 'type': 'search', 'api_key': KEY,
    }, timeout=10)
    data = r.json()
    place = data.get('place_results', {})
    coords = place.get('gps_coordinates', {})
    elapsed = round(time.time()-t, 2)
    if coords.get('latitude'):
        print(f'  ✓ {q} -> {coords["latitude"]}, {coords["longitude"]} ({elapsed}s)')
        return coords['latitude'], coords['longitude']
    print(f'  ✗ {q} -> NO RESULT ({elapsed}s) | keys: {list(data.keys())}')
    return None, None

def test_osrm(coords):
    t = time.time()
    coord_str = ';'.join([f"{lon},{lat}" for lat,lon in coords])
    r = requests.get(
        f'http://router.project-osrm.org/route/v1/driving/{coord_str}',
        params={'overview': 'full', 'geometries': 'geojson'}, timeout=15
    )
    data = r.json()
    elapsed = round(time.time()-t, 2)
    if data.get('code') == 'Ok':
        miles = data['routes'][0]['distance'] * 0.000621371
        print(f'  ✓ OSRM route: {round(miles,1)} miles ({elapsed}s)')
    else:
        print(f'  ✗ OSRM failed: {data.get("code")} ({elapsed}s)')

print('=== Geocoding ===')
lat1, lon1 = test_serpapi_geocode('Chicago, IL')
lat2, lon2 = test_serpapi_geocode('Indianapolis, IN')
lat3, lon3 = test_serpapi_geocode('Cincinnati, OH')

if all([lat1, lat2, lat3]):
    print('\n=== Routing ===')
    test_osrm([(lat1,lon1),(lat2,lon2)])
    test_osrm([(lat2,lon2),(lat3,lon3)])
    test_osrm([(lat1,lon1),(lat2,lon2),(lat3,lon3)])
