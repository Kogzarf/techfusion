// Main App component
function App() {
    const { useState, useEffect } = React;
    const [heatpoints, setHeatpoints] = useState([]);
    const [currentRelayStep, setCurrentRelayStep] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");
    const [stats, setStats] = useState({ requests: 0, responders: 0 });

    const nodes = [
        { id: "A", lat: 12.97, lng: 77.59, label: "Device A" },
        { id: "B", lat: 12.972, lng: 77.595, label: "Device B" },
        { id: "C", lat: 12.974, lng: 77.60, label: "Device C" },
        { id: "S", lat: 12.976, lng: 77.605, label: "Server" },
    ];

    const links = [["A", "B"], ["B", "C"], ["C", "S"]];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [heatRes, reqRes, respRes] = await Promise.all([
                    fetch("/api/heatmap"),
                    fetch("/api/requests"),
                    fetch("/api/responders")
                ]);
                
                const heatData = await heatRes.json();
                const reqData = await reqRes.json();
                const respData = await respRes.json();

                setHeatpoints(heatData.heatpoints || []);
                setStats({
                    requests: reqData.requests?.length || 0,
                    responders: respData.responders?.length || 0
                });
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };

        fetchData();
        const handle = setInterval(fetchData, 5000);
        
        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        return () => clearInterval(handle);
    }, []);

    const NavItem = ({ id, icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === id 
                ? "bg-primary/20 text-primary border-l-4 border-primary shadow-[0_0_15px_rgba(56,189,248,0.2)]" 
                : "text-text-muted hover:bg-white/5 hover:text-white"
            }`}
        >
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
                    <NavItem id="heatmap" icon="map" label="Live Heatmap" />
                    <NavItem id="flow" icon="network" label="Network Flow" />
                    <NavItem id="settings" icon="settings" label="System Settings" />
                </nav>

                <div className="mt-auto glass p-4 rounded-xl border border-white/5 bg-white/5">
                    <div className="flex items-center space-x-2 text-xs text-success mb-1">
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                        <span className="font-bold uppercase tracking-wider">System Online</span>
                    </div>
                    <p className="text-[10px] text-text-muted">v2.4.0-stable | Mesh Active</p>
                </div>
            </div>

            {/* Main Content */}
            <main className="main-content flex-1">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">
                            {activeTab === 'dashboard' ? 'Operational Overview' : 
                             activeTab === 'heatmap' ? 'Emergency Heatmap' : 'Network Flow Intelligence'}
                        </h2>
                        <p className="text-text-muted text-sm">Real-time situational awareness and network health monitoring.</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="glass px-4 py-2 rounded-lg flex items-center space-x-3 border border-white/5">
                            <i data-lucide="bell" className="w-5 h-5 text-text-muted"></i>
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                <i data-lucide="user" className="w-4 h-4 text-white"></i>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card glass border-l-4 border-primary">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <i data-lucide="alert-circle" className="text-primary w-6 h-6"></i>
                            </div>
                            <span className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">High Priority</span>
                        </div>
                        <h3 className="text-text-muted text-sm font-medium mb-1">Active Requests</h3>
                        <p className="text-4xl font-bold text-white">{stats.requests}</p>
                    </div>

                    <div className="card glass border-l-4 border-success">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-success/10 rounded-lg">
                                <i data-lucide="users" className="text-success w-6 h-6"></i>
                            </div>
                            <span className="text-[10px] text-success font-bold uppercase tracking-widest bg-success/10 px-2 py-1 rounded">Deployed</span>
                        </div>
                        <h3 className="text-text-muted text-sm font-medium mb-1">Available Responders</h3>
                        <p className="text-4xl font-bold text-white">{stats.responders}</p>
                    </div>

                    <div className="card glass border-l-4 border-warning">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-warning/10 rounded-lg">
                                <i data-lucide="activity" className="text-warning w-6 h-6"></i>
                            </div>
                            <span className="text-[10px] text-warning font-bold uppercase tracking-widest bg-warning/10 px-2 py-1 rounded">Stable</span>
                        </div>
                        <h3 className="text-text-muted text-sm font-medium mb-1">Network Latency</h3>
                        <p className="text-4xl font-bold text-white">24<span className="text-lg font-normal ml-1">ms</span></p>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
                    <div className="flex flex-col space-y-4 h-full">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center space-x-2">
                                <i data-lucide="map" className="w-5 h-5 text-primary"></i>
                                <span>Emergency Intensity Heatmap</span>
                            </h3>
                            <button className="text-xs text-primary hover:underline">Full Screen</button>
                        </div>
                        <div className="flex-1 min-h-[400px]">
                            <HeatmapMap heatpoints={heatpoints} />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-4 h-full">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center space-x-2">
                                <i data-lucide="network" className="w-5 h-5 text-primary"></i>
                                <span>Mesh Relay Simulation</span>
                            </h3>
                            <div className="flex space-x-2">
                                {['A-B', 'B-C', 'C-S'].map(step => (
                                    <button
                                        key={step}
                                        onClick={() => setCurrentRelayStep(step)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                                            currentRelayStep === step 
                                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                            : "bg-white/5 text-text-muted hover:bg-white/10"
                                        }`}
                                    >
                                        {step.replace('-', ' → ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 min-h-[400px]">
                            <MessageFlowMap 
                                nodes={nodes} 
                                links={links} 
                                activeLink={currentRelayStep} 
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}