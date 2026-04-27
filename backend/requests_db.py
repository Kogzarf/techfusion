# requests_db.py
import random

def generate_requests():
    centers = [
        {"lat": 12.9716, "lng": 77.5946, "city": "Center"},
        {"lat": 12.98, "lng": 77.60, "city": "West"},
        {"lat": 13.00, "lng": 77.62, "city": "North"},
    ]
    types = ["Fire", "Injury", "Food", "Shelter", "Search"]
    requests = []
    for i in range(5):
        center = random.choice(centers)
        req_type = random.choice(types)
        req = {
            "id": f"req-{i+1}",
            "type": req_type,
            "people": random.randint(1, 20),
            "desc": f"Simulated {req_type} in {center['city']}",
            "priority": round(random.uniform(1.0, 5.0), 2),
            "location": center,
        }
        requests.append(req)
    return requests

requests_db = generate_requests()