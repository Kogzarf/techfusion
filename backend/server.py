"""
TechFusion Backend Server
Provides API endpoints for emergency requests, responders, and network monitoring.
"""
import logging
from flask import Flask, jsonify, request
from assignment_engine import AssignmentEngine
from requests_db import requests_db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

engine = AssignmentEngine()
app = Flask(__name__)

@app.route("/api/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "version": "2.4.0"})

@app.route("/api/responders")
def get_responders():
    """Fetch all active responders."""
    try:
        responders = engine.get_responders()
        return jsonify({"responders": responders, "count": len(responders)})
    except Exception as e:
        logger.error(f"Error fetching responders: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/requests")
def get_requests():
    """Fetch all active emergency requests."""
    return jsonify({"requests": requests_db, "count": len(requests_db)})

@app.route("/api/heatmap")
def get_heatmap():
    """Fetch heatmap data points based on request priority and location."""
    points = [
        {
            "lat": req["location"]["lat"],
            "lng": req["location"]["lng"],
            "weight": req["priority"],
        }
        for req in requests_db
        if req.get("location")
    ]
    return jsonify({"heatpoints": points, "timestamp": "current"})

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