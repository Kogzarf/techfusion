// HeatmapMap component
function HeatmapMap({ heatpoints }) {
    const { useEffect, useRef } = React;
    const mapRef = useRef(null);

    useEffect(() => {
        if (mapRef.current) return;

        const map = L.map("heatmap-map", {
            zoomControl: false,
            attributionControl: false
        }).setView([12.9716, 77.5946], 12);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            maxZoom: 19,
        }).addTo(map);

        if (heatpoints && heatpoints.length > 0) {
            const heatData = heatpoints.map(p => [p.lat, p.lng, p.weight || 1]);
            L.heatLayer(heatData, { 
                radius: 30, 
                blur: 15, 
                maxZoom: 10,
                gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
            }).addTo(map);
        }

        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [heatpoints]);

    return (
        <div className="relative w-full h-full min-h-[300px]">
            <div id="heatmap-map" className="absolute inset-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl"></div>
            <div className="absolute top-4 right-4 z-[1000] glass px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-500/30">
                Live Intensity
            </div>
        </div>
    );
}