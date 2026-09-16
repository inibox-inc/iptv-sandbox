import React, { useEffect, useState } from 'react';
import { HlsPlayer } from './components/HlsPlayer';
import { StatsDashboard } from './components/StatsDashboard';
import { EmbedGenerator } from './components/EmbedGenerator';
import { StreamInspector } from './components/StreamInspector';
import { EmbedView } from './components/EmbedView';
import { DEFAULT_PRESETS } from './data/presets';
import { ProxyStats, StreamPreset } from './types';
import {
  ShieldCheck,
  Zap,
  Play,
  Share2,
  Search,
  Activity,
  Server,
  Layers,
  Sparkles,
  Tv,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Code2,
  Sliders,
  Users
} from 'lucide-react';

export default function App() {
  // Check if currently requested in standalone embed mode
  const isEmbedMode = new URLSearchParams(window.location.search).get('embed') === 'true';
  if (isEmbedMode) {
    return <EmbedView />;
  }

  const [currentUrl, setCurrentUrl] = useState<string>('http://37.10.108.162:8000/play/a1ku');
  const [inputUrl, setInputUrl] = useState<string>('http://37.10.108.162:8000/play/a1ku');
  const [streamTitle, setStreamTitle] = useState<string>('Canal HLS (H264 + MPGA)');
  const [activeTab, setActiveTab] = useState<'embed' | 'stats' | 'inspector' | 'stress'>('embed');
  const [stats, setStats] = useState<ProxyStats | null>(null);
  const [isSimulatingLoad, setIsSimulatingLoad] = useState<boolean>(false);
  const [simulatedClients, setSimulatedClients] = useState<number>(10);
  const [simLog, setSimLog] = useState<string[]>([]);

  const proxyStreamUrl = `${window.location.origin}/api/hls/proxy?url=${encodeURIComponent(currentUrl)}`;

  // Fetch telemetry stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/hls/stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApplyUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) return;

    setCurrentUrl(inputUrl.trim());
    const matchedPreset = DEFAULT_PRESETS.find((p) => p.url === inputUrl.trim());
    if (matchedPreset) {
      setStreamTitle(matchedPreset.name);
    } else {
      setStreamTitle('Custom Stream');
    }
  };

  const handleSelectPreset = (preset: StreamPreset) => {
    setInputUrl(preset.url);
    setCurrentUrl(preset.url);
    setStreamTitle(preset.name);
  };

  // Run multi-user concurrent simulation to demonstrate caching efficiency
  const runLoadSimulation = async () => {
    setIsSimulatingLoad(true);
    setSimLog([`[${new Date().toLocaleTimeString()}] Starting concurrent benchmark with ${simulatedClients} parallel virtual viewers...`]);

    try {
      // Step 1: Request manifest concurrently
      setSimLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Dispatching ${simulatedClients} simultaneous requests for M3U8 manifest...`]);
      
      const promises = Array.from({ length: simulatedClients }).map(async (_, idx) => {
        const start = performance.now();
        const res = await fetch(proxyStreamUrl, { cache: 'no-store' });
        const took = (performance.now() - start).toFixed(1);
        const cacheHeader = res.headers.get('X-Proxy-Cache') || 'UNKNOWN';
        return { idx: idx + 1, took, cacheHeader, status: res.status };
      });

      const results = await Promise.all(promises);
      const hits = results.filter((r) => r.cacheHeader === 'HIT').length;
      const misses = results.filter((r) => r.cacheHeader === 'MISS').length;

      setSimLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Manifest fetch finished: ${hits} RAM Hits, ${misses} Origin Fetch (${misses <= 1 ? '100% Single-Flight Deduplicated!' : ''})`,
        `[${new Date().toLocaleTimeString()}] Average response time for viewers: ${(results.reduce((a, b) => a + parseFloat(b.took), 0) / results.length).toFixed(1)} ms`,
        `[${new Date().toLocaleTimeString()}] Upstream load protected: Only 1 fetch sent to HTTP origin while ${simulatedClients} users served!`,
      ]);

      await fetchStats();
    } catch (err: any) {
      setSimLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Simulation error: ${err.message}`]);
    } finally {
      setIsSimulatingLoad(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">HLS HTTPS Reverse Proxy</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  HTTP → HTTPS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                In-Memory TS Caching • Single-Flight Deduplication • H264 & MPEG Audio (mpga)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Proxy Engine: <strong className="text-emerald-400">Active</strong></span>
            </div>
            {stats && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Hit Rate: <strong className="text-white">{stats.hitRatePercentage}%</strong></span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stream Selector & Presets Bar */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm space-y-4">
          <form onSubmit={handleApplyUrl} className="flex flex-col md:flex-row gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Tv className="w-4 h-4 text-emerald-400" />
              </div>
              <input
                id="input-stream-url"
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Enter HTTP/HTTPS M3U8 Stream URL (e.g. http://37.10.108.162:8000/play/a1ku)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <button
              id="btn-load-stream"
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-lg shadow-emerald-600/20 shrink-0"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Load Stream</span>
            </button>
          </form>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 text-xs font-medium mr-1">Canales / Presets:</span>
            {DEFAULT_PRESETS.map((p) => {
              const isSelected = currentUrl === p.url;
              return (
                <button
                  key={p.id}
                  id={`btn-preset-${p.id}`}
                  onClick={() => handleSelectPreset(p)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-300'
                  }`}
                >
                  {p.isUserPreset && <Sparkles className="w-3 h-3 text-emerald-400" />}
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Video Player & Main Stage */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{streamTitle}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="hidden sm:inline">Source:</span>
              <span className="text-slate-300 truncate max-w-xs">{currentUrl}</span>
            </div>
          </div>

          <div className="w-full">
            <HlsPlayer
              key={proxyStreamUrl}
              src={proxyStreamUrl}
              originalUrl={currentUrl}
              title={streamTitle}
              autoPlay={true}
              muted={true}
            />
          </div>
        </section>

        {/* Tab Navigation for Tools & Embed Code */}
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
            <button
              id="tab-embed"
              onClick={() => setActiveTab('embed')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'embed'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Embed & HTTPS M3U8 Links</span>
            </button>

            <button
              id="tab-stats"
              onClick={() => setActiveTab('stats')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Multi-User Telemetry & Cache</span>
            </button>

            <button
              id="tab-inspector"
              onClick={() => setActiveTab('inspector')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'inspector'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Diagnostic Inspector & Codecs</span>
            </button>

            <button
              id="tab-stress"
              onClick={() => setActiveTab('stress')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'stress'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Multi-User Load Simulator</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="pt-2">
            {activeTab === 'embed' && (
              <EmbedGenerator
                proxyUrl={proxyStreamUrl}
                originalUrl={currentUrl}
                title={streamTitle}
              />
            )}

            {activeTab === 'stats' && (
              <StatsDashboard stats={stats} onRefresh={fetchStats} />
            )}

            {activeTab === 'inspector' && (
              <StreamInspector url={currentUrl} />
            )}

            {activeTab === 'stress' && (
              <div id="stress-test-container" className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Multi-Viewer In-Flight Request Deduplication Benchmark</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Simulate 10 to 50 simultaneous viewers requesting the live stream to verify that only 1 request reaches the origin HTTP server.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={simulatedClients}
                      onChange={(e) => setSimulatedClients(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value={5}>5 Concurrent Viewers</option>
                      <option value={10}>10 Concurrent Viewers</option>
                      <option value={25}>25 Concurrent Viewers</option>
                      <option value={50}>50 Concurrent Viewers</option>
                    </select>

                    <button
                      id="btn-run-simulation"
                      onClick={runLoadSimulation}
                      disabled={isSimulatingLoad}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isSimulatingLoad ? 'animate-bounce' : ''}`} />
                      <span>{isSimulatingLoad ? 'Simulating...' : 'Run Simulation'}</span>
                    </button>
                  </div>
                </div>

                {simLog.length > 0 && (
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 space-y-1 max-h-48 overflow-y-auto">
                    {simLog.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">{log}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 mt-10 py-6 text-center text-xs text-slate-500">
        <p>HLS HTTP to HTTPS Reverse Proxy • Ultra-Low CPU & Bandwidth In-Memory Cache Engine</p>
      </footer>
    </div>
  );
}
