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
  Settings2
} from 'lucide-react';

interface EmbedGeneratorProps {
  proxyUrl: string;
  originalUrl: string;
  title: string;
}

export const EmbedGenerator: React.FC<EmbedGeneratorProps> = ({
  proxyUrl,
  originalUrl,
  title,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedVlc, setCopiedVlc] = useState(false);

  // Embed Customizer options
  const [autoplay, setAutoplay] = useState(true);
  const [muted, setMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'16/9' | '4/3' | '100%'>('16/9');

  const originUrl = window.location.origin;
  const embedPageUrl = `${originUrl}/?embed=true&url=${encodeURIComponent(originalUrl)}&autoplay=${autoplay ? '1' : '0'}&muted=${muted ? '1' : '0'}&title=${encodeURIComponent(title || 'Live Stream')}`;

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

  return (
    <div id="embed-generator-container" className="space-y-4">
      {/* HTTPS Proxy URL Output Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white text-sm font-semibold">HTTPS Direct M3U8 Stream Endpoint</h3>
              <p className="text-slate-400 text-xs">Use in any HLS player, OBS, Smart TV, or mobile app without mixed-content errors</p>
            </div>
          </div>
          <button
            id="btn-copy-proxy-url"
            onClick={() => handleCopy(proxyUrl, 'url')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Copied to Clipboard!' : 'Copy HTTPS M3U8'}</span>
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
              <h3 className="text-white text-sm font-semibold">Responsive Player Embed Code (Iframe)</h3>
              <p className="text-slate-400 text-xs">Embed directly on any website or CMS with HTML5 MSE support</p>
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
              <span>Test Embed Page</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              id="btn-copy-embed-code"
              onClick={() => handleCopy(iframeCode, 'embed')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              {copiedEmbed ? <Check className="w-3.5 h-3.5 text-sky-200" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEmbed ? 'Copied Iframe!' : 'Copy HTML Iframe'}</span>
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
            <span>Muted by default</span>
          </label>
          <div className="flex items-center gap-2 text-slate-300 col-span-2">
            <span className="text-slate-400">Aspect Ratio:</span>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white text-xs"
            >
              <option value="16/9">16:9 Standard</option>
              <option value="4/3">4:3 Classic</option>
              <option value="100%">Fill Viewport</option>
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
            <span>Using in VLC or External Media Player</span>
          </div>
          <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
            Open <strong>VLC &gt; Media &gt; Open Network Stream (Ctrl+N)</strong> and paste the HTTPS Proxy URL. VLC will stream without mixed content warnings.
          </p>
          <button
            onClick={() => handleCopy(`vlc "${proxyUrl}"`, 'vlc')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono cursor-pointer transition-colors"
          >
            <Terminal className="w-3 h-3 text-slate-400" />
            <span>{copiedVlc ? 'Copied CLI Command!' : 'Copy VLC CLI command'}</span>
          </button>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-white mb-2">
            <Share2 className="w-4 h-4 text-sky-400" />
            <span>CORS & Universal Compatibility</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            All requests to <code>/api/hls/proxy</code> include wildcard CORS headers (<code>Access-Control-Allow-Origin: *</code>), allowing the stream to be used inside any frontend app or cross-origin iframe.
          </p>
        </div>
      </div>
    </div>
  );
};
