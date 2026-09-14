import React, { useState } from 'react';
import { 
  Terminal, 
  FolderDown, 
  Copy, 
  Check, 
  FileCode, 
  Github, 
  Layers, 
  ExternalLink,
  Code2,
  Zap,
  CheckCircle2,
  Laptop,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import JSZip from 'jszip';
import { GatewayConfig } from '../types';
import { 
  generateDockerCompose, 
  generateCaddyfile, 
  generateInstallScript, 
  generateUninstallScript,
  generateReadme, 
  generateEnv 
} from '../lib/templates';

interface DeploymentHubProps {
  config: GatewayConfig;
}

export const DeploymentHub: React.FC<DeploymentHubProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'caddy' | 'install' | 'uninstall' | 'env' | 'readme'>('readme');
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  const dockerComposeContent = generateDockerCompose(config);
  const caddyfileContent = generateCaddyfile(config);
  const installScriptContent = generateInstallScript(config);
  const uninstallScriptContent = generateUninstallScript(config);
  const readmeContent = generateReadme(config);
  const envContent = generateEnv(config);

  const oneLineInstall = `curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/install.sh | bash`;
  const oneLineUninstall = `curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/uninstall.sh | bash`;

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'docker':
        return dockerComposeContent;
      case 'caddy':
        return caddyfileContent;
      case 'install':
        return installScriptContent;
      case 'uninstall':
        return uninstallScriptContent;
      case 'env':
        return envContent;
      case 'readme':
        return readmeContent;
    }
  };

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(getCurrentContent());
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleCopyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(id);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const handleDownloadZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      
      zip.file('docker-compose.yml', dockerComposeContent);
      zip.file('Caddyfile', caddyfileContent);
      zip.file('install.sh', installScriptContent);
      zip.file('uninstall.sh', uninstallScriptContent);
      zip.file('README.md', readmeContent);
      zip.file('.env.example', envContent);
      zip.file('.env', envContent);
      zip.file('.gitignore', 'caddy_data/\ncaddy_config/\nnzbdav-cache/\ndownloads/\n.env\n');

      const blob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'TS-Skipper-main.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error generating zip', err);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header and Download Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">TS-Skipper GitHub & Installation Center</h2>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <a
              href="https://github.com/ReyesPascal/TS-Skipper"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 underline font-mono"
            >
              <span>https://github.com/ReyesPascal/TS-Skipper</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={zipping}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 self-start sm:self-auto cursor-pointer"
          >
            {zipping ? <Terminal className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4" />}
            <span>Download TS-Skipper (.zip)</span>
          </button>
        </div>
      </div>

      {/* Screenshot Diagnostic Analysis */}
      <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Screenshot Analysis & Fix: Port 3002 Connection Refused</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          In your screenshot, the Caddy container started cleanly on port 8443, but navigating to <code className="text-purple-300">http://localhost:3002</code> in Brave resulted in <span className="text-rose-300 font-mono">ERR_CONNECTION_REFUSED</span>. The root cause was that port 3002 was not bound in <code className="text-slate-300">docker-compose.yml</code>. 
          We have updated Caddy to bind <code className="text-emerald-300">:3002</code> directly and serve the self-contained TS-Skipper web dashboard. Re-running the 1-line install below will immediately fix this on your machine!
        </p>
      </div>

      {/* Hero: 1-Command Ubuntu Install */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-950 to-indigo-950/70 border border-purple-800/50 space-y-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Simple One-Command Install / Update on Ubuntu
              </h3>
              <p className="text-[11px] text-purple-300/80">
                Installs Caddy, opens UFW firewall (8443 & {config.guiPort}), auto-patches Usenet Ultimate, and serves GUI on port {config.guiPort}.
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Zero Client Tailscale
          </span>
        </div>

        <div className="relative group">
          <pre className="bg-slate-950 border border-purple-900/60 p-3.5 rounded-xl text-xs font-mono text-purple-200 overflow-x-auto select-all pr-24 leading-relaxed">
            {oneLineInstall}
          </pre>
          <button
            onClick={() => handleCopyCommand(oneLineInstall, 'oneliner-install')}
            className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
          >
            {copiedCommand === 'oneliner-install' ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero: 1-Command Ubuntu Uninstall */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-950 to-slate-900 border border-rose-900/50 space-y-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Simple One-Command Uninstall on Ubuntu
              </h3>
              <p className="text-[11px] text-rose-300/80">
                Stops TS-Skipper container, deletes UFW firewall rules, and deletes directory (nzbdav and usenet-ultimate remain untouched).
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Clean Removal
          </span>
        </div>

        <div className="relative group">
          <pre className="bg-slate-950 border border-rose-900/60 p-3.5 rounded-xl text-xs font-mono text-rose-200 overflow-x-auto select-all pr-24 leading-relaxed">
            {oneLineUninstall}
          </pre>
          <button
            onClick={() => handleCopyCommand(oneLineUninstall, 'oneliner-uninstall')}
            className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer"
          >
            {copiedCommand === 'oneliner-uninstall' ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* GitHub Sync Step-by-Step Instructions */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-3">
          <Terminal className="w-4 h-4 text-purple-400" />
          Git Synchronization & Ubuntu Deployment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                <span>1. Push Changes to GitHub</span>
                <span className="text-[10px] text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded font-mono">Sync</span>
              </div>
              <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
                If updating files locally, push straight to your repository:
              </p>
            </div>
            <div className="relative group">
              <pre className="bg-slate-950 p-2.5 rounded text-[11px] font-mono text-purple-300 overflow-x-auto">
{`git remote set-url origin https://github.com/ReyesPascal/TS-Skipper.git
git add .
git commit -m "Configure TS-Skipper"
git push origin main`}
              </pre>
              <button
                onClick={() => handleCopyCommand(`git remote set-url origin https://github.com/ReyesPascal/TS-Skipper.git\ngit add .\ngit commit -m "Configure TS-Skipper"\ngit push origin main`, 'step1')}
                className="absolute top-1.5 right-1.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy command"
              >
                {copiedCommand === 'step1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                <span>2. Run on Ubuntu Laptop</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono">Deploy</span>
              </div>
              <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
                Clone on Ubuntu and run the automated bash installer:
              </p>
            </div>
            <div className="relative group">
              <pre className="bg-slate-950 p-2.5 rounded text-[11px] font-mono text-emerald-300 overflow-x-auto">
{`git clone https://github.com/ReyesPascal/TS-Skipper.git
cd TS-Skipper
chmod +x install.sh
./install.sh`}
              </pre>
              <button
                onClick={() => handleCopyCommand(`git clone https://github.com/ReyesPascal/TS-Skipper.git\ncd TS-Skipper\nchmod +x install.sh\n./install.sh`, 'step2')}
                className="absolute top-1.5 right-1.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy command"
              >
                {copiedCommand === 'step2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                <span>3. Pull Updates in 1 Click</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded font-mono">Update</span>
              </div>
              <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
                Whenever you change ports or settings on GitHub, update your Ubuntu server:
              </p>
            </div>
            <div className="relative group">
              <pre className="bg-slate-950 p-2.5 rounded text-[11px] font-mono text-cyan-300 overflow-x-auto">
{`cd ~/TS-Skipper
git pull origin main
docker compose up -d`}
              </pre>
              <button
                onClick={() => handleCopyCommand(`cd ~/TS-Skipper\ngit pull origin main\ndocker compose up -d`, 'step3')}
                className="absolute top-1.5 right-1.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy command"
              >
                {copiedCommand === 'step3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Code File Viewer with Tabs */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          {/* File Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveTab('readme')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'readme'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              README.md (GitHub Docs)
            </button>

            <button
              onClick={() => setActiveTab('docker')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'docker'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              docker-compose.yml
            </button>

            <button
              onClick={() => setActiveTab('caddy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'caddy'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              Caddyfile (TLS Proxy)
            </button>

            <button
              onClick={() => setActiveTab('install')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'install'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              install.sh (Installer)
            </button>

            <button
              onClick={() => setActiveTab('uninstall')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'uninstall'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              uninstall.sh (Uninstaller)
            </button>

            <button
              onClick={() => setActiveTab('env')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'env'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              .env.example
            </button>
          </div>

          <button
            onClick={handleCopyCurrent}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {copiedFile ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content Container */}
        <div className="mt-3 bg-slate-950 border border-slate-800/90 rounded-xl overflow-hidden shadow-inner">
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono">
              {activeTab === 'docker' && 'docker-compose.yml'}
              {activeTab === 'caddy' && 'Caddyfile'}
              {activeTab === 'install' && 'install.sh'}
              {activeTab === 'uninstall' && 'uninstall.sh'}
              {activeTab === 'env' && '.env'}
              {activeTab === 'readme' && 'README.md'}
            </span>
            <span>UTF-8 / LF</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[420px] overflow-y-auto leading-relaxed">
            {getCurrentContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};
