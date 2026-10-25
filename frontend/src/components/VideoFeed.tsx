import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Maximize2,
  Minimize2,
  Flame,
  Eye,
  Volume2,
  VolumeX,
  MousePointer2,
  Video,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';

export interface SectorData {
  name: string;
  count: number;
  status: string;
}

export interface DemoVideoInfo {
  id: string;
  title: string;
  filename: string;
  description?: string;
  sector?: string;
  is_active?: boolean;
}

interface VideoFeedProps {
  imageRef: React.RefObject<string | null>;
  isRecording: boolean;
  visionMode: string;
  activeCamera: string;
  activeVideoName?: string;
  availableVideos?: DemoVideoInfo[];
  soundEnabled: boolean;
  status: string;
  flowDirection?: { angle: number; label: string };
  sectors?: SectorData[];
  onToggleRecord: () => void;
  onToggleVision: () => void;
  onToggleSound: () => void;
  onSetGeofence: (points: { x: number; y: number }[]) => void;
  onSelectCamera?: (cam: string) => void;
  onOpenPhoneModal?: () => void;
}

const DEFAULT_VIDEOS: DemoVideoInfo[] = [
  {
    id: 'demo.mp4',
    title: 'Demo 1: Main Concourse',
    filename: 'demo.mp4',
    description: 'High-density concourse crowd surveillance',
    sector: 'Entrance',
  },
  {
    id: 'demo2.mp4',
    title: 'Demo 2: Gateway Transit',
    filename: 'demo2.mp4',
    description: 'Pedestrian chokepoint corridor flow',
    sector: 'Gate A',
  },
];

