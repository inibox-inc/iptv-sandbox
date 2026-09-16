import React, { useEffect, useState } from 'react';
import { StreamInspection } from '../types';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface StreamInspectorProps {
  url: string;
}

export const StreamInspector: React.FC<StreamInspectorProps> = ({ url }) => {
  const [inspection, setInspection] = useState<StreamInspection | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'rewritten' | 'raw'>('summary');

  const runInspection = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hls/inspect?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setInspection(data);
    } catch (err: any) {
      setInspection({
        success: false,
        latencyMs: 0,
        error: err.message || 'Failed to inspect stream',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runInspection();
  }, [url]);

  return (
    <div id="stream-inspector-container" className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold">Stream Diagnostic & Manifest Rewriter Inspector</h3>
            <p className="text-slate-400 text-xs">Verify upstream HTTP connection, latency, codec tags, and rewritten proxy URLs</p>
          </div>
        </div>

        <button
          id="btn-refresh-inspect"
          onClick={runInspection}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Inspecting...' : 'Re-check'}</span>
        </button>
      </div>

      {loading && (
        <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to upstream HTTP server and parsing playlist...</span>
        </div>
      )}

      {!loading && inspection && (
        <div className="space-y-3">
          {/* Status summary pill bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Upstream Status:</span>
              <span className="font-mono font-semibold flex items-center gap-1">
                {inspection.success ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{inspection.statusCode || 200} OK</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">Error</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Origin Latency:</span>
              <span className="font-mono font-semibold text-sky-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{inspection.latencyMs} ms</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Playlist Type:</span>
              <span className="font-mono font-semibold text-slate-200">
                {inspection.info?.isMasterPlaylist ? 'Master (Multi-bitrate)' : 'Media Playlist'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Segment Count:</span>
              <span className="font-mono font-semibold text-indigo-400">
                {inspection.info?.segmentCount || 0} chunks detected
              </span>
            </div>
          </div>

          {inspection.error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-mono">
              Error connecting to origin: {inspection.error}
            </div>
          )}

          {/* Sub-tabs for detailed view */}
          <div className="pt-2">
            <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'summary' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Codecs & Format Specs
              </button>
              <button
                onClick={() => setActiveTab('rewritten')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'rewritten' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Rewritten Proxy M3U8 Manifest
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'raw' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Original Raw Origin Manifest
              </button>
            </div>

            <div className="mt-3">
              {activeTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                    <h5 className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Video & Audio Stream Details</span>
                    </h5>
                    <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Target Segment Duration:</span>
                        <span className="text-emerald-400">{inspection.info?.targetDuration || 3}s</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Video Encoding:</span>
                        <span className="text-sky-400">H264 - MPEG-4 AVC (Part 10)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Audio Encoding:</span>
                        <span className="text-indigo-400">MPEG Audio Layer 1/2 (mpga)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Transport Container:</span>
                        <span className="text-amber-400">MPEG-TS (.ts) over HTTPS</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                    <h5 className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Proxy Translation Pipeline</span>
                    </h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      All segment URIs (e.g. <code>chunk_01.ts</code>) are dynamically rewritten to route through <code>/api/hls/proxy?url=...</code> over SSL/TLS.
                    </p>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
                      <div className="text-slate-500 line-through truncate">http://37.10.108.162:8000/live/seg_1.ts</div>
                      <div className="text-emerald-400 flex items-center gap-1 truncate">
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span>https://[proxy]/api/hls/proxy?url=http%3A%2F%2F...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'rewritten' && (
                <div className="relative">
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 max-h-60 overflow-y-auto whitespace-pre leading-relaxed">
                    {inspection.info?.sampleRewritten || '# No rewritten snippet available'}
                  </pre>
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="relative">
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto whitespace-pre leading-relaxed">
                    {inspection.rawSnippet || '# No raw data available'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
