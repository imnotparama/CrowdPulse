import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Wifi,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ArrowRight,
} from 'lucide-react';

interface PhoneCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectSuccess?: (url: string) => void;
  currentStreamUrl?: string | null;
}

export const PhoneCameraModal: React.FC<PhoneCameraModalProps> = ({
  isOpen,
  onClose,
  onConnectSuccess,
  currentStreamUrl,
}) => {
  const [url, setUrl] = useState(currentStreamUrl || 'http://192.168.1.15:8080/video');
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'idle' | 'success' | 'error';
    text: string;
  }>({
    type: currentStreamUrl ? 'success' : 'idle',
    text: currentStreamUrl ? `Active stream: ${currentStreamUrl}` : '',
  });

  if (!isOpen) return null;

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsConnecting(true);
    setStatusMessage({ type: 'idle', text: '' });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/phone/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: '✅ Phone camera connected! Real-time AI pipeline is now analyzing your phone stream.',
        });
        if (onConnectSuccess) {
          onConnectSuccess(data.stream_url || url);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.detail || 'Failed to connect. Check Wi-Fi and stream URL.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Backend offline or connection timed out. Ensure the backend is running.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQuickUrl = (sample: string) => {
    setUrl(sample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#141417] border border-white/[0.1] rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-zinc-100 animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Smartphone size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Connect Phone Camera
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Edge Node
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Stream real-time wireless video from your Android or iOS smartphone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex items-center gap-2 bg-[#1C1C21] p-1 rounded-2xl border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              platform === 'android'
                ? 'bg-[#141417] text-white shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🤖 Android (IP Webcam)
          </button>
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              platform === 'ios'
                ? 'bg-[#141417] text-white shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🍎 iPhone / iOS (IP Camera Lite)
          </button>
        </div>

        {/* Step-by-Step Instructions Card */}
        <div className="bg-[#1C1C21]/60 border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-zinc-300 font-medium">
            <Info size={14} className="text-cyan-400" />
            <span>How to Connect in 30 Seconds:</span>
          </div>

          <ol className="space-y-2 text-zinc-400 pl-4 list-decimal marker:text-cyan-400 text-[11px] leading-relaxed">
            {platform === 'android' ? (
              <>
                <li>
                  Install <strong className="text-white">IP Webcam</strong> (free on Google Play Store) or DroidCam.
                </li>
                <li>
                  Connect your phone to the <strong className="text-white">same Wi-Fi network</strong> as your PC.
                </li>
                <li>
                  Open IP Webcam, scroll to the bottom, and tap <strong className="text-emerald-400">"Start server"</strong>.
                </li>
                <li>
                  Copy the IPv4 URL shown on your phone screen (e.g. <code className="text-cyan-300 bg-white/[0.05] px-1 py-0.5 rounded">http://192.168.1.X:8080/video</code>).
                </li>
              </>
            ) : (
              <>
                <li>
                  Install <strong className="text-white">IP Camera Lite</strong> or <strong className="text-white">Iriun Webcam</strong> from the iOS App Store.
                </li>
                <li>
                  Connect your iPhone to the <strong className="text-white">same Wi-Fi network</strong> as your PC.
                </li>
                <li>
                  Open the app and tap <strong className="text-emerald-400">"Turn On" / "Start"</strong> to broadcast.
                </li>
                <li>
                  Enter the URL shown in the app below (e.g. <code className="text-cyan-300 bg-white/[0.05] px-1 py-0.5 rounded">http://192.168.1.X:8081/video</code>).
                </li>
              </>
            )}
          </ol>
        </div>

        {/* Connect Form */}
        <form onSubmit={handleConnect} className="flex flex-col gap-3">
          <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
            <span>Phone Stream URL:</span>
            <span className="text-[10px] text-zinc-500 font-mono">Format: http://[PHONE_IP]:8080/video</span>
          </label>

          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-zinc-500 pointer-events-none">
              <Radio size={16} />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={platform === 'android' ? 'http://192.168.1.15:8080/video' : 'http://192.168.1.15:8081/video'}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0B0B0D] border border-white/[0.1] rounded-2xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="text-[10px] text-zinc-500">Quick URL:</span>
            <button
              type="button"
              onClick={() => handleQuickUrl('http://192.168.1.100:8080/video')}
              className="px-2 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-md font-mono text-zinc-300 border border-white/[0.04] transition-colors"
            >
              192.168.1.100:8080
            </button>
            <button
              type="button"
              onClick={() => handleQuickUrl('http://192.168.0.100:8080/video')}
              className="px-2 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-md font-mono text-zinc-300 border border-white/[0.04] transition-colors"
            >
              192.168.0.100:8080
            </button>
            <button
              type="button"
              onClick={() => handleQuickUrl('http://10.85.22.197:8080/video')}
              className="px-2 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-md font-mono text-zinc-300 border border-white/[0.04] transition-colors"
            >
              Prior Campus IP
            </button>
          </div>

          {/* Status Alert Banner */}
          {statusMessage.text && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 border animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-red-950/40 border-red-500/30 text-red-300'
                  : 'bg-zinc-900 border-white/10 text-zinc-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              ) : (
                <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting || !url.trim()}
              className="px-5 py-2 rounded-2xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Connecting to Phone...</span>
                </>
              ) : (
                <>
                  <Wifi size={14} />
                  <span>Connect Camera</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PhoneCameraModal;
