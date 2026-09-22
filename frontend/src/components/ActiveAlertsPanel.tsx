import React from 'react';
import { CheckCircle2, ShieldAlert, Bell } from 'lucide-react';

interface AlertItem {
  id: number;
  type: string;
  severity: string;
  message: string;
  timestamp: number;
}

interface ActiveAlertsPanelProps {
  activeAlert?: AlertItem | null;
  alertHistory?: AlertItem[];
}

export const ActiveAlertsPanel: React.FC<ActiveAlertsPanelProps> = ({
  activeAlert,
  alertHistory = [],
}) => {
  const resolvedList =
    alertHistory.length > 0
      ? alertHistory.slice(0, 3).map((a) => ({
          id: a.id,
          title: `${a.type} — ${a.message.slice(0, 26)}...`,
          time: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }))
      : [
          { id: 101, title: 'Queue Formed at Gate A', time: '5m ago' },
          { id: 102, title: 'Density Elevated in Sector NW', time: '12m ago' },
          { id: 103, title: 'Speed Drop near Exit 2', time: '24m ago' },
        ];

  return (
    <div className="card-enterprise p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-zinc-400" />
          <h3 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase font-['Space_Grotesk']">
            Alert Activity
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">LIVE FEED</span>
      </div>

      {/* ── Active Alerts ── */}
      <div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Active Alerts</span>
          <span className="text-emerald-400 text-[9px] font-bold">
            {activeAlert ? '1 TRIGGERED' : 'NONE'}
          </span>
        </div>

        {activeAlert ? (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 animate-pulse">
            <ShieldAlert size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-red-300">{activeAlert.type}</div>
              <div className="text-[10px] text-zinc-400 leading-snug mt-0.5">{activeAlert.message}</div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center gap-2 text-zinc-400">
            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-zinc-400">No active critical alerts. All sectors nominal.</span>
          </div>
        )}
      </div>

      {/* ── Recent Resolved Alerts ── */}
      <div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
          Recent Resolved
        </div>
        <div className="space-y-1.5">
          {resolvedList.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-lg bg-white/[0.015] border border-white/[0.03] flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-300 truncate max-w-[170px]">{item.title}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                <span className="text-emerald-400/80">Resolved</span> • {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveAlertsPanel;
