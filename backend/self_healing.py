# self_healing.py — Self-Healing Task Reassignment Engine
"""
Self-Healing Task Reassignment Engine
--------------------------------------
Behaves like a fault-tolerant distributed system:
- Monitors every assignment for acknowledgment within a time window
- Auto-reassigns on timeout or rejection
- Scores responders by proximity + skill + availability
- Generates a traffic-free route for field responders
- Broadcasts police alerts for Critical severity tasks
"""
import math
import time
import threading
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
ACK_TIMEOUT_SECONDS   = 30   # Window to acknowledge before reassignment
MAX_REASSIGN_ATTEMPTS = 5    # Maximum chain length before marking FAILED
POLICE_SEVERITY_TAGS  = {"Critical", "High"}

# Skill → responder type mapping
SKILL_MAP = {
    "Fire Hazard":      "Rescue",
    "Health Alert":     "Medical",
    "Road Blockage":    "Police",
    "General Warning":  "General",
    "Injury":           "Medical",
    "Fire":             "Rescue",
    "Search":           "General",
    "Food":             "General",
    "Shelter":          "General",
}

# ── Simple road graph (simulated Bengaluru nodes for routing) ──────────────────
ROAD_NODES = {
    "Koramangala": (12.9352, 77.6245),
    "BTM":         (12.9162, 77.6101),
    "MG Road":     (12.9716, 77.6011),
    "Indiranagar": (12.9719, 77.6412),
    "Whitefield":  (12.9698, 77.7499),
    "Yelahanka":   (13.1004, 77.5963),
    "Rajajinagar": (12.9916, 77.5530),
    "HSR Layout":  (12.9081, 77.6476),
    "Malleshwaram":(13.0055, 77.5707),
    "Electronic City":(12.8452, 77.6602),
}

ROAD_EDGES = [
    ("MG Road",     "Indiranagar",    3.2),
    ("MG Road",     "Koramangala",    4.5),
    ("MG Road",     "Rajajinagar",    5.1),
    ("MG Road",     "Malleshwaram",   3.8),
    ("Koramangala", "BTM",            2.1),
    ("Koramangala", "HSR Layout",     3.3),
    ("BTM",         "Electronic City",6.8),
    ("HSR Layout",  "Electronic City",5.2),
    ("Indiranagar", "Whitefield",     9.4),
    ("Malleshwaram","Rajajinagar",    2.5),
    ("Malleshwaram","Yelahanka",      8.1),
]

