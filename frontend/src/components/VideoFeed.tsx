import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Eye,
  Volume2,
  VolumeX,
  MousePointer2,
  Compass,
  Maximize2,
  Minimize2,
  Flame,
  Layers
} from 'lucide-react';

interface SectorData {
  name: string;
  count: number;
  status: string;
}

interface VideoFeedProps {
  imageRef: React.RefObject<string | null>;
  isRecording: boolean;
  visionMode: string;
  activeCamera: string;
  soundEnabled: boolean;
  status: string;
  flowDirection?: { angle: number; label: string };
  sectors?: SectorData[];
  onToggleRecord: () => void;
  onToggleVision: () => void;
  onToggleSound: () => void;
  onSetGeofence: (points: { x: number; y: number }[]) => void;
  onSelectCamera?: (cam: string) => void;
}

const CAMERAS = [
  { id: 'Entrance', label: 'Entrance', status: 'optimal' },
  { id: 'Exit', label: 'Exit', status: 'optimal' },
  { id: 'Food Court', label: 'Food Court', status: 'optimal' },
  { id: 'Gate A', label: 'Gate A', status: 'warning' },
  { id: 'Parking', label: 'Parking', status: 'optimal' },
];

export const VideoFeed: React.FC<VideoFeedProps> = ({
  imageRef,
  isRecording,
  visionMode,
  activeCamera,
  soundEnabled,
  status,
  flowDirection,
  sectors,
  onToggleRecord,
  onToggleVision,
  onToggleSound,
  onSetGeofence,
  onSelectCamera,
}) => {
  const [drawingMode, setDrawingMode] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [fps, setFps] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showHudBoxes, setShowHudBoxes] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameTimestamps = useRef<number[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let lastSrc = '';

    const tick = () => {
      const newSrc = imageRef.current;
      if (newSrc && newSrc !== lastSrc) {
        lastSrc = newSrc;
        if (imgRef.current) {
          imgRef.current.src = `data:image/jpeg;base64,${newSrc}`;
        }
        if (!hasImage) setHasImage(true);

        const now = performance.now();
        frameTimestamps.current.push(now);
        frameTimestamps.current = frameTimestamps.current.filter((t) => now - t < 2000);
        const newFps = Math.round(frameTimestamps.current.length / 2);
        setFps((prev) => (Math.abs(newFps - prev) > 1 ? newFps : prev));
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hasImage, imageRef]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (!drawingMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    if (newPoints.length >= 4) {
      onSetGeofence(newPoints);
      setDrawingMode(false);
      setTimeout(() => setPoints([]), 2500);
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

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {/* ── Camera Tabs (Entrance, Exit, Food Court, Gate A, Parking) ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <div className="flex items-center gap-1.5 bg-[#121215] p-1 rounded-xl border border-white/[0.06]">
          {CAMERAS.map((cam) => {
            const isSelected = activeCamera === cam.id || (activeCamera.includes('01') && cam.id === 'Entrance');
            return (
              <button
                key={cam.id}
                onClick={() => onSelectCamera && onSelectCamera(cam.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    cam.status === 'warning' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                  }`}
                />
                <span>{cam.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#121215] rounded-xl border border-white/[0.06] text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE FEED</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300 font-semibold">{fps} FPS</span>
        </div>
      </div>

      {/* ── Main Camera Viewport ── */}
      <div
        ref={containerRef}
        onClick={handleClick}
        className="card-enterprise flex-1 min-h-[360px] lg:min-h-[440px] relative overflow-hidden flex items-center justify-center bg-black group"
      >
        {/* Top-Left HUD Info */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/[0.1] text-xs font-medium text-white flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              status === 'CRITICAL' ? 'bg-red-500 animate-ping' : status === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className="font-['Space_Grotesk'] font-semibold">{activeCamera || 'Entrance'}</span>
            <span className="text-[10px] text-zinc-400 font-mono">1080p AI</span>
            {sectors && sectors.length > 0 && (
              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                {sectors.length} ZONES
              </span>
            )}
          </div>

          {isRecording && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              REC
            </div>
          )}
        </div>

        {/* Top-Right HUD Stats */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
          {flowDirection && flowDirection.label !== 'STABLE' && (
            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30 text-cyan-400 text-xs font-mono flex items-center gap-1.5">
              <Compass size={13} className="text-cyan-400" />
              <span>{flowDirection.label}</span>
              <span
                className="inline-block transition-transform duration-500"
                style={{ transform: `rotate(${flowDirection.angle}deg)` }}
              >
                ↑
              </span>
            </div>
          )}

          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/[0.1] text-xs font-mono text-zinc-300">
            {visionMode}
          </div>
        </div>

        {/* Video Frame Image */}
        <img
          ref={imgRef}
          alt="Live Crowd Camera Feed"
          className="w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Simulated AI Heatmap Overlay */}
        {showHeatmap && (
          <div className="absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-70 transition-opacity duration-500">
            <div className="w-full h-full bg-[radial-gradient(circle_at_45%_55%,rgba(255,23,68,0.45)_0%,rgba(255,193,7,0.3)_35%,rgba(0,255,136,0.15)_60%,transparent_80%)]" />
          </div>
        )}

        {/* Enhanced Bounding Boxes (Simulated Overlay Samples when enabled) */}
        {showHudBoxes && hasImage && (
          <div className="absolute inset-0 pointer-events-none z-15">
            {/* Person #14 Sample Overlay */}
            <div
              className="absolute border border-emerald-400/80 bg-emerald-400/[0.04] rounded-lg transition-all duration-300 shadow-[0_0_12px_rgba(0,255,136,0.25)]"
              style={{ top: '38%', left: '42%', width: '12%', height: '32%' }}
            >
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-emerald-400" />

              {/* Tag pill */}
              <div className="absolute -top-6 left-0 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-400/40 whitespace-nowrap flex items-center gap-1">
                <span>Person #14</span>
                <span className="text-zinc-500">|</span>
                <span>96%</span>
              </div>
            </div>

            {/* Person #08 Sample Overlay */}
            <div
              className="absolute border border-cyan-400/80 bg-cyan-400/[0.04] rounded-lg transition-all duration-300 shadow-[0_0_12px_rgba(0,224,255,0.25)]"
              style={{ top: '42%', left: '56%', width: '11%', height: '30%' }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />

              <div className="absolute -top-6 left-0 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 border border-cyan-400/40 whitespace-nowrap flex items-center gap-1">
                <span>Person #08</span>
                <span className="text-zinc-500">|</span>
                <span>94%</span>
              </div>
            </div>
          </div>
        )}

        {/* Geofence Overlay */}
        {points.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <polygon
              points={points.map((p) => `${p.x * 100}% ${p.y * 100}%`).join(', ')}
              fill="rgba(0, 224, 255, 0.15)"
              stroke="#00e0ff"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={`${p.x * 100}%`}
                cy={`${p.y * 100}%`}
                r="4"
                fill="#00e0ff"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        )}

        {/* Modern Bottom Floating Toolbar */}
        <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="bg-black/70 backdrop-blur-xl px-2 py-1.5 rounded-xl border border-white/[0.1] flex items-center gap-1 pointer-events-auto shadow-2xl">
            {/* Vision Mode */}
            <button
              onClick={onToggleVision}
              className={`btn-icon-soc ${visionMode === 'THERMAL' ? 'active' : ''}`}
              title="Toggle Thermal / Optical"
            >
              <Eye size={15} />
            </button>

            {/* AI Heatmap */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`btn-icon-soc ${showHeatmap ? 'active' : ''}`}
              title="Toggle AI Heatmap Overlay"
            >
              <Flame size={15} />
            </button>

            {/* HUD Bounding Boxes */}
            <button
              onClick={() => setShowHudBoxes(!showHudBoxes)}
              className={`btn-icon-soc ${showHudBoxes ? 'active' : ''}`}
              title="Toggle Person Detection HUD"
            >
              <Layers size={15} />
            </button>

            {/* Geofence Tool */}
            <button
              onClick={() => {
                setDrawingMode(!drawingMode);
                setPoints([]);
              }}
              className={`btn-icon-soc ${drawingMode ? 'active' : ''}`}
              title="Draw Monitored Zone"
            >
              <MousePointer2 size={15} />
            </button>

            {/* Record */}
            <button
              onClick={onToggleRecord}
              className={`btn-icon-soc ${isRecording ? 'text-red-400 !border-red-500/50 bg-red-500/10' : ''}`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              <Video size={15} />
            </button>

            {/* Audio */}
            <button
              onClick={onToggleSound}
              className="btn-icon-soc"
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          </div>

          {/* Fullscreen Button */}
          <div className="pointer-events-auto">
            <button
              onClick={toggleFullscreen}
              className="btn-icon-soc bg-black/70 backdrop-blur-xl shadow-2xl"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoFeed;
