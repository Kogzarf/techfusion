// ManagementPanel — Add custom alerts, user warnings, and responders
function ManagementPanel({ onDataChanged }) {
    var _React = React;
    var useState = _React.useState;

    var ZONES = [
        { label: "Koramangala",   lat: 12.9352, lng: 77.6245 },
        { label: "BTM Layout",    lat: 12.9162, lng: 77.6101 },
        { label: "MG Road",       lat: 12.9716, lng: 77.6011 },
        { label: "Indiranagar",   lat: 12.9719, lng: 77.6412 },
        { label: "Whitefield",    lat: 12.9698, lng: 77.7499 },
        { label: "Yelahanka",     lat: 13.1004, lng: 77.5963 },
        { label: "Rajajinagar",   lat: 12.9916, lng: 77.5530 },
        { label: "HSR Layout",    lat: 12.9081, lng: 77.6476 },
        { label: "Malleshwaram",  lat: 13.0055, lng: 77.5707 },
        { label: "Electronic City", lat: 12.8452, lng: 77.6602 },
        { label: "Jayanagar",     lat: 12.9397, lng: 77.5832 },
        { label: "Hebbal",        lat: 13.0720, lng: 77.5996 },
    ];

    var TABS = ["Alert", "Warning", "Responder"];
    var INP = { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "white", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "Inter,sans-serif" };
    var LBL = { fontSize: "11px", fontWeight: 600, color: "#94a3b8", marginBottom: "5px", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" };

    var initAlert = { type: "Fire", severity: "High", desc: "", zone: ZONES[0].label, people: 1 };
    var initWarn  = { type: "Health Alert", severity: "Medium", desc: "", reporter: "", people: 1, zone: ZONES[0].label };
    var initResp  = { name: "", type: "Medical", status: "available", zone: ZONES[0].label };

    var [activeTab, setActiveTab] = useState("Alert");
    var [alertForm, setAlertForm] = useState(initAlert);
    var [warnForm,  setWarnForm]  = useState(initWarn);
    var [respForm,  setRespForm]  = useState(initResp);
    var [feedback,  setFeedback]  = useState(null);
    var [loading,   setLoading]   = useState(false);

    function showFeedback(msg, ok) {
        setFeedback({ msg: msg, ok: ok !== false });
        setTimeout(function() { setFeedback(null); }, 3000);
    }

    function zoneCoords(label) {
        var z = ZONES.find(function(z) { return z.label === label; });
        return z ? { lat: z.lat, lng: z.lng, city: z.label } : ZONES[0];
    }

    // ── Submit custom alert (system/admin level) ───────────────────────────────
    async function submitAlert(e) {
        e.preventDefault();
        if (!alertForm.desc.trim()) { showFeedback("Description required", false); return; }
        setLoading(true);
        try {
            var loc = zoneCoords(alertForm.zone);
            var payload = Object.assign({}, alertForm, { location_label: alertForm.zone, source: "admin", people: Number(alertForm.people) });
            var res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) { showFeedback("✅ Alert added to the system!"); setAlertForm(initAlert); if (onDataChanged) onDataChanged(); }
            else showFeedback("Failed to add alert", false);
        } catch(err) { showFeedback("Network error", false); }
        setLoading(false);
    }

    // ── Submit user warning ────────────────────────────────────────────────────
    async function submitWarning(e) {
        e.preventDefault();
        if (!warnForm.desc.trim()) { showFeedback("Description required", false); return; }
        setLoading(true);
        try {
            var payload = Object.assign({}, warnForm, { location_label: warnForm.zone, source: "user", people: Number(warnForm.people) });
            var res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) { showFeedback("📡 Warning broadcast!"); setWarnForm(initWarn); if (onDataChanged) onDataChanged(); }
            else showFeedback("Failed to broadcast warning", false);
        } catch(err) { showFeedback("Network error", false); }
        setLoading(false);
    }

    // ── Add responder ──────────────────────────────────────────────────────────
    async function submitResponder(e) {
        e.preventDefault();
        if (!respForm.name.trim()) { showFeedback("Name required", false); return; }
        setLoading(true);
        try {
            var loc = zoneCoords(respForm.zone);
            var payload = { name: respForm.name, type: respForm.type, status: respForm.status, lat: loc.lat, lng: loc.lng, zone: respForm.zone };
            var res = await fetch("/api/responders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) { showFeedback("🚑 Responder deployed!"); setRespForm(initResp); if (onDataChanged) onDataChanged(); }
            else showFeedback("Failed to add responder", false);
        } catch(err) { showFeedback("Network error", false); }
        setLoading(false);
    }

    var tabBtnStyle = function(t) { return { padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: "Inter,sans-serif", transition: "all 0.2s", background: activeTab === t ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.05)", color: activeTab === t ? "#38bdf8" : "#94a3b8", borderBottom: activeTab === t ? "2px solid #38bdf8" : "2px solid transparent" }; };

    var ALERT_TYPES = ["Fire","Injury","Health Alert","Road Blockage","General Warning","Fire Hazard","Food","Shelter","Search"];
    var WARN_TYPES  = ["Health Alert","Road Blockage","Fire Hazard","General Warning"];
    var RESP_TYPES  = ["Medical","Rescue","Police","General"];
    var SEVERITIES  = ["Critical","High","Medium","Low"];
    var SEV_COLOR   = { Critical:"#ef4444", High:"#f97316", Medium:"#f59e0b", Low:"#38bdf8" };

    return (
        <div style={{ fontFamily: "Inter,sans-serif", color: "#f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ fontFamily: "Outfit,sans-serif", fontSize: "18px", fontWeight: 700, color: "white", margin: 0 }}>
                    ⚙️ System Management
                </h3>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Add alerts, warnings, and responders to the live system</span>
            </div>

            {/* Tab switcher */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0" }}>
                {TABS.map(function(t) { return <button key={t} style={tabBtnStyle(t)} onClick={function() { setActiveTab(t); setFeedback(null); }}>
                    {t === "Alert" ? "🔴 Custom Alert" : t === "Warning" ? "⚠️ User Warning" : "🚑 Add Responder"}
                </button>; })}
            </div>

            {/* Feedback banner */}
            {feedback && (
                <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: feedback.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", border: "1px solid " + (feedback.ok ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"), color: feedback.ok ? "#34d399" : "#f87171" }}>
                    {feedback.msg}
                </div>
            )}

            {/* ── ALERT FORM ── */}
            {activeTab === "Alert" && (
                <form onSubmit={submitAlert}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                        <div>
                            <label style={LBL}>Emergency Type</label>
                            <select style={INP} value={alertForm.type} onChange={function(e) { setAlertForm(function(f) { return Object.assign({}, f, { type: e.target.value }); }); }}>
                                {ALERT_TYPES.map(function(t) { return <option key={t}>{t}</option>; })}
                            </select>
                        </div>
                        <div>
                            <label style={LBL}>Severity</label>
                            <select style={Object.assign({}, INP, { color: SEV_COLOR[alertForm.severity] || "white" })} value={alertForm.severity} onChange={function(e) { setAlertForm(function(f) { return Object.assign({}, f, { severity: e.target.value }); }); }}>
                                {SEVERITIES.map(function(s) { return <option key={s} style={{ color: SEV_COLOR[s] }}>{s}</option>; })}
                            </select>
                        </div>
                        <div>
                            <label style={LBL}>Zone / Location</label>
                            <select style={INP} value={alertForm.zone} onChange={function(e) { setAlertForm(function(f) { return Object.assign({}, f, { zone: e.target.value }); }); }}>
                                {ZONES.map(function(z) { return <option key={z.label}>{z.label}</option>; })}
                            </select>
                        </div>
                        <div>
                            <label style={LBL}>People Affected</label>
                            <input style={INP} type="number" min="1" value={alertForm.people} onChange={function(e) { setAlertForm(function(f) { return Object.assign({}, f, { people: e.target.value }); }); }} />
                        </div>
                    </div>
                    <div style={{ marginBottom: "16px" }}>
                        <label style={LBL}>Description</label>
                        <textarea style={Object.assign({}, INP, { height: "80px", resize: "none" })} placeholder="Describe the emergency situation..." value={alertForm.desc} maxLength={250} onChange={function(e) { setAlertForm(function(f) { return Object.assign({}, f, { desc: e.target.value }); }); }} required></textarea>
                    </div>
                    <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white", fontWeight: 700, fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.35)" }}>
                        {loading ? "Adding…" : "🚨 Add Emergency Alert"}
                    </button>
                    <p style={{ fontSize: "11px", color: "#475569", marginTop: "8px", textAlign: "center" }}>This alert appears on the heatmap and triggers self-healing assignment.</p>
                </form>
            )}

            {/* ── WARNING FORM ── */}
            {activeTab === "Warning" && (
                <form onSubmit={submitWarning}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                        <div>
                            <label style={LBL}>Warning Type</label>
                            <select style={INP} value={warnForm.type} onChange={function(e) { setWarnForm(function(f) { return Object.assign({}, f, { type: e.target.value }); }); }}>
                                {WARN_TYPES.map(function(t) { return <option key={t}>{t}</option>; })}
                            </select>
                        </div>
                        <div>
                            <label style={LBL}>Severity</label>
                            <select style={Object.assign({}, INP, { color: SEV_COLOR[warnForm.severity] || "white" })} value={warnForm.severity} onChange={function(e) { setWarnForm(function(f) { return Object.assign({}, f, { severity: e.target.value }); }); }}>
                                {SEVERITIES.map(function(s) { return <option key={s}>{s}</option>; })}
                            </select>
                        </div>
                        <div>
                            <label style={LBL}>Your Name <span style={{ color: "#475569" }}>(optional)</span></label>
                            <input style={INP} placeholder="Anonymous" value={warnForm.reporter} onChange={function(e) { setWarnForm(function(f) { return Object.assign({}, f, { reporter: e.target.value }); }); }} />
                        </div>
                        <div>
                            <label style={LBL}>People Affected</label>
                            <input style={INP} type="number" min="1" value={warnForm.people} onChange={function(e) { setWarnForm(function(f) { return Object.assign({}, f, { people: e.target.value }); }); }} />
                        </div>
                        <div style={{ gridColumn: "1/-1" }}>
                            <label style={LBL}>Zone / Location</label>
                            <select style={INP} value={warnForm.zone} onChange={function(e) { setWarnForm(function(f) { return Object.assign({}, f, { zone: e.target.value }); }); }}>
                                {ZONES.map(function(z) { return <option key={z.label}>{z.label}</option>; })}
                            </select>
                        </div>
                    </div>
                    <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <label style={LBL}>Description</label>
                            <span style={{ fontSize: "10px", color: warnForm.desc.length > 200 ? "#ef4444" : "#475569" }}>{warnForm.desc.length}/250</span>
                        </div>
                        <textarea style={Object.assign({}, INP, { height: "80px", resize: "none" })} placeholder="What is happening? Be specific." value={warnForm.desc} maxLength={250} onChange={function(e) { setWarnForm(function(f) { return Object.assign({}, f, { desc: e.target.value }); }); }} required></textarea>
                    </div>
                    <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "white", fontWeight: 700, fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(245,158,11,0.35)" }}>
                        {loading ? "Broadcasting…" : "📡 Broadcast Warning"}
                    </button>
                    <p style={{ fontSize: "11px", color: "#475569", marginTop: "8px", textAlign: "center" }}>Warning appears in the Alert Feed and on the heatmap.</p>
                </form>
            )}

            {/* ── RESPONDER FORM ── */}
            {activeTab === "Responder" && (
                <form onSubmit={submitResponder}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                        <div style={{ gridColumn: "1/-1" }}>
                            <label style={LBL}>Full Name</label>
                            <input style={INP} placeholder="e.g. Dr. Sarah Connor" value={respForm.name} onChange={function(e) { setRespForm(function(f) { return Object.assign({}, f, { name: e.target.value }); }); }} required />
                        </div>
                        <div>
                            <label style={LBL}>Responder Type</label>
                            <select style={INP} value={respForm.type} onChange={function(e) { setRespForm(function(f) { return Object.assign({}, f, { type: e.target.value }); }); }}>
                                {RESP_TYPES.map(function(t) { return <option key={t}>{t}</option>; })}
                            </select>
                        </div>
                        <div>
                            <label style={LBL}>Initial Status</label>
                            <select style={INP} value={respForm.status} onChange={function(e) { setRespForm(function(f) { return Object.assign({}, f, { status: e.target.value }); }); }}>
                                <option value="available">Available</option>
                                <option value="busy">Busy</option>
                                <option value="offline">Offline</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: "1/-1" }}>
                            <label style={LBL}>Deployed Zone</label>
                            <select style={INP} value={respForm.zone} onChange={function(e) { setRespForm(function(f) { return Object.assign({}, f, { zone: e.target.value }); }); }}>
                                {ZONES.map(function(z) { return <option key={z.label}>{z.label}</option>; })}
                            </select>
                        </div>
                    </div>

                    {/* Preview card */}
                    <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "10px" }}>
                        <div style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 700, marginBottom: "6px" }}>Preview</div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <div style={{ width: "36px", height: "36px", background: respForm.type === "Police" ? "#818cf8" : respForm.type === "Medical" ? "#10b981" : respForm.type === "Rescue" ? "#ef4444" : "#38bdf8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                                {respForm.type === "Medical" ? "🚑" : respForm.type === "Rescue" ? "🚒" : respForm.type === "Police" ? "🚔" : "👤"}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, color: "white", fontSize: "13px" }}>{respForm.name || "—"}</div>
                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{respForm.type} · {respForm.zone} · <span style={{ color: respForm.status === "available" ? "#10b981" : respForm.status === "busy" ? "#f59e0b" : "#94a3b8" }}>{respForm.status}</span></div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "white", fontWeight: 700, fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(16,185,129,0.35)" }}>
                        {loading ? "Deploying…" : "🚑 Deploy Responder"}
                    </button>
                    <p style={{ fontSize: "11px", color: "#475569", marginTop: "8px", textAlign: "center" }}>Responder is added to the live pool and becomes eligible for self-healing assignment.</p>
                </form>
            )}
        </div>
    );
}
