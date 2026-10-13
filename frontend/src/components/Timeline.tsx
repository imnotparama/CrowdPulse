import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Users, CheckCircle2, Shield, Play, Pause, RotateCcw } from 'lucide-react';

interface TimelineEvent {
  time: string;
  density: number;
  label: string;
  type: 'spike' | 'queue' | 'resolved' | 'normal';
  details?: string;
}

interface TimelineProps {
  currentDensity: number;
}

export const Timeline: React.FC<TimelineProps> = ({ currentDensity }) => {
  const now = new Date();
  const [replayActive, setReplayActive] = useState(false);
  const [replayIndex, setReplayIndex] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);

  // Generate recent 6 operational event intervals with icons
  const intervals: TimelineEvent[] = [
    {
      time: new Date(now.getTime() - 10 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.12,
      label: 'Flow Steady',
      type: 'normal',
      details: 'All turnstiles flowing at nominal clearance speed.',
    },
    {
      time: new Date(now.getTime() - 8 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.28,
      label: 'Density ↑',
      type: 'spike',
      details: 'Inflow surged +18% from arrival shuttle drop-off.',
    },
    {
      time: new Date(now.getTime() - 6 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.44,
      label: 'Alert ⚠️',
      type: 'spike',
      details: 'Gate A turnstile bottleneck detected. Pre-alert broadcasted.',
    },
    {
      time: new Date(now.getTime() - 4 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.36,
      label: 'Queue ⏳',
      type: 'queue',
      details: 'Queue formation peaked. Secondary egress routes opened.',
    },
    {
      time: new Date(now.getTime() - 2 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.22,
      label: 'Resolved ✓',
      type: 'resolved',
      details: 'Corridor clearance restored below warning threshold.',
    },
    {
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: currentDensity,
      label: currentDensity > 0.3 ? 'Dense ↑' : 'Normal',
      type: currentDensity > 0.3 ? 'spike' : 'normal',
      details: 'Real-time telemetry streaming from active edge camera.',
    },
  ];

  // Auto-advance replay when playing
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setReplayIndex((prev) => (prev >= intervals.length - 1 ? 0 : prev + 1));
    }, 1400);
    return () => clearInterval(timer);
  }, [isPlaying, intervals.length]);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'spike':
        return <TrendingUp size={12} className="text-red-400" />;
      case 'queue':
        return <Users size={12} className="text-amber-400" />;
      case 'resolved':
        return <CheckCircle2 size={12} className="text-emerald-400" />;
      default:
        return <Shield size={12} className="text-zinc-500" />;
    }
  };

  const getEventBadge = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'spike':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'queue':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'resolved':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-zinc-400 bg-white/[0.04] border-white/[0.08]';
    }
  };

  const activeItem = intervals[replayActive ? replayIndex : intervals.length - 1];

  return (
    <div className="card-level-3 p-3 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-zinc-500" />
          <span className="font-semibold tracking-wider uppercase font-['Space_Grotesk'] text-zinc-300 text-[11px]">
            Operational Event Timeline
          </span>
          {replayActive && (
            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/25 animate-pulse">
              REPLAY ACTIVE
            </span>
          )}
        </div>

        {/* Replay Mode Toggle & Indicators */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setReplayActive(!replayActive);
              if (replayActive) setIsPlaying(false);
            }}
            className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 transition-all ${
              replayActive
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,224,255,0.2)]'
                : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <RotateCcw size={10} />
            <span>{replayActive ? 'EXIT REPLAY' : 'CROWD REPLAY'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-mono border-l border-white/10 pl-2">
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Normal
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Queue
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Spike
            </span>
          </div>
        </div>
      </div>

      {/* Replay Scrubber Bar (Shown when Replay Mode is active) */}
      {replayActive && (
        <div className="bg-black/60 p-2.5 rounded-xl border border-cyan-500/30 flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 flex items-center justify-center hover:bg-cyan-500/25 transition-all shadow-sm flex-shrink-0"
            title={isPlaying ? 'Pause Replay' : 'Play Replay'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-cyan-400 font-bold">
                FRAME {replayIndex + 1}/{intervals.length}: {activeItem.time}
              </span>
              <span className="text-zinc-400">{activeItem.details}</span>
            </div>
            <input
              type="range"
              min="0"
              max={intervals.length - 1}
              value={replayIndex}
              onChange={(e) => setReplayIndex(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Event Track Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
        {intervals.map((evt, idx) => {
          const isSelected = replayActive ? idx === replayIndex : idx === intervals.length - 1;
          const badgeStyle = getEventBadge(evt.type);

          return (
            <div
              key={idx}
              onClick={() => {
                if (replayActive) setReplayIndex(idx);
              }}
              className={`p-2 rounded-lg border transition-all cursor-pointer group flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? 'bg-cyan-500/[0.08] border-cyan-500/40 shadow-[0_0_12px_rgba(0,224,255,0.12)]'
                  : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono ${isSelected ? 'text-cyan-400 font-bold' : 'text-zinc-400'}`}>
                  {evt.time}
                </span>
                {getEventIcon(evt.type)}
              </div>

              {/* Event status pill */}
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${badgeStyle}`}>
                  {evt.label}
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-200">
                  {(evt.density * 100).toFixed(0)}%
                </span>
              </div>

              {/* Micro density line */}
              <div className="w-full bg-white/[0.04] h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    evt.density > 0.4 ? 'bg-red-500' : evt.density > 0.25 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, evt.density * 200))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
