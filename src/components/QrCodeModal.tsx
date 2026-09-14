import React, { useEffect, useRef } from 'react';
import { X, Smartphone, Check, Copy } from 'lucide-react';

interface QrCodeModalProps {
  url: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate QR code using public reliable canvas API or standard SVG
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}&bgcolor=0f172a&color=38bdf8&margin=1`;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Scan to Install in Stremio</h3>
          <p className="text-xs text-slate-400 mt-1">
            Point your iPhone, iPad, or Android camera at the code below to open the manifest directly.
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="mt-6 flex justify-center">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl shadow-inner">
            <img 
              src={qrApiUrl} 
              alt="Stremio Manifest QR Code" 
              className="w-56 h-56 rounded-lg object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* URL Display and Copy */}
        <div className="mt-6">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
            Manifest URL
          </label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <code className="text-xs text-cyan-300 font-mono truncate flex-1 select-all">
              {url}
            </code>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
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

        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500">
            Make sure your mobile device is connected to the same Wi-Fi network.
          </p>
        </div>
      </div>
    </div>
  );
};
