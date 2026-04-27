// HeatmapMap — styled to match reference image: dark map, vivid blobs, dot legend
function HeatmapMap({ heatpoints, alerts }) {
    const { useEffect, useRef } = React;
    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);
    const markerLayerRef = useRef(null);

    const SEV_COLOR = { Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#3b82f6" };
    const TYPE_ICON = { "Health Alert":"🏥","Road Blockage":"🚧","Fire Hazard":"🔥","General Warning":"⚠️","Fire":"🔥","Injury":"🚑","Food":"🍲","Shelter":"🏠","Search":"🔍" };

    // ── Init map once ──────────────────────────────────────────────────────────
    useEffect(function() {
        if (mapRef.current) return;
        var map = L.map("heatmap-map", { zoomControl: true, attributionControl: false }).setView([12.9716, 77.5946], 12);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
        // City label
        L.marker([12.9716, 77.5946], {
            icon: L.divIcon({
                className: "",
                html: '<div style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;letter-spacing:2px;font-family:Outfit,sans-serif;white-space:nowrap;text-shadow:0 0 8px rgba(0,0,0,0.8)">BENGALURU</div>',
                iconAnchor: [35, 0]
            })
        }).addTo(map);
        mapRef.current = map;
        return function() { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    }, []);

    // ── Heat layer ─────────────────────────────────────────────────────────────
    useEffect(function() {
        var map = mapRef.current;
        if (!map) return;
        if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }
        if (heatpoints && heatpoints.length > 0) {
            var heatData = heatpoints.map(function(p) { return [p.lat, p.lng, p.weight || 1]; });
            heatLayerRef.current = L.heatLayer(heatData, {
                radius: 55,
                blur: 35,
                maxZoom: 14,
                max: 5.0,
                // Matches the image: blue(low) → yellow(medium) → red(high)
                gradient: { 0.0: "#1d4ed8", 0.25: "#3b82f6", 0.5: "#fbbf24", 0.75: "#f97316", 1.0: "#dc2626" }
            }).addTo(map);
        }
    }, [heatpoints]);

    // ── Alert markers ──────────────────────────────────────────────────────────
    useEffect(function() {
        var map = mapRef.current;
        if (!map) return;
        if (markerLayerRef.current) { markerLayerRef.current.clearLayers(); }
        else { markerLayerRef.current = L.layerGroup().addTo(map); }
        if (!alerts || alerts.length === 0) return;

        alerts.forEach(function(alert) {
            if (!alert.location) return;
            var sev = alert.severity || (alert.priority >= 4 ? "High" : alert.priority >= 2.5 ? "Medium" : "Low");
            var color = SEV_COLOR[sev] || "#3b82f6";
            var icon = TYPE_ICON[alert.type] || "⚠️";
            var html = '<div style="width:32px;height:32px;background:' + color + '33;border:2px solid ' + color + ';border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 14px ' + color + '99;cursor:pointer;">' + icon + '</div>';
            var marker = L.marker([alert.location.lat, alert.location.lng], {
                icon: L.divIcon({ className: "", html: html, iconSize: [32,32], iconAnchor: [16,16] })
            });
            marker.bindPopup(
                '<div style="font-family:Inter,sans-serif;min-width:160px;background:#0f172a;color:#f1f5f9;border-radius:8px;">' +
                '<div style="font-weight:700;font-size:13px;color:' + color + ';margin-bottom:6px;">' + icon + ' ' + alert.type + '</div>' +
                '<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">' + (alert.desc || "") + '</div>' +
                '<div style="display:flex;gap:6px;">' +
                '<span style="background:' + color + '22;color:' + color + ';border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;">' + sev + '</span>' +
                '<span style="background:#1e293b;color:#94a3b8;border-radius:4px;padding:1px 7px;font-size:10px;">👥 ' + (alert.people || 1) + ' affected</span>' +
                '</div></div>',
                { className: "glass-popup" }
            );
            markerLayerRef.current.addLayer(marker);
        });
    }, [alerts]);

    var highCount   = (alerts || []).filter(function(a){ return (a.priority||0) >= 4 || a.severity === "Critical" || a.severity === "High"; }).length;
    var medCount    = (alerts || []).filter(function(a){ var p = a.priority||0; return (p >= 2.5 && p < 4) || a.severity === "Medium"; }).length;
    var lowCount    = (alerts || []).filter(function(a){ return (a.priority||0) < 2.5 || a.severity === "Low"; }).length;

    return (
        <div style={{position:"relative", width:"100%", height:"100%", minHeight:"300px"}}>
            <div id="heatmap-map" style={{position:"absolute",inset:0,borderRadius:"12px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)"}}></div>

            {/* LIVE INTENSITY badge — top right like in image */}
            <div style={{position:"absolute",top:"12px",right:"12px",zIndex:1000,background:"rgba(15,23,42,0.75)",backdropFilter:"blur(8px)",border:"1px solid rgba(56,189,248,0.35)",borderRadius:"20px",padding:"4px 12px",display:"flex",alignItems:"center",gap:"7px"}}>
                <span style={{width:"7px",height:"7px",background:"#38bdf8",borderRadius:"50%",display:"inline-block",animation:"pulse 1.5s infinite"}}></span>
                <span style={{fontSize:"10px",fontWeight:700,letterSpacing:"1.5px",color:"#38bdf8",textTransform:"uppercase"}}>Live Intensity</span>
            </div>

            {/* Active alerts count — top left */}
            {alerts && alerts.length > 0 && (
                <div style={{position:"absolute",top:"12px",left:"12px",zIndex:1000,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:"20px",padding:"4px 12px"}}>
                    <span style={{fontSize:"10px",fontWeight:700,color:"#f87171"}}>{alerts.length} Active Alerts</span>
                </div>
            )}

            {/* Legend — bottom left, matching the image style with colored dots */}
            <div style={{position:"absolute",bottom:"12px",left:"12px",zIndex:1000,background:"rgba(15,23,42,0.82)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",padding:"10px 14px",display:"flex",flexDirection:"column",gap:"6px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{width:"10px",height:"10px",background:"#ef4444",borderRadius:"50%",display:"inline-block",boxShadow:"0 0 6px #ef4444"}}></span>
                    <span style={{fontSize:"11px",color:"#f1f5f9",fontFamily:"Inter,sans-serif"}}>High ({highCount})</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{width:"10px",height:"10px",background:"#f59e0b",borderRadius:"50%",display:"inline-block",boxShadow:"0 0 6px #f59e0b"}}></span>
                    <span style={{fontSize:"11px",color:"#f1f5f9",fontFamily:"Inter,sans-serif"}}>Medium ({medCount})</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{width:"10px",height:"10px",background:"#3b82f6",borderRadius:"50%",display:"inline-block",boxShadow:"0 0 6px #3b82f6"}}></span>
                    <span style={{fontSize:"11px",color:"#f1f5f9",fontFamily:"Inter,sans-serif"}}>Low ({lowCount})</span>
                </div>
            </div>
        </div>
    );
}