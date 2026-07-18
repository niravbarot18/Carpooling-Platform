import math
import json
from datetime import datetime

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371.0 # Radius of earth in kilometers.
    return c * r

def calculate_match_score(passenger_start_lat, passenger_start_lng, passenger_end_lat, passenger_end_lng, passenger_time, ride):
    """
    Calculates a Match Score (0 - 100) and provides a list of satisfied conditions
    for a passenger's search profile compared to a driver's Ride.
    """
    # 1. Route similarity (50%)
    # Let's inspect the ride's polyline points if available
    points = []
    if ride.route_polyline:
        try:
            points = json.loads(ride.route_polyline)
        except Exception:
            # Fallback to start and end points of ride if JSON fails
            points = [
                {"lat": ride.start_lat, "lng": ride.start_lng},
                {"lat": ride.end_lat, "lng": ride.end_lng}
            ]
    else:
        points = [
            {"lat": ride.start_lat, "lng": ride.start_lng},
            {"lat": ride.end_lat, "lng": ride.end_lng}
        ]

    # Find the index of the closest point to passenger start
    min_start_dist = float('inf')
    start_index = -1
    for idx, pt in enumerate(points):
        d = haversine(passenger_start_lat, passenger_start_lng, pt['lat'], pt['lng'])
        if d < min_start_dist:
            min_start_dist = d
            start_index = idx

    # Find the index of the closest point to passenger end (only search at or after start_index)
    min_end_dist = float('inf')
    end_index = -1
    for idx, pt in enumerate(points):
        # We want to encourage end point to be after start point, but scan all to check ordering
        d = haversine(passenger_end_lat, passenger_end_lng, pt['lat'], pt['lng'])
        if d < min_end_dist:
            min_end_dist = d
            end_index = idx

    # Route score
    route_score = 0.0
    correct_direction = False
    
    # Check direction: start index must be before end index
    if start_index != -1 and end_index != -1 and start_index < end_index:
        correct_direction = True
        # If total deviation is small, route score is high
        total_deviation = min_start_dist + min_end_dist
        # Within 1.5 km total deviation is a good match
        route_score = max(0, 100 - (total_deviation * 33.3))  # 3km deviation = 0%
    else:
        # If direction is reversed, give a small penalty/low score, or score based on end-to-end direct distance
        total_deviation = haversine(passenger_start_lat, passenger_start_lng, ride.start_lat, ride.start_lng) + \
                          haversine(passenger_end_lat, passenger_end_lng, ride.end_lat, ride.end_lng)
        route_score = max(0, 60 - (total_deviation * 20))  # Max 60% if starts are nearby but direction check failed

    # 2. Timing similarity (30%)
    time_score = 0.0
    if isinstance(passenger_time, str):
        try:
            p_time = datetime.fromisoformat(passenger_time.replace('Z', '+00:00'))
        except Exception:
            p_time = None
    else:
        p_time = passenger_time

    if p_time and ride.departure_time:
        # Difference in minutes
        time_diff = abs((ride.departure_time - p_time).total_seconds()) / 60.0
        # If leaves within 1 hour (60 minutes)
        if time_diff <= 60.0:
            time_score = 100.0 - (time_diff / 60.0) * 100.0
        else:
            time_score = max(0.0, 100.0 - (time_diff / 120.0) * 100.0)  # decays to 0 at 2 hours
    else:
        time_score = 80.0  # default score if time parse failed

    # 3. Seat availability (10%)
    seat_score = 100.0 if ride.available_seats > 0 else 0.0

    # 4. Cost/Environmental Savings (10%)
    # Let's reward EV/Hybrid vehicles with bonus matching, and calculate savings
    savings_score = 100.0
    if ride.vehicle and ride.vehicle.fuel_type == 'EV':
        savings_score = 100.0
    elif ride.vehicle and ride.vehicle.fuel_type == 'Hybrid':
        savings_score = 90.0

    # Compute weighted average
    overall_score = (route_score * 0.5) + (time_score * 0.3) + (seat_score * 0.1) + (savings_score * 0.1)
    overall_score = round(overall_score, 0)

    # Explanation checklist
    checklist = []
    if correct_direction and (min_start_dist + min_end_dist) < 1.0:
        checklist.append("✓ Excellent route match")
    elif correct_direction and (min_start_dist + min_end_dist) < 2.5:
        checklist.append("✓ Same Route")
    else:
        checklist.append("⚠ Route detour required")

    # Time explanation
    if p_time and ride.departure_time:
        time_diff_mins = int(abs((ride.departure_time - p_time).total_seconds()) / 60.0)
        if time_diff_mins <= 5:
            checklist.append("✓ Leaves right on time")
        elif time_diff_mins <= 20:
            checklist.append(f"✓ Leaves within {time_diff_mins} minutes")
        else:
            checklist.append(f"✓ Leaves in {time_diff_mins} minutes")
    
    # Savings explanation
    saved_amount = int(float(ride.price_per_seat))
    checklist.append(f"✓ Saves ₹{saved_amount * 2} in fuel cost")

    # Walking distance explanation (minimum walking distance to pickup)
    walking_m = int(min_start_dist * 1000) if min_start_dist != float('inf') else 200
    if walking_m < 100:
        checklist.append(f"✓ Only {max(20, walking_m)}m walking to pickup")
    else:
        checklist.append(f"✓ Only {walking_m}m walking to pickup")

    return {
        "score": int(overall_score),
        "checklist": checklist,
        "details": {
            "route_match": round(route_score, 1),
            "time_match": round(time_score, 1),
            "pickup_walking_km": round(min_start_dist, 3) if min_start_dist != float('inf') else 0.0,
            "dropoff_walking_km": round(min_end_dist, 3) if min_end_dist != float('inf') else 0.0
        }
    }
