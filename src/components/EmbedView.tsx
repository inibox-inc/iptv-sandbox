import React from 'react';
import { HlsPlayer } from './HlsPlayer';

export const EmbedView: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const rawUrl = searchParams.get('url') || 'http://37.10.108.162:8000/play/a1ku';
  const autoPlay = searchParams.get('autoplay') !== '0';
  const muted = searchParams.get('muted') !== '0';
  const title = searchParams.get('title') || 'Live Stream';

  const proxySrc = `/api/hls/proxy?url=${encodeURIComponent(rawUrl)}`;

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden m-0 p-0">
      <HlsPlayer
        src={proxySrc}
        originalUrl={rawUrl}
        autoPlay={autoPlay}
        muted={muted}
        title={title}
        isEmbed={true}
      />
    </div>
  );
};