export const VideoFeed: React.FC<VideoFeedProps> = ({
  imageRef,
  isRecording,
  visionMode,
  activeCamera,
  activeVideoName,
  availableVideos = DEFAULT_VIDEOS,
  soundEnabled,
  onToggleRecord,
  onToggleVision,
  onToggleSound,
  onSetGeofence,
  onSelectCamera,
  onOpenPhoneModal,
}) => {
  const [drawingMode, setDrawingMode] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [fps, setFps] = useState(25);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [viewportSize, setViewportSize] = useState<'compact' | 'standard' | 'large'>('compact');

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameTimestamps = useRef<number[]>([]);
  const rafRef = useRef<number>(0);

  const videoList = availableVideos && availableVideos.length > 0 ? availableVideos : DEFAULT_VIDEOS;

  // Determine active item helper
  const isVideoActive = (vid: DemoVideoInfo) => {
    if (!activeCamera) return vid.id === 'demo.mp4';
    const normActive = activeCamera.toLowerCase();
    const normId = vid.id.toLowerCase();
    const normFile = vid.filename.toLowerCase();
    const normTitle = vid.title.toLowerCase();
    const normSector = (vid.sector || '').toLowerCase();

    return (
      normActive === normId ||
      normActive === normFile ||
      normActive.includes(normFile) ||
      normActive === normTitle ||
      normActive === normSector ||
      (normActive.includes('demo 1') && normFile.includes('demo.mp4')) ||
      (normActive.includes('demo 2') && normFile.includes('demo2.mp4')) ||
      (normActive === 'entrance' && normFile.includes('demo.mp4')) ||
      (normActive === 'gate a' && normFile.includes('demo2.mp4')) ||
      (normActive === 'exit' && normFile.includes('demo2.mp4'))
    );
  };

  const currentActiveVid = videoList.find(isVideoActive) || videoList[0];

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
  }, [imageRef, hasImage]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSnapshot = () => {
    if (!imgRef.current) return;
    const link = document.createElement('a');
    link.download = `crowdpulse-${currentActiveVid?.filename || 'feed'}-${Date.now()}.jpg`;
    link.href = imgRef.current.src;
    link.click();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const newPoints = [...points, { x, y }];
    setPoints(newPoints);
    if (newPoints.length >= 4) {
      onSetGeofence(newPoints);
      setDrawingMode(false);
    }
  };

  return (
    <div className="card-apple p-3.5 flex flex-col gap-3 w-full max-w-[1240px] mx-auto animate-apple-in delay-100">
      {/* ── Top Bar: Segmented Demo Video Switcher, Viewport Sizer & AI Status Badge ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Apple/Tesla segmented video selector */}
        <div className="flex items-center bg-[#1C1C21] p-1 rounded-full border border-white/[0.06] overflow-x-auto scrollbar-none shadow-inner">
          {videoList.map((vid) => {
            const isActive = isVideoActive(vid);
            return (
              <button
                key={vid.id}
                onClick={() => onSelectCamera && onSelectCamera(vid.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-[#141417] text-white shadow-md border border-white/[0.12] ring-1 ring-white/10'
                    : 'text-[#B9B9C5] hover:text-white hover:bg-white/[0.04]'
                }`}
                title={vid.description || vid.title}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isActive ? 'bg-[#1ED760] animate-beacon-green shadow-[0_0_8px_#1ED760]' : 'bg-zinc-600'
                  }`}
                />
                <span className="font-semibold tracking-tight">{vid.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white/[0.06] rounded text-zinc-400 border border-white/[0.04]">
                  {vid.filename}
                </span>
              </button>
            );
          })}

          {/* Connect Phone Camera Button */}
          {onOpenPhoneModal && (
            <button
              onClick={onOpenPhoneModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400 hover:text-white hover:bg-emerald-500/20 transition-all duration-200 whitespace-nowrap active:scale-95 border border-emerald-500/20"
              title="Connect your Android or iPhone as a live wireless camera"
            >
              <Smartphone size={13} strokeWidth={2} />
              <span>+ Phone Camera</span>
            </button>
          )}
        </div>

        {/* Viewport Size & Status Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Viewport Size Switcher */}
          <div className="flex items-center bg-[#1C1C21] p-1 rounded-full border border-white/[0.06] text-xs font-medium shadow-inner">
            <button
              onClick={() => setViewportSize('compact')}
              className={`px-3 py-1 rounded-full transition-all duration-200 ${
                viewportSize === 'compact'
                  ? 'bg-[#141417] text-white shadow-sm border border-white/[0.1] font-semibold'
                  : 'text-[#B9B9C5] hover:text-white'
              }`}
              title="Compact View (Clean, low profile)"
            >
              Compact
            </button>
            <button
              onClick={() => setViewportSize('standard')}
              className={`px-3 py-1 rounded-full transition-all duration-200 ${
                viewportSize === 'standard'
                  ? 'bg-[#141417] text-white shadow-sm border border-white/[0.1] font-semibold'
                  : 'text-[#B9B9C5] hover:text-white'
              }`}
              title="Standard View"
            >
              Standard
            </button>
            <button
              onClick={() => setViewportSize('large')}
              className={`px-3 py-1 rounded-full transition-all duration-200 ${
                viewportSize === 'large'
                  ? 'bg-[#141417] text-white shadow-sm border border-white/[0.1] font-semibold'
                  : 'text-[#B9B9C5] hover:text-white'
              }`}
              title="Expanded Large View"
            >
              Large
            </button>
          </div>

          {/* Verified Real Footage Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-medium text-emerald-300">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>REAL INFERENCE</span>
          </div>

          {/* YOLOv8m FPS Badge */}
          <div className="flex items-center gap-2 bg-[#1C1C21] px-3.5 py-1.5 rounded-full border border-white/[0.06] text-xs font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#1ED760] animate-beacon-green" />
            <span className="text-white font-medium">YOLOv8m</span>
            <span className="text-zinc-600">•</span>
            <span className="text-[#B9B9C5] font-mono">{fps || 25} FPS</span>
          </div>
        </div>
      </div>

      {/* ── Main Video Player Viewport (Aspect-Video Constrained) ── */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className={`relative w-full aspect-video ${
          viewportSize === 'compact'
            ? 'max-h-[320px] md:max-h-[350px]'
            : viewportSize === 'standard'
            ? 'max-h-[410px] md:max-h-[450px]'
            : 'max-h-[560px]'
        } bg-[#0B0B0D] rounded-2xl overflow-hidden border border-white/[0.06] flex items-center justify-center select-none shadow-2xl transition-all duration-300 mx-auto ${
          drawingMode ? 'cursor-crosshair' : ''
        }`}
      >
        {/* Live Frame Image (OpenCV YOLOv8 Bounding Boxes + Optical Flow Rendered Natively) */}
        <img
          ref={imgRef}
          alt="Live Neural Video Stream"
          className={`w-full h-full object-contain pointer-events-none select-none transition-opacity duration-200 ${
            hasImage ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
        />

        {/* Live Active Sector Watermark Badge */}
        {hasImage && (
          <div className="absolute top-3 left-3 pointer-events-none z-20 flex items-center gap-2 bg-[#141417]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.08] shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white tracking-wide">
                {activeVideoName || currentActiveVid?.title || 'Demo Feed'}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {currentActiveVid?.filename} • 640×360 AI Analysis
              </span>
            </div>
          </div>
        )}

        {/* Thermal Mode Filter */}
        {visionMode === 'THERMAL' && (
          <div className="absolute inset-0 pointer-events-none mix-blend-color-dodge bg-gradient-to-tr from-blue-900/40 via-amber-600/30 to-purple-800/40 opacity-70" />
        )}

        {/* Heatmap Overlay */}
        {showHeatmap && (
          <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-60">
            <div className="w-full h-full bg-[radial-gradient(circle_at_45%_55%,rgba(255,77,90,0.45)_0%,rgba(245,165,36,0.3)_35%,rgba(30,215,96,0.15)_65%,transparent_80%)]" />
          </div>
        )}

        {/* Geofence Overlay */}
        {points.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <polygon
              points={points.map((p) => `${p.x * 100}% ${p.y * 100}%`).join(', ')}
              fill="rgba(0, 181, 255, 0.12)"
              stroke="#00B5FF"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={`${p.x * 100}%`}
                cy={`${p.y * 100}%`}
                r="4"
                fill="#00B5FF"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            ))}
          </svg>
        )}

        {/* Standby / Connecting State */}
        {!hasImage && (
          <div className="flex flex-col items-center justify-center gap-3 text-center pointer-events-none p-6 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-[#1C1C21] border border-white/[0.08] flex items-center justify-center text-zinc-400">
              <Video size={22} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Connecting to {currentActiveVid?.title || 'Video Stream'}...
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                YOLOv8m Neural Pipeline • Decoding {currentActiveVid?.filename}
              </p>
            </div>
          </div>
        )}

        {/* ── Floating Controls Pill (Minimalist Glass Design) ── */}
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none z-30">
          <div className="glass-pill px-3 py-1.5 flex items-center gap-1.5 pointer-events-auto shadow-2xl backdrop-blur-xl bg-[#141417]/80 border border-white/[0.1]">
            {/* Record Button */}
            <button
              onClick={onToggleRecord}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                isRecording
                  ? 'bg-[#FF4D5A] text-white shadow-[0_0_12px_rgba(255,77,90,0.5)]'
                  : 'text-[#B9B9C5] hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecording ? 'bg-white animate-pulse' : 'bg-[#FF4D5A]'
                }`}
              />
              <span>{isRecording ? 'Recording' : 'Record'}</span>
            </button>

            <span className="w-px h-4 bg-white/[0.1]" />

            {/* Snapshot */}
            <button
              onClick={handleSnapshot}
              className="p-1.5 rounded-full text-[#B9B9C5] hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Capture Frame Snapshot"
            >
              <Camera size={15} strokeWidth={1.75} />
            </button>

            {/* Vision Mode */}
            <button
              onClick={onToggleVision}
              className={`p-1.5 rounded-full transition-colors ${
                visionMode === 'THERMAL'
                  ? 'bg-white/[0.15] text-white shadow-inner'
                  : 'text-[#B9B9C5] hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Toggle Vision Spectrum (Thermal / Optical)"
            >
              <Eye size={15} strokeWidth={1.75} />
            </button>

            {/* Heatmap Toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`p-1.5 rounded-full transition-colors ${
                showHeatmap
                  ? 'bg-white/[0.15] text-white shadow-inner'
                  : 'text-[#B9B9C5] hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Toggle Density Heatmap"
            >
              <Flame size={15} strokeWidth={1.75} />
            </button>

            {/* Geofence Draw */}
            <button
              onClick={() => {
                setDrawingMode(!drawingMode);
                setPoints([]);
              }}
              className={`p-1.5 rounded-full transition-colors ${
                drawingMode
                  ? 'bg-[#00B5FF] text-white shadow-[0_0_10px_rgba(0,181,255,0.4)]'
                  : 'text-[#B9B9C5] hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Draw Monitored Zone"
            >
              <MousePointer2 size={15} strokeWidth={1.75} />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className="p-1.5 rounded-full text-[#B9B9C5] hover:text-white hover:bg-white/[0.06] transition-colors"
              title={soundEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
            >
              {soundEnabled ? (
                <Volume2 size={15} strokeWidth={1.75} />
              ) : (
                <VolumeX size={15} strokeWidth={1.75} />
              )}
            </button>

            <span className="w-px h-4 bg-white/[0.1]" />

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full text-[#B9B9C5] hover:text-white hover:bg-white/[0.06] transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 size={15} strokeWidth={1.75} />
              ) : (
                <Maximize2 size={15} strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoFeed;
