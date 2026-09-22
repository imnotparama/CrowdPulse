import React from 'react';
import { Clock } from 'lucide-react';

interface TimelineEvent {
  time: string;
  density: number;
  label?: string;
  hasIncident?: boolean;
}

interface TimelineProps {
  currentDensity: number;
}

export const Timeline: React.FC<TimelineProps> = ({ currentDensity }) => {
  // Generate recent 10-minute intervals
  const now = new Date();
  const intervals: TimelineEvent[] = Array.from({ length: 8 }).map((_, i) => {
    const d = new Date(now.getTime() - (7 - i) * 60000);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isSpike = i === 3;
    const isQueue = i === 6;
    const isLatest = i === 7;
    const densityVal = isLatest ? currentDensity : (isSpike ? 0.48 : isQueue ? 0.38 : 0.15 + (i * 0.03) % 0.2);
    return {
      time: timeStr,
      density: densityVal,
      label: isSpike ? 'Crowd Spike' : isQueue ? 'Queue Formed' : undefined,
      hasIncident: isSpike || isQueue,
    };
  });

  return (
    <div className="card-enterprise p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-zinc-400" />
          <span className="font-medium tracking-wide uppercase font-['Space_Grotesk'] text-zinc-300">
            Timeline Activity
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400/80" /> Normal
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Queue
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Spike
          </span>
        </div>
      </div>

      {/* Timeline track */}
      <div className="grid grid-cols-8 gap-2 items-end pt-1">
        {intervals.map((evt, idx) => {
          const heightPct = Math.min(100, Math.max(20, evt.density * 180));
          const isLatest = idx === intervals.length - 1;
          const barColor =
            evt.density > 0.45
              ? 'bg-red-500 hover:bg-red-400'
              : evt.density > 0.3
              ? 'bg-amber-400 hover:bg-amber-300'
              : 'bg-emerald-400/70 hover:bg-emerald-400';

          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 group cursor-pointer relative">
              {/* Tooltip on hover */}
              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-zinc-200 border border-white/10 pointer-events-none whitespace-nowrap z-30 shadow-xl">
                <div>{evt.time}</div>
                <div className="font-semibold text-cyan-400">Density: {evt.density.toFixed(2)}</div>
                {evt.label && <div className="text-amber-400 text-[9px]">{evt.label}</div>}
              </div>

              {/* Bar */}
              <div className="w-full bg-white/[0.04] h-10 rounded-md overflow-hidden flex items-end p-0.5">
                <div
                  className={`w-full rounded-sm transition-all duration-300 ${barColor} ${
                    isLatest ? 'animate-pulse' : ''
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              {/* Time label */}
              <span className={`text-[10px] font-mono ${isLatest ? 'text-cyan-400 font-semibold' : 'text-zinc-500'}`}>
                {evt.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
