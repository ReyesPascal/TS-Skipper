import React, { useState } from 'react';
import { 
  Laptop, 
  Tv, 
  Smartphone, 
  Wifi, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle,
  Radio,
  Server,
  Network
} from 'lucide-react';
import { GatewayConfig } from '../types';
import { getResolvedDomain } from '../lib/templates';

interface NetworkTopologyProps {
  config: GatewayConfig;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({ config }) => {
  const [viewMode, setViewMode] = useState<'solved' | 'broken'>('solved');
  const domain = getResolvedDomain(config);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background subtle glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Network Architecture & Stream Routing</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Understanding why Apple ATS blocked your stream and how the local gateway solves it without client VPNs.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('solved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'solved'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            New Solution (Zero-Client LAN)
          </button>
          <button
            onClick={() => setViewMode('broken')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'broken'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Previous Issue (Plain HTTP)
          </button>
        </div>
      </div>

      {/* Interactive Topology Visualizer */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">
        {/* Node 1: Ubuntu Laptop */}
        <div className="lg:col-span-4 bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Ubuntu Laptop</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{config.serverIp}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Docker Host
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-300 font-mono">nzb-dav (WebDAV)</span>
                <span className="text-emerald-400 font-mono text-[11px]">Port {config.nzbDavPort}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-300 font-mono">usenet-ultimate</span>
                <span className="text-emerald-400 font-mono text-[11px]">Port {config.usenetUltimatePort}</span>
              </div>
              {viewMode === 'solved' ? (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-200 font-medium">Caddy Gateway (TLS)</span>
                  </div>
                  <span className="text-emerald-300 font-mono text-[11px] font-bold">Port {config.gatewayPort} HTTPS</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs flex items-center justify-between">
                  <span className="text-rose-200">No TLS Proxy</span>
                  <span className="text-rose-400 font-mono text-[11px]">Plain HTTP :{config.nzbDavPort}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400">
            {viewMode === 'solved' ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Auto-issues SSL for {domain}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Exposed raw HTTP, rejected by Apple ATS
              </span>
            )}
          </div>
        </div>

        {/* Middle Connector: Home Wi-Fi Router */}
        <div className="lg:col-span-4 bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Home Wi-Fi Router</h3>
                  <span className="text-[11px] text-slate-400">LAN Broadcast Domain</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/60">
                1Gbps+ Local
              </span>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              {viewMode === 'solved' ? (
                <p>
                  <strong className="text-white">Direct Local Route:</strong> Video chunks stream at full Wi-Fi/Ethernet speeds between your laptop and your TV with zero internet upload or latency overhead.
                </p>
              ) : (
                <p className="text-rose-300">
                  <strong className="text-rose-200">Blocked at Client:</strong> The router physically routes the packets, but Apple's ATS software sandbox rejects the socket handshake because it lacks TLS encryption.
                </p>
              )}
            </div>

            {/* Optional Tailscale Badge */}
            <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Radio className={`w-3.5 h-3.5 ${config.tailscaleEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-slate-300 text-[11px]">Optional Remote Tailscale:</span>
              </div>
              <span className={`text-[11px] font-mono ${config.tailscaleEnabled ? 'text-cyan-400 font-semibold' : 'text-slate-500'}`}>
                {config.tailscaleEnabled ? 'Subnet Router (Active)' : 'LAN-Only (Disabled)'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400">
            Wi-Fi traffic never leaves your local household router.
          </div>
        </div>

        {/* Node 3: Client Devices */}
        <div className="lg:col-span-4 bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Streaming Devices</h3>
                  <span className="text-[11px] text-slate-400">Apple TV, iPhone, Smart TVs</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                viewMode === 'solved' 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950 text-rose-300 border border-rose-800/60'
              }`}>
                {viewMode === 'solved' ? 'No Tailscale Needed!' : 'Tailscale Forced'}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">Apple TV 4K (Stremio/Infuse)</span>
                </div>
                <span className={`text-[11px] font-bold ${viewMode === 'solved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {viewMode === 'solved' ? '✅ ATS Passed' : '❌ ATS Blocked'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">iPhone / iPad / Android</span>
                </div>
                <span className={`text-[11px] font-bold ${viewMode === 'solved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {viewMode === 'solved' ? '✅ Native Wi-Fi' : '❌ Needs VPN App'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">Living Room / Guest TVs</span>
                </div>
                <span className={`text-[11px] font-bold ${viewMode === 'solved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {viewMode === 'solved' ? '✅ Zero Setup' : '❌ Cannot Install'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px]">
            {viewMode === 'solved' ? (
              <span className="text-emerald-400 font-medium">
                Devices simply connect to your Wi-Fi and stream immediately!
              </span>
            ) : (
              <span className="text-rose-400">
                Required you to download & log in to Tailscale on every single screen.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key Insight Callout */}
      <div className="mt-6 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-slate-300 space-y-1">
          <p className="font-semibold text-white">Why this eliminates the need for Tailscale on every device:</p>
          <p className="text-slate-400">
            Tailscale was previously acting as a band-aid: it created an encrypted tunnel with TLS certificates, which happened to satisfy Apple's ATS rule. By running the lightweight Caddy SSL proxy on your Ubuntu laptop on port <strong className="text-white">{config.gatewayPort}</strong>, your laptop handles TLS natively for your entire home network. All devices on your Wi-Fi talk directly to it—fast, secure, and hassle-free.
          </p>
        </div>
      </div>
    </div>
  );
};
