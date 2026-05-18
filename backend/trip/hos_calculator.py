"""
HOS (Hours of Service) Calculator
Property-carrying driver, 70 hrs / 8-day cycle
"""
from datetime import datetime, timedelta

DRIVE_LIMIT      = 11.0   # max driving hours per shift
ON_DUTY_LIMIT    = 14.0   # max on-duty hours per shift
BREAK_AFTER      = 8.0    # driving hours before mandatory 30-min break
BREAK_DURATION   = 0.5    # 30 minutes
REST_REQUIRED    = 10.0   # off-duty hours required between shifts
CYCLE_LIMIT      = 70.0   # hours in 8 days
CYCLE_RESET      = 34.0   # restart off-duty hours
FUEL_EVERY_MILES = 1000.0
FUEL_STOP_TIME   = 0.5    # 30 min on-duty for fueling
STOP_TIME        = 1.0    # 1 hr pickup / dropoff
AVG_SPEED        = 55.0   # mph


def calculate_trip(current_location, pickup_location, dropoff_location,
                   cycle_used_hrs, route_data):

    dist_to_pickup  = float(route_data.get('dist_to_pickup_miles', 0))
    dist_to_dropoff = float(route_data.get('dist_pickup_to_dropoff_miles', 0))

    # Build a simple list of work items: (kind, miles)
    # kind: 'drive' or 'stop'
    work = [
        ('drive', dist_to_pickup),
        ('stop',  0, f'Pickup at {pickup_location}'),
        ('drive', dist_to_dropoff),
        ('stop',  0, f'Dropoff at {dropoff_location}'),
    ]

    # ── state ──────────────────────────────────────────────────────────────
    cycle_hrs        = float(cycle_used_hrs)
    shift_drive      = 0.0   # driving hours in current shift
    shift_on_duty    = 0.0   # total on-duty hours in current shift
    drive_since_break= 0.0   # driving since last 30-min break
    miles_since_fuel = 0.0

    day_start = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
    hour      = 8.0          # current hour within the day (0-24)
    day_num   = 1

    logs   = []
    stops  = []
    entries= []              # entries for current day

    total_miles = 0.0
    MAX_ITER = 100_000       # safety cap — prevents infinite loops

    # ── helpers ────────────────────────────────────────────────────────────
    def flush_day():
        nonlocal day_num, hour, day_start, shift_drive, shift_on_duty
        # fill remainder of day as off-duty
        if hour < 24.0:
            entries.append({'status':'off_duty','start':round(hour,4),
                            'end':24.0,'note':'Off duty','location':''})
        logs.append({
            'day':       day_num,
            'date':      day_start.strftime('%Y-%m-%d'),
            'entries':   list(entries),
            'total_driving': round(shift_drive, 2),
            'total_on_duty': round(shift_on_duty, 2),
        })
        entries.clear()
        day_num  += 1
        day_start = day_start + timedelta(days=1)
        hour      = 0.0

    def add(status, hrs, note='', location=''):
        nonlocal hour, shift_drive, shift_on_duty, cycle_hrs
        if hrs <= 0:
            return
        # split across midnight
        remaining = hrs
        iters = 0
        while remaining > 1e-6:
            iters += 1
            if iters > 1000:
                break
            space = 24.0 - hour
            chunk = min(remaining, space)
            entries.append({'status': status,
                            'start':  round(hour, 4),
                            'end':    round(hour + chunk, 4),
                            'note':   note, 'location': location})
            hour += chunk
            remaining -= chunk
            if status == 'driving':
                shift_drive   += chunk
                shift_on_duty += chunk
                cycle_hrs     += chunk
            elif status == 'on_duty':
                shift_on_duty += chunk
                cycle_hrs     += chunk
            if hour >= 24.0 - 1e-6:
                flush_day()

    def do_rest(hrs, note):
        nonlocal shift_drive, shift_on_duty, drive_since_break
        add('off_duty', hrs, note)
        shift_drive       = 0.0
        shift_on_duty     = 0.0
        drive_since_break = 0.0

    def do_cycle_reset():
        nonlocal cycle_hrs
        stops.append({'type':'cycle_reset','location':'En route',
                      'day':day_num,'time':f'{int(hour):02d}:00',
                      'duration_hrs':CYCLE_RESET,'note':'34-hr restart'})
        do_rest(CYCLE_RESET, '34-hr cycle restart')
        cycle_hrs = 0.0

    # ── main loop ──────────────────────────────────────────────────────────
    iters = 0
    for item in work:
        if item[0] == 'stop':
            label = item[2]
            # cycle check
            if cycle_hrs >= CYCLE_LIMIT:
                do_cycle_reset()
            # shift check
            if shift_on_duty + STOP_TIME > ON_DUTY_LIMIT or \
               shift_drive >= DRIVE_LIMIT:
                stops.append({'type':'rest','location':label,
                              'day':day_num,'time':f'{int(hour):02d}:00',
                              'duration_hrs':REST_REQUIRED})
                do_rest(REST_REQUIRED, '10-hr rest')
            add('on_duty', STOP_TIME, label)
            stops.append({'type': label.split()[0].lower(),
                          'location': label, 'day': day_num,
                          'time': f'{int(hour):02d}:00',
                          'duration_hrs': STOP_TIME})

        else:  # drive
            miles_left = float(item[1])
            while miles_left > 1e-4:
                iters += 1
                if iters > MAX_ITER:
                    break

                # 1. cycle reset if needed
                if cycle_hrs >= CYCLE_LIMIT:
                    do_cycle_reset()
                    continue

                # 2. mandatory 30-min break
                if drive_since_break >= BREAK_AFTER:
                    add('off_duty', BREAK_DURATION, '30-min mandatory break')
                    drive_since_break = 0.0
                    continue

                # 3. end-of-shift rest
                if shift_drive >= DRIVE_LIMIT or shift_on_duty >= ON_DUTY_LIMIT:
                    stops.append({'type':'rest','location':'En route',
                                  'day':day_num,'time':f'{int(hour):02d}:00',
                                  'duration_hrs':REST_REQUIRED})
                    do_rest(REST_REQUIRED, '10-hr rest')
                    continue

                # 4. how much can we drive right now?
                avail = min(
                    DRIVE_LIMIT   - shift_drive,
                    ON_DUTY_LIMIT - shift_on_duty,
                    BREAK_AFTER   - drive_since_break,
                    CYCLE_LIMIT   - cycle_hrs,
                )
                avail = max(0.0, avail)
                if avail < 1e-6:
                    do_rest(REST_REQUIRED, '10-hr rest')
                    continue

                # 5. fuel stop?
                miles_avail = avail * AVG_SPEED
                if miles_since_fuel + min(miles_left, miles_avail) >= FUEL_EVERY_MILES:
                    miles_to_fuel = FUEL_EVERY_MILES - miles_since_fuel
                    hrs_to_fuel   = miles_to_fuel / AVG_SPEED
                    if hrs_to_fuel > avail:
                        hrs_to_fuel = avail
                        miles_to_fuel = hrs_to_fuel * AVG_SPEED
                    if hrs_to_fuel > 1e-6:
                        add('driving', hrs_to_fuel, 'Driving to fuel stop')
                        drive_since_break += hrs_to_fuel
                        miles_left        -= miles_to_fuel
                        miles_since_fuel  += miles_to_fuel
                        total_miles       += miles_to_fuel
                    # fuel stop
                    if shift_on_duty + FUEL_STOP_TIME <= ON_DUTY_LIMIT:
                        add('on_duty', FUEL_STOP_TIME, 'Fuel stop')
                        stops.append({'type':'fuel','location':'Fuel stop',
                                      'day':day_num,'time':f'{int(hour):02d}:00',
                                      'duration_hrs':FUEL_STOP_TIME})
                    miles_since_fuel = 0.0
                    continue

                # 6. drive the chunk
                drive_hrs  = min(avail, miles_left / AVG_SPEED)
                drive_miles= drive_hrs * AVG_SPEED
                add('driving', drive_hrs, f'Driving')
                drive_since_break += drive_hrs
                miles_left        -= drive_miles
                miles_since_fuel  += drive_miles
                total_miles       += drive_miles

    # close last day
    if entries:
        flush_day()

    return {
        'logs':             logs,
        'stops':            stops,
        'total_miles':      round(total_miles, 1),
        'total_days':       day_num - 1,
        'cycle_hours_used': round(cycle_hrs, 2),
    }
