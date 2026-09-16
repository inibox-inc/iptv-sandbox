import { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import { URL } from 'url';

interface CacheEntry {
  contentType: string;
  data: Buffer;
  status: number;
  timestamp: number;
  ttlMs: number;
  headers: Record<string, string>;
}

interface StreamStats {
  totalRequests: number;
  manifestRequests: number;
  segmentRequests: number;
  cacheHits: number;
  cacheMisses: number;
  bytesServed: number;
  bytesSaved: number;
  upstreamBytesFetched: number;
  activeRequests: number;
  activeStreams: Set<string>;
  startTime: number;
}

class HlsProxyEngine {
  private cache = new Map<string, CacheEntry>();
  private inFlightRequests = new Map<string, Promise<{ contentType: string; data: Buffer; status: number; headers: Record<string, string> }>>();
  
  public stats: StreamStats = {
    totalRequests: 0,
    manifestRequests: 0,
    segmentRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    bytesServed: 0,
    bytesSaved: 0,
    upstreamBytesFetched: 0,
    activeRequests: 0,
    activeStreams: new Set<string>(),
    startTime: Date.now(),
  };

  private maxCacheSizeEntries = 400; // Limit in-memory segment cache entries
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Run periodic cache cleaner every 10 seconds to free expired TS chunks & manifests
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 10000);
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttlMs) {
        this.cache.delete(key);
      }
    }

    // If cache still exceeds limit, prune oldest
    if (this.cache.size > this.maxCacheSizeEntries) {
      const keysToDelete = Array.from(this.cache.keys()).slice(0, this.cache.size - this.maxCacheSizeEntries);
      for (const k of keysToDelete) {
        this.cache.delete(k);
      }
    }
  }

  public getStats() {
    const uptimeSec = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const hitRate = this.stats.totalRequests > 0 
      ? Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100) 
      : 0;
    
    let cacheMemoryBytes = 0;
    for (const entry of this.cache.values()) {
      cacheMemoryBytes += entry.data.length;
    }

    return {
      totalRequests: this.stats.totalRequests,
      manifestRequests: this.stats.manifestRequests,
      segmentRequests: this.stats.segmentRequests,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      hitRatePercentage: hitRate,
      bytesServedMB: +(this.stats.bytesServed / (1024 * 1024)).toFixed(2),
      bytesSavedMB: +(this.stats.bytesSaved / (1024 * 1024)).toFixed(2),
      upstreamMBFetched: +(this.stats.upstreamBytesFetched / (1024 * 1024)).toFixed(2),
      activeRequests: this.stats.activeRequests,
      activeChannelsCount: this.stats.activeStreams.size,
      cachedEntriesCount: this.cache.size,
      cacheMemoryMB: +(cacheMemoryBytes / (1024 * 1024)).toFixed(2),
      uptimeSeconds: uptimeSec,
    };
  }

  /**
   * Rewrite M3U8 content to point internal relative & absolute URLs to the HTTPS proxy
   */
  public rewriteM3u8(content: string, targetUrl: string, proxyBaseUrl: string): string {
    const targetUrlObj = new URL(targetUrl);
    const lines = content.split(/\r?\n/);
    const rewrittenLines: string[] = [];

    const makeProxyUrl = (rawUrl: string): string => {
      try {
        const resolved = new URL(rawUrl, targetUrlObj.href).href;
        return `${proxyBaseUrl}?url=${encodeURIComponent(resolved)}`;
      } catch {
        return rawUrl;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        rewrittenLines.push(lines[i]);
        continue;
      }

      // Check for tags containing URI="..." e.g. #EXT-X-MEDIA, #EXT-X-KEY, #EXT-X-MAP, #EXT-X-SESSION-DATA
      if (line.startsWith('#')) {
        if (line.includes('URI="')) {
          const replacedLine = line.replace(/URI="([^"]+)"/g, (_, uriVal) => {
            return `URI="${makeProxyUrl(uriVal)}"`;
          });
          rewrittenLines.push(replacedLine);
        } else {
          rewrittenLines.push(lines[i]);
        }
        continue;
      }

      // Non-comment line = Media segment or Child Playlist URL
      rewrittenLines.push(makeProxyUrl(line));
    }

    return rewrittenLines.join('\n');
  }

  /**
   * Fetch from upstream HTTP/HTTPS origin with timeout, redirects, and error handling
   */
  private fetchUpstream(targetUrl: string, reqHeaders: Record<string, string | string[] | undefined>): Promise<{
    contentType: string;
    data: Buffer;
    status: number;
    headers: Record<string, string>;
  }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(targetUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 HLSProxy/1.0',
        'Accept': '*/*',
        'Connection': 'keep-alive',
      };

      if (reqHeaders['range'] && typeof reqHeaders['range'] === 'string') {
        headers['Range'] = reqHeaders['range'];
      }

      const req = client.request(
        urlObj,
        {
          method: 'GET',
          headers,
          timeout: 15000,
        },
        (res) => {
          // Handle HTTP 3xx Redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, targetUrl).href;
            res.resume(); // consume stream to free memory
            this.fetchUpstream(redirectUrl, reqHeaders).then(resolve).catch(reject);
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const contentType = res.headers['content-type'] || 'application/octet-stream';
            
            const responseHeaders: Record<string, string> = {};
            if (res.headers['content-range']) {
              responseHeaders['content-range'] = String(res.headers['content-range']);
            }
            if (res.headers['accept-ranges']) {
              responseHeaders['accept-ranges'] = String(res.headers['accept-ranges']);
            }

            resolve({
              contentType,
              data: buffer,
              status: res.statusCode || 200,
              headers: responseHeaders,
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Upstream connection timed out for ${targetUrl}`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }

  /**
   * Handle incoming proxy request
   */
  public async handleProxy(req: Request, res: Response) {
    const rawTargetUrl = req.query.url as string;

    if (!rawTargetUrl) {
      res.status(400).json({ error: 'Missing required query parameter "url"' });
      return;
    }

    let targetUrl: string;
    try {
      targetUrl = decodeURIComponent(rawTargetUrl);
      new URL(targetUrl); // validate
    } catch {
      res.status(400).json({ error: 'Invalid URL provided' });
      return;
    }

    const isM3u8 = targetUrl.toLowerCase().includes('.m3u8') || targetUrl.toLowerCase().includes('/play/') || targetUrl.toLowerCase().includes('/live/');
    const isSegment = targetUrl.toLowerCase().includes('.ts') || 
                      targetUrl.toLowerCase().includes('.m4s') || 
                      targetUrl.toLowerCase().includes('.mp4') || 
                      targetUrl.toLowerCase().includes('.aac') ||
                      targetUrl.toLowerCase().includes('.key');

    this.stats.totalRequests++;
    this.stats.activeRequests++;
    if (isM3u8) {
      this.stats.manifestRequests++;
    } else {
      this.stats.segmentRequests++;
    }

    // Register active channel hostname/path
    try {
      const parsed = new URL(targetUrl);
      this.stats.activeStreams.add(`${parsed.hostname}${parsed.pathname.substring(0, 20)}`);
      // Keep activeStreams set bounded
      if (this.stats.activeStreams.size > 200) {
        this.stats.activeStreams.clear();
      }
    } catch {
      // ignore
    }

    // CORS Headers for universal browser and embed compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

    if (req.method === 'OPTIONS') {
      this.stats.activeRequests = Math.max(0, this.stats.activeRequests - 1);
      res.status(204).end();
      return;
    }

    // Check Memory Cache
    const cached = this.cache.get(targetUrl);
    const now = Date.now();

    if (cached && (now - cached.timestamp < cached.ttlMs)) {
      this.stats.cacheHits++;
      this.stats.bytesSaved += cached.data.length;
      this.stats.bytesServed += cached.data.length;
      this.stats.activeRequests = Math.max(0, this.stats.activeRequests - 1);

      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('X-Proxy-Cache', 'HIT');
      res.setHeader('X-Proxy-Age', `${Math.round((now - cached.timestamp) / 1000)}s`);
      for (const [hk, hv] of Object.entries(cached.headers)) {
        res.setHeader(hk, hv);
      }
      res.status(cached.status).send(cached.data);
      return;
    }

    this.stats.cacheMisses++;

    try {
      // In-flight Request Coalescing (Single-Flight Deduplication)
      let fetchPromise = this.inFlightRequests.get(targetUrl);
      if (!fetchPromise) {
        fetchPromise = this.fetchUpstream(targetUrl, req.headers)
          .finally(() => {
            this.inFlightRequests.delete(targetUrl);
          });
        this.inFlightRequests.set(targetUrl, fetchPromise);
      }

      const upstream = await fetchPromise;

      this.stats.upstreamBytesFetched += upstream.data.length;

      // Determine content type and caching TTL
      let finalContentType = upstream.contentType;
      let finalData = upstream.data;

      const isManifest = isM3u8 || upstream.contentType.includes('mpegurl') || upstream.contentType.includes('application/x-mpegURL') || upstream.data.toString('utf-8', 0, 7).startsWith('#EXTM3U');

      if (isManifest) {
        finalContentType = 'application/vnd.apple.mpegurl';
        
        // Compute base proxy URL from request host
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const proxyBaseUrl = `${protocol}://${host}/api/hls/proxy`;

        const rawText = upstream.data.toString('utf-8');
        const rewrittenText = this.rewriteM3u8(rawText, targetUrl, proxyBaseUrl);
        finalData = Buffer.from(rewrittenText, 'utf-8');

        // Cache live manifests for 1.8 seconds (short TTL to keep live streams fresh while collapsing multi-user polling bursts)
        this.cache.set(targetUrl, {
          contentType: finalContentType,
          data: finalData,
          status: upstream.status,
          timestamp: Date.now(),
          ttlMs: 2000,
          headers: upstream.headers,
        });

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        // Media segment (.ts, .m4s, .key, etc.)
        if (targetUrl.toLowerCase().includes('.ts')) {
          finalContentType = 'video/mp2t';
        } else if (targetUrl.toLowerCase().includes('.m4s') || targetUrl.toLowerCase().includes('.mp4')) {
          finalContentType = 'video/mp4';
        }

        // Cache segments for 60 seconds (immutable video chunks)
        // This ensures if 10 or 100 viewers stream simultaneously, each segment is fetched from origin ONLY ONCE!
        this.cache.set(targetUrl, {
          contentType: finalContentType,
          data: finalData,
          status: upstream.status,
          timestamp: Date.now(),
          ttlMs: 60000,
          headers: upstream.headers,
        });

        res.setHeader('Cache-Control', 'public, max-age=60');
      }

      this.stats.bytesServed += finalData.length;

      res.setHeader('Content-Type', finalContentType);
      res.setHeader('X-Proxy-Cache', 'MISS');
      for (const [hk, hv] of Object.entries(upstream.headers)) {
        res.setHeader(hk, hv);
      }

      res.status(upstream.status).send(finalData);
    } catch (err: any) {
      console.error(`[HlsProxyEngine Error] Failed to proxy ${targetUrl}:`, err.message || err);
      res.status(502).json({
        error: 'Bad Gateway: Failed to fetch upstream HTTP stream',
        details: err.message || 'Unknown network error',
        targetUrl,
      });
    } finally {
      this.stats.activeRequests = Math.max(0, this.stats.activeRequests - 1);
    }
  }

  /**
   * Diagnostic inspector for testing URLs, checking headers, codecs, and latency
   */
  public async inspectStream(url: string, proxyBaseUrl: string) {
    const start = Date.now();
    try {
      const upstream = await this.fetchUpstream(url, {});
      const latencyMs = Date.now() - start;
      const isM3u8 = upstream.contentType.includes('mpegurl') || upstream.data.toString('utf-8', 0, 7).startsWith('#EXTM3U');
      const text = upstream.data.toString('utf-8');

      let parsedInfo = {
        isMasterPlaylist: false,
        variantsCount: 0,
        segmentCount: 0,
        targetDuration: 0,
        codecsFound: [] as string[],
        audioStreams: [] as string[],
        sampleRewritten: '',
      };

      if (isM3u8) {
        parsedInfo.isMasterPlaylist = text.includes('#EXT-X-STREAM-INF');
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.includes('CODECS="')) {
            const match = line.match(/CODECS="([^"]+)"/);
            if (match && match[1]) {
              parsedInfo.codecsFound.push(match[1]);
            }
          }
          if (line.startsWith('#EXT-X-MEDIA:TYPE=AUDIO')) {
            parsedInfo.audioStreams.push(line);
          }
          if (line.startsWith('#EXT-X-TARGETDURATION:')) {
            parsedInfo.targetDuration = parseFloat(line.split(':')[1]) || 0;
          }
          if (line.startsWith('#EXTINF:')) {
            parsedInfo.segmentCount++;
          }
        }

        parsedInfo.sampleRewritten = this.rewriteM3u8(text.slice(0, 1500), url, proxyBaseUrl);
      }

      return {
        success: true,
        statusCode: upstream.status,
        latencyMs,
        contentType: upstream.contentType,
        contentLengthBytes: upstream.data.length,
        isM3u8,
        info: parsedInfo,
        rawSnippet: text.slice(0, 1500),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to connect to stream',
        latencyMs: Date.now() - start,
      };
    }
  }
}

export const proxyEngine = new HlsProxyEngine();
