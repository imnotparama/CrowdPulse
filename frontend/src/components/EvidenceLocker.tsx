import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Film, Download, FileVideo, Shield, Lock, Unlock, Play } from 'lucide-react';
import { getApiBase } from '../config';

interface EvidenceLockerProps {
  lockerOpen: boolean;
  setLockerOpen: (open: boolean) => void;
  recordings: string[];
  selectedVideo: string | null;
  setSelectedVideo: (video: string | null) => void;
}

const EvidenceLocker: React.FC<EvidenceLockerProps> = ({
  lockerOpen,
  setLockerOpen,
  recordings,
  selectedVideo,
  setSelectedVideo,
}) => {
  const formatName = (filename: string) => {
    // evidence_20260227-154026.webm -> 2026-02-27 15:40:26
    const match = filename.match(/evidence_(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
    }
    return filename;
  };

  const [decryptProgress, setDecryptProgress] = React.useState(0);
  const [isDecrypted, setIsDecrypted] = React.useState(false);
  const holdTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
    };
  }, []);

  const handleSelect = (rec: string) => {
    setSelectedVideo(rec);
    setIsDecrypted(false);
    setDecryptProgress(0);
  };

  const startDecrypt = () => {
    if (isDecrypted) return;
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = setInterval(() => {
      setDecryptProgress((prev: number) => {
        if (prev >= 100) {
          clearInterval(holdTimer.current!);
          setIsDecrypted(true);
          return 100;
        }
        return prev + 5; // ~1 second total to decrypt
      });
    }, 50);
  };

  const stopDecrypt = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    if (!isDecrypted) {
      holdTimer.current = setInterval(() => {
        setDecryptProgress((prev: number) => {
          if (prev <= 0) {
            clearInterval(holdTimer.current!);
            return 0;
          }
          return prev - 3;
        });
      }, 50);
    }
  };

  return (
    <AnimatePresence>
      {lockerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8"
          onClick={() => setLockerOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.94, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 15 }}
            className="card-level-1 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden bg-[#121216] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,224,255,0.2)]">
                  <Shield size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-['Space_Grotesk'] font-bold text-white tracking-wide">
                    SECURE EVIDENCE VAULT
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-400">
                    256-BIT ENCRYPTED • {recordings.length} CAPTURED FOOTAGE
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLockerOpen(false)}
                className="btn-icon-soc hover:text-white"
                title="Close Vault"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-[320px]">
              {selectedVideo ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>←</span> BACK TO EVIDENCE LOG
                  </button>

                  {!isDecrypted ? (
                    <div className="w-full aspect-video rounded-xl border border-red-500/30 bg-black/80 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
                      <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-3 animate-pulse">
                        <Lock size={36} />
                      </div>
                      <h3 className="text-base font-['Space_Grotesk'] font-bold tracking-wider text-red-400 mb-1">
                        RESTRICTED EVIDENCE FOOTAGE
                      </h3>
                      <p className="text-xs font-mono text-zinc-400 mb-5">
                        Cryptographic Verification Required
                      </p>

                      <button
                        onMouseDown={startDecrypt}
                        onMouseUp={stopDecrypt}
                        onMouseLeave={stopDecrypt}
                        onTouchStart={startDecrypt}
                        onTouchEnd={stopDecrypt}
                        className="relative overflow-hidden px-8 py-3 rounded-xl border border-cyan-400/50 bg-cyan-500/10 text-cyan-300 font-mono text-xs tracking-wider font-bold hover:bg-cyan-500/20 transition-all select-none shadow-[0_0_20px_rgba(0,224,255,0.15)]"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Unlock size={14} /> HOLD TO AUTHORIZE DECRYPTION
                        </span>
                        {/* Progress Fill */}
                        <div
                          className="absolute inset-0 bg-cyan-400/30 -z-0 transition-all duration-75"
                          style={{ width: `${decryptProgress}%` }}
                        />
                      </button>

                      {/* Decryption Progress Bar */}
                      <div className="absolute bottom-6 w-2/3 max-w-[280px] h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-75"
                          style={{ width: `${decryptProgress}%` }}
                        />
                      </div>
                      {decryptProgress > 0 && (
                        <span className="absolute bottom-2 text-[10px] font-mono text-cyan-400 font-bold">
                          {decryptProgress}% DECRYPTING
                        </span>
                      )}
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                        <video
                          src={`${getApiBase()}/recordings/${selectedVideo}`}
                          controls
                          autoPlay
                          className="w-full aspect-video"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div>
                          <div className="text-xs font-semibold text-white font-['Space_Grotesk']">
                            {formatName(selectedVideo)}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500">{selectedVideo}</div>
                        </div>
                        <a
                          href={`${getApiBase()}/recordings/${selectedVideo}`}
                          download
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
                        >
                          <Download size={12} /> EXPORT FOOTAGE
                        </a>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {recordings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
                      <Film size={36} className="text-zinc-600" />
                      <p className="text-sm font-['Space_Grotesk'] font-medium text-zinc-400">
                        No recorded evidence sessions
                      </p>
                      <p className="text-xs font-mono text-zinc-600">
                        Use the REC button on the live camera toolbar to capture security footage
                      </p>
                    </div>
                  ) : (
                    recordings.map((rec, i) => (
                      <motion.div
                        key={rec}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => handleSelect(rec)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/40 hover:bg-cyan-500/[0.03] cursor-pointer transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:border-cyan-400/50 group-hover:bg-cyan-500/10 transition-colors">
                          <FileVideo size={18} className="text-zinc-400 group-hover:text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-zinc-200 group-hover:text-white font-['Space_Grotesk']">
                            {formatName(rec)}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 truncate">{rec}</div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 group-hover:text-cyan-400 transition-colors">
                          <Play size={10} /> REVIEW →
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EvidenceLocker;
