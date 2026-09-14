import React, { useState } from 'react';
import { 
  Radio, 
  ShieldCheck, 
  Copy, 
  Check, 
  ToggleLeft, 
  ToggleRight, 
  Globe, 
  Cpu, 
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import { GatewayConfig } from '../types';

interface TailscaleManagerProps {
  config: GatewayConfig;
  onChangeConfig: (newConfig: GatewayConfig) => void;
}

export const TailscaleManager: React.FC<TailscaleManagerProps> = ({ config, onChangeConfig }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const subnetCommand = `sudo tailscale up --advertise-routes=${config.tailscaleSubnet || '192.168.1.0/24'} --accept-dns=false`;
  const serveCommand = `sudo tailscale serve --bg https / http://localhost:${config.gatewayPort}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header with Enable/Disable Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Optional Remote Tailscale Gateway</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Keep your home TVs 100% Tailscale-free while optionally exposing your Ubuntu server for travel streaming.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300">
            {config.tailscaleEnabled ? 'Remote Access: Enabled' : 'Remote Access: Disabled (LAN Only)'}
          </span>
          <button
            onClick={() => onChangeConfig({ ...config, tailscaleEnabled: !config.tailscaleEnabled })}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Toggle Tailscale Integration"
          >
            {config.tailscaleEnabled ? (
              <ToggleRight className="w-9 h-9 text-cyan-400" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Comparison Grid: Why this solves the multi-device problem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>At Home on Local Wi-Fi (No Tailscale)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All devices (Apple TV, smart TVs, family phones) talk directly to your Ubuntu laptop over high-speed 1Gbps local Wi-Fi. No VPN client, no battery drain, and no logins needed on any TV.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1">
            <Globe className="w-4 h-4" />
            <span>When Away from Home (Remote Travel)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your Ubuntu laptop advertises itself or your subnet as a gateway. When you are on hotel Wi-Fi or 5G, only your traveling phone/laptop connects to your private tailnet.
          </p>
        </div>
      </div>

      {config.tailscaleEnabled && (
        <div className="space-y-4 pt-2 animate-in fade-in">
          {/* Strategy Mode Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Select Remote Integration Strategy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1 */}
              <button
                onClick={() => onChangeConfig({ ...config, tailscaleMode: 'subnet_router' })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  config.tailscaleMode === 'subnet_router'
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Subnet Router (Recommended)</span>
                  {config.tailscaleMode === 'subnet_router' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Ubuntu shares the local LAN route so remote devices can access your gateway IP directly.
                </p>
              </button>

              {/* Option 2 */}
              <button
                onClick={() => onChangeConfig({ ...config, tailscaleMode: 'serve' })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  config.tailscaleMode === 'serve'
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Tailscale Serve (MagicDNS)</span>
                  {config.tailscaleMode === 'serve' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Exposes port {config.gatewayPort} via your Ubuntu node name (e.g. ubuntu.tailnet.ts.net).
                </p>
              </button>

              {/* Option 3 */}
              <button
                onClick={() => onChangeConfig({ ...config, tailscaleMode: 'sidecar_container' })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  config.tailscaleMode === 'sidecar_container'
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Docker Sidecar Container</span>
                  {config.tailscaleMode === 'sidecar_container' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Runs Tailscale inside Docker without installing the APT package on Ubuntu host.
                </p>
              </button>
            </div>
          </div>

          {/* Subnet Configuration input */}
          {config.tailscaleMode === 'subnet_router' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold text-white block">
                    Local Subnet CIDR to Advertise
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Matches your home router IP range (e.g. 192.168.1.0/24 or 192.168.0.0/24)
                  </p>
                </div>
                <input
                  type="text"
                  value={config.tailscaleSubnet}
                  onChange={(e) => onChangeConfig({ ...config, tailscaleSubnet: e.target.value })}
                  placeholder="192.168.1.0/24"
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono w-44"
                />
              </div>

              {/* Ubuntu Command Snippet */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Run on Ubuntu Terminal
                </span>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto">
                    {subnetCommand}
                  </pre>
                  <button
                    onClick={() => handleCopy(subnetCommand, 'subnet')}
                    className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {copiedId === 'subnet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {config.tailscaleMode === 'serve' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-white block">
                Tailscale Serve Command
              </span>
              <p className="text-[11px] text-slate-400">
                Publishes your gateway port securely inside your private tailnet with automatic TLS:
              </p>
              <div className="relative group">
                <pre className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto">
                  {serveCommand}
                </pre>
                <button
                  onClick={() => handleCopy(serveCommand, 'serve')}
                  className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copiedId === 'serve' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {config.tailscaleMode === 'sidecar_container' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-white block">
                Tailscale Container Auth Key (TS_AUTHKEY)
              </span>
              <p className="text-[11px] text-slate-400">
                Generate a reusable or ephemeral auth key from your Tailscale Admin Console:
              </p>
              <input
                type="password"
                value={config.tailscaleAuthKey}
                onChange={(e) => onChangeConfig({ ...config, tailscaleAuthKey: e.target.value })}
                placeholder="tskey-auth-kXXXXXX-XXXXXXXX"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 block">
                This has been automatically added to your downloadable <code className="text-cyan-400">docker-compose.yml</code>.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
