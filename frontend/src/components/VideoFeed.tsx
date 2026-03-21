import React, { useState, useRef, useEffect } from 'react';
import { Video, Eye, Volume2, VolumeX, MousePointer2, Compass, Maximize2 } from 'lucide-react';

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
    const [fps, setFps] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const frameTimestamps = useRef<number[]>([]);
    const prevImageRef = useRef<string | null>(null);

    // Optimized frame rendering — directly update img.src without React re-render
    useEffect(() => {
        if (image && image !== prevImageRef.current) {
            prevImageRef.current = image;
            if (imgRef.current) {
                imgRef.current.src = `data:image/jpeg;base64,${image}`;
            }
            // FPS counter
            const now = performance.now();
            frameTimestamps.current.push(now);
            frameTimestamps.current = frameTimestamps.current.filter(t => now - t < 2000);
            const newFps = Math.round(frameTimestamps.current.length / 2);
            if (Math.abs(newFps - fps) > 1) { // Only re-render if FPS changed by >1
                setFps(newFps);
            }
        }
    }, [image]);

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

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
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
            className={`card flex-1 min-h-0 p-0 border-amd-red/30 relative group ${isRecording ? 'card-danger border-amd-red shadow-[0_0_20px_#ed1c24]' : ''}`}
            onClick={handleClick}
        >
              {/* Feed Header Overlay */}
              <div className="absolute top-3 left-3 z-20 flex gap-2 pointer-events-none">
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-2 ${isRecording ? 'bg-amd-red text-white animate-pulse-fast' : 'bg-amd-red/80 text-black'}`}>
                    {isRecording ? <div className="w-2 h-2 bg-white rounded-full"></div> : null}
                    {isRecording ? 'REC' : 'LIVE'}
                 </span>
                 <span className="bg-black/80 border border-white/20 text-white text-[10px] font-mono px-2 py-0.5 rounded-sm flex items-center gap-2">
                   CAM_01 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                 </span>
              </div>

              {/* Top-right: FPS + Flow + Fullscreen */}
              <div className="absolute top-3 right-3 z-20 flex gap-2 pointer-events-none">
                  {/* Real FPS Counter */}
                  <div className="bg-black/80 border border-white/20 px-2 py-0.5 rounded-sm pointer-events-auto">
                      <span className={`text-[9px] font-mono font-bold ${fps > 20 ? 'text-neon-green' : fps > 10 ? 'text-neon-amber' : 'text-red-400'}`}>
                          {fps} FPS
                      </span>
                  </div>

                  {/* Flow Direction */}
                  {flowDirection && flowDirection.label !== 'STABLE' && (
                      <div className="bg-black/80 border border-neon-blue/40 px-2 py-0.5 flex items-center gap-1.5 rounded-sm">
                          <Compass size={10} className="text-neon-blue" />
                          <span className="text-[9px] font-mono text-neon-blue">{flowDirection.label}</span>
                          <div 
                              className="text-[9px] text-neon-blue transition-transform duration-500"
                              style={{ transform: `rotate(${flowDirection.angle}deg)` }}
                          >
                              ↑
                          </div>
                      </div>
                  )}

                  {/* Fullscreen Toggle */}
                  <button 
                      onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} 
                      className="bg-black/80 border border-white/20 px-1.5 py-0.5 rounded-sm pointer-events-auto hover:bg-white/10 transition-colors"
                  >
                      <Maximize2 size={10} className="text-amd-silver" />
                  </button>
              </div>

               {/* Video Area */}
               <div className="w-full h-full bg-black relative overflow-hidden flex items-center justify-center">
                 {image ? (
                   <>
                     <img 
                       ref={imgRef}
                       alt="Live Feed" 
                       className={`w-full h-full object-contain ${visionMode === 'THERMAL' ? 'contrast-125 saturate-150' : ''}`}
                       style={{ imageRendering: 'auto' }}
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
                             <div key={i} className={`border border-white/5 flex items-start justify-start p-1.5 transition-colors duration-500 ${sector.status !== 'SAFE' ? getSectorColor(sector.status) : ''}`}>
                                 <div className={`text-[8px] font-mono px-1 py-0.5 rounded-sm bg-black/60 border transition-colors duration-500 ${
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
                            strokeDasharray="8 4"
                            className="animate-border-sweep"
                         />
                         {/* Point markers */}
                         {points.map((p, i) => (
                             <circle key={i} cx={`${p.x * 100}%`} cy={`${p.y * 100}%`} r="4" fill="#ED1C24" stroke="white" strokeWidth="1" />
                         ))}
                     </svg>
                 )}

                 {/* Animated Corner Brackets */}
                 <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/10"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-amd-red"></div>
                    
                    {/* Animated brackets that pulse on active feed */}
                    <div className={`absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 rounded-tl-lg transition-all duration-700 ${image ? 'border-amd-red/40' : 'border-amd-red/20'}`}></div>
                    <div className={`absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 rounded-tr-lg transition-all duration-700 ${image ? 'border-amd-red/40' : 'border-amd-red/20'}`}></div>
                    <div className={`absolute bottom-12 left-6 w-12 h-12 border-b-2 border-l-2 rounded-bl-lg transition-all duration-700 ${image ? 'border-amd-red/40' : 'border-amd-red/20'}`}></div>
                    <div className={`absolute bottom-12 right-6 w-12 h-12 border-b-2 border-r-2 rounded-br-lg transition-all duration-700 ${image ? 'border-amd-red/40' : 'border-amd-red/20'}`}></div>
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
                        className={`btn-cyber !px-2 !py-1 text-[9px] flex items-center gap-1.5 ${isRecording ? 'bg-amd-red text-white animate-pulse-fast' : ''}`}
                    >
                        <Video size={10}/> {isRecording ? 'STOP REC' : 'RECORD'}
                    </button>
                  </div>
                  <div className="font-mono text-[9px] text-amd-silver/60 hidden md:flex items-center gap-3">
                     <span>RES: 1080p</span>
                     <span className={fps > 20 ? 'text-neon-green' : fps > 10 ? 'text-neon-amber' : 'text-red-400'}>FPS: {fps}</span>
                     <span>LATENCY: 24ms</span>
                  </div>
               </div>
        </div>
    );
};

export default VideoFeed;
