from trip.hos_calculator import calculate_trip

route = {
    'total_distance_miles': 300,
    'dist_to_pickup_miles': 100,
    'dist_pickup_to_dropoff_miles': 200,
    'waypoints': [],
}

for cycle in [0, 20, 50, 65, 69]:
    result = calculate_trip('Chicago IL', 'Indianapolis IN', 'Cincinnati OH', cycle, route)
    print(f'Cycle {cycle:2d}h -> {result["total_days"]} days, '
          f'{len(result["logs"])} logs, {len(result["stops"])} stops, '
          f'{result["total_miles"]} miles')
