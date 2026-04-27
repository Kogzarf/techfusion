// MessageFlowMap component
function MessageFlowMap({ links, nodes, activeLink }) {
    const { useEffect, useRef } = React;
    const mapRef = useRef(null);

    useEffect(() => {
        if (mapRef.current) return;

        const map = L.map("flow-map", {
            zoomControl: false,
            attributionControl: false
        }).setView([12.973, 77.598], 14);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            maxZoom: 19,
        }).addTo(map);

        const nodeMarkers = {};
        nodes.forEach(n => {
            const isServer = n.id === 'S';
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="map-node-icon ${isServer ? 'server-node-icon' : ''} pulse">${n.id}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([n.lat, n.lng], { icon }).addTo(map);
            marker.bindTooltip(n.label, { 
                permanent: true, 
                direction: 'top',
                className: 'glass-tooltip'
            });
            nodeMarkers[n.id] = marker;
        });

        links.forEach(([fromId, toId]) => {
            const from = nodeMarkers[fromId];
            const to = nodeMarkers[toId];
            if (!from || !to) return;

            const a = from.getLatLng();
            const b = to.getLatLng();
            const isActive = activeLink === `${fromId}-${toId}`;

            const line = L.polyline([a, b], {
                color: isActive ? "#38bdf8" : "#334155",
                weight: isActive ? 4 : 2,
                opacity: isActive ? 1 : 0.4,
                dashArray: isActive ? "10, 10" : "none",
            }).addTo(map);

            if (isActive) {
                // Simple dash offset animation simulation
                let offset = 0;
                const interval = setInterval(() => {
                    offset += 1;
                    line.setStyle({ dashOffset: `-${offset}` });
                }, 50);
                line._animationInterval = interval;
            }
        });

        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [links, nodes, activeLink]);

    return (
        <div className="relative w-full h-full min-h-[300px]">
            <div id="flow-map" className="absolute inset-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl"></div>
            <div className="absolute top-4 left-4 z-[1000] glass px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                Network Topology
            </div>
            {activeLink && (
                <div className="absolute bottom-4 left-4 z-[1000] glass px-4 py-2 rounded-lg border border-primary/30 animate-pulse">
                    <div className="text-[10px] text-text-muted uppercase">Active Relay</div>
                    <div className="text-sm font-bold text-white">{activeLink.replace('-', ' → ')}</div>
                </div>
            )}
        </div>
    );
}