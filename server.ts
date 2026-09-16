import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { proxyEngine } from './server/proxy-engine.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic middleware
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // HLS HTTP -> HTTPS Reverse Proxy Route
  app.get('/api/hls/proxy', (req, res) => {
    proxyEngine.handleProxy(req, res);
  });

  // Live Performance & Cache Statistics
  app.get('/api/hls/stats', (req, res) => {
    res.json(proxyEngine.getStats());
  });

  // Stream Inspector & Diagnostic Route
  app.get('/api/hls/inspect', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      res.status(400).json({ error: 'Missing parameter "url"' });
      return;
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proxyBaseUrl = `${protocol}://${host}/api/hls/proxy`;

    const spoofMode = (req.query.spoof as any) || 'localhost';
    const customUserAgent = req.query.ua as string | undefined;
    const customReferer = req.query.ref as string | undefined;
    const customOrigin = req.query.origin as string | undefined;
    const customIp = req.query.ip as string | undefined;

    const result = await proxyEngine.inspectStream(rawUrl, proxyBaseUrl, {
      mode: spoofMode,
      customUserAgent,
      customReferer,
      customOrigin,
      customIp,
    });
    res.json(result);
  });

  // Vite middleware for development vs Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HLS Proxy Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
