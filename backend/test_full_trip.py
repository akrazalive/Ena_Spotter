"""Quick test of the full trip planning pipeline."""
import requests, json, time

BASE = 'http://localhost:8000'

payload = {
    'current_location': 'Chicago, IL',
    'pickup_location': 'Indianapolis, IN',
    'dropoff_location': 'Cincinnati, OH',
    'cycle_used_hrs': 0,
}

print('Testing trip plan...')
t = time.time()
r = requests.post(f'{BASE}/api/trip/plan/', json=payload, timeout=30)
print(f'Status: {r.status_code} | Time: {round(time.time()-t,2)}s')

if r.status_code == 200:
    data = r.json()
    s = data['summary']
    print(f"Distance: {s['total_miles']} miles")
    print(f"Days: {s['total_days']}")
    print(f"Logs: {len(data['logs'])} sheets")
    print(f"Stops: {len(data['stops'])}")
    print(f"Route geometry: {'YES' if data['route']['geometry'] else 'NO'}")
else:
    print('ERROR:', r.text[:500])