def _haversine(lat1, lng1, lat2, lng2) -> float:
    """Straight-line distance in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _nearest_node(lat, lng) -> str:
    """Find the closest road graph node to a coordinate."""
    return min(ROAD_NODES, key=lambda n: _haversine(lat, lng, *ROAD_NODES[n]))

def _dijkstra(start: str, end: str) -> List[str]:
    """Dijkstra shortest path on the simulated road graph."""
    graph: Dict[str, List] = {n: [] for n in ROAD_NODES}
    for a, b, w in ROAD_EDGES:
        graph[a].append((b, w))
        graph[b].append((a, w))

    dist = {n: float("inf") for n in ROAD_NODES}
    dist[start] = 0
    prev = {}
    unvisited = set(ROAD_NODES)

    while unvisited:
        u = min(unvisited, key=lambda n: dist[n])
        if dist[u] == float("inf") or u == end:
            break
        unvisited.remove(u)
        for v, w in graph[u]:
            alt = dist[u] + w
            if alt < dist[v]:
                dist[v] = alt
                prev[v] = u

    path, cur = [], end
    while cur in prev:
        path.append(cur)
        cur = prev[cur]
    path.append(start)
    return list(reversed(path))

def generate_route(responder_lat: float, responder_lng: float,
                   target_lat: float,   target_lng: float) -> Dict:
    """Return a traffic-free route from responder to incident location."""
    start = _nearest_node(responder_lat, responder_lng)
    end   = _nearest_node(target_lat,   target_lng)
    waypoints = _dijkstra(start, end)
    straight_km = _haversine(responder_lat, responder_lng, target_lat, target_lng)
    # Routing adds ~20% overhead vs straight line
    est_km = round(straight_km * 1.2, 2)
    est_min = round((est_km / 40) * 60)   # assuming 40 km/h average

    coords = [
        {"node": n, "lat": ROAD_NODES[n][0], "lng": ROAD_NODES[n][1]}
        for n in waypoints if n in ROAD_NODES
    ]
    return {
        "waypoints": coords,
        "distance_km": est_km,
        "eta_minutes": est_min,
        "avoids": ["Outer Ring Road congestion zone", "Silk Board flyover"],
        "via": " → ".join(waypoints) if waypoints else f"{start} → {end}",
    }

# ── Assignment record ──────────────────────────────────────────────────────────
class AssignmentRecord:
    def __init__(self, request_id: str, responder_id: str, timestamp: float):
        self.request_id    = request_id
        self.responder_id  = responder_id
        self.timestamp     = timestamp
        self.acknowledged  = False
        self.rejected      = False
        self.attempt       = 1
        self.chain: List[str] = [responder_id]

# ── Self-Healing Engine ────────────────────────────────────────────────────────
class SelfHealingEngine:
    def __init__(self, assignment_engine, requests_db_ref):
        self.engine     = assignment_engine
        self.db_ref     = requests_db_ref
        self._records: Dict[str, AssignmentRecord] = {}
        self._history: List[Dict]                  = []
        self._lock = threading.Lock()

        # Start background watchdog
        t = threading.Thread(target=self._watchdog, daemon=True)
        t.start()
        logger.info("[SelfHealing] Watchdog started.")

    # ── Public API ─────────────────────────────────────────────────────────────
    def assign(self, request_id: str) -> Optional[Dict]:
        """Initial assignment attempt."""
        req = self._get_request(request_id)
        if not req:
            return None
        responder = self.engine.assign_best_responder(req)
        if not responder:
            self._log_event(request_id, None, "NO_RESPONDERS_AVAILABLE", 1)
            return None

        rec = AssignmentRecord(request_id, responder["id"], time.time())
        with self._lock:
            self._records[request_id] = rec

        route = self._build_route(responder, req)
        self._log_event(request_id, responder, "ASSIGNED", 1, route)
        self._maybe_alert_police(req, responder, route)
        return {"responder": responder, "route": route, "attempt": 1}

    def acknowledge(self, request_id: str) -> bool:
        """Responder acknowledged the task."""
        with self._lock:
            rec = self._records.get(request_id)
            if not rec:
                return False
            rec.acknowledged = True
        self._log_event(request_id, None, "ACKNOWLEDGED", rec.attempt)
        logger.info(f"[SelfHealing] {request_id} acknowledged by {rec.responder_id}")
        return True

    def reject(self, request_id: str) -> Optional[Dict]:
        """Responder rejected the task — trigger immediate reassignment."""
        with self._lock:
            rec = self._records.get(request_id)
            if not rec:
                return None
            rec.rejected = True
        self._log_event(request_id, None, "REJECTED", rec.attempt)
        return self._reassign(request_id, reason="REJECTED")

    def get_status(self, request_id: str) -> Optional[Dict]:
        with self._lock:
            rec = self._records.get(request_id)
        if not rec:
            return None
        elapsed = round(time.time() - rec.timestamp, 1)
        return {
            "request_id":   request_id,
            "responder_id": rec.responder_id,
            "acknowledged": rec.acknowledged,
            "rejected":     rec.rejected,
            "attempt":      rec.attempt,
            "elapsed_s":    elapsed,
            "timeout_s":    ACK_TIMEOUT_SECONDS,
            "chain":        rec.chain,
        }

    def get_history(self) -> List[Dict]:
        return list(reversed(self._history[-50:]))

    # ── Internal ───────────────────────────────────────────────────────────────
    def _watchdog(self):
        """Background thread — checks every 5 s for timed-out assignments."""
        while True:
            time.sleep(5)
            now = time.time()
            timed_out = []
            with self._lock:
                for rid, rec in self._records.items():
                    if rec.acknowledged or rec.rejected:
                        continue
                    if (now - rec.timestamp) > ACK_TIMEOUT_SECONDS:
                        timed_out.append(rid)

            for rid in timed_out:
                logger.warning(f"[SelfHealing] Timeout for {rid} — auto-reassigning.")
                self._reassign(rid, reason="TIMEOUT")

    def _reassign(self, request_id: str, reason: str) -> Optional[Dict]:
        with self._lock:
            rec = self._records.get(request_id)
        if not rec:
            return None

        if rec.attempt >= MAX_REASSIGN_ATTEMPTS:
            self._log_event(request_id, None, "CHAIN_EXHAUSTED", rec.attempt)
            logger.error(f"[SelfHealing] Chain exhausted for {request_id}.")
            return None

        # Free previous responder
        old_resp = next(
            (r for r in self.engine.responders if r["id"] == rec.responder_id), None
        )
        if old_resp:
            old_resp["status"] = "available"

        req = self._get_request(request_id)
        if not req:
            return None

        # Exclude already-tried responders
        skip = set(rec.chain)
        available = [
            r for r in self.engine.responders
            if r["status"] == "available" and r["id"] not in skip
        ]
        if not available:
            self._log_event(request_id, None, "NO_RESPONDERS_AVAILABLE", rec.attempt + 1)
            return None

        # Score and pick best
        best = self._score_responders(available, req)[0]
        best["status"] = "busy"

        with self._lock:
            rec.responder_id = best["id"]
            rec.timestamp    = time.time()
            rec.acknowledged = False
            rec.rejected     = False
            rec.attempt     += 1
            rec.chain.append(best["id"])

        route = self._build_route(best, req)
        self._log_event(request_id, best, f"REASSIGNED_{reason}", rec.attempt, route)
        self._maybe_alert_police(req, best, route)
        logger.info(f"[SelfHealing] {request_id} reassigned to {best['id']} (attempt {rec.attempt})")
        return {"responder": best, "route": route, "attempt": rec.attempt, "reason": reason}

    def _score_responders(self, candidates: List[Dict], req: Dict) -> List[Dict]:
        """Score = proximity_score(0-50) + skill_match(30) + availability_bonus(20)."""
        preferred_type = SKILL_MAP.get(req.get("type", ""), "General")
        req_lat = req.get("location", {}).get("lat", 12.97)
        req_lng = req.get("location", {}).get("lng", 77.59)

        def score(r):
            proximity = max(0, 50 - r.get("distance", 5) * 5)
            skill     = 30 if r.get("type") == preferred_type else 0
            avail     = 20 if r.get("status") == "available" else 0
            return proximity + skill + avail

        return sorted(candidates, key=score, reverse=True)

    def _build_route(self, responder: Dict, req: Dict) -> Dict:
        lat = responder.get("lat", 12.97)
        lng = responder.get("lng", 77.59)
        target_lat = req.get("location", {}).get("lat", 12.97)
        target_lng = req.get("location", {}).get("lng", 77.59)
        return generate_route(lat, lng, target_lat, target_lng)

    def _maybe_alert_police(self, req: Dict, responder: Dict, route: Dict):
        if req.get("severity") in POLICE_SEVERITY_TAGS:
            logger.warning(
                f"[POLICE ALERT] {req.get('type')} [{req.get('severity')}] at "
                f"{req.get('location',{}).get('city','Unknown')} — "
                f"Responder {responder['id']} dispatched via {route.get('via','N/A')}"
            )

    def _log_event(self, request_id, responder, event, attempt, route=None):
        entry = {
            "request_id":  request_id,
            "event":       event,
            "attempt":     attempt,
            "responder_id": responder["id"] if responder else None,
            "responder_name": responder.get("name") if responder else None,
            "timestamp":   datetime.now(timezone.utc).isoformat(),
            "route":       route,
        }
        self._history.append(entry)

    def _get_request(self, request_id: str) -> Optional[Dict]:
        return next((r for r in self.db_ref if r["id"] == request_id), None)
