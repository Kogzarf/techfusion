// MessageFlowMap — fixed lifecycle, animated packet, customizable nodes/links
function MessageFlowMap({ nodes, links, activeLink, onNodesChange, onLinksChange }) {
    const { useEffect, useRef, useState } = React;
    const mapRef = useRef(null);
    const nodeMarkersRef = useRef({});
    const linkLinesRef = useRef({});
    const packetRef = useRef(null);
    const packetAnimRef = useRef(null);
    const animIntervalRef = useRef({});

    // ── Init map once ────────────────────────────────────────────────────────
    useEffect(() => {
        if (mapRef.current) return;

        const map = L.map("flow-map", {
            zoomControl: false,
            attributionControl: false,
        }).setView([12.973, 77.598], 14);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        return () => {
            Object.values(animIntervalRef.current).forEach(clearInterval);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // ── Update node markers whenever nodes change ────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Remove stale markers not in new nodes list
        Object.keys(nodeMarkersRef.current).forEach(id => {
            if (!nodes.find(n => n.id === id)) {
                map.removeLayer(nodeMarkersRef.current[id]);
                delete nodeMarkersRef.current[id];
            }
        });

        nodes.forEach(n => {
            const isServer = n.id === "S";
            const bgColor = n.status === "offline" ? "#ef4444" : isServer ? "#818cf8" : "#38bdf8";
            const markerHtml = `
                <div style="
                    width:36px; height:36px;
                    background:${bgColor};
                    border:2.5px solid white;
                    border-radius:50%;
                    display:flex; align-items:center; justify-content:center;
                    font-weight:800; font-size:13px; color:white;
                    box-shadow: 0 0 14px ${bgColor}99;
                    font-family:Outfit,sans-serif;
                ">${n.id}</div>`;

            const icon = L.divIcon({
                className: "custom-div-icon",
                html: markerHtml,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
            });

            if (nodeMarkersRef.current[n.id]) {
                nodeMarkersRef.current[n.id].setIcon(icon);
                nodeMarkersRef.current[n.id].setLatLng([n.lat, n.lng]);
            } else {
                const marker = L.marker([n.lat, n.lng], { icon }).addTo(map);
                marker.bindTooltip(n.label, {
                    permanent: true,
                    direction: "top",
                    className: "glass-tooltip",
                });
                nodeMarkersRef.current[n.id] = marker;
            }
        });
    }, [nodes]);

    // ── Update link lines + packet animation whenever links/activeLink change ──
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear old packet
        if (packetRef.current) {
            map.removeLayer(packetRef.current);
            packetRef.current = null;
        }
        if (packetAnimRef.current) {
            clearInterval(packetAnimRef.current);
            packetAnimRef.current = null;
        }

        // Clear all old intervals
        Object.values(animIntervalRef.current).forEach(clearInterval);
        animIntervalRef.current = {};

        // Remove stale lines
        Object.keys(linkLinesRef.current).forEach(key => {
            map.removeLayer(linkLinesRef.current[key]);
        });
        linkLinesRef.current = {};

        links.forEach(([fromId, toId]) => {
            const fromMarker = nodeMarkersRef.current[fromId];
            const toMarker = nodeMarkersRef.current[toId];
            if (!fromMarker || !toMarker) return;

            const a = fromMarker.getLatLng();
            const b = toMarker.getLatLng();
            const key = `${fromId}-${toId}`;
            const isActive = activeLink === key;

            const line = L.polyline([a, b], {
                color: isActive ? "#38bdf8" : "#334155",
                weight: isActive ? 4 : 2,
                opacity: isActive ? 1 : 0.4,
                dashArray: isActive ? "8, 8" : "none",
            }).addTo(map);

            if (isActive) {
                let offset = 0;
                const iv = setInterval(() => {
                    offset -= 2;
                    line.setStyle({ dashOffset: `${offset}` });
                }, 40);
                animIntervalRef.current[key] = iv;

                // Animated moving packet dot
                const fromLatLng = fromMarker.getLatLng();
                const toLatLng = toMarker.getLatLng();
                let t = 0;

                const packetIcon = L.divIcon({
                    className: "custom-div-icon",
                    html: `<div style="
                        width:12px;height:12px;
                        background:#38bdf8;
                        border-radius:50%;
                        box-shadow:0 0 8px #38bdf8;
                        border:2px solid white;
                    "></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                });

                const packet = L.marker([fromLatLng.lat, fromLatLng.lng], {
                    icon: packetIcon,
                    zIndexOffset: 500,
                }).addTo(map);
                packetRef.current = packet;

                packetAnimRef.current = setInterval(() => {
                    t += 0.015;
                    if (t > 1) t = 0;
                    const lat = fromLatLng.lat + (toLatLng.lat - fromLatLng.lat) * t;
                    const lng = fromLatLng.lng + (toLatLng.lng - fromLatLng.lng) * t;
                    packet.setLatLng([lat, lng]);
                }, 30);
            }

            linkLinesRef.current[key] = line;
        });
    }, [links, activeLink, nodes]);

    return (
        <div className="relative w-full h-full min-h-[300px]">
            <div id="flow-map" className="absolute inset-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl"></div>

            <div className="absolute top-3 left-3 z-[1000] glass px-3 py-1.5 rounded-full border border-primary/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Network Topology</span>
            </div>

            {activeLink && (
                <div className="absolute bottom-3 left-3 z-[1000] glass px-4 py-2 rounded-lg border border-primary/30">
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Active Relay</div>
                    <div className="text-sm font-bold text-white">{activeLink.replace("-", " → ")}</div>
                    <div className="text-[9px] text-cyan-400 mt-0.5">Packet transmitting…</div>
                </div>
            )}
        </div>
    );
}