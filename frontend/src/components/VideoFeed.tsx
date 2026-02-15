import React, { useState, useRef } from 'react';
import { Video, Eye, Volume2, VolumeX, MousePointer2, Compass } from 'lucide-react';

interface SectorData {
    name: string;
    count: number;
    status: string;
}

interface VideoFeedProps {
    image: string | null;
    isRecording: boolean;
    visionMode: string;
    soundEnabled: boolean;
    flowDirection?: { angle: number, label: string };
    sectors?: SectorData[];
    onToggleRecord: () => void;
    onToggleVision: () => void;
    onToggleSound: () => void;
    onSetGeofence: (points: {x: number, y: number}[]) => void;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ 
    image, isRecording, visionMode, soundEnabled, flowDirection, sectors,
    onToggleRecord, onToggleVision, onToggleSound, onSetGeofence 
}) => {
    const [drawingMode, setDrawingMode] = useState(false);
    const [points, setPoints] = useState<{x: number, y: number}[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleClick = (e: React.MouseEvent) => {
        if (!drawingMode || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        const newPoints = [...points, {x, y}];
        setPoints(newPoints);
        
        if (newPoints.length >= 4) {
             onSetGeofence(newPoints);
             setDrawingMode(false);
             setTimeout(() => setPoints([]), 2000);
        }
    };

    const getSectorColor = (status: string) => {
        switch(status) {
            case 'CRITICAL': return 'bg-red-500/20 border-red-500/60 text-red-400';
            case 'WARNING': return 'bg-orange-500/15 border-orange-500/50 text-orange-400';
            case 'ELEVATED': return 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400';
            default: return 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400';
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`card flex-1 min-h-0 p-0 border-amd-red/30 relative group ${isRecording ? 'border-amd-red shadow-[0_0_20px_#ed1c24]' : ''}`}
            onClick={handleClick}
        >
              {/* Feed Header Overlay */}
              <div className="absolute top-3 left-3 z-20 flex gap-2 pointer-events-none">
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-2 ${isRecording ? 'bg-amd-red text-white animate-pulse' : 'bg-amd-red/80 text-black'}`}>
                    {isRecording ? <div className="w-2 h-2 bg-white rounded-full"></div> : null}
                    {isRecording ? 'REC' : 'LIVE'}
                 </span>
                 <span className="bg-black/80 border border-white/20 text-white text-[10px] font-mono px-2 py-0.5 rounded-sm flex items-center gap-2">
                   CAM_01 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                 </span>
              </div>

              {/* Flow Direction Indicator */}
              {flowDirection && flowDirection.label !== 'STABLE' && (
                  <div className="absolute top-3 right-3 z-20 pointer-events-none">
                      <div className="bg-black/80 border border-neon-blue/40 px-2 py-1 flex items-center gap-2 rounded-sm">
                          <Compass size={12} className="text-neon-blue" />
                          <span className="text-[9px] font-mono text-neon-blue">FLOW: {flowDirection.label}</span>
                          <div 
                              className="w-3 h-3 text-neon-blue transition-transform duration-500"
                              style={{ transform: `rotate(${flowDirection.angle}deg)` }}
                          >
                              ↑
                          </div>
                      </div>
                  </div>
              )}

               {/* Video Area */}
               <div className="w-full h-full bg-black relative overflow-hidden flex items-center justify-center">
                 {image ? (
                   <>
                     <img 
                       src={`data:image/jpeg;base64,${image}`} 
                       alt="Live Feed" 
                       className={`w-full h-full object-contain ${visionMode === 'THERMAL' ? 'contrast-125 saturate-150' : ''}`}
                     />
                     <div className="scanline"></div>
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center gap-4 opacity-50">
                      <div className="w-16 h-16 border-2 border-amd-red rounded-full border-t-transparent animate-spin"></div>
                      <span className="font-mono text-xs tracking-widest text-amd-red animate-pulse">SEARCHING_SIGNAL...</span>
                   </div>
                 )}

                 {/* Sector Grid Overlay */}
                 {sectors && image && (
                     <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none z-10">
                         {sectors.map((sector, i) => (
                             <div key={i} className={`border border-white/5 flex items-start justify-start p-1.5 ${sector.status !== 'SAFE' ? getSectorColor(sector.status) : ''}`}>
                                 <div className={`text-[8px] font-mono px-1 py-0.5 rounded-sm bg-black/60 border ${
                                     sector.status === 'CRITICAL' ? 'border-red-500/50 text-red-400' :
                                     sector.status === 'WARNING' ? 'border-orange-500/40 text-orange-400' :
                                     sector.status === 'ELEVATED' ? 'border-yellow-500/30 text-yellow-400' :
                                     'border-white/10 text-white/40'
                                 }`}>
                                     {sector.name}: {sector.count}
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}

                 {/* Geofence Overlay */}
                 {points.length > 0 && (
                     <svg className="absolute inset-0 w-full h-full pointer-events-none">
                         <polygon 
                            points={points.map(p => `${p.x * 100}% ${p.y * 100}%`).join(', ')}
                            fill="rgba(237, 28, 36, 0.2)"
                            stroke="#ED1C24"
                            strokeWidth="2"
                            strokeDasharray="4"
                         />
                     </svg>
                 )}

                 {/* HUD Overlays */}
                 <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/10"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-amd-red"></div>
                    
                    <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-amd-red/20 rounded-tl-lg"></div>
                    <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-amd-red/20 rounded-tr-lg"></div>
                    <div className="absolute bottom-12 left-6 w-12 h-12 border-b-2 border-l-2 border-amd-red/20 rounded-bl-lg"></div>
                    <div className="absolute bottom-12 right-6 w-12 h-12 border-b-2 border-r-2 border-amd-red/20 rounded-br-lg"></div>
                 </div>
               </div>

               {/* Bottom Control Bar */}
               <div className="absolute bottom-0 left-0 w-full bg-black/80 backdrop-blur border-t border-white/10 p-1.5 flex justify-between items-center z-20">
                  <div className="flex gap-1.5">
                    <button 
                         onClick={onToggleVision}
                         className={`btn-cyber !px-2 !py-1 text-[9px] flex items-center gap-1.5 ${visionMode === 'THERMAL' ? 'bg-amd-red text-white' : ''}`}
                    >
                         <Eye size={10}/> {visionMode === 'THERMAL' ? 'THERMAL' : 'OPTICAL'}
                    </button>
                    <button 
                        onClick={onToggleSound}
                        className="btn-cyber !px-2 !py-1 text-[9px] flex items-center gap-1.5"
                    >
                        {soundEnabled ? <Volume2 size={10}/> : <VolumeX size={10}/>} AUDIO
                    </button>
                    <button 
                         onClick={() => {
                             setDrawingMode(!drawingMode);
                             setPoints([]);
                         }}
                         className={`btn-cyber !px-2 !py-1 text-[9px] flex items-center gap-1.5 ${drawingMode ? 'bg-neon-blue text-black' : ''}`}
                    >
                         <MousePointer2 size={10}/> {drawingMode ? 'DRAWING...' : 'SET ZONE'}
                    </button>
                    <button 
                        onClick={onToggleRecord}
                        className={`btn-cyber !px-2 !py-1 text-[9px] flex items-center gap-1.5 ${isRecording ? 'bg-amd-red text-white animate-pulse' : ''}`}
                    >
                        <Video size={10}/> {isRecording ? 'STOP REC' : 'RECORD'}
                    </button>
                  </div>
                  <div className="font-mono text-[9px] text-amd-silver/60 hidden md:block">
                     RES: 1080p | FPS: 30 | LATENCY: 24ms
                  </div>
               </div>
        </div>
    );
};

export default VideoFeed;
