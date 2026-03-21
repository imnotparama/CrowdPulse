import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Film, Download, FileVideo, Shield, Trash2 } from 'lucide-react';

interface EvidenceLockerProps {
    lockerOpen: boolean;
    setLockerOpen: (open: boolean) => void;
    recordings: string[];
    selectedVideo: string | null;
    setSelectedVideo: (video: string | null) => void;
}

const EvidenceLocker: React.FC<EvidenceLockerProps> = ({ lockerOpen, setLockerOpen, recordings, selectedVideo, setSelectedVideo }) => {
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
        return () => { if (holdTimer.current) clearInterval(holdTimer.current); };
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
                 return prev + 4; // 1.25 seconds total to decrypt
             });
         }, 50);
    };

    const stopDecrypt = () => {
         if (holdTimer.current) clearInterval(holdTimer.current);
         // Slowly drain progress if they let go
         if (!isDecrypted) {
             holdTimer.current = setInterval(() => {
                 setDecryptProgress((prev: number) => {
                     if (prev <= 0) {
                         clearInterval(holdTimer.current!);
                         return 0;
                     }
                     return prev - 2;
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
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
                    onClick={() => setLockerOpen(false)}
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-amd-dark border border-amd-red/50 max-w-3xl w-full max-h-[80vh] flex flex-col shadow-[0_0_40px_rgba(237,28,36,0.15)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-amd-red/10 border border-amd-red/30 flex items-center justify-center">
                                    <Shield size={16} className="text-amd-red" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-mono font-bold text-white tracking-wider">EVIDENCE LOCKER</h2>
                                    <p className="text-[9px] font-mono text-amd-silver/50">ENCRYPTED • {recordings.length} FILES</p>
                                </div>
                            </div>
                            <button onClick={() => setLockerOpen(false)} className="text-amd-silver hover:text-white p-1 hover:bg-white/5 transition-colors">
                                <X size={18}/>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 relative min-h-[300px]">
                            {selectedVideo ? (
                                <div className="space-y-3">
                                    <button onClick={() => setSelectedVideo(null)} className="text-[10px] font-mono text-amd-red hover:text-white transition-colors">
                                        ← BACK TO LIST
                                    </button>
                                    
                                    {!isDecrypted ? (
                                        <div className="w-full aspect-video border border-amd-red/40 bg-black/90 flex flex-col items-center justify-center relative overflow-hidden group">
                                             <div className="absolute inset-0 scanlines opacity-50 pointer-events-none" />
                                             <Shield size={48} className="text-amd-red mb-4 animate-pulse" />
                                             <h3 className="text-amd-red font-mono font-bold tracking-widest mb-1">ENCRYPTED FILE</h3>
                                             <p className="text-[10px] font-mono text-amd-silver/70 mb-6">Security Clearance Required</p>
                                             
                                             <button 
                                                 onMouseDown={startDecrypt}
                                                 onMouseUp={stopDecrypt}
                                                 onMouseLeave={stopDecrypt}
                                                 onTouchStart={startDecrypt}
                                                 onTouchEnd={stopDecrypt}
                                                 className="relative overflow-hidden px-8 py-3 border-2 border-amd-red text-amd-red font-mono text-sm tracking-widest font-bold hover:bg-amd-red/10 transition-colors select-none"
                                             >
                                                 <span className="relative z-10">HOLD TO DECRYPT</span>
                                                 {/* Progress fill */}
                                                 <div 
                                                     className="absolute inset-0 bg-amd-red/30 -z-0"
                                                     style={{ width: `${decryptProgress}%`, transition: 'width 50ms linear' }}
                                                 />
                                             </button>
                                             
                                             {/* Loading Bar at bottom */}
                                             <div className="absolute bottom-6 w-3/4 max-w-[300px] h-1 bg-white/10">
                                                 <div className="h-full bg-amd-red transition-all duration-75" style={{ width: `${decryptProgress}%` }} />
                                             </div>
                                             {decryptProgress > 0 && <span className="absolute bottom-2 text-[9px] font-mono text-amd-red">{decryptProgress}% DECRYPTED</span>}
                                        </div>
                                    ) : (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                            <video 
                                                src={`http://127.0.0.1:8000/recordings/${selectedVideo}`}
                                                controls 
                                                autoPlay 
                                                className="w-full border border-white/10"
                                            />
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono text-amd-silver">{formatName(selectedVideo)}</span>
                                                <a 
                                                    href={`http://127.0.0.1:8000/recordings/${selectedVideo}`}
                                                    download
                                                    className="btn-cyber !px-3 !py-1 text-[9px] flex items-center gap-1.5"
                                                >
                                                    <Download size={10}/> EXPORT
                                                </a>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {recordings.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
                                            <Film size={32} className="text-amd-silver" />
                                            <p className="text-xs font-mono text-amd-silver">No recordings yet</p>
                                            <p className="text-[9px] font-mono text-amd-silver/50">Use the RECORD button on the video feed to capture evidence</p>
                                        </div>
                                    ) : (
                                        recordings.map((rec, i) => (
                                            <motion.div
                                                key={rec}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => setSelectedVideo(rec)}
                                                className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 hover:border-amd-red/30 hover:bg-amd-red/5 cursor-pointer transition-all group"
                                            >
                                                <div className="w-10 h-10 bg-amd-gray border border-white/10 flex items-center justify-center group-hover:border-amd-red/40 transition-colors">
                                                    <FileVideo size={16} className="text-amd-red" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-mono text-white">{formatName(rec)}</div>
                                                    <div className="text-[9px] font-mono text-amd-silver/50">{rec}</div>
                                                </div>
                                                <div className="text-[9px] font-mono text-amd-silver/40 group-hover:text-amd-red transition-colors">
                                                    PLAY →
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
