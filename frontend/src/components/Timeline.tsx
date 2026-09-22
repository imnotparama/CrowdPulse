import React from 'react';
import { Clock, TrendingUp, Users, CheckCircle2, Shield } from 'lucide-react';

interface TimelineEvent {
  time: string;
  density: number;
  label: string;
  type: 'spike' | 'queue' | 'resolved' | 'normal';
}

interface TimelineProps {
  currentDensity: number;
}

export const Timeline: React.FC<TimelineProps> = ({ currentDensity }) => {
  const now = new Date();
  
  // Generate recent 6 operational event intervals with icons
  const intervals: TimelineEvent[] = [
    {
      time: new Date(now.getTime() - 10 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.12,
      label: 'Flow Steady',
      type: 'normal',
    },
    {
      time: new Date(now.getTime() - 8 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.28,
      label: 'Density ↑',
      type: 'spike',
    },
    {
      time: new Date(now.getTime() - 6 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.44,
      label: 'Alert ⚠️',
      type: 'spike',
    },
    {
      time: new Date(now.getTime() - 4 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.36,
      label: 'Queue ⏳',
      type: 'queue',
    },
    {
      time: new Date(now.getTime() - 2 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: 0.22,
      label: 'Resolved ✓',
      type: 'resolved',
    },
    {
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      density: currentDensity,
      label: currentDensity > 0.3 ? 'Dense ↑' : 'Normal',
      type: currentDensity > 0.3 ? 'spike' : 'normal',
    },
  ];

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

  return (
    <div className="card-level-3 p-3 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-zinc-500" />
          <span className="font-semibold tracking-wider uppercase font-['Space_Grotesk'] text-zinc-300 text-[11px]">
            Operational Event Timeline
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
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

      {/* Event Track */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
        {intervals.map((evt, idx) => {
          const isLatest = idx === intervals.length - 1;
          const badgeStyle = getEventBadge(evt.type);

          return (
            <div
              key={idx}
              className={`p-2 rounded-lg border transition-all cursor-pointer group flex flex-col justify-between gap-1.5 ${
                isLatest
                  ? 'bg-cyan-500/[0.06] border-cyan-500/30 shadow-[0_0_10px_rgba(0,224,255,0.08)]'
                  : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono ${isLatest ? 'text-cyan-400 font-bold' : 'text-zinc-400'}`}>
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
