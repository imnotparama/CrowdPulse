import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Camera,
  Layers,
  Flame,
  MousePointer2,
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
  { id: 'Entrance', label: 'Entrance' },
  { id: 'Exit', label: 'Exit' },
  { id: 'Food Court', label: 'Food Court' },
  { id: 'Gate A', label: 'Gate A' },
  { id: 'Parking', label: 'Parking' },
];

export const VideoFeed: React.FC<VideoFeedProps> = ({
  imageRef,
  isRecording,
  visionMode,
  activeCamera,
  soundEnabled,
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
    link.download = `crowdpulse-snapshot-${Date.now()}.jpg`;
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
    <div className="card-apple p-4 flex flex-col gap-3 w-full h-full flex-1 min-h-[460px] lg:min-h-[540px] animate-apple-in delay-100">
      {/* ── Top Bar: Segmented Channel Control & Small AI Badge ── */}
      <div className="flex items-center justify-between gap-4">
        {/* Apple-style segmented camera switcher */}
        <div className="flex items-center bg-[#1C1C21] p-1 rounded-full border border-white/[0.05] overflow-x-auto scrollbar-none">
          {CAMERAS.map((cam) => {
            const isActive = (activeCamera || 'Entrance') === cam.id;
            return (
              <button
                key={cam.id}
                onClick={() => onSelectCamera && onSelectCamera(cam.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-[#141417] text-white shadow-sm border border-white/[0.08]'
                    : 'text-[#B9B9C5] hover:text-white'
                }`}
              >
                {cam.label}
              </button>
            );
          })}
        </div>

        {/* Small AI Badge: YOLOv11 • 30 FPS with breathing beacon */}
        <div className="flex items-center gap-2 bg-[#1C1C21] px-3.5 py-1.5 rounded-full border border-white/[0.05] text-xs font-medium shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#1ED760] animate-beacon-green" />
          <span className="text-white font-medium">YOLOv11</span>
          <span className="text-[#B9B9C5]">•</span>
          <span className="text-[#B9B9C5] font-mono">{fps || 30} FPS</span>
        </div>
      </div>

      {/* ── Main Video Player Viewport ── */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className={`relative flex-1 w-full bg-[#0B0B0D] rounded-2xl overflow-hidden border border-white/[0.04] flex items-center justify-center select-none ${
          drawingMode ? 'cursor-crosshair' : ''
        }`}
      >
        {/* Live Frame Image */}
        <img
          ref={imgRef}
          alt=""
          className={`w-full h-full object-contain pointer-events-none select-none transition-opacity duration-300 ${
            hasImage ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
        />

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

        {/* Apple-style Detection Bounding Boxes */}
        {showHudBoxes && hasImage && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Person Box 1 */}
            <div
              className="absolute border border-white/40 bg-white/[0.03] rounded-xl transition-all duration-300"
              style={{ top: '36%', left: '40%', width: '13%', height: '34%' }}
            >
              <div className="absolute -top-6 left-0 bg-[#1C1C21] px-2 py-0.5 rounded-md text-[11px] text-white font-medium border border-white/[0.08] shadow-md flex items-center gap-1.5">
                <span>Person 18</span>
                <span className="text-[#B9B9C5]">1.2 m/s</span>
              </div>
            </div>

            {/* Person Box 2 */}
            <div
              className="absolute border border-white/40 bg-white/[0.03] rounded-xl transition-all duration-300"
              style={{ top: '40%', left: '57%', width: '12%', height: '32%' }}
            >
              <div className="absolute -top-6 left-0 bg-[#1C1C21] px-2 py-0.5 rounded-md text-[11px] text-white font-medium border border-white/[0.08] shadow-md flex items-center gap-1.5">
                <span>Person 08</span>
                <span className="text-[#B9B9C5]">1.8 m/s</span>
              </div>
            </div>
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

        {/* Standby State (Clean, Understated Apple Design) */}
        {!hasImage && (
          <div className="flex flex-col items-center justify-center gap-3 text-center pointer-events-none p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#1C1C21] border border-white/[0.05] flex items-center justify-center text-[#B9B9C5]">
              <Camera size={20} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Camera Feed • {activeCamera || 'Entrance'}
              </p>
              <p className="text-xs text-[#B9B9C5] mt-0.5">
                AI Vision Pipeline Active • 1080p Stream
              </p>
            </div>
          </div>
        )}

        {/* ── Floating Controls Pill (Minimalist Apple/Tesla Glass) ── */}
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none z-30">
          <div className="glass-pill px-3 py-1.5 flex items-center gap-1.5 pointer-events-auto shadow-2xl">
            {/* Record Button */}
            <button
              onClick={onToggleRecord}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                isRecording
                  ? 'bg-[#FF4D5A] text-white'
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

            <span className="w-px h-4 bg-white/[0.08]" />

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
                  ? 'bg-white/[0.12] text-white'
                  : 'text-[#B9B9C5] hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Toggle Vision Spectrum"
            >
              <Eye size={15} strokeWidth={1.75} />
            </button>

            {/* Heatmap Toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`p-1.5 rounded-full transition-colors ${
                showHeatmap
                  ? 'bg-white/[0.12] text-white'
                  : 'text-[#B9B9C5] hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Toggle Density Heatmap"
            >
              <Flame size={15} strokeWidth={1.75} />
            </button>

            {/* HUD Toggle */}
            <button
              onClick={() => setShowHudBoxes(!showHudBoxes)}
              className={`p-1.5 rounded-full transition-colors ${
                showHudBoxes
                  ? 'bg-white/[0.12] text-white'
                  : 'text-[#B9B9C5] hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Toggle Detection Boxes"
            >
              <Layers size={15} strokeWidth={1.75} />
            </button>

            {/* Geofence Draw */}
            <button
              onClick={() => {
                setDrawingMode(!drawingMode);
                setPoints([]);
              }}
              className={`p-1.5 rounded-full transition-colors ${
                drawingMode
                  ? 'bg-[#00B5FF] text-white'
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

            <span className="w-px h-4 bg-white/[0.08]" />

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
