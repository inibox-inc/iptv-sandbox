import { StreamPreset } from '../types';

export const DEFAULT_PRESETS: StreamPreset[] = [
  {
    id: 'user-stream',
    name: 'Canal Principal (/play/a1ku)',
    description: 'Emisión H264 AVC + MPEG Audio layer 1/2 (mpga)',
    url: 'http://37.10.108.162:8000/play/a1ku',
    videoCodec: 'H264 / AVC (DX11)',
    audioCodec: 'MPEG Audio layer 1/2 (mpga)',
    isUserPreset: true,
  },
  {
    id: 'user-playlist',
    name: 'Canal Playlist (/playlist.m3u8)',
    description: 'Lista M3U8 directa del servidor de origen',
    url: 'http://37.10.108.162:8000/playlist.m3u8',
    videoCodec: 'H264 / AVC (DX11)',
    audioCodec: 'MPEG Audio layer 1/2 (mpga)',
    isUserPreset: true,
  },
  {
    id: 'bbb-hls',
    name: 'Test Stream: Big Buck Bunny HLS',
    description: 'Multi-bitrate master playlist (1080p, 720p, 480p, 360p)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    videoCodec: 'H264 / AVC',
    audioCodec: 'AAC-LC',
  },
  {
    id: 'apple-bipbop',
    name: 'Test Stream: Apple Advanced BipBop',
    description: 'HLS test stream with alternate audio tracks and subtitles',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8',
    videoCodec: 'H264 / AVC',
    audioCodec: 'AAC',
  },
];
