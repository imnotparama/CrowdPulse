import React from 'react';
import { Film, Video, X } from 'lucide-react';

interface EvidenceLockerProps {
    lockerOpen: boolean;
    setLockerOpen: (open: boolean) => void;
    recordings: string[];
    selectedVideo: string | null;
    setSelectedVideo: (v: string | null) => void;
}

const EvidenceLocker: React.FC<EvidenceLockerProps> = ({
    lockerOpen,
    setLockerOpen,
    recordings,
    selectedVideo,
    setSelectedVideo,
}) => {
    if (!lockerOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-12">
            <div className="w-full h-full border border-amd-red/50 bg-black/50 p-6 flex flex-col relative card shadow-2xl">
                <button onClick={() => setLockerOpen(false)} className="absolute top-4 right-4 text-amd-silver hover:text-white">
                    <X size={24}/>
                </button>
                
                <h2 className="text-2xl font-mono text-white mb-6 flex items-center gap-3">
                    <Film className="text-amd-red"/> EVIDENCE LOCKER
                </h2>
                
                <div className="flex flex-1 gap-6 min-h-0">
                     <div className="w-1/3 border-r border-white/10 pr-4 overflow-y-auto">
                          <h3 className="text-xs font-mono text-amd-silver mb-4 uppercase tracking-widest">Encrypted Files</h3>
                          {recordings.length === 0 ? (
                              <div className="text-amd-silver/50 text-sm font-mono italic">No recordings found.</div>
                          ) : (
                              <div className="space-y-2">
                                  {recordings.map((rec, i) => (
                                      <div 
                                        key={i} 
                                        onClick={() => setSelectedVideo(rec)}
                                        className={`p-3 border ${selectedVideo === rec ? 'border-amd-red bg-amd-red/10 text-white' : 'border-white/10 text-amd-silver hover:bg-white/5'} cursor-pointer transition-all font-mono text-xs`}
                                      >
                                          <div className="flex items-center gap-2">
                                              <Video size={14}/>
                                              <span>{rec}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                     </div>

                     <div className="flex-1 flex flex-col items-center justify-center bg-black/50 border border-white/5 p-4 rounded-sm">
                          {selectedVideo ? (
                              <div className="w-full h-full flex flex-col gap-4">
                                  <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden border border-amd-red/20 group">
                                      <video 
                                          id="evidence-video"
                                          src={`http://127.0.0.1:8000/recordings/${selectedVideo}`} 
                                          controls
                                          autoPlay 
                                          className="max-w-full max-h-full"
                                      />
                                  </div>
                                  <div className="text-center font-mono text-xs text-amd-silver flex flex-col gap-1">
                                      <div>PLAYING: <span className="text-white">{selectedVideo}</span></div>
                                  </div>
                              </div>
                          ) : (
                              <div className="text-amd-silver/30 font-mono flex flex-col items-center gap-4">
                                  <Film size={48}/>
                                  <span>SELECT FOOTAGE TO REVIEW</span>
                              </div>
                          )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default EvidenceLocker;
