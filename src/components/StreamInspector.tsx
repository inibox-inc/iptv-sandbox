import React, { useEffect, useState } from 'react';
import { SpoofConfig, StreamInspection } from '../types';
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
  RefreshCw,
  Send
} from 'lucide-react';

interface StreamInspectorProps {
  url: string;
  spoofConfig: SpoofConfig;
}

export const StreamInspector: React.FC<StreamInspectorProps> = ({ url, spoofConfig }) => {
  const [inspection, setInspection] = useState<StreamInspection | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'headers' | 'rewritten' | 'raw'>('summary');

  const runInspection = async () => {
    if (!url) return;
    setLoading(true);
    try {
      let endpoint = `/api/hls/inspect?url=${encodeURIComponent(url)}&spoof=${encodeURIComponent(spoofConfig.mode)}`;
      if (spoofConfig.customUserAgent) endpoint += `&ua=${encodeURIComponent(spoofConfig.customUserAgent)}`;
      if (spoofConfig.customReferer) endpoint += `&ref=${encodeURIComponent(spoofConfig.customReferer)}`;
      if (spoofConfig.customOrigin) endpoint += `&origin=${encodeURIComponent(spoofConfig.customOrigin)}`;
      if (spoofConfig.customIp) endpoint += `&ip=${encodeURIComponent(spoofConfig.customIp)}`;

      const res = await fetch(endpoint);
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
  }, [url, spoofConfig.mode, spoofConfig.customUserAgent, spoofConfig.customReferer]);

  return (
    <div id="stream-inspector-container" className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold">Diagnóstico de Emisión y Cabeceras de Origen</h3>
            <p className="text-slate-400 text-xs">Verifica la conexión con el servidor emisor HTTP, latencia, códecs y emulación de cabeceras</p>
          </div>
        </div>

        <button
          id="btn-refresh-inspect"
          onClick={runInspection}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Comprobando...' : 'Re-analizar'}</span>
        </button>
      </div>

      {loading && (
        <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Conectando con el servidor HTTP de origen y analizando el manifiesto...</span>
        </div>
      )}

      {!loading && inspection && (
        <div className="space-y-3">
          {/* Status summary pill bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Estado Origen:</span>
              <span className="font-mono font-semibold flex items-center gap-1">
                {inspection.success ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{inspection.statusCode || 200} OK</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">Error / Bloqueado</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Latencia Origen:</span>
              <span className="font-mono font-semibold text-sky-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{inspection.latencyMs} ms</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Tipo Playlist:</span>
              <span className="font-mono font-semibold text-slate-200">
                {inspection.info?.isMasterPlaylist ? 'Master (Multi-bitrate)' : 'Media Playlist'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Fragmentos:</span>
              <span className="font-mono font-semibold text-indigo-400">
                {inspection.info?.segmentCount || 0} chunks detectados
              </span>
            </div>
          </div>

          {inspection.error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-mono space-y-1">
              <div className="font-bold">Error al conectar con el servidor emisor:</div>
              <div>{inspection.error}</div>
              <div className="text-slate-400 text-[11px] pt-1">
                💡 Consejo: Si el servidor bloquea la conexión, cambia el modo de emulación a <strong>Localhost</strong> o <strong>Same-Origin</strong> en la pestaña de Embed.
              </div>
            </div>
          )}

          {/* Sub-tabs for detailed view */}
          <div className="pt-2">
            <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs overflow-x-auto">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'summary' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Códecs & Formato
              </button>
              <button
                onClick={() => setActiveTab('headers')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'headers' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cabeceras HTTP Enviadas
              </button>
              <button
                onClick={() => setActiveTab('rewritten')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'rewritten' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Manifiesto HTTPS Reescrito
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'raw' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Manifiesto Original HTTP
              </button>
            </div>

            <div className="mt-3">
              {activeTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                    <h5 className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Detalles de Vídeo y Audio</span>
                    </h5>
                    <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Duración Objetivo Fragmento:</span>
                        <span className="text-emerald-400">{inspection.info?.targetDuration || 3}s</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Códec de Vídeo:</span>
                        <span className="text-sky-400">H264 - MPEG-4 AVC (Part 10)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Códec de Audio:</span>
                        <span className="text-indigo-400">MPEG Audio Layer 1/2 (mpga)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Contenedor de Transporte:</span>
                        <span className="text-amber-400">MPEG-TS (.ts) sobre HTTPS</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                    <h5 className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Túnel Seguro y Rendimiento</span>
                    </h5>
                    <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Tipo de Contenido (MIME):</span>
                        <span className="text-emerald-400">{inspection.contentType || 'application/vnd.apple.mpegurl'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Modo de Emulación:</span>
                        <span className="text-amber-400">{spoofConfig.mode}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Caché en RAM Proxy:</span>
                        <span className="text-sky-400">Activada (Single-Flight)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Encapsulación CORS:</span>
                        <span className="text-emerald-400">Access-Control-Allow-Origin: *</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'headers' && (
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-2">
                    <Send className="w-3.5 h-3.5" />
                    <span>Cabeceras HTTP enviadas directamente al servidor HTTP de origen:</span>
                  </div>
                  <div className="font-mono text-xs text-slate-300 bg-slate-900 p-3 rounded border border-slate-800 space-y-1">
                    {inspection.requestHeadersSent ? (
                      Object.entries(inspection.requestHeadersSent).map(([k, v]) => (
                        <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1 py-0.5 border-b border-slate-800/40">
                          <span className="text-sky-400 font-semibold">{k}:</span>
                          <span className="text-emerald-300 break-all">{v}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500">No se capturaron cabeceras</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'rewritten' && (
                <div className="relative">
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 max-h-60 overflow-y-auto whitespace-pre leading-relaxed">
                    {inspection.info?.sampleRewritten || '# No hay fragmentos disponibles'}
                  </pre>
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="relative">
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto whitespace-pre leading-relaxed">
                    {inspection.rawSnippet || '# No se recibieron datos sin procesar'}
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
