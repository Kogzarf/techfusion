// Main App component
function App() {
    const { useState, useEffect, useCallback, useRef } = React;
    const [heatpoints, setHeatpoints] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [currentRelayStep, setCurrentRelayStep] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");
    const [stats, setStats] = useState({ requests: 0, responders: 0, warnings: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevAlertCount = useRef(0);
    const autoPlayRef = useRef(null);

    // Warning form state
    const [form, setForm] = useState({
        type: "Health Alert", severity: "High",
        desc: "", reporter: "", people: 1, location_label: "Bengaluru"
    });

    // Portal target — renders modal directly on <body>, above all stacking contexts
    const modalRoot = typeof document !== 'undefined' ? document.body : null;

    // Mesh relay customisation
    const [nodes, setNodes] = useState([
        { id: "A", lat: 12.97,  lng: 77.59,  label: "Device A" },
        { id: "B", lat: 12.972, lng: 77.595, label: "Device B" },
        { id: "C", lat: 12.974, lng: 77.60,  label: "Device C" },
        { id: "S", lat: 12.976, lng: 77.605, label: "Server"   },
    ]);
    const [links, setLinks] = useState([["A","B"],["B","C"],["C","S"]]);
    const [newNodeLabel, setNewNodeLabel] = useState("");
    const [autoPlay, setAutoPlay] = useState(false);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = useCallback(async () => {
        try {
            const [heatRes, reqRes, respRes, alertRes] = await Promise.all([
                fetch(apiUrl("/api/heatmap")),
                fetch(apiUrl("/api/requests")),
                fetch(apiUrl("/api/responders")),
                fetch(apiUrl("/api/alerts")),
            ]);
            const [heatData, reqData, respData, alertData] = await Promise.all([
                heatRes.json(), reqRes.json(), respRes.json(), alertRes.json()
            ]);

            setHeatpoints(heatData.heatpoints || []);
            setAllRequests(reqData.requests || []);
            const newAlerts = alertData.alerts || [];
            setAlerts(newAlerts);
            setStats({
                requests: reqData.requests?.length || 0,
                responders: respData.responders?.length || 0,
                warnings: newAlerts.length,
            });
            if (newAlerts.length > prevAlertCount.current) {
                setUnreadCount(c => c + (newAlerts.length - prevAlertCount.current));
            }
            prevAlertCount.current = newAlerts.length;
        } catch (err) {
            console.error("Fetch error:", err);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const handle = setInterval(fetchData, 5000);
        return () => clearInterval(handle);
    }, [fetchData]);

    // Auto-play relay
    useEffect(() => {
        if (autoPlay) {
            const steps = links.map(([a, b]) => `${a}-${b}`);
            let i = 0;
            setCurrentRelayStep(steps[0]);
            autoPlayRef.current = setInterval(() => {
                i = (i + 1) % steps.length;
                setCurrentRelayStep(steps[i]);
            }, 2000);
        } else {
            clearInterval(autoPlayRef.current);
        }
        return () => clearInterval(autoPlayRef.current);
    }, [autoPlay, links]);

    const submitWarning = async (e) => {
        e.preventDefault();
        if (!form.desc.trim()) return;
        try {
            const res = await fetch(apiUrl("/api/requests"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setIsModalOpen(false);
                setForm({ type: "Health Alert", severity: "High", desc: "", reporter: "", people: 1, location_label: "Bengaluru" });
                showToast("⚠️ Warning broadcast successfully!");
                await fetchData();
            } else {
                showToast("Failed to submit warning", "error");
            }
        } catch (err) {
            showToast("Network error", "error");
        }
    };

    const dismissAlert = async (id) => {
        try {
            await fetch(apiUrl("/api/requests/" + id), { method: "DELETE" });
            await fetchData();
            showToast("Alert dismissed");
        } catch(err) { showToast("Failed to dismiss", "error"); }
    };

    const addNode = () => {
        if (!newNodeLabel.trim()) return;
        const id = newNodeLabel.trim().toUpperCase().slice(0, 2);
        if (nodes.find(n => n.id === id)) return;
        const last = nodes[nodes.length - 2];
        setNodes(prev => [...prev.slice(0, -1), {
            id, lat: last.lat + 0.002, lng: last.lng + 0.005, label: `Device ${id}`
        }, prev[prev.length - 1]]);
        const serverNode = nodes[nodes.length - 1];
        setLinks(prev => [...prev.slice(0, -1), [prev[prev.length - 1][0], id], [id, serverNode.id]]);
        setNewNodeLabel("");
    };

    const removeNode = (id) => {
        if (id === "S" || nodes.length <= 2) return;
        setNodes(prev => prev.filter(n => n.id !== id));
        setLinks(prev => prev.filter(([a, b]) => a !== id && b !== id));
        if (currentRelayStep.includes(id)) setCurrentRelayStep("");
    };

    const severityColor = { Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#38bdf8" };
    const typeEmoji = { "Health Alert": "🏥", "Road Blockage": "🚧", "Fire Hazard": "🔥", "General Warning": "⚠️" };

    const relaySteps = links.map(([a, b]) => `${a}-${b}`);

    const NavItem = ({ id, icon, label }) => (
        <button onClick={() => { setActiveTab(id); if (id === "dashboard") setUnreadCount(0); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === id
                ? "bg-primary/20 text-primary border-l-4 border-primary shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                : "text-text-muted hover:bg-white/5 hover:text-white"
            }`}>
            <i data-lucide={icon} className="w-5 h-5"></i>
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <div className="flex bg-bg-dark text-slate-100 min-h-screen">

            {/* Sidebar */}
            <div className="sidebar glass border-r border-white/5 p-6 flex flex-col">
                <div className="flex items-center space-x-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <i data-lucide="shield" className="text-white w-6 h-6"></i>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white leading-none">TechFusion</h1>
                        <span className="text-[10px] text-primary font-bold uppercase tracking-widest">ResilientNet</span>
                    </div>
                </div>
                <nav className="flex-1 space-y-2">
                    <NavItem id="dashboard" icon="layout-dashboard" label="Overview" />
                    <NavItem id="heatmap"   icon="map"              label="Live Heatmap" />
                    <NavItem id="alerts"    icon="bell"             label="Alert Feed" />
                    <NavItem id="flow"      icon="network"          label="Network Flow" />
                    <NavItem id="selfheal"  icon="shield-check"    label="Self-Healing" />
                    <NavItem id="manage"    icon="settings"         label="Management" />
                </nav>
                <div className="mt-auto glass p-4 rounded-xl border border-white/5 bg-white/5">
                    <div className="flex items-center space-x-2 text-xs text-success mb-1">
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                        <span className="font-bold uppercase tracking-wider">System Online</span>
                    </div>
                    <p className="text-[10px] text-text-muted">v2.5.0-stable | Mesh Active</p>
                </div>
            </div>

            {/* Main Content */}
            <main className="main-content flex-1">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">
                            {activeTab === "dashboard" ? "Operational Overview" :
                             activeTab === "heatmap"   ? "Emergency Heatmap" :
                             activeTab === "alerts"    ? "Live Alert Feed" :
                             activeTab === "selfheal"  ? "Self-Healing Task Engine" :
                             activeTab === "manage"    ? "System Management" :
                             "Network Flow Intelligence"}
                        </h2>
                        <p className="text-text-muted text-sm">Real-time situational awareness and network health monitoring.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={() => setIsModalOpen(true)}
                            className="report-btn flex items-center space-x-2 px-4 py-2.5 rounded-lg font-bold text-white">
                            <i data-lucide="alert-triangle" className="w-4 h-4"></i>
                            <span>Report Warning</span>
                        </button>
                        <button onClick={() => { setActiveTab("alerts"); setUnreadCount(0); }}
                            className="relative glass px-3 py-2.5 rounded-lg border border-white/5">
                            <i data-lucide="bell" className="w-5 h-5 text-text-muted"></i>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Active Requests", val: stats.requests,   borderColor: "#38bdf8", iconColor: "#38bdf8", icon: "alert-circle", badge: "High Priority" },
                        { label: "Responders",       val: stats.responders, borderColor: "#10b981", iconColor: "#10b981", icon: "users",        badge: "Deployed"      },
                        { label: "User Warnings",    val: stats.warnings,   borderColor: "#ef4444", iconColor: "#ef4444", icon: "activity",     badge: "Live"          },
                        { label: "Network Latency",  val: "24ms",           borderColor: "#f59e0b", iconColor: "#f59e0b", icon: "zap",         badge: "Stable"        },
                    ].map(function(s) { return (
                        <div key={s.label} className="card glass" style={{borderLeft: "4px solid " + s.borderColor}}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 rounded-lg" style={{background: s.borderColor + "22"}}>
                                    <i data-lucide={s.icon} className="w-5 h-5" style={{color: s.iconColor}}></i>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{color: s.iconColor, background: s.borderColor + "22"}}>{s.badge}</span>
                            </div>
                            <h3 className="text-text-muted text-xs font-medium mb-1">{s.label}</h3>
                            <p className="text-3xl font-bold text-white">{s.val}</p>
                        </div>
                    );})}
                </div>

                {/* ── Dashboard Tab ── */}
                {activeTab === "dashboard" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{height:"500px"}}>
                        <div className="flex flex-col space-y-3 h-full">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-bold flex items-center space-x-2">
                                    <i data-lucide="map" className="w-4 h-4 text-primary"></i>
                                    <span>Emergency Heatmap</span>
                                </h3>
                            </div>
                            <div className="flex-1 min-h-[420px]">
                                <HeatmapMap heatpoints={heatpoints} alerts={allRequests} />
                            </div>
                        </div>
                        <div className="flex flex-col space-y-3 h-full">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-bold flex items-center space-x-2">
                                    <i data-lucide="network" className="w-4 h-4 text-primary"></i>
                                    <span>Mesh Relay</span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setAutoPlay(p => !p)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                                            autoPlay ? "bg-success text-white" : "bg-white/5 text-text-muted hover:bg-white/10"
                                        }`}>
                                        {autoPlay ? "⏹ Stop" : "▶ Auto"}
                                    </button>
                                    {relaySteps.map(step => (
                                        <button key={step} onClick={() => { setAutoPlay(false); setCurrentRelayStep(step); }}
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                                                currentRelayStep === step && !autoPlay
                                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                : "bg-white/5 text-text-muted hover:bg-white/10"
                                            }`}>
                                            {step.replace("-", "→")}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 min-h-[380px]">
                                <MessageFlowMap nodes={nodes} links={links} activeLink={currentRelayStep} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Heatmap Tab ── */}
                {activeTab === "heatmap" && (
                    <div style={{height:"600px"}} className="flex flex-col space-y-3">
                        <div className="flex-1">
                            <HeatmapMap heatpoints={heatpoints} alerts={allRequests} />
                        </div>
                    </div>
                )}

                {/* ── Alert Feed Tab ── */}
                {activeTab === "alerts" && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-text-muted">{alerts.length} user-submitted warning{alerts.length !== 1 ? "s" : ""}</span>
                            <button onClick={fetchData} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <i data-lucide="refresh-cw" className="w-3 h-3"></i> Refresh
                            </button>
                        </div>
                        {alerts.length === 0 && (
                            <div className="card glass text-center py-12 text-text-muted">
                                <i data-lucide="check-circle" className="w-10 h-10 mx-auto mb-3 text-success"></i>
                                <p className="font-medium">No active user warnings</p>
                            </div>
                        )}
                        {alerts.map(alert => {
                            const sev = alert.severity || "High";
                            const col = severityColor[sev] || "#f97316";
                            const emoji = typeEmoji[alert.type] || "⚠️";
                            const ts = alert.submitted_at ? new Date(alert.submitted_at).toLocaleTimeString() : "";
                            return (
                                <div key={alert.id} className="alert-feed-item glass card"
                                    style={{borderLeft:`4px solid ${col}`}}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-3 flex-1">
                                            <span className="text-2xl mt-0.5">{emoji}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="font-bold text-white text-sm">{alert.type}</span>
                                                    <span className="severity-badge" style={{background:`${col}22`, color:col}}>{sev}</span>
                                                    <span className="severity-badge" style={{background:"#1e293b", color:"#94a3b8"}}>
                                                        {alert.people} affected
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 text-sm mb-1">{alert.desc}</p>
                                                <div className="flex gap-3 text-[11px] text-text-muted">
                                                    <span>📍 {alert.location?.city}</span>
                                                    {alert.reporter && <span>👤 {alert.reporter}</span>}
                                                    {ts && <span>🕐 {ts}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => dismissAlert(alert.id)}
                                            className="text-text-muted hover:text-danger transition-colors ml-3 mt-1"
                                            title="Dismiss">
                                            <i data-lucide="x-circle" className="w-5 h-5"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Network Flow Tab ── */}
                {activeTab === "flow" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 flex flex-col space-y-3" style={{height:"560px"}}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <i data-lucide="network" className="w-4 h-4 text-primary"></i>
                                    Mesh Relay Simulation
                                </h3>
                                <button onClick={() => setAutoPlay(p => !p)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${
                                        autoPlay ? "bg-success text-white" : "bg-white/5 text-text-muted hover:bg-white/10"
                                    }`}>
                                    {autoPlay ? "⏹ Stop Auto-Play" : "▶ Auto-Play"}
                                </button>
                            </div>
                            <div className="flex-1">
                                <MessageFlowMap nodes={nodes} links={links} activeLink={currentRelayStep} />
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {relaySteps.map(step => (
                                    <button key={step}
                                        onClick={() => { setAutoPlay(false); setCurrentRelayStep(step); }}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${
                                            currentRelayStep === step
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "bg-white/5 text-text-muted hover:bg-white/10"
                                        }`}>
                                        {step.replace("-", " → ")}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Customisation Panel */}
                        <div className="flex flex-col gap-4">
                            <div className="glass card border border-white/5">
                                <h4 className="font-bold text-sm mb-3 text-white">Node Manager</h4>
                                <div className="space-y-2 mb-3">
                                    {nodes.map(n => (
                                        <div key={n.id} className="flex items-center justify-between py-1.5 border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    n.id === "S" ? "bg-accent" : "bg-primary"
                                                } text-white`}>{n.id}</span>
                                                <span className="text-sm text-slate-300">{n.label}</span>
                                            </div>
                                            {n.id !== "S" && (
                                                <button onClick={() => removeNode(n.id)}
                                                    className="text-text-muted hover:text-danger text-xs transition-colors">
                                                    <i data-lucide="trash-2" className="w-4 h-4"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
                                        placeholder="Node ID (e.g. D)"
                                        value={newNodeLabel}
                                        onChange={e => setNewNodeLabel(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && addNode()} />
                                    <button onClick={addNode}
                                        className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg px-3 py-1.5 text-sm font-bold transition-all">
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="glass card border border-white/5">
                                <h4 className="font-bold text-sm mb-3 text-white">Active Links</h4>
                                <div className="space-y-1.5">
                                    {links.map(([a, b], i) => (
                                        <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-sm ${
                                            currentRelayStep === `${a}-${b}` ? "bg-primary/10 text-primary" : "text-slate-400"
                                        }`}>
                                            <span className="font-mono">{a} → {b}</span>
                                            {currentRelayStep === `${a}-${b}` && (
                                                <span className="text-[9px] uppercase text-primary font-bold animate-pulse">Active</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Self-Healing Tab ── */}
                {activeTab === "selfheal" && (
                    <div className="glass card border border-white/5">
                        <SelfHealingPanel />
                    </div>
                )}

                {/* ── Management Tab ── */}
                {activeTab === "manage" && (
                    <div className="glass card border border-white/5">
                        <ManagementPanel onDataChanged={fetchData} />
                    </div>
                )}
            </main>

            {/* Warning Modal — fixed position with very high z-index */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={function(e){ e.stopPropagation(); }}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold text-white">⚠️ Report Emergency</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:"20px"}}>✕</button>
                        </div>
                        <form onSubmit={submitWarning} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Warning Type</label>
                                    <select className="form-input" value={form.type} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{type:e.target.value}); }); }}>
                                        <option>Health Alert</option>
                                        <option>Road Blockage</option>
                                        <option>Fire Hazard</option>
                                        <option>General Warning</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Severity</label>
                                    <select className="form-input" value={form.severity} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{severity:e.target.value}); }); }}>
                                        <option>Critical</option>
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Reporter Name</label>
                                    <input className="form-input" placeholder="Your name (optional)" value={form.reporter} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{reporter:e.target.value}); }); }} />
                                </div>
                                <div>
                                    <label className="form-label">People Affected</label>
                                    <input className="form-input" type="number" min="1" value={form.people} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{people:parseInt(e.target.value)||1}); }); }} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Location / Area</label>
                                <input className="form-input" placeholder="e.g. Koramangala, Bengaluru" value={form.location_label} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{location_label:e.target.value}); }); }} />
                            </div>
                            <div>
                                <div className="flex justify-between">
                                    <label className="form-label">Description</label>
                                    <span style={{fontSize:"10px", color: form.desc.length > 200 ? "#ef4444" : "#94a3b8"}}>{form.desc.length}/250</span>
                                </div>
                                <textarea className="form-input resize-none" style={{height:"96px"}} placeholder="Describe the situation clearly..." maxLength={250} value={form.desc} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{desc:e.target.value}); }); }} required></textarea>
                            </div>
                            <div className="flex gap-3" style={{paddingTop:"8px"}}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"none",color:"#94a3b8",fontWeight:700,padding:"12px",borderRadius:"8px",cursor:"pointer"}}>Cancel</button>
                                <button type="submit" className="report-btn" style={{flex:1,color:"white",fontWeight:700,padding:"12px",borderRadius:"8px",cursor:"pointer",border:"none"}}>📡 Broadcast Warning</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={"toast-notification " + (toast.type === "error" ? "toast-error" : "toast-success")}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}