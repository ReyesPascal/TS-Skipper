import React, { useState } from 'react';
import { 
  Tv, 
  Layers, 
  HardDrive, 
  PlaySquare, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  ShieldCheck, 
  HelpCircle,
  AlertCircle,
  Cpu,
  Radio,
  Server
} from 'lucide-react';
import { GatewayConfig } from '../types';
import { getAppConfigGuides, getManifestUrl, getResolvedDomain } from '../lib/templates';
import { QrCodeModal } from './QrCodeModal';

interface UsenetAppsGuideProps {
  config: GatewayConfig;
}

export const UsenetAppsGuide: React.FC<UsenetAppsGuideProps> = ({ config }) => {
  const guides = getAppConfigGuides(config);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<boolean>(false);

  const activeGuide = guides[activeTab] || guides[0];
  const manifestUrl = getManifestUrl(config);
  const domain = getResolvedDomain(config);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">
              App Configuration Matrix (Customized for Your Setup)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Exact settings, ports, and environment variables detected from your active Docker Compose files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQr(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Scan Manifest QR</span>
          </button>
        </div>
      </div>

      {/* Port Allocation Callout Banner - Pure Usenet Focus */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-mono">GUI Dashboard</span>
          <span className="text-sm font-bold text-cyan-400 font-mono">:{config.guiPort}</span>
          <span className="text-[10px] text-emerald-400 block font-sans mt-0.5">Active</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-mono">nzbdav (WebDAV)</span>
          <span className="text-sm font-bold text-indigo-400 font-mono">:{config.nzbDavPort}</span>
          <span className="text-[10px] text-indigo-300 block font-sans mt-0.5">Preserved</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-mono">usenet-ultimate</span>
          <span className="text-sm font-bold text-purple-400 font-mono">:{config.usenetUltimatePort}</span>
          <span className="text-[10px] text-purple-300 block font-sans mt-0.5">Preserved</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-mono">Caddy Gateway</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">:{config.gatewayPort}</span>
          <span className="text-[10px] text-emerald-400 block font-sans mt-0.5">TLS / ATS Safe</span>
        </div>
      </div>

      {/* App Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-800/80">
        {guides.map((guide, idx) => {
          let IconComponent = Tv;
          if (guide.category === 'engine') IconComponent = HardDrive;
          if (guide.category === 'addon') IconComponent = Layers;
          if (guide.category === 'arr') IconComponent = Server;
          if (guide.appName.includes('Stremio')) IconComponent = PlaySquare;

          return (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === idx
                  ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{guide.appName.split('(')[0].trim()}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300">
                {guide.currentPort}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active App Details */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{activeGuide.appName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-normal uppercase bg-slate-800 text-cyan-400 border border-slate-700">
                {activeGuide.category}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeGuide.description}</p>
          </div>

          {activeTab === 0 && (
            <div className="flex items-center gap-2">
              <a
                href={manifestUrl.replace(/^https?:\/\//, 'stremio://')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Stremio</span>
              </a>
            </div>
          )}
        </div>

        {/* Fields List */}
        <div className="space-y-3">
          {activeGuide.fields.map((field, fIdx) => (
            <div
              key={fIdx}
              className={`p-3.5 rounded-xl border transition-all ${
                field.critical
                  ? 'bg-slate-900/90 border-cyan-500/30'
                  : 'bg-slate-900/50 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    {field.label}
                  </span>
                  {field.critical && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Key Setting
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleCopy(field.value, `${activeTab}-${fIdx}`)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1"
                  title="Copy value"
                >
                  {copiedKey === `${activeTab}-${fIdx}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="font-mono text-xs text-cyan-300 bg-slate-950 p-2 rounded-lg border border-slate-800 break-all select-all">
                {field.value}
              </div>

              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                {field.explanation}
              </p>
            </div>
          ))}
        </div>

        {/* Port Conflict Prevention Highlight */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero Interference With Your Existing Stack</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Your active <strong className="text-indigo-300">nzbdav</strong> on port <strong className="text-indigo-300">3000</strong> and <strong className="text-purple-300">usenet-ultimate</strong> on port <strong className="text-purple-300">1337</strong> are untouched. TS-Skipper’s web GUI runs cleanly on port <strong className="text-cyan-300">3002</strong> and bridges your traffic to HTTPS port <strong className="text-emerald-300">8443</strong> so Apple ATS never blocks your streams.
          </p>
        </div>
      </div>

      {showQr && (
        <QrCodeModal
          url={manifestUrl}
          domain={domain}
          port={config.gatewayPort}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
};
