// HeatmapMap — fully reactive, with markers + legend overlay
function HeatmapMap({ heatpoints, alerts }) {
    const { useEffect, useRef } = React;
    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);
    const markerLayerRef = useRef(null);

    // Severity → ring color
    const severityColor = {
        "Critical": "#ef4444",
        "High":     "#f97316",
        "Medium":   "#f59e0b",
        "Low":      "#38bdf8",
    };

    const typeIcon = {
        "Health Alert":    "🏥",
        "Road Blockage":   "🚧",
        "Fire Hazard":     "#🔥",
        "General Warning": "⚠️",
        "Fire":            "🔥",
        "Injury":          "🚑",
        "Food":            "🍲",
        "Shelter":         "🏠",
        "Search":          "🔍",
    };

    // ── Initialise map once ──────────────────────────────────────────────────
    useEffect(() => {
        if (mapRef.current) return;

        const map = L.map("heatmap-map", {
            zoomControl: true,
            attributionControl: false,
        }).setView([12.9716, 77.5946], 12);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // ── Update heat layer whenever heatpoints change ─────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Remove old heat layer
        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
            heatLayerRef.current = null;
        }

        if (heatpoints && heatpoints.length > 0) {
            const heatData = heatpoints.map(p => [p.lat, p.lng, p.weight || 1]);
            heatLayerRef.current = L.heatLayer(heatData, {
                radius: 40,
                blur: 25,
                maxZoom: 13,
                max: 5.0,
                gradient: { 0.0: "#1e40af", 0.3: "#0ea5e9", 0.6: "#f59e0b", 0.85: "#ef4444", 1.0: "#7f1d1d" }
            }).addTo(map);
        }
    }, [heatpoints]);

    // ── Render alert markers whenever alerts list changes ────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear old markers
        if (markerLayerRef.current) {
            markerLayerRef.current.clearLayers();
        } else {
            markerLayerRef.current = L.layerGroup().addTo(map);
        }

        if (!alerts || alerts.length === 0) return;

        alerts.forEach(alert => {
            if (!alert.location) return;
            const color = severityColor[alert.severity] || "#38bdf8";
            const icon = typeIcon[alert.type] || "⚠️";
            const markerHtml = `
                <div style="
                    width:36px; height:36px;
                    background:${color}22;
                    border: 2px solid ${color};
                    border-radius:50%;
                    display:flex; align-items:center; justify-content:center;
                    font-size:16px;
                    box-shadow: 0 0 12px ${color}88;
                    animation: pulse-ring 1.8s cubic-bezier(0.215,0.61,0.355,1) infinite;
                ">${icon}</div>`;

            const divIcon = L.divIcon({
                className: "custom-div-icon",
                html: markerHtml,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
            });

            const marker = L.marker([alert.location.lat, alert.location.lng], { icon: divIcon });
            const popupHtml = `
                <div style="font-family:Inter,sans-serif;min-width:160px;">
                    <div style="font-weight:700;font-size:13px;color:${color};margin-bottom:4px;">${alert.type}</div>
                    <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">${alert.desc || ""}</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <span style="background:${color}22;color:${color};border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;">${alert.severity}</span>
                        <span style="background:#1e293b;color:#94a3b8;border-radius:4px;padding:1px 6px;font-size:10px;">${alert.location.city}</span>
                    </div>
                </div>`;
            marker.bindPopup(popupHtml, { className: "glass-popup" });
            markerLayerRef.current.addLayer(marker);
        });
    }, [alerts]);

    return (
        <div className="relative w-full h-full min-h-[300px]">
            <div id="heatmap-map" className="absolute inset-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl"></div>

            {/* Live badge */}
            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 glass px-3 py-1.5 rounded-full border border-cyan-500/30">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse inline-block"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Live Intensity</span>
            </div>

            {/* Alert count badge */}
            {alerts && alerts.length > 0 && (
                <div className="absolute top-3 left-3 z-[1000] glass px-3 py-1.5 rounded-full border border-red-500/40">
                    <span className="text-[10px] font-bold text-red-400">{alerts.length} Active Alert{alerts.length !== 1 ? "s" : ""}</span>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] glass px-3 py-2 rounded-lg border border-white/10">
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1.5">Intensity</div>
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400">Low</span>
                    <div style={{
                        width: "80px", height: "8px", borderRadius: "4px",
                        background: "linear-gradient(to right, #1e40af, #0ea5e9, #f59e0b, #ef4444, #7f1d1d)"
                    }}></div>
                    <span className="text-[9px] text-slate-400">High</span>
                </div>
            </div>
        </div>
    );
}