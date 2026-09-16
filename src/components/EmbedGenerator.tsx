import React, { useState } from 'react';
import {
  Copy,
  Check,
  Code2,
  ExternalLink,
  ShieldCheck,
  Tv,
  Share2,
  Terminal,
  Settings2,
  Globe,
  Sliders,
  Laptop
} from 'lucide-react';
import { SpoofConfig, SpoofMode } from '../types';

interface EmbedGeneratorProps {
  proxyUrl: string;
  originalUrl: string;
  title: string;
  spoofConfig: SpoofConfig;
  onSpoofChange: (newConfig: SpoofConfig) => void;
}

export const EmbedGenerator: React.FC<EmbedGeneratorProps> = ({
  proxyUrl,
  originalUrl,
  title,
  spoofConfig,
  onSpoofChange,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedVlc, setCopiedVlc] = useState(false);
  const [showAdvancedHeaders, setShowAdvancedHeaders] = useState(false);

  // Embed Customizer options
  const [autoplay, setAutoplay] = useState(true);
  const [muted, setMuted] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'16/9' | '4/3' | '100%'>('16/9');

  const originUrl = window.location.origin;
  
  let embedQueryParams = `embed=true&url=${encodeURIComponent(originalUrl)}&spoof=${encodeURIComponent(spoofConfig.mode)}&autoplay=${autoplay ? '1' : '0'}&muted=${muted ? '1' : '0'}&title=${encodeURIComponent(title || 'Live Stream')}`;
  if (spoofConfig.customUserAgent) embedQueryParams += `&ua=${encodeURIComponent(spoofConfig.customUserAgent)}`;
  if (spoofConfig.customReferer) embedQueryParams += `&ref=${encodeURIComponent(spoofConfig.customReferer)}`;
  if (spoofConfig.customOrigin) embedQueryParams += `&origin=${encodeURIComponent(spoofConfig.customOrigin)}`;
  if (spoofConfig.customIp) embedQueryParams += `&ip=${encodeURIComponent(spoofConfig.customIp)}`;

  const embedPageUrl = `${originUrl}/?${embedQueryParams}`;

  const iframeCode = `<iframe
  src="${embedPageUrl}"
  width="100%"
  height="100%"
  frameborder="0"
  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
  allowfullscreen
  style="border-radius: 12px; border: none; aspect-ratio: ${aspectRatio};"
></iframe>`;

  const handleCopy = (text: string, type: 'url' | 'embed' | 'vlc') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'embed') {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } else {
      setCopiedVlc(true);
      setTimeout(() => setCopiedVlc(false), 2000);
    }
  };

  const SPOOF_PRESETS: Array<{
    mode: SpoofMode;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      mode: 'localhost',
      label: 'Localhost / 127.0.0.1 (Recomendado)',
      description: 'Envía Referer http://localhost:8000/, X-Forwarded-For: 127.0.0.1 y User-Agent VLC.',
      icon: '🏠',
    },
    {
      mode: 'same_origin',
      label: 'Same-Origin (HTTP Origen)',
      description: 'Envía Referer http://37.10.108.162:8000/ y User-Agent Chrome nativo.',
      icon: '🌐',
    },
    {
      mode: 'vlc',
      label: 'VLC Media Player',
      description: 'Emula estrictamente un reproductor VLC de escritorio (VLC/3.0.20 LibVLC).',
      icon: '📺',
    },
    {
      mode: 'ffmpeg',
      label: 'FFmpeg / Lavf Engine',
      description: 'Emula el motor multimedia Lavf/58.76.100 para decodificadores IPTV.',
      icon: '⚡',
    },
    {
      mode: 'clean',
      label: 'Browser Direct (Sin proxy headers)',
      description: 'Elimina cualquier cabecera intermedia o de proxy.',
      icon: '🛡️',
    },
    {
      mode: 'custom',
      label: 'Cabeceras Personalizadas',
      description: 'Define manualmente User-Agent, Referer, Origin y dirección IP.',
      icon: '⚙️',
    },
  ];

  return (
    <div id="embed-generator-container" className="space-y-4">
      {/* Spoofing / Header Emulation Selector Card */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                Modo de Emulación de Origen (Bypass HTTP / Localhost)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {spoofConfig.mode.toUpperCase()}
                </span>
              </h3>
              <p className="text-slate-400 text-xs">
                Engaña al servidor emisor para que detecte la petición como si viniera directamente desde localhost o la misma máquina
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedHeaders(!showAdvancedHeaders)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors shrink-0"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showAdvancedHeaders ? 'Ocultar Cabeceras' : 'Ajustar Cabeceras'}</span>
          </button>
        </div>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
          {SPOOF_PRESETS.map((p) => {
            const isSelected = spoofConfig.mode === p.mode;
            return (
              <button
                key={p.mode}
                type="button"
                onClick={() => onSpoofChange({ ...spoofConfig, mode: p.mode })}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{p.description}</p>
              </button>
            );
          })}
        </div>

        {/* Advanced Headers Editor */}
        {showAdvancedHeaders && (
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3 mb-2 text-xs">
            <h4 className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-emerald-400" />
              <span>Valores de Cabecera Emulados al Servidor de Origen</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">User-Agent Simulado:</label>
                <input
                  type="text"
                  value={spoofConfig.customUserAgent || ''}
                  onChange={(e) => onSpoofChange({ ...spoofConfig, customUserAgent: e.target.value })}
                  placeholder="VLC/3.0.20 LibVLC/3.0.20"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Referer Simulado:</label>
                <input
                  type="text"
                  value={spoofConfig.customReferer || ''}
                  onChange={(e) => onSpoofChange({ ...spoofConfig, customReferer: e.target.value })}
                  placeholder="http://localhost:8000/"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Origin Simulado:</label>
                <input
                  type="text"
                  value={spoofConfig.customOrigin || ''}
                  onChange={(e) => onSpoofChange({ ...spoofConfig, customOrigin: e.target.value })}
                  placeholder="http://localhost:8000"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">IP Forwarded (X-Forwarded-For):</label>
                <input
                  type="text"
                  value={spoofConfig.customIp || ''}
                  onChange={(e) => onSpoofChange({ ...spoofConfig, customIp: e.target.value })}
                  placeholder="127.0.0.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HTTPS Proxy URL Output Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white text-sm font-semibold">Endpoint HTTPS M3U8 Directo</h3>
              <p className="text-slate-400 text-xs">Usa este enlace en cualquier reproductor (VLC, OBS, Smart TV, HLS.js, Kodi) sin errores de contenido mixto</p>
            </div>
          </div>
          <button
            id="btn-copy-proxy-url"
            onClick={() => handleCopy(proxyUrl, 'url')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? '¡Copiado al Portapapeles!' : 'Copiar URL HTTPS'}</span>
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto font-mono text-xs text-emerald-400">
          <span className="truncate">{proxyUrl}</span>
        </div>
      </div>

      {/* Embed Iframe Generator Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white text-sm font-semibold">Código Iframe para Incrustar Player (Embed)</h3>
              <p className="text-slate-400 text-xs">Incrusta el reproductor directamente en tu web o CMS compatible con H264 y audio MPGA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              id="btn-test-embed-window"
              href={embedPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <span>Abrir Embed</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              id="btn-copy-embed-code"
              onClick={() => handleCopy(iframeCode, 'embed')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              {copiedEmbed ? <Check className="w-3.5 h-3.5 text-sky-200" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEmbed ? '¡Copiado!' : 'Copiar Iframe HTML'}</span>
            </button>
          </div>
        </div>

        {/* Customizer Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Autoplay</span>
          </label>
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => setMuted(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Silenciado por defecto</span>
          </label>
          <div className="flex items-center gap-2 text-slate-300 col-span-2">
            <span className="text-slate-400">Aspect Ratio:</span>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white text-xs"
            >
              <option value="16/9">16:9 Estándar</option>
              <option value="4/3">4:3 Clásico</option>
              <option value="100%">Llenar Viewport</option>
            </select>
          </div>
        </div>

        {/* Code Snippet */}
        <div className="relative">
          <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs text-sky-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
            {iframeCode}
          </pre>
        </div>
      </div>

      {/* Integration Quick Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-white mb-2">
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>Uso en VLC o Reproductores Externos</span>
          </div>
          <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
            Abre <strong>VLC &gt; Medio &gt; Abrir emisión de red (Ctrl+N)</strong> y pega el enlace del proxy HTTPS. VLC transmitirá sin advertencias de contenido mixto.
          </p>
          <button
            onClick={() => handleCopy(`vlc "${proxyUrl}"`, 'vlc')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono cursor-pointer transition-colors"
          >
            <Terminal className="w-3 h-3 text-slate-400" />
            <span>{copiedVlc ? '¡Comando Copiado!' : 'Copiar comando VLC'}</span>
          </button>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-white mb-2">
            <Share2 className="w-4 h-4 text-sky-400" />
            <span>Cabeceras CORS Universales</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Todas las peticiones a <code>/api/hls/proxy</code> incluyen <code>Access-Control-Allow-Origin: *</code>, permitiendo incrustar y reproducir en cualquier web o iframe seguro HTTPS.
          </p>
        </div>
      </div>
    </div>
  );
};

