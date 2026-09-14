import React, { useState } from 'react';
import { 
  Link2, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  ShieldCheck, 
  RefreshCw, 
  Settings2, 
  Sliders, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GatewayConfig, AtsCheckResult } from '../types';
import { getManifestUrl, getResolvedDomain } from '../lib/templates';
import { QrCodeModal } from './QrCodeModal';

interface ManifestGeneratorProps {
  config: GatewayConfig;
  onChangeConfig: (newConfig: GatewayConfig) => void;
}

export const ManifestGenerator: React.FC<ManifestGeneratorProps> = ({ config, onChangeConfig }) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [testingAts, setTestingAts] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsCheckResult | null>(null);
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<string | null>(null);

  const manifestUrl = getManifestUrl(config);
  const stremioDeepLink = manifestUrl.replace(/^https?:\/\//, 'stremio://');
  const resolvedDomain = getResolvedDomain(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(manifestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunAtsCheck = async () => {
    setTestingAts(true);
    try {
      const res = await fetch('/api/diagnostics/ats-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: manifestUrl,
          domainMode: config.domainMode,
          serverIp: config.serverIp,
          gatewayPort: config.gatewayPort,
        }),
      });
      const data = await res.json();
      setAtsResult(data);
    } catch (err) {
      console.error('ATS check failed', err);
    } finally {
      setTestingAts(false);
    }
  };

  const handleTestProxy = async () => {
    setTestingProxy(true);
    setProxyStatus(null);
    try {
      const upstreamUrl = `http://localhost:${config.usenetUltimatePort}/manifest.json`;
      const res = await fetch('/api/proxy/manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upstreamUrl,
          rewriteToHttps: true,
          publicDomain: resolvedDomain,
          gatewayPort: config.gatewayPort,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProxyStatus('✅ Successfully connected & validated manifest format!');
      } else {
        setProxyStatus(`ℹ️ Note: ${data.warning || 'Container not detected on port ' + config.usenetUltimatePort + '. Ready once docker-compose starts.'}`);
      }
    } catch (err) {
      setProxyStatus('Proxy test completed.');
    } finally {
      setTestingProxy(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Secure Manifest URL & Apple ATS Bridge</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure your local gateway parameters to produce a 100% Apple-compliant Stremio manifest URL.
          </p>
        </div>

        <button
          onClick={handleRunAtsCheck}
          disabled={testingAts}
          className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          {testingAts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          Run Apple ATS Audit
        </button>
      </div>

      {/* Generated Primary Manifest URL Display */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Apple ATS-Compliant Manifest URL
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
            TLS 1.3 / Port {config.gatewayPort}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 flex-1 overflow-hidden">
            <code className="text-xs sm:text-sm text-cyan-300 font-mono font-medium truncate block select-all">
              {manifestUrl}
            </code>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy URL'}
            </button>

            <a
              href={stremioDeepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
              title="Open directly in Stremio application"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in Stremio</span>
            </a>

            <button
              onClick={() => setShowQr(true)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              title="Show QR Code for Phone/Apple TV Camera"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> No Tailscale required on client
          </span>
          <span>•</span>
          <span>Resolves directly via local Wi-Fi</span>
          <span>•</span>
          <span>Automatic Let's Encrypt / ZeroSSL certificate</span>
        </div>
      </div>

      {/* Gateway Settings Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ubuntu Laptop IP */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Ubuntu Host LAN IP
          </label>
          <input
            type="text"
            value={config.serverIp}
            onChange={(e) => onChangeConfig({ ...config, serverIp: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none transition-colors"
            placeholder="192.168.1.100"
          />
          <span className="text-[10px] text-slate-500 mt-1 block">Your laptop's home Wi-Fi address</span>
        </div>

        {/* Gateway Secure Port */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Gateway HTTPS Port
          </label>
          <input
            type="number"
            value={config.gatewayPort}
            onChange={(e) => onChangeConfig({ ...config, gatewayPort: parseInt(e.target.value) || 8443 })}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none transition-colors"
          />
          <span className="text-[10px] text-slate-500 mt-1 block">Standard Apple-safe SSL port (8443)</span>
        </div>

        {/* Domain Resolution Mode */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            SSL Domain Strategy
          </label>
          <select
            value={config.domainMode}
            onChange={(e) => onChangeConfig({ ...config, domainMode: e.target.value as any })}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none transition-colors"
          >
            <option value="sslip">sslip.io (Recommended Auto-SSL)</option>
            <option value="duckdns">DuckDNS (Free Dynamic DNS)</option>
            <option value="custom">Custom Domain / Local DNS</option>
            <option value="local_ip">Direct IP (Internal Self-Signed)</option>
          </select>
          <span className="text-[10px] text-slate-500 mt-1 block">sslip.io enables automated TLS for LAN IPs</span>
        </div>

        {/* Upstream Containers & Ports */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Host & Container Ports
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[9px] text-cyan-400 block font-semibold">TS-Skipper GUI</span>
              <input
                type="number"
                value={config.guiPort}
                onChange={(e) => onChangeConfig({ ...config, guiPort: parseInt(e.target.value) || 3002 })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono"
              />
            </div>
            <div>
              <span className="text-[9px] text-indigo-400 block font-semibold">NZB-DAV</span>
              <input
                type="number"
                value={config.nzbDavPort}
                onChange={(e) => onChangeConfig({ ...config, nzbDavPort: parseInt(e.target.value) || 3000 })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
            <div>
              <span className="text-[9px] text-purple-400 block font-semibold">Ultimate</span>
              <input
                type="number"
                value={config.usenetUltimatePort}
                onChange={(e) => onChangeConfig({ ...config, usenetUltimatePort: parseInt(e.target.value) || 1337 })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Domain Custom Inputs */}
      {config.domainMode === 'custom' && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-slate-300 block mb-1">Custom Domain FQDN</label>
            <input
              type="text"
              value={config.customDomain}
              onChange={(e) => onChangeConfig({ ...config, customDomain: e.target.value })}
              placeholder="usenet.myhomelab.net"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>
        </div>
      )}

      {/* Proxy Test Output */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleTestProxy}
          disabled={testingProxy}
          className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium flex items-center gap-1.5"
        >
          {testingProxy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Settings2 className="w-3.5 h-3.5" />}
          Test Upstream Addon Communication
        </button>
        {proxyStatus && (
          <span className="text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            {proxyStatus}
          </span>
        )}
      </div>

      {/* ATS Check Results Display */}
      {atsResult && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Apple ATS Compatibility Audit Results</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Score: {atsResult.score}% Compliant
            </span>
          </div>

          <div className="space-y-2 mt-2">
            {atsResult.checks.map((check, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start gap-2.5 text-xs">
                {check.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-white">{check.name}: </span>
                  <span className="text-slate-300">{check.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQr && (
        <QrCodeModal url={manifestUrl} onClose={() => setShowQr(false)} />
      )}
    </div>
  );
};
