export interface ProxyStats {
  totalRequests: number;
  manifestRequests: number;
  segmentRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatePercentage: number;
  bytesServedMB: number;
  bytesSavedMB: number;
  upstreamMBFetched: number;
  activeRequests: number;
  activeChannelsCount: number;
  cachedEntriesCount: number;
  cacheMemoryMB: number;
  uptimeSeconds: number;
}

export interface StreamInspection {
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  contentType?: string;
  contentLengthBytes?: number;
  isM3u8?: boolean;
  error?: string;
  info?: {
    isMasterPlaylist: boolean;
    variantsCount: number;
    segmentCount: number;
    targetDuration: number;
    codecsFound: string[];
    audioStreams: string[];
    sampleRewritten: string;
  };
  rawSnippet?: string;
}

export interface StreamPreset {
  id: string;
  name: string;
  description: string;
  url: string;
  videoCodec: string;
  audioCodec: string;
  isUserPreset?: boolean;
}
