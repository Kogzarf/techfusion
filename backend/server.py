"""
TechFusion Backend Server
Provides API endpoints for emergency requests, responders, and network monitoring.
"""
import os
import logging
import uuid
import random
from datetime import datetime, timezone
from flask import Flask, jsonify, request, send_from_directory
from assignment_engine import AssignmentEngine
from requests_db import requests_db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

engine = AssignmentEngine()

# Resolve the client directory (one level up from backend/)
CLIENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "client"))

app = Flask(__name__, static_folder=CLIENT_DIR, static_url_path="")

# ── Frontend serving ───────────────────────────────────────────────────────────
@app.route("/")
def serve_index():
    """Serve the frontend index.html."""
    return send_from_directory(CLIENT_DIR, "index.html")

@app.route("/<path:filename>")
def serve_static(filename):
    """Serve any other static file from the client directory (skips /api/ routes)."""
    if filename.startswith("api/"):
        from flask import abort
        abort(404)
    return send_from_directory(CLIENT_DIR, filename)

# ── CORS helper ───────────────────────────────────────────────────────────────
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,DELETE,OPTIONS"
    return response

@app.route("/api/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "version": "2.5.0"})

# ── Responders ─────────────────────────────────────────────────────────────────
@app.route("/api/responders")
def get_responders():
    """Fetch all active responders."""
    try:
        responders = engine.get_responders()
        return jsonify({"responders": responders, "count": len(responders)})
    except Exception as e:
        logger.error(f"Error fetching responders: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ── Requests ───────────────────────────────────────────────────────────────────
@app.route("/api/requests", methods=["GET", "POST", "OPTIONS"])
def manage_requests():
    """Fetch all active emergency requests or add a new user warning."""
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if request.method == "POST":
        data = request.json
        if not data:
            return jsonify({"error": "Invalid payload"}), 400

        severity = data.get("severity", "High")
        severity_priority_map = {"Critical": 5.0, "High": 4.0, "Medium": 2.5, "Low": 1.0}
        base_priority = severity_priority_map.get(severity, 3.0)

        new_req = {
            "id": f"req-usr-{str(uuid.uuid4())[:8]}",
            "type": data.get("type", "General Warning"),
            "severity": severity,
            "people": max(1, int(data.get("people", 1))),
            "reporter": data.get("reporter", "Anonymous"),
            "desc": data.get("desc", "User submitted warning").strip(),
            "priority": round(base_priority + random.uniform(-0.2, 0.2), 2),
            "source": "user",
            "status": "active",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "location": {
                "lat": round(random.uniform(12.90, 13.05), 4),
                "lng": round(random.uniform(77.50, 77.70), 4),
                "city": data.get("location_label", "Bengaluru")
            }
        }
        requests_db.append(new_req)
        logger.info(f"[WARNING] {new_req['type']} [{severity}] reported by {new_req['reporter']} — ID: {new_req['id']}")
        return jsonify({"status": "success", "request": new_req}), 201

    return jsonify({"requests": requests_db, "count": len(requests_db)})

# ── Dismiss / Resolve a request ────────────────────────────────────────────────
@app.route("/api/requests/<request_id>", methods=["DELETE", "OPTIONS"])
def delete_request(request_id):
    """Mark a user-submitted warning as resolved/dismissed."""
    if request.method == "OPTIONS":
        return jsonify({}), 200
    global requests_db
    req = next((r for r in requests_db if r["id"] == request_id), None)
    if not req:
        return jsonify({"error": "Request not found"}), 404
    requests_db[:] = [r for r in requests_db if r["id"] != request_id]
    logger.info(f"Request {request_id} dismissed.")
    return jsonify({"status": "dismissed", "id": request_id})

# ── Dedicated Alerts feed (user-submitted only) ────────────────────────────────
@app.route("/api/alerts")
def get_alerts():
    """Return only user-submitted warnings sorted newest-first."""
    alerts = [r for r in requests_db if r.get("source") == "user"]
    alerts_sorted = sorted(alerts, key=lambda x: x.get("submitted_at", ""), reverse=True)
    return jsonify({"alerts": alerts_sorted, "count": len(alerts_sorted)})

# ── Heatmap ────────────────────────────────────────────────────────────────────
@app.route("/api/heatmap")
def get_heatmap():
    """Fetch heatmap data points based on request priority and location."""
    points = [
        {
            "lat": req["location"]["lat"],
            "lng": req["location"]["lng"],
            "weight": req["priority"],
            "type": req.get("type", "Unknown"),
            "severity": req.get("severity", "Medium"),
            "id": req["id"],
        }
        for req in requests_db
        if req.get("location")
    ]
    return jsonify({"heatpoints": points, "timestamp": datetime.now(timezone.utc).isoformat()})

# ── Assignment ─────────────────────────────────────────────────────────────────
@app.route("/api/requests/<request_id>/assign", methods=["POST"])
def assign_responder(request_id):
    """Assign the best available responder to a specific request."""
    request_obj = next((r for r in requests_db if r["id"] == request_id), None)
    if not request_obj:
        return jsonify({"error": f"Request {request_id} not found"}), 404

    responder = engine.assign_best_responder(request_obj)
    if not responder:
        return jsonify({"status": "pending", "message": "No available responders"}), 200

    logger.info(f"Assigned responder {responder['id']} to request {request_id}")
    return jsonify({
        "status": "success",
        "requestId": request_id,
        "assignedResponder": responder,
    })

@app.route("/api/requests/<request_id>/fail", methods=["POST"])
def fail_responder(request_id):
    """Simulate a responder failure and trigger re-assignment."""
    responder = engine.simulate_failure(request_id)
    if not responder:
        return jsonify({"error": "Failed to re-assign or original assignment not found"}), 400

    logger.warning(f"Responder failure detected for request {request_id}. Re-assigned to {responder['id']}")
    return jsonify({
        "status": "success",
        "reassignedTo": responder,
    })

if __name__ == "__main__":
    logger.info("Starting TechFusion Backend on port 5000...")
    app.run(port=5000, debug=True)