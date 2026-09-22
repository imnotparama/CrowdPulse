import React from 'react';
import { CheckCircle2, AlertTriangle, Radio, Activity } from 'lucide-react';

interface EventItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  time: string;
}

interface RecentEventsProps {
  events?: EventItem[];
}

export const RecentEvents: React.FC<RecentEventsProps> = ({ events }) => {
  const defaultEvents: EventItem[] = [
    { id: '1', type: 'success', title: 'Camera Connected & Calibrated', time: 'Just now' },
    { id: '2', type: 'success', title: 'Crowd Density Normal (Level A)', time: '1m ago' },
    { id: '3', type: 'warning', title: 'Queue Forming at Gate A', time: '3m ago' },
    { id: '4', type: 'info', title: 'AI Farneback Optical Flow Active', time: '5m ago' },
  ];

  const displayEvents = events && events.length > 0 ? events : defaultEvents;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={13} className="text-amber-400" />;
      case 'info':
        return <Radio size={13} className="text-cyan-400" />;
      default:
        return <CheckCircle2 size={13} className="text-emerald-400" />;
    }
  };

  return (
    <div className="card-enterprise p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-zinc-400" />
          <h3 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase font-['Space_Grotesk']">
            Recent Events
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">LAST 10 MIN</span>
      </div>

      <div className="space-y-2">
        {displayEvents.map((evt) => (
          <div
            key={evt.id}
            className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">{getIcon(evt.type)}</div>
              <span className="text-xs text-zinc-300 font-medium truncate max-w-[170px]">
                {evt.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
              {evt.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentEvents;
