# assignment_engine.py
from typing import Dict, List, Optional, Any

class AssignmentEngine:
    def __init__(self):
        self.responders: List[Dict[str, Any]] = [
            {
                "id": "r1",
                "name": "Alice (Medic)",
                "type": "Medical",
                "status": "available",
                "distance": 1.2,
            },
            {
                "id": "r2",
                "name": "Bob (Fire/Rescue)",
                "type": "Rescue",
                "status": "available",
                "distance": 2.5,
            },
            {
                "id": "r3",
                "name": "Charlie (Volunteer)",
                "type": "General",
                "status": "available",
                "distance": 0.8,
            },
            {
                "id": "r4",
                "name": "Diana (Supplies)",
                "type": "Food",
                "status": "busy",
                "distance": 3.0,
            },
        ]
        self.assignments: Dict[str, str] = {}  # requestId -> responderId

    def get_responders(self) -> List[Dict[str, Any]]:
        return self.responders

    def assign_best_responder(self, request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        available = [r for r in self.responders if r["status"] == "available"]
        if not available:
            return None

        preferred_type = request.get("type", "General")
        best_match = next(
            (r for r in available if r["type"] == preferred_type),
            None
        )

        if not best_match:
            available.sort(key=lambda x: x["distance"])
            best_match = available[0]

        best_match["status"] = "busy"
        request_id = str(request.get("id"))
        self.assignments[request_id] = best_match["id"]

        return best_match

    def get_assignment(self, request_id: Any) -> Optional[Dict[str, Any]]:
        responder_id = self.assignments.get(str(request_id))
        if not responder_id:
            return None

        return next(
            (r for r in self.responders if r["id"] == responder_id),
            None,
        )

    def simulate_failure(self, request_id: Any) -> Optional[Dict[str, Any]]:
        request_id_str = str(request_id)
        responder_id = self.assignments.get(request_id_str)
        if not responder_id:
            return None

        responder = next(
            (r for r in self.responders if r["id"] == responder_id),
            None
        )
        if responder:
            responder["status"] = "offline"

        if request_id_str in self.assignments:
            del self.assignments[request_id_str]

        dummy_request = {
            "id": request_id_str,
            "type": "General",
        }

        new_responder = self.assign_best_responder(dummy_request)
        return new_responder