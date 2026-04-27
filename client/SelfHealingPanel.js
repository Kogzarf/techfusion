// SelfHealingPanel — Real-time dashboard for the Self-Healing Task Reassignment engine
function SelfHealingPanel() {
    const { useState, useEffect, useRef } = React;
    const [history, setHistory] = useState([]);
    const [requests, setRequests] = useState([]);
    const [statuses, setStatuses] = useState({});
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState({});
    const [policeAlerts, setPoliceAlerts] = useState([]);
    const tickRef = useRef({});

    const SEVERITY_COLOR = { Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#38bdf8" };
    const EVENT_COLOR = {
        ASSIGNED:            "#10b981",
        ACKNOWLEDGED:        "#38bdf8",
        REJECTED:            "#f97316",
        REASSIGNED_TIMEOUT:  "#f59e0b",
        REASSIGNED_REJECTED: "#ef4444",
        CHAIN_EXHAUSTED:     "#7f1d1d",
        NO_RESPONDERS_AVAILABLE: "#94a3b8",
    };

    const fetchAll = async () => {
        try {
            const [reqRes, histRes] = await Promise.all([
                fetch(apiUrl("/api/requests")),
                fetch(apiUrl("/api/selfheal/history")),
            ]);
            const reqData  = await reqRes.json();
            const histData = await histRes.json();
            setRequests(reqData.requests || []);
            setHistory(histData.events || []);

            // detect police alerts from history
            const alerts = (histData.events || []).filter(function(e) {
                return e.event === "ASSIGNED" || e.event.startsWith("REASSIGNED");
            }).slice(0, 3);
            setPoliceAlerts(alerts);
        } catch(err) {
            console.error("SelfHealing fetch error", err);
        }
    };

    useEffect(function() {
        fetchAll();
        const h = setInterval(fetchAll, 4000);
        return function() { clearInterval(h); };
    }, []);

    // Countdown timers for pending assignments
    useEffect(function() {
        Object.values(tickRef.current).forEach(clearInterval);
        tickRef.current = {};
        requests.forEach(function(req) {
            const st = statuses[req.id];
            if (st && !st.acknowledged && !st.rejected) {
                tickRef.current[req.id] = setInterval(function() {
                    setStatuses(function(prev) {
                        var s = prev[req.id];
                        if (!s) return prev;
                        return Object.assign({}, prev, { [req.id]: Object.assign({}, s, { elapsed_s: s.elapsed_s + 1 }) });
                    });
                }, 1000);
            }
        });
        return function() { Object.values(tickRef.current).forEach(clearInterval); };
    }, [requests]);

    const doAssign = async function(reqId) {
        setLoading(function(p) { return Object.assign({}, p, { [reqId]: true }); });
        try {
            const res = await fetch(apiUrl("/api/selfheal/" + reqId + "/assign"), { method: "POST" });
            const data = await res.json();
            if (data.status === "assigned") {
                setStatuses(function(p) { return Object.assign({}, p, { [reqId]: {
                    request_id: reqId, responder_id: data.responder && data.responder.id,
                    acknowledged: false, rejected: false, attempt: data.attempt || 1,
                    elapsed_s: 0, timeout_s: 30, chain: data.responder ? [data.responder.id] : [],
                    route: data.route
                }}); });
                if (data.responder && data.responder.type === "Police") {
                    setPoliceAlerts(function(p) { return [{ request_id: reqId, responder_name: data.responder.name, event: "POLICE_DISPATCHED", timestamp: new Date().toISOString(), route: data.route }].concat(p.slice(0,4)); });
                }
            }
            await fetchAll();
        } catch(err) { console.error(err); }
        setLoading(function(p) { return Object.assign({}, p, { [reqId]: false }); });
    };

    const doAck = async function(reqId) {
        await fetch(apiUrl("/api/selfheal/" + reqId + "/acknowledge"), { method: "POST" });
        setStatuses(function(p) {
            var s = p[reqId];
            return s ? Object.assign({}, p, { [reqId]: Object.assign({}, s, { acknowledged: true }) }) : p;
        });
        await fetchAll();
    };

    const doReject = async function(reqId) {
        setLoading(function(p) { return Object.assign({}, p, { [reqId + "_rej"]: true }); });
        const res = await fetch(apiUrl("/api/selfheal/" + reqId + "/reject"), { method: "POST" });
        const data = await res.json();
        if (data.status === "reassigned") {
            setStatuses(function(p) {
                var s = p[reqId] || {};
                return Object.assign({}, p, { [reqId]: Object.assign({}, s, {
                    responder_id: data.responder && data.responder.id,
                    acknowledged: false, rejected: false,
                    attempt: data.attempt || (s.attempt || 1) + 1,
                    elapsed_s: 0, route: data.route,
                    chain: (s.chain || []).concat(data.responder ? [data.responder.id] : [])
                })});
            });
        }
        setLoading(function(p) { return Object.assign({}, p, { [reqId + "_rej"]: false }); });
        await fetchAll();
    };

    const openDetail = async function(reqId) {
        setSelected(reqId);
        try {
            const res = await fetch(apiUrl("/api/selfheal/" + reqId + "/status"));
            if (res.ok) {
                const data = await res.json();
                setDetail(data);
            } else {
                setDetail(null);
            }
        } catch(e) { setDetail(null); }
    };

    const req = requests.find(function(r) { return r.id === selected; });
    const st  = statuses[selected];

    return (
        <div style={{fontFamily:"Inter,sans-serif", color:"#f1f5f9"}}>

            {/* Police Alert Banner */}
            {policeAlerts.length > 0 && (
                <div style={{background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"12px"}}>
                    <span style={{fontSize:"22px"}}>🚔</span>
                    <div>
                        <div style={{fontWeight:700, color:"#f87171", fontSize:"13px"}}>POLICE ALERT DISPATCHED</div>
                        <div style={{fontSize:"11px", color:"#94a3b8"}}>{policeAlerts[0] && (policeAlerts[0].responder_name || "Responder")} dispatched — {policeAlerts[0] && policeAlerts[0].route && ("Via: " + policeAlerts[0].route.via)}</div>
                    </div>
                    <div style={{marginLeft:"auto", fontSize:"10px", color:"#94a3b8"}}>{policeAlerts[0] && new Date(policeAlerts[0].timestamp).toLocaleTimeString()}</div>
                </div>
            )}

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px"}}>

                {/* Left — Request queue */}
                <div>
                    <h3 style={{fontFamily:"Outfit,sans-serif", fontSize:"15px", fontWeight:700, marginBottom:"12px", color:"white"}}>
                        🛡️ Active Requests — Self-Heal Queue
                    </h3>
                    <div style={{display:"flex", flexDirection:"column", gap:"10px", maxHeight:"520px", overflowY:"auto"}}>
                        {requests.length === 0 && <div style={{color:"#94a3b8", fontSize:"13px", textAlign:"center", padding:"40px"}}>No active requests</div>}
                        {requests.map(function(req) {
                            var st = statuses[req.id];
                            var sev = req.severity || "Medium";
                            var col = SEVERITY_COLOR[sev] || "#38bdf8";
                            var elapsed = st ? st.elapsed_s : 0;
                            var timeout = st ? st.timeout_s : 30;
                            var pct = st && !st.acknowledged ? Math.min(100, (elapsed / timeout) * 100) : 0;
                            var barCol = pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#38bdf8";

                            return (
                                <div key={req.id}
                                    onClick={function() { openDetail(req.id); }}
                                    style={{background: selected === req.id ? "rgba(56,189,248,0.08)" : "rgba(30,41,59,0.7)", border:"1px solid " + (selected === req.id ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.08)"), borderLeft:"4px solid " + col, borderRadius:"10px", padding:"12px 14px", cursor:"pointer", transition:"all 0.2s"}}>

                                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px"}}>
                                        <div>
                                            <span style={{fontWeight:700, fontSize:"13px", color:"white"}}>{req.type}</span>
                                            <span style={{marginLeft:"8px", fontSize:"10px", fontWeight:700, padding:"1px 7px", borderRadius:"4px", background: col + "22", color: col}}>{sev}</span>
                                        </div>
                                        <span style={{fontSize:"10px", color:"#94a3b8"}}>{req.id}</span>
                                    </div>

                                    <div style={{fontSize:"11px", color:"#94a3b8", marginBottom:"8px"}}>{req.desc}</div>

                                    {/* Timer bar */}
                                    {st && !st.acknowledged && (
                                        <div style={{marginBottom:"8px"}}>
                                            <div style={{display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#94a3b8", marginBottom:"3px"}}>
                                                <span>⏱ Ack timeout</span>
                                                <span style={{color: pct > 80 ? "#ef4444" : "#94a3b8"}}>{elapsed}s / {timeout}s</span>
                                            </div>
                                            <div style={{background:"rgba(255,255,255,0.08)", borderRadius:"4px", height:"4px"}}>
                                                <div style={{width: pct + "%", height:"4px", borderRadius:"4px", background: barCol, transition:"width 1s linear"}}></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status */}
                                    {st && (
                                        <div style={{fontSize:"11px", marginBottom:"8px"}}>
                                            {st.acknowledged && <span style={{color:"#10b981", fontWeight:700}}>✓ Acknowledged — Attempt {st.attempt}</span>}
                                            {!st.acknowledged && <span style={{color:"#f59e0b"}}>⏳ Awaiting ack — Attempt {st.attempt} — Responder: {st.responder_id}</span>}
                                            {st.chain && st.chain.length > 1 && <span style={{color:"#94a3b8", marginLeft:"8px"}}>({st.chain.length} in chain)</span>}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                                        {!st && (
                                            <button onClick={function(e){ e.stopPropagation(); doAssign(req.id); }}
                                                style={{background:"#38bdf8", border:"none", color:"#0f172a", fontWeight:700, fontSize:"11px", padding:"5px 12px", borderRadius:"6px", cursor:"pointer"}}>
                                                {loading[req.id] ? "Assigning…" : "⚡ Assign"}
                                            </button>
                                        )}
                                        {st && !st.acknowledged && (
                                            <button onClick={function(e){ e.stopPropagation(); doAck(req.id); }}
                                                style={{background:"rgba(16,185,129,0.2)", border:"1px solid rgba(16,185,129,0.4)", color:"#34d399", fontWeight:700, fontSize:"11px", padding:"5px 12px", borderRadius:"6px", cursor:"pointer"}}>
                                                ✓ Acknowledge
                                            </button>
                                        )}
                                        {st && !st.acknowledged && (
                                            <button onClick={function(e){ e.stopPropagation(); doReject(req.id); }}
                                                style={{background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", fontWeight:700, fontSize:"11px", padding:"5px 12px", borderRadius:"6px", cursor:"pointer"}}>
                                                {loading[req.id + "_rej"] ? "Reassigning…" : "✕ Reject"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right — Detail + History */}
                <div style={{display:"flex", flexDirection:"column", gap:"16px"}}>

                    {/* Detail panel */}
                    {selected && req && (
                        <div style={{background:"rgba(30,41,59,0.8)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", padding:"16px"}}>
                            <h4 style={{fontFamily:"Outfit,sans-serif", fontSize:"14px", fontWeight:700, marginBottom:"12px", color:"white"}}>📋 Assignment Detail — {selected}</h4>

                            {detail && (
                                <div style={{display:"flex", flexDirection:"column", gap:"8px", marginBottom:"12px"}}>
                                    <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px"}}>
                                        <span style={{color:"#94a3b8"}}>Responder</span>
                                        <span style={{color:"white", fontWeight:600}}>{detail.responder_id || "—"}</span>
                                    </div>
                                    <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px"}}>
                                        <span style={{color:"#94a3b8"}}>Attempts</span>
                                        <span style={{color:"#f59e0b", fontWeight:700}}>{detail.attempt} / 5</span>
                                    </div>
                                    <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px"}}>
                                        <span style={{color:"#94a3b8"}}>Status</span>
                                        <span style={{color: detail.acknowledged ? "#10b981" : "#f59e0b", fontWeight:700}}>
                                            {detail.acknowledged ? "ACKNOWLEDGED" : "PENDING ACK"}
                                        </span>
                                    </div>
                                    {detail.chain && (
                                        <div style={{fontSize:"11px", color:"#94a3b8", marginTop:"4px"}}>
                                            Chain: {detail.chain.join(" → ")}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Route info */}
                            {st && st.route && (
                                <div style={{background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:"8px", padding:"10px"}}>
                                    <div style={{fontSize:"11px", fontWeight:700, color:"#38bdf8", marginBottom:"6px"}}>🗺️ Traffic-Free Route</div>
                                    <div style={{fontSize:"11px", color:"#94a3b8", marginBottom:"4px"}}>Via: {st.route.via}</div>
                                    <div style={{display:"flex", gap:"12px", fontSize:"11px"}}>
                                        <span style={{color:"white"}}>📏 {st.route.distance_km} km</span>
                                        <span style={{color:"#10b981"}}>⏱ ~{st.route.eta_minutes} min ETA</span>
                                    </div>
                                    {st.route.avoids && (
                                        <div style={{fontSize:"10px", color:"#94a3b8", marginTop:"4px"}}>
                                            Avoids: {st.route.avoids.join(", ")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Event History */}
                    <div style={{background:"rgba(30,41,59,0.7)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"10px", padding:"14px", flex:1}}>
                        <h4 style={{fontFamily:"Outfit,sans-serif", fontSize:"14px", fontWeight:700, marginBottom:"10px", color:"white"}}>📜 Reassignment Event Log</h4>
                        <div style={{maxHeight:"300px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"6px"}}>
                            {history.length === 0 && <div style={{color:"#94a3b8", fontSize:"12px", textAlign:"center", padding:"20px"}}>No events yet. Assign a request above to begin.</div>}
                            {history.map(function(ev, i) {
                                var col = EVENT_COLOR[ev.event] || "#94a3b8";
                                return (
                                    <div key={i} style={{background:"rgba(255,255,255,0.03)", borderLeft:"3px solid " + col, borderRadius:"6px", padding:"7px 10px"}}>
                                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"2px"}}>
                                            <span style={{fontSize:"11px", fontWeight:700, color:col}}>{ev.event.replace(/_/g," ")}</span>
                                            <span style={{fontSize:"10px", color:"#475569"}}>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ""}</span>
                                        </div>
                                        <div style={{fontSize:"11px", color:"#94a3b8"}}>
                                            {ev.request_id} {ev.responder_name ? ("→ " + ev.responder_name) : ""} {ev.attempt ? ("(attempt " + ev.attempt + ")") : ""}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
