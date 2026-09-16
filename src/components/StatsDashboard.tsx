import React, { useEffect, useState } from 'react';
import { ProxyStats } from '../types';
import {
  Zap,
  TrendingDown,
  Server,
  Layers,
  HardDrive,
  Users,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';

interface StatsDashboardProps {
  stats: ProxyStats | null;
  onRefresh: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats, onRefresh }) => {
  if (!stats) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-xs">Connecting to Proxy Telemetry Engine...</p>
      </div>
    );
  }

  // Calculate theoretical upstream load reduction
  const theoreticalTotalUpstreamMB = (stats.bytesServedMB).toFixed(2);
  const actualUpstreamMB = (stats.upstreamMBFetched).toFixed(2);
  const efficiencyMultiplier = stats.upstreamMBFetched > 0 
    ? (stats.bytesServedMB / stats.upstreamMBFetched).toFixed(1)
    : '1.0';

  return (
    <div id="stats-dashboard-container" className="space-y-4">
      {/* High-level performance cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Cache Hit Rate */}
        <div id="stat-card-hit-rate" className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Cache Hit Rate</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono tracking-tight">{stats.hitRatePercentage}%</span>
            <span className="text-xs text-emerald-400 font-mono">Deduplicated</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {stats.cacheHits.toLocaleString()} hits / {stats.totalRequests.toLocaleString()} total
          </p>
        </div>

        {/* Upstream Bandwidth Saved */}
        <div id="stat-card-saved" className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-bl-full pointer-events-none group-hover:bg-sky-500/10 transition-colors"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Origin Bandwidth Saved</span>
            <TrendingDown className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-400 font-mono tracking-tight">{stats.bytesSavedMB} MB</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {efficiencyMultiplier}x bandwidth efficiency multiplier
          </p>
        </div>

        {/* Segment Memory Cache */}
        <div id="stat-card-cache-memory" className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">In-RAM TS Chunks</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono tracking-tight">{stats.cachedEntriesCount}</span>
            <span className="text-xs text-indigo-400 font-mono">({stats.cacheMemoryMB} MB)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Auto-pruned with 60s live TTL
          </p>
        </div>

        {/* Active Concurrent Pipelines */}
        <div id="stat-card-active-requests" className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Active Pipelines</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 font-mono tracking-tight">{stats.activeRequests}</span>
            <span className="text-xs text-slate-400 font-mono">in-flight</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Single-flight coalesced
          </p>
        </div>
      </div>

      {/* Multi-user Architecture Breakdown */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h4 className="font-semibold text-slate-200">How Multi-User Optimization Protects the HTTP Origin:</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>1. Single-Flight Coalescing</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              When 50 viewers request the newest live video segment simultaneously, the proxy executes only <strong>1 upstream HTTP fetch</strong> and broadcasts the incoming buffer to all 50 viewers.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Memory Segment Cache</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Recent `.ts` transport stream segments are stored in high-speed RAM with a 60-second TTL. Subsequent viewers receive the segments with 0ms origin wait time and zero CPU transcoding overhead.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>3. Low Resource Pass-Through</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Streams are served natively without heavy video re-encoding on the server. The client-side player handles H264 AVC and MPEG Audio layer 1/2 decoding directly via browser MediaSource.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
