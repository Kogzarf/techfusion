# requests_db.py — rich seeded data covering multiple Bengaluru zones for a vivid heatmap
import random

SEED_REQUESTS = [
    # ── Zone 1: Koramangala / BTM (south-east, high density) ──────────────────
    {"id": "req-s01", "type": "Injury",  "people": 12, "priority": 4.8, "severity": "Critical",
     "desc": "Multi-vehicle accident on Outer Ring Road",
     "location": {"lat": 12.9352, "lng": 77.6245, "city": "Koramangala"}},
    {"id": "req-s02", "type": "Fire",    "people": 5,  "priority": 4.5, "severity": "High",
     "desc": "Electrical fire in apartment block",
     "location": {"lat": 12.9162, "lng": 77.6101, "city": "BTM Layout"}},
    {"id": "req-s03", "type": "Health Alert", "people": 30, "priority": 4.9, "severity": "Critical",
     "desc": "Dengue cluster — 30+ cases reported",
     "source": "user",
     "location": {"lat": 12.9280, "lng": 77.6270, "city": "Koramangala 5th Block"}},

    # ── Zone 2: MG Road / Brigade (central) ───────────────────────────────────
    {"id": "req-s04", "type": "Road Blockage", "people": 200, "priority": 3.5, "severity": "Medium",
     "desc": "Waterlogging blocks underpass, traffic standstill",
     "source": "user",
     "location": {"lat": 12.9716, "lng": 77.6011, "city": "MG Road"}},
    {"id": "req-s05", "type": "Search",  "people": 2,  "priority": 3.8, "severity": "High",
     "desc": "Missing elderly residents post-storm",
     "location": {"lat": 12.9750, "lng": 77.6094, "city": "Brigade Road"}},

    # ── Zone 3: Indiranagar / Domlur (east) ───────────────────────────────────
    {"id": "req-s06", "type": "Shelter", "people": 45, "priority": 3.2, "severity": "Medium",
     "desc": "Families displaced by building collapse",
     "location": {"lat": 12.9719, "lng": 77.6412, "city": "Indiranagar"}},
    {"id": "req-s07", "type": "Health Alert", "people": 8, "priority": 4.2, "severity": "High",
     "desc": "Gas leak near residential area",
     "source": "user",
     "location": {"lat": 12.9600, "lng": 77.6384, "city": "Domlur"}},

    # ── Zone 4: Whitefield / ITPL (far east, spread) ──────────────────────────
    {"id": "req-s08", "type": "Fire",   "people": 3,  "priority": 4.7, "severity": "Critical",
     "desc": "Industrial fire at warehouse complex",
     "location": {"lat": 12.9698, "lng": 77.7499, "city": "Whitefield"}},
    {"id": "req-s09", "type": "Injury", "people": 6,  "priority": 3.9, "severity": "High",
     "desc": "Construction site accident — crane collapse",
     "location": {"lat": 12.9870, "lng": 77.7272, "city": "ITPL"}},

    # ── Zone 5: Yelahanka / Airport Road (north) ──────────────────────────────
    {"id": "req-s10", "type": "Shelter", "people": 70, "priority": 2.8, "severity": "Medium",
     "desc": "Storm damaged 15 homes overnight",
     "location": {"lat": 13.1004, "lng": 77.5963, "city": "Yelahanka"}},
    {"id": "req-s11", "type": "Food",    "people": 120,"priority": 2.5, "severity": "Medium",
     "desc": "Relief camp food shortage — 3-day supply depleted",
     "location": {"lat": 13.0720, "lng": 77.5996, "city": "Hebbal"}},

    # ── Zone 6: Banashankari / Jayanagar (south) ──────────────────────────────
    {"id": "req-s12", "type": "Health Alert", "people": 15, "priority": 3.6, "severity": "High",
     "desc": "Cholera outbreak suspected near lake",
     "source": "user",
     "location": {"lat": 12.9254, "lng": 77.5660, "city": "Banashankari"}},
    {"id": "req-s13", "type": "Road Blockage", "people": 50, "priority": 2.2, "severity": "Low",
     "desc": "Tree fallen across road after heavy rain",
     "source": "user",
     "location": {"lat": 12.9397, "lng": 77.5832, "city": "Jayanagar"}},

    # ── Zone 7: Rajajinagar / Mahalakshmi (north-west) ────────────────────────
    {"id": "req-s14", "type": "Fire",    "people": 9,  "priority": 4.3, "severity": "High",
     "desc": "Market fire spreading to adjacent stalls",
     "location": {"lat": 12.9916, "lng": 77.5530, "city": "Rajajinagar"}},
    {"id": "req-s15", "type": "Search",  "people": 1,  "priority": 3.0, "severity": "Medium",
     "desc": "Child missing near bus terminus",
     "location": {"lat": 12.9997, "lng": 77.5710, "city": "Mahalakshmi Layout"}},

    # ── Zone 8: Electronic City (south, far) ──────────────────────────────────
    {"id": "req-s16", "type": "Injury",  "people": 4,  "priority": 3.7, "severity": "High",
     "desc": "Chemical spill injures factory workers",
     "location": {"lat": 12.8452, "lng": 77.6602, "city": "Electronic City"}},
    {"id": "req-s17", "type": "Food",    "people": 85, "priority": 2.0, "severity": "Low",
     "desc": "Migrant workers camp needs supplies",
     "location": {"lat": 12.8599, "lng": 77.6759, "city": "Singasandra"}},

    # ── Zone 9: Bommanahalli / HSR Layout (south-central) ─────────────────────
    {"id": "req-s18", "type": "Health Alert", "people": 22, "priority": 4.1, "severity": "High",
     "desc": "Water contamination — 22 hospitalised",
     "source": "user",
     "location": {"lat": 12.9081, "lng": 77.6476, "city": "HSR Layout"}},
    {"id": "req-s19", "type": "Shelter", "people": 18, "priority": 3.3, "severity": "Medium",
     "desc": "Flash flood forces evacuation",
     "location": {"lat": 12.8990, "lng": 77.6270, "city": "Bommanahalli"}},

    # ── Zone 10: Malleshwaram / Sadashivanagar (north central) ────────────────
    {"id": "req-s20", "type": "General Warning", "people": 300, "priority": 4.6, "severity": "Critical",
     "desc": "CRITICAL: Power grid failure — hospitals on backup",
     "source": "user",
     "location": {"lat": 13.0055, "lng": 77.5707, "city": "Malleshwaram"}},
]

def generate_requests():
    return [dict(req) for req in SEED_REQUESTS]

requests_db = generate_requests()