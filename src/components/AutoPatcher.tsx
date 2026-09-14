import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  FolderOpen, 
  RefreshCw, 
  Server, 
  Tv, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import { GatewayConfig, PatchResult } from '../types';
import { getManifestUrl, getResolvedDomain } from '../lib/templates';

interface AutoPatcherProps {
  config: GatewayConfig;
  onChangeConfig: (newConfig: GatewayConfig) => void;
}

export const AutoPatcher: React.FC<AutoPatcherProps> = ({ config, onChangeConfig }) => {
  const [uuDir, setUuDir] = useState<string>('~/usenet-ultimate');
  const [patching, setPatching] = useState<boolean>(false);
  const [patchResult, setPatchResult] = useState<PatchResult | null>(null);
  const [detecting, setDetecting] = useState<boolean>(false);
  const [detectedStatus, setDetectedStatus] = useState<{ found: boolean; path?: string; currentBaseUrl?: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const domain = getResolvedDomain(config);
  const manifestUrl = getManifestUrl(config);
  const newBaseUrl = `https://${domain}:${config.gatewayPort}`;

  // Automatically check Usenet Ultimate directory on mount
  useEffect(() => {
    async function checkUu() {
      setDetecting(true);
      try {
        const res = await fetch('/api/system/detect-uu');
        if (res.ok) {
          const data = await res.json();
          setDetectedStatus(data);
          if (data.found && data.path) {
            setUuDir(data.path);
          }
        }
      } catch (err) {
        console.warn('Could not auto-detect usenet-ultimate folder', err);
      } finally {
        setDetecting(false);
      }
    }
    checkUu();
  }, []);

  const handleRunPatch = async () => {
    setPatching(true);
    setPatchResult(null);
    try {
      const res = await fetch('/api/system/patch-usenet-ultimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directoryPath: uuDir,
          newBaseUrl,
        }),
      });
      const data = await res.json();
      setPatchResult(data);
      if (data.success) {
        setDetectedStatus((prev) => (prev ? { ...prev, currentBaseUrl: newBaseUrl } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend patch service';
      setPatchResult({
        success: false,
        message: msg,
      });
    } finally {
      setPatching(false);
    }
  };

  const handleCopyManifest = () => {
    navigator.clipboard.writeText(manifestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">
              Automated Usenet Ultimate Gateway Configurator
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automatically routes your Usenet streams through TS-Skipper’s TLS proxy so Apple ATS never blocks video playback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            SAB / Prowlarr / Lidarr Ignored
          </span>
        </div>
      </div>

      {/* Auto-detected IP & Manifest Card */}
      <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">Automatically Detected Server IP</span>
          </div>
          <span className="text-xs font-mono text-cyan-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            {config.serverIp}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
            Your Exact Stremio Manifest URL (Ready for Apple TV & iPhone):
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-cyan-300 select-all break-all">
              {manifestUrl}
            </div>
            <button
              onClick={handleCopyManifest}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-cyan-500/20"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1-Click Auto Patch Action Box */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-indigo-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Auto-Update Usenet Ultimate UU_BASE_URL
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically writes <code className="text-cyan-300 font-mono">UU_BASE_URL={newBaseUrl}</code> to your compose directory.
              </p>
            </div>
          </div>

          {detectedStatus && (
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              detectedStatus.found 
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {detectedStatus.found ? 'Folder Detected' : 'Custom Path'}
            </span>
          )}
        </div>

        {/* Directory Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Usenet Ultimate Directory on Ubuntu:</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={uuDir}
              onChange={(e) => setUuDir(e.target.value)}
              placeholder="~/usenet-ultimate or /home/ryan/usenet-ultimate"
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none transition-colors"
            />
            <button
              onClick={handleRunPatch}
              disabled={patching}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 shrink-0"
            >
              {patching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Auto-Patch UU_BASE_URL</span>
            </button>
          </div>
        </div>

        {/* Current / Detected Base URL display */}
        {detectedStatus?.currentBaseUrl && (
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 pt-1">
            <span className="text-slate-500">Current in file:</span>
            <span className="text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {detectedStatus.currentBaseUrl}
            </span>
            <span className="text-slate-500">➔ Target:</span>
            <span className="text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {newBaseUrl}
            </span>
          </div>
        )}

        {/* Patch Result Notification */}
        {patchResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all animate-in fade-in ${
              patchResult.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            {patchResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">{patchResult.message}</p>
              {patchResult.filePath && (
                <p className="text-[11px] font-mono text-emerald-300/80">
                  Target File: {patchResult.filePath}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed space-y-1">
        <span className="text-slate-200 font-bold block flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Container Conflict Prevention
        </span>
        <p className="text-[11px]">
          TS-Skipper is intentionally isolated from your other media containers (<strong className="text-slate-300">SABnzbd</strong>, <strong className="text-slate-300">Prowlarr</strong>, and <strong className="text-slate-300">Lidarr</strong>). It exclusively bridges <strong className="text-indigo-300">NZB-DAV (port 3000)</strong> and <strong className="text-purple-300">Usenet Ultimate (port 1337)</strong> to <strong className="text-cyan-300">HTTPS port 8443</strong> so you will never encounter container name or port collision errors.
        </p>
      </div>
    </div>
  );
};
