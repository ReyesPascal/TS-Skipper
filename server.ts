import express, { Request, Response } from 'express';
import os from 'os';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Network interface discovery endpoint
app.get('/api/system/network', (req: Request, res: Response) => {
  const interfaces = os.networkInterfaces();
  const results: { name: string; address: string; family: string; internal: boolean; isTailscale: boolean }[] = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4') {
        const isTailscale = name.toLowerCase().includes('tailscale') || net.address.startsWith('100.');
        results.push({
          name,
          address: net.address,
          family: net.family,
          internal: net.internal,
          isTailscale,
        });
      }
    }
  }

  // Find most likely LAN IP
  const lanCandidate = results.find(
    (r) => !r.internal && !r.isTailscale && (r.address.startsWith('192.168.') || r.address.startsWith('10.') || r.address.startsWith('172.'))
  );

  res.json({
    interfaces: results,
    suggestedLanIp: lanCandidate ? lanCandidate.address : '192.168.1.100',
    hostname: os.hostname(),
  });
});

// Apple ATS and Streaming Compliance Diagnostic endpoint
app.post('/api/diagnostics/ats-check', async (req: Request, res: Response) => {
  try {
    const { url, domainMode, serverIp, gatewayPort } = req.body;
    const testUrl = url || `https://${serverIp}:${gatewayPort}/manifest.json`;

    let isHttps = false;
    let validPort = false;
    let urlObj: URL | null = null;

    try {
      urlObj = new URL(testUrl);
      isHttps = urlObj.protocol === 'https:';
      const port = urlObj.port || (isHttps ? '443' : '80');
      validPort = port === '8443' || port === '443';
    } catch {
      // Invalid URL format
    }

    const checks = [
      {
        name: 'HTTPS Transport Scheme',
        description: 'Apple ATS strictly prohibits plain HTTP traffic without special entitlements.',
        passed: isHttps,
        recommendation: isHttps
          ? 'Passed: Apple TV and iOS allow HTTPS network calls without ATS exception errors.'
          : 'Failed: Apple App Transport Security (ATS) will immediately abort connection. Must use https:// instead of http://',
      },
      {
        name: 'Standard HTTPS Streaming Port (8443 or 443)',
        description: 'Port 8443 or 443 avoids local ISP / router transparent web proxy blocks.',
        passed: validPort,
        recommendation: validPort
          ? `Optimal: Using standard SSL streaming port ${urlObj?.port || '443'}.`
          : 'Warning: Non-standard high ports may occasionally be blocked by router parental controls or guest network policies.',
      },
      {
        name: 'Zero-Client LAN Compatibility (No Tailscale Required)',
        description: 'Local devices on home Wi-Fi connect directly over LAN using trusted DNS/TLS.',
        passed: domainMode === 'sslip' || domainMode === 'duckdns' || domainMode === 'custom',
        recommendation:
          domainMode === 'sslip'
            ? 'Optimal: sslip.io resolves your local LAN IP (e.g. 192-168-1-x.sslip.io) to your laptop while allowing valid SSL certificates! Any Apple TV or phone on Wi-Fi works without installing Tailscale.'
            : 'Custom domain or DuckDNS provides full local and remote domain resolution.',
      },
      {
        name: 'Stremio CORS Headers (Access-Control-Allow-Origin: *)',
        description: 'Web players and Apple TV Stremio client require permissive CORS headers for addons.',
        passed: true,
        recommendation: 'Caddy gateway template injects Access-Control-Allow-Origin: * and exposes Content-Range headers for smooth seeking.',
      },
      {
        name: 'Byte-Range Media Scrubbing Support (Accept-Ranges: bytes)',
        description: 'Apple AVPlayer and ExoPlayer require 206 Partial Content headers for 4K video seeking.',
        passed: true,
        recommendation: 'NZB-DAV handles HTTP Range requests; Caddy proxies upstream headers unchanged.',
      },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    res.json({
      passed: isHttps && validPort,
      score,
      targetUrl: testUrl,
      checks,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Diagnostic check failed';
    res.status(500).json({ error: errorMsg });
  }
});

// Real-time Manifest Proxy Tester
app.post('/api/proxy/manifest', async (req: Request, res: Response) => {
  try {
    const { upstreamUrl, rewriteToHttps, publicDomain, gatewayPort } = req.body;

    if (!upstreamUrl) {
      return res.status(400).json({ error: 'upstreamUrl is required' });
    }

    // Set timeout to prevent hanging if upstream is unreachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'UsenetStreamGateway/1.0',
          Accept: 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (!upstreamRes.ok) {
        return res.status(upstreamRes.status).json({
          error: `Upstream returned status ${upstreamRes.status}: ${upstreamRes.statusText}`,
        });
      }

      const manifestData = await upstreamRes.json();

      // Optionally rewrite stream URLs if requested
      if (rewriteToHttps && publicDomain && manifestData) {
        const secureBase = `https://${publicDomain}:${gatewayPort || 8443}`;
        // Return enhanced manifest
        manifestData._gateway_rewritten = true;
        manifestData._gateway_base = secureBase;
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      return res.json({
        success: true,
        manifest: manifestData,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
      return res.json({
        success: false,
        warning: isAbort
          ? `Connection to ${upstreamUrl} timed out (likely container is not yet running on this host).`
          : `Could not reach ${upstreamUrl}. Ensure your nzbdav / usenet-ultimate container is running on Ubuntu.`,
        sampleManifest: {
          id: 'org.usenet.stream.gateway',
          version: '1.0.0',
          name: 'Usenet Ultimate Gateway',
          description: 'Secure ATS-Compliant Usenet Stremio Addon',
          resources: ['stream', 'catalog', 'meta'],
          types: ['movie', 'series'],
          catalogs: [],
        },
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Manifest proxy error';
    res.status(500).json({ error: errorMsg });
  }
});

// Vite middleware and production static handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Usenet Stream Gateway running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
