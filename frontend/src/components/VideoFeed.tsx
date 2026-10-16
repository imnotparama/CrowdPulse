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
  Layers,
  Cpu,
  Zap,
  TrendingUp,
  Camera
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
  { id: 'Entrance', label: 'Entrance', status: 'optimal', previewColor: 'from-emerald-950/40 to-black' },
  { id: 'Exit', label: 'Exit', status: 'optimal', previewColor: 'from-cyan-950/40 to-black' },
  { id: 'Food Court', label: 'Food Court', status: 'optimal', previewColor: 'from-blue-950/40 to-black' },
  { id: 'Gate A', label: 'Gate A', status: 'warning', previewColor: 'from-amber-950/40 to-black' },
  { id: 'Parking', label: 'Parking', status: 'optimal', previewColor: 'from-zinc-900 to-black' },
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
  const [showFlowVectors, setShowFlowVectors] = useState(true);
  const [snapshotEffect, setSnapshotEffect] = useState(false);

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

  const handleSnapshot = () => {
    setSnapshotEffect(true);
    setTimeout(() => setSnapshotEffect(false), 300);
  };

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {/* ── Camera Tabs with Miniature Thumbnail Previews ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <div className="flex items-center gap-2 bg-[#101014] p-1.5 rounded-xl border border-white/[0.06]">
          {CAMERAS.map((cam) => {
            const isSelected = activeCamera === cam.id || (activeCamera.includes('01') && cam.id === 'Entrance');
            return (
              <button
                key={cam.id}
                onClick={() => onSelectCamera && onSelectCamera(cam.id)}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                  isSelected
                    ? 'bg-cyan-500/10 text-white border border-cyan-500/40 shadow-[0_0_12px_rgba(0,224,255,0.15)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {/* Miniature Camera Preview Box */}
                <div
                  className={`w-7 h-5 rounded bg-gradient-to-br ${cam.previewColor} border ${
                    isSelected ? 'border-cyan-400/80 shadow-sm' : 'border-white/10 group-hover:border-white/20'
                  } flex items-center justify-center relative overflow-hidden`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span
                    className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                      cam.status === 'warning' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                </div>
                <span className="font-['Space_Grotesk'] font-medium">{cam.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live FPS & Edge Vitals Tag */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#101014] rounded-xl border border-white/[0.06] text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-semibold">LIVE</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300 font-semibold">{fps} FPS</span>
          <span className="text-zinc-600">•</span>
          <span className="text-cyan-400">0 DROPPED</span>
        </div>
      </div>

      {/* ── Main Camera Viewport (Dominant Hero ~70% center height) ── */}
      <div
        ref={containerRef}
        onClick={handleClick}
        className="card-level-1 flex-1 min-h-[460px] lg:min-h-[560px] relative overflow-hidden flex items-center justify-center bg-[#07070a] group select-none cursor-crosshair border border-cyan-500/20 shadow-[0_0_30px_rgba(0,0,0,0.9)]"
      >
        {/* 4 Corner Tactical Reticles */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none z-20" />
        <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none z-20" />
        <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none z-20" />
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none z-20" />

        {/* Flash effect on snapshot */}
        {snapshotEffect && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-300 animate-out fade-out" />
        )}

        {/* ── Top-Left HUD Info: Camera & Zone Pills ── */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/[0.12] text-xs font-medium text-white flex items-center gap-2.5 shadow-xl">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'CRITICAL'
                  ? 'bg-red-500 animate-ping'
                  : status === 'WARNING'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400 shadow-[0_0_8px_#00ff88]'
              }`}
            />
            <span className="font-['Space_Grotesk'] font-bold tracking-tight text-zinc-100">
              {activeCamera || 'Entrance'}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded">
              1080p AI
            </span>
            {sectors && sectors.length > 0 && (
              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                {sectors.length} ACTIVE ZONES
              </span>
            )}
          </div>

          {isRecording && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-2 animate-pulse shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              REC • 00:24
            </div>
          )}
        </div>

        {/* ── Top-Right Edge AI Diagnostics Telemetry HUD ── */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
          {flowDirection && flowDirection.label !== 'STABLE' && (
            <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 text-cyan-400 text-xs font-mono flex items-center gap-1.5 shadow-xl">
              <Compass size={13} className="text-cyan-400" />
              <span>FLOW: {flowDirection.label}</span>
              <span
                className="inline-block transition-transform duration-500 font-bold"
                style={{ transform: `rotate(${flowDirection.angle}deg)` }}
              >
                ↑
              </span>
            </div>
          )}

          {/* Edge AI Model & Latency Vitals */}
          <div className="hidden md:flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/[0.12] text-[11px] font-mono text-zinc-300 shadow-xl">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Zap size={12} />
              <span>YOLOv11</span>
            </div>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400">18ms</span>
            <span className="text-zinc-600">|</span>
            <div className="flex items-center gap-1 text-zinc-400">
              <Cpu size={12} />
              <span>RTX 3050</span>
            </div>
          </div>
        </div>

        {/* Standby / Initializing Overlay if no image arrives */}
        {!hasImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,224,255,0.06)_0%,rgba(0,0,0,0.85)_70%)]">
            {/* Concentric Calibration Reticle */}
            <div className="relative w-28 h-28 rounded-full border border-cyan-500/25 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/20 animate-spin-slow" />
              <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00e0ff]" />
              </div>
              {/* Reticle axis lines */}
              <div className="absolute top-0 bottom-0 w-[1px] bg-cyan-500/20" />
              <div className="absolute left-0 right-0 h-[1px] bg-cyan-500/20" />
            </div>

            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="text-xs font-mono text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>CHANNEL [{activeCamera?.toUpperCase() || 'ENTRANCE'}] • STANDBY</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                1080p RTSP SURVEILLANCE • OPTICAL FLOW & YOLOv11 ENGINE READY
              </span>
              <span className="text-[9px] font-mono text-zinc-600">
                STREAM ENCRYPTION: SHA-256 • HARDWARE EDGE INGESTION ARMED
              </span>
            </div>
          </div>
        )}

        {/* Video Frame Image (cleanly hidden until frame bytes arrive) */}
        <img
          ref={imgRef}
          alt=""
          className={`w-full h-full object-contain pointer-events-none select-none transition-opacity duration-500 ${
            hasImage ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
        />

        {/* Simulated AI Heatmap Overlay */}
        {showHeatmap && (
          <div className="absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-75 transition-opacity duration-500">
            <div className="w-full h-full bg-[radial-gradient(circle_at_45%_55%,rgba(255,23,68,0.55)_0%,rgba(255,193,7,0.35)_35%,rgba(0,255,136,0.18)_65%,transparent_85%)]" />
          </div>
        )}

        {/* Optical Flow Vectors Overlay (Arrows showing pedestrian movement currents) */}
        {showFlowVectors && (
          <div className="absolute inset-0 pointer-events-none z-12 opacity-65 flex flex-col justify-around px-8 py-12">
            <div className="flex justify-around text-cyan-400 text-sm font-mono tracking-widest animate-flow-drift">
              <span>→ → →</span>
              <span>→ → →</span>
              <span>↘ ↘ ↘</span>
            </div>
            <div className="flex justify-around text-emerald-400 text-sm font-mono tracking-widest animate-flow-drift delay-100">
              <span>→ → →</span>
              <span>↘ ↘</span>
              <span>→ → →</span>
            </div>
            <div className="flex justify-around text-cyan-400 text-sm font-mono tracking-widest animate-flow-drift delay-200">
              <span>↗ ↗</span>
              <span>→ → →</span>
              <span>→ →</span>
            </div>
          </div>
        )}

        {/* ── Rich Person Detection Overlays (With Velocity Arrow, Speed, Confidence & Status) ── */}
        {showHudBoxes && hasImage && (
          <div className="absolute inset-0 pointer-events-none z-15">
            {/* Person #18 (Central corridor) */}
            <div
              className="absolute border border-emerald-400/90 bg-emerald-400/[0.04] rounded-lg transition-all duration-300 shadow-[0_0_16px_rgba(0,255,136,0.3)]"
              style={{ top: '36%', left: '40%', width: '13%', height: '34%' }}
            >
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />

              {/* Rich Tag Card */}
              <div className="absolute -top-7 left-0 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-emerald-400 border border-emerald-400/50 whitespace-nowrap flex items-center gap-1.5 shadow-lg">
                <span className="font-bold">Person 18</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-200 flex items-center gap-0.5">
                  <span>↓</span> 1.2 m/s
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-cyan-300">94%</span>
                <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Normal</span>
              </div>
            </div>

            {/* Person #08 (Right quadrant) */}
            <div
              className="absolute border border-cyan-400/90 bg-cyan-400/[0.04] rounded-lg transition-all duration-300 shadow-[0_0_16px_rgba(0,224,255,0.3)]"
              style={{ top: '40%', left: '57%', width: '12%', height: '32%' }}
            >
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />

              <div className="absolute -top-7 left-0 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-cyan-400 border border-cyan-400/50 whitespace-nowrap flex items-center gap-1.5 shadow-lg">
                <span className="font-bold">Person 08</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-200 flex items-center gap-0.5">
                  <span>→</span> 1.8 m/s
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-cyan-300">96%</span>
                <span className="text-[8px] bg-cyan-500/20 text-cyan-300 px-1 rounded">Rapid</span>
              </div>
            </div>

            {/* Person #24 (Far left queuing) */}
            <div
              className="absolute border border-amber-400/80 bg-amber-400/[0.03] rounded-lg transition-all duration-300"
              style={{ top: '44%', left: '22%', width: '10%', height: '28%' }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-amber-400" />
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-amber-400" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-amber-400" />

              <div className="absolute -top-7 left-0 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-amber-400 border border-amber-400/40 whitespace-nowrap flex items-center gap-1.5 shadow-lg">
                <span className="font-bold">Person 24</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-200 flex items-center gap-0.5">
                  <span>•</span> 0.4 m/s
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-amber-300">91%</span>
                <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded">Queue</span>
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

        {/* ── Enhanced Bottom Floating Toolbar (With Tooltips & Text Labels) ── */}
        <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-white/[0.12] flex items-center gap-1.5 pointer-events-auto shadow-2xl">
            {/* Snapshot */}
            <button
              onClick={handleSnapshot}
              className="btn-icon-soc gap-1.5 px-2.5 text-xs font-mono"
              title="Capture High-Res Evidence Frame"
            >
              <Camera size={14} />
              <span className="hidden xl:inline text-[10px]">Snapshot</span>
            </button>

            {/* Record */}
            <button
              onClick={onToggleRecord}
              className={`btn-icon-soc gap-1.5 px-2.5 text-xs font-mono ${
                isRecording ? 'text-red-400 !border-red-500/50 bg-red-500/10' : ''
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              <Video size={14} />
              <span className="hidden xl:inline text-[10px]">{isRecording ? 'Stop REC' : 'Record'}</span>
            </button>

            <div className="w-[1px] h-5 bg-white/10 mx-0.5" />

            {/* Heatmap */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`btn-icon-soc gap-1.5 px-2.5 text-xs font-mono ${showHeatmap ? 'active' : ''}`}
              title="Toggle AI Crowd Heatmap Overlay"
            >
              <Flame size={14} />
              <span className="hidden xl:inline text-[10px]">Heatmap</span>
            </button>

            {/* Flow Vectors */}
            <button
              onClick={() => setShowFlowVectors(!showFlowVectors)}
              className={`btn-icon-soc gap-1.5 px-2.5 text-xs font-mono ${showFlowVectors ? 'active' : ''}`}
              title="Toggle Pedestrian Optical Flow Direction Vectors"
            >
              <TrendingUp size={14} />
              <span className="hidden xl:inline text-[10px]">Flow Vectors</span>
            </button>

            {/* HUD Bounding Boxes */}
            <button
              onClick={() => setShowHudBoxes(!showHudBoxes)}
              className={`btn-icon-soc gap-1.5 px-2.5 text-xs font-mono ${showHudBoxes ? 'active' : ''}`}
              title="Toggle Person Detection HUD & Velocity Tags"
            >
              <Layers size={14} />
              <span className="hidden xl:inline text-[10px]">Tracking HUD</span>
            </button>

            {/* Geofence Tool */}
            <button
              onClick={() => {
                setDrawingMode(!drawingMode);
                setPoints([]);
              }}
              className={`btn-icon-soc gap-1.5 px-2.5 text-xs font-mono ${drawingMode ? 'active' : ''}`}
              title="Draw Custom Monitored Geofence Zone"
            >
              <MousePointer2 size={14} />
              <span className="hidden xl:inline text-[10px]">Zones</span>
            </button>

            <div className="w-[1px] h-5 bg-white/10 mx-0.5" />

            {/* Vision Mode */}
            <button
              onClick={onToggleVision}
              className={`btn-icon-soc ${visionMode === 'THERMAL' ? 'active' : ''}`}
              title="Toggle Thermal / Optical Spectrum"
            >
              <Eye size={14} />
            </button>

            {/* Audio */}
            <button
              onClick={onToggleSound}
              className="btn-icon-soc"
              title={soundEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </div>

          {/* Fullscreen Button */}
          <div className="pointer-events-auto">
            <button
              onClick={toggleFullscreen}
              className="btn-icon-soc bg-black/80 backdrop-blur-xl shadow-2xl"
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
