import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Link2, 
  Github, 
  Radio, 
  Tv,
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Laptop,
  Terminal,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { GatewayConfig, NetworkInterfaceInfo } from './types';
import { NetworkTopology } from './components/NetworkTopology';
import { ManifestGenerator } from './components/ManifestGenerator';
import { UsenetAppsGuide } from './components/UsenetAppsGuide';
import { DeploymentHub } from './components/DeploymentHub';
import { TailscaleManager } from './components/TailscaleManager';
import { AutoPatcher } from './components/AutoPatcher';
import { getResolvedDomain } from './lib/templates';

export default function App() {
  const [activeView, setActiveView] = useState<'autopatch' | 'apps' | 'manifest' | 'topology' | 'deploy' | 'tailscale'>('autopatch');
  
  // Default configuration state matching ryan@Brain (from your terminal: 192.168.4.40)
  const [config, setConfig] = useState<GatewayConfig>({
    serverIp: '192.168.4.40',
    guiPort: 3002,
    gatewayPort: 8443,
    nzbDavPort: 3000,
    usenetUltimatePort: 1337,
    usenetUltimateDir: '~/usenet-ultimate',
    dockerNetworkName: 'existing_nzbdav_network',
    domainMode: 'sslip',
    customDomain: '',
    duckDnsToken: '',
    tailscaleEnabled: false,
    tailscaleMode: 'subnet_router',
    tailscaleSubnet: '192.168.4.0/24',
    tailscaleAuthKey: '',
    usenetProviderHost: 'news.usenetserver.com',
    usenetProviderPort: 563,
    useSslNntp: true,
  });

  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([]);
  const [hostName, setHostName] = useState<string>('ubuntu-laptop');

  // Discover network interfaces from server
  useEffect(() => {
    async function loadNetwork() {
      try {
        const res = await fetch('/api/system/network');
        if (res.ok) {
          const data = await res.json();
          if (data.interfaces) {
            setInterfaces(data.interfaces);
          }
          if (data.suggestedLanIp && config.serverIp === '192.168.1.150') {
            setConfig((prev) => ({
              ...prev,
              serverIp: data.suggestedLanIp,
              tailscaleSubnet: data.suggestedLanIp.replace(/\.\d+$/, '.0/24'),
            }));
          }
          if (data.hostname) {
            setHostName(data.hostname);
          }
        }
      } catch (err) {
        console.warn('Could not auto-fetch server network interfaces', err);
      }
    }
    loadNetwork();
  }, []);

  const resolvedDomain = getResolvedDomain(config);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white font-black text-sm tracking-wider">
              TS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  TS-Skipper
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
                  Tailscale Skipper
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800">
                  Port :{config.guiPort}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800 hidden md:inline-block">
                  nzbdav on :3000
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Stream Usenet on Apple TV & Stremio without installing Tailscale on every device
              </p>
            </div>
          </div>

          {/* Live Host & Status Pill */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Host:</span>
              <span className="text-white font-mono font-medium">{hostName}</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-mono">{config.serverIp}</span>
            </div>

            <a
              href="https://github.com/ReyesPascal/TS-Skipper"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">ReyesPascal/TS-Skipper</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Navigation Sub-Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar">
            <button
              onClick={() => setActiveView('autopatch')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeView === 'autopatch'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span className="text-amber-300">⚡</span>
              Auto-Configure UU_BASE_URL
            </button>

            <button
              onClick={() => setActiveView('apps')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeView === 'apps'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Usenet Apps Guide
            </button>

            <button
              onClick={() => setActiveView('manifest')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeView === 'manifest'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Manifest URL & Apple ATS
            </button>

            <button
              onClick={() => setActiveView('topology')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeView === 'topology'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Network className="w-4 h-4" />
              Why It Works (Topology)
            </button>

            <button
              onClick={() => setActiveView('deploy')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeView === 'deploy'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4" />
              1-Command Install & GitHub
            </button>

            <button
              onClick={() => setActiveView('tailscale')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeView === 'tailscale'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-4 h-4" />
              Optional Remote Tailscale
              {config.tailscaleEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeView === 'autopatch' && (
          <div className="space-y-6">
            <AutoPatcher config={config} onChangeConfig={setConfig} />
            <UsenetAppsGuide config={config} />
          </div>
        )}

        {activeView === 'apps' && (
          <div className="space-y-6">
            <AutoPatcher config={config} onChangeConfig={setConfig} />
            <UsenetAppsGuide config={config} />
            <ManifestGenerator config={config} onChangeConfig={setConfig} />
          </div>
        )}

        {activeView === 'manifest' && (
          <div className="space-y-6">
            <AutoPatcher config={config} onChangeConfig={setConfig} />
            <ManifestGenerator config={config} onChangeConfig={setConfig} />
            <UsenetAppsGuide config={config} />
          </div>
        )}

        {activeView === 'topology' && (
          <div className="space-y-6">
            <NetworkTopology config={config} />
            <UsenetAppsGuide config={config} />
          </div>
        )}

        {activeView === 'deploy' && (
          <DeploymentHub config={config} />
        )}

        {activeView === 'tailscale' && (
          <TailscaleManager config={config} onChangeConfig={setConfig} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">TS-Skipper</span>
            <span>•</span>
            <a 
              href="https://github.com/ReyesPascal/TS-Skipper" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-purple-400 transition-colors"
            >
              github.com/ReyesPascal/TS-Skipper
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span>Localhost GUI: http://localhost:{config.guiPort}</span>
            <span>•</span>
            <span className="text-emerald-400">Zero Tailscale on Clients</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
