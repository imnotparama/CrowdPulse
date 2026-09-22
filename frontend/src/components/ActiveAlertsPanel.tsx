import React from 'react';
import { CheckCircle2, ShieldAlert, Bell, Radio } from 'lucide-react';

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
          { id: 101, title: 'Queue Cleared at Gate A', time: '28m ago' },
          { id: 102, title: 'Density Re-stabilized in Sector NW', time: '45m ago' },
          { id: 103, title: 'Pedestrian Flow Paced near Exit 2', time: '1h ago' },
        ];

  return (
    <div
      className={`p-4 flex flex-col gap-3 transition-all ${
        activeAlert ? 'card-level-1-alert' : 'card-level-2'
      }`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center text-zinc-300">
            <Bell size={13} />
          </div>
          <h3 className="text-xs font-semibold tracking-wider text-zinc-200 uppercase font-['Space_Grotesk']">
            Alert Activity
          </h3>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
          <Radio size={11} className="animate-pulse" />
          MONITORING
        </span>
      </div>

      {/* ── Active Priority Alert / Warm Empty State ── */}
      <div>
        {activeAlert ? (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 flex items-start gap-3 shadow-[0_0_20px_rgba(255,23,68,0.2)] animate-pulse">
            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 flex-shrink-0 mt-0.5">
              <ShieldAlert size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-['Space_Grotesk'] text-red-300">
                  {activeAlert.type}
                </span>
                <span className="text-[9px] font-mono font-bold bg-red-500/30 text-red-200 px-1.5 py-0.5 rounded">
                  {activeAlert.severity}
                </span>
              </div>
              <div className="text-[11px] text-zinc-300 leading-snug mt-1">
                {activeAlert.message}
              </div>
            </div>
          </div>
        ) : (
          /* Warm & Informative Empty State */
          <div className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span className="text-xs font-semibold font-['Space_Grotesk']">
                All sectors operating normally
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-sans leading-snug pl-6">
              Last incident resolved <span className="text-zinc-200 font-medium">28 minutes ago</span> (Gate A queue cleared). Coverage: 100% active.
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Resolved Alerts ── */}
      <div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Resolved Incidents</span>
          <span className="text-zinc-400 font-semibold">{resolvedList.length} LOGGED</span>
        </div>
        <div className="space-y-1.5">
          {resolvedList.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 flex-shrink-0" />
                <span className="text-xs text-zinc-300 truncate">{item.title}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0 ml-2">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveAlertsPanel;
