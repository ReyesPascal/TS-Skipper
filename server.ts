import express, { Request, Response } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Network interface discovery endpoint - automatically finds server IP
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

  // Filter out internal, tailscale, and virtual docker interfaces
  const physicalCandidates = results.filter(
    (r) =>
      !r.internal &&
      !r.isTailscale &&
      !r.name.startsWith('docker') &&
      !r.name.startsWith('br-') &&
      !r.name.startsWith('veth') &&
      (r.address.startsWith('192.168.') || r.address.startsWith('10.') || r.address.startsWith('172.'))
  );

  // Check if client accessed via an IP address in Host header
  let hostHeaderIp: string | null = null;
  const hostHeader = req.headers.host || '';
  const hostMatch = hostHeader.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (hostMatch && hostMatch[1] !== '127.0.0.1') {
    hostHeaderIp = hostMatch[1];
  }

  const selectedIp = hostHeaderIp || (physicalCandidates[0] ? physicalCandidates[0].address : '192.168.4.40');

  res.json({
    interfaces: results,
    suggestedLanIp: selectedIp,
    hostname: os.hostname(),
  });
});

// Auto-detect Usenet Ultimate directory and current configuration
app.get('/api/system/detect-uu', (req: Request, res: Response) => {
  const homeDir = os.homedir();
  const possiblePaths = [
    path.join(homeDir, 'usenet-ultimate'),
    '/home/ryan/usenet-ultimate',
    path.join(process.cwd(), 'usenet-ultimate'),
    path.join(process.cwd(), '..', 'usenet-ultimate'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const envPath = path.join(p, '.env');
      let currentBaseUrl = '';
      if (fs.existsSync(envPath)) {
        try {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const match = envContent.match(/UU_BASE_URL=(.*)/);
          if (match) {
            currentBaseUrl = match[1].trim();
          }
        } catch {
          // ignore read error
        }
      }
      return res.json({
        found: true,
        path: p,
        hasEnv: fs.existsSync(envPath),
        currentBaseUrl,
      });
    }
  }

  return res.json({
    found: false,
    suggestedPath: path.join(homeDir, 'usenet-ultimate'),
    currentBaseUrl: '',
  });
});

// Automatically update UU_BASE_URL in Usenet Ultimate directory
app.post('/api/system/patch-usenet-ultimate', (req: Request, res: Response) => {
  try {
    const { directoryPath, newBaseUrl } = req.body;

    if (!newBaseUrl) {
      return res.status(400).json({ success: false, message: 'newBaseUrl is required' });
    }

    const homeDir = os.homedir();
    let targetDir = directoryPath || path.join(homeDir, 'usenet-ultimate');

    // Expand ~ to user home
    if (targetDir.startsWith('~/')) {
      targetDir = path.join(homeDir, targetDir.slice(2));
    } else if (targetDir === '~') {
      targetDir = homeDir;
    }

    // Check fallback paths if directory not found
    if (!fs.existsSync(targetDir)) {
      const fallbackRyan = '/home/ryan/usenet-ultimate';
      if (fs.existsSync(fallbackRyan)) {
        targetDir = fallbackRyan;
      } else {
        return res.status(404).json({
          success: false,
          message: `Directory "${targetDir}" not found on this system. Please check path.`,
        });
      }
    }

    const envPath = path.join(targetDir, '.env');
    let previousBaseUrl = 'not set';

    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      const prevMatch = content.match(/UU_BASE_URL=(.*)/);
      if (prevMatch) {
        previousBaseUrl = prevMatch[1].trim();
        content = content.replace(/UU_BASE_URL=.*/, `UU_BASE_URL=${newBaseUrl}`);
      } else {
        content += `\nUU_BASE_URL=${newBaseUrl}\n`;
      }

      // Ensure NZBDAV_PROXY_ENABLED is set
      if (!content.includes('NZBDAV_PROXY_ENABLED=')) {
        content += `NZBDAV_PROXY_ENABLED=true\n`;
      }

      fs.writeFileSync(envPath, content, 'utf8');
      return res.json({
        success: true,
        message: `Successfully updated UU_BASE_URL to ${newBaseUrl} in ${envPath}`,
        filePath: envPath,
        previousBaseUrl,
        newBaseUrl,
      });
    } else {
      // Create .env file with appropriate settings
      const newEnvContent = `# Created by TS-Skipper Auto-Patcher\nUU_BASE_URL=${newBaseUrl}\nNZBDAV_PROXY_ENABLED=true\nNZBDAV_NETWORK=existing_nzbdav_network\n`;
      fs.writeFileSync(envPath, newEnvContent, 'utf8');

      return res.json({
        success: true,
        message: `Created ${envPath} and set UU_BASE_URL=${newBaseUrl}`,
        filePath: envPath,
        previousBaseUrl: 'none',
        newBaseUrl,
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during patch';
    return res.status(500).json({ success: false, message: errorMsg });
  }
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
        name: 'Target Port ATS-Compatibility',
        description: 'Ports 8443 and 443 are universally permitted by iOS/tvOS URLSession policies.',
        passed: validPort,
        recommendation: validPort
          ? 'Passed: Using gateway TLS port.'
          : 'Warning: Apple ATS prefers ports 443 or 8443 for standard HTTPS traffic.',
      },
      {
        name: 'LAN DNS Resolution Scheme',
        description: 'Verifies whether host uses sslip.io or valid domain for TLS certificates.',
        passed: domainMode === 'sslip' || domainMode === 'duckdns' || domainMode === 'custom',
        recommendation: 'sslip.io resolves directly to your local IP while Caddy provisions a valid TLS cert.',
      },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    res.json({
      passed: passedCount === checks.length,
      score,
      checks,
      analyzedUrl: testUrl,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'ATS check failed';
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TS-Skipper/1.0',
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

      if (rewriteToHttps && publicDomain && manifestData) {
        const secureBase = `https://${publicDomain}:${gatewayPort || 8443}`;
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
          ? `Connection to ${upstreamUrl} timed out.`
          : `Could not reach ${upstreamUrl}. Ensure usenet-ultimate container is running on port 1337.`,
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
    app.get('*all', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TS-Skipper server running on port ${PORT}`);
  });
}

startServer();
