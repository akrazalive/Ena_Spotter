"""
HOS (Hours of Service) Calculator
Property-carrying driver, 70hrs/8days cycle
"""
import math
from datetime import datetime, timedelta


DRIVING_LIMIT_PER_DAY = 11  # hours
ON_DUTY_LIMIT_PER_DAY = 14  # hours
REST_BREAK_AFTER = 8        # hours driving before mandatory 30-min break
REQUIRED_REST = 10          # hours off duty between shifts
CYCLE_LIMIT = 70            # hours in 8 days
PICKUP_DROPOFF_TIME = 1.0   # hour each
FUEL_INTERVAL_MILES = 1000  # miles
AVG_SPEED_MPH = 55          # average driving speed


def calculate_trip(current_location, pickup_location, dropoff_location,
                   cycle_used_hrs, route_data):
    """
    Main HOS trip calculator.
    Returns list of daily log entries and stop details.
    """
    total_distance_miles = route_data.get('total_distance_miles', 0)
    waypoints = route_data.get('waypoints', [])

    remaining_cycle = CYCLE_LIMIT - cycle_used_hrs
    total_drive_time = total_distance_miles / AVG_SPEED_MPH

    logs = []
    stops = []

    # Start time: today at 08:00
    current_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
    day_start = current_time

    day_driving = 0.0
    day_on_duty = 0.0
    cycle_hours = cycle_used_hrs
    miles_since_fuel = 0.0
    total_miles_driven = 0.0

    # Drive from current to pickup
    dist_to_pickup = route_data.get('dist_to_pickup_miles', total_distance_miles * 0.2)
    drive_to_pickup = dist_to_pickup / AVG_SPEED_MPH

    segments = [
        {
            'type': 'drive_to_pickup',
            'distance': dist_to_pickup,
            'drive_hours': drive_to_pickup,
            'label': f'Drive to Pickup: {pickup_location}',
        },
        {
            'type': 'pickup',
            'distance': 0,
            'drive_hours': 0,
            'on_duty_hours': PICKUP_DROPOFF_TIME,
            'label': f'Pickup at {pickup_location}',
        },
        {
            'type': 'drive_to_dropoff',
            'distance': route_data.get('dist_pickup_to_dropoff_miles',
                                       total_distance_miles * 0.8),
            'drive_hours': route_data.get('dist_pickup_to_dropoff_miles',
                                          total_distance_miles * 0.8) / AVG_SPEED_MPH,
            'label': f'Drive to Dropoff: {dropoff_location}',
        },
        {
            'type': 'dropoff',
            'distance': 0,
            'drive_hours': 0,
            'on_duty_hours': PICKUP_DROPOFF_TIME,
            'label': f'Dropoff at {dropoff_location}',
        },
    ]

    day_entries = []  # list of (status, start_hour, end_hour, location, note)
    day_num = 1
    hour_in_day = 8.0  # start at 8am

    def flush_day():
        nonlocal day_num, day_driving, day_on_duty, hour_in_day, day_start
        logs.append({
            'day': day_num,
            'date': day_start.strftime('%Y-%m-%d'),
            'entries': list(day_entries),
            'total_driving': round(day_driving, 2),
            'total_on_duty': round(day_on_duty, 2),
        })
        day_entries.clear()
        day_num += 1
        day_start = day_start + timedelta(days=1)
        hour_in_day = 0.0
        day_driving = 0.0
        day_on_duty = 0.0

    def add_entry(status, hours, note='', location=''):
        nonlocal hour_in_day, day_driving, day_on_duty, cycle_hours
        start = hour_in_day
        end = hour_in_day + hours
        day_entries.append({
            'status': status,  # 'off_duty','sleeper','driving','on_duty'
            'start': round(start, 2),
            'end': round(end, 2),
            'note': note,
            'location': location,
        })
        hour_in_day = end
        if status == 'driving':
            day_driving += hours
            day_on_duty += hours
            cycle_hours += hours
        elif status == 'on_duty':
            day_on_duty += hours
            cycle_hours += hours

    def need_rest_break(driving_since_break):
        return driving_since_break >= REST_BREAK_AFTER

    driving_since_break = 0.0

    for seg in segments:
        if seg['type'] in ('pickup', 'dropoff'):
            # On-duty not driving
            on_hrs = seg['on_duty_hours']
            # Check if we have room in the day
            if hour_in_day + on_hrs > 24:
                # Rest first
                rest_needed = REQUIRED_REST
                add_entry('off_duty', rest_needed, 'Required rest', seg['label'])
                if hour_in_day >= 24:
                    flush_day()
            add_entry('on_duty', on_hrs, seg['label'], seg['label'])
            stops.append({
                'type': seg['type'],
                'location': seg['label'],
                'day': day_num,
                'time': f"{int(hour_in_day):02d}:00",
                'duration_hrs': on_hrs,
            })
        else:
            # Driving segment
            remaining_drive = seg['drive_hours']
            seg_miles = seg['distance']
            miles_per_hour = AVG_SPEED_MPH

            while remaining_drive > 0:
                # Check cycle limit
                if cycle_hours >= CYCLE_LIMIT:
                    stops.append({
                        'type': 'cycle_reset',
                        'location': 'En route',
                        'day': day_num,
                        'time': f"{int(hour_in_day):02d}:00",
                        'duration_hrs': 34,
                        'note': '34-hour restart',
                    })
                    add_entry('off_duty', 34, '34-hour restart')
                    if hour_in_day >= 24:
                        flush_day()
                    cycle_hours = 0
                    driving_since_break = 0

                # Check 30-min break
                if driving_since_break >= REST_BREAK_AFTER:
                    add_entry('off_duty', 0.5, '30-min mandatory break')
                    driving_since_break = 0
                    if hour_in_day >= 24:
                        flush_day()

                # How much can we drive today?
                available_driving = min(
                    DRIVING_LIMIT_PER_DAY - day_driving,
                    ON_DUTY_LIMIT_PER_DAY - day_on_duty,
                    REST_BREAK_AFTER - driving_since_break,
                    remaining_cycle - cycle_hours if remaining_cycle > cycle_hours else 0,
                )
                available_driving = max(0, available_driving)

                if available_driving <= 0:
                    # Need rest
                    rest_hrs = REQUIRED_REST
                    add_entry('off_duty', rest_hrs, 'Required 10-hr rest')
                    driving_since_break = 0
                    if hour_in_day >= 24:
                        flush_day()
                    continue

                drive_chunk = min(remaining_drive, available_driving)

                # Check fuel stop
                miles_this_chunk = drive_chunk * miles_per_hour
                if miles_since_fuel + miles_this_chunk >= FUEL_INTERVAL_MILES:
                    miles_to_fuel = FUEL_INTERVAL_MILES - miles_since_fuel
                    hrs_to_fuel = miles_to_fuel / miles_per_hour
                    if hrs_to_fuel > 0:
                        add_entry('driving', hrs_to_fuel, 'Driving to fuel stop')
                        driving_since_break += hrs_to_fuel
                        remaining_drive -= hrs_to_fuel
                        total_miles_driven += miles_to_fuel
                    # Fuel stop (on-duty 30 min)
                    add_entry('on_duty', 0.5, 'Fuel stop')
                    stops.append({
                        'type': 'fuel',
                        'location': 'En route fuel stop',
                        'day': day_num,
                        'time': f"{int(hour_in_day):02d}:00",
                        'duration_hrs': 0.5,
                    })
                    miles_since_fuel = 0
                    drive_chunk = min(remaining_drive, available_driving - hrs_to_fuel)
                    if drive_chunk <= 0:
                        continue

                add_entry('driving', drive_chunk, seg['label'])
                driving_since_break += drive_chunk
                remaining_drive -= drive_chunk
                miles_since_fuel += drive_chunk * miles_per_hour
                total_miles_driven += drive_chunk * miles_per_hour

                if hour_in_day >= 24:
                    flush_day()

    # Final rest
    if day_entries:
        remaining_day = 24 - hour_in_day
        if remaining_day > 0:
            add_entry('off_duty', remaining_day, 'End of day rest')
        flush_day()

    return {
        'logs': logs,
        'stops': stops,
        'total_miles': round(total_miles_driven, 1),
        'total_days': day_num - 1,
        'cycle_hours_used': round(cycle_hours, 2),
    }
