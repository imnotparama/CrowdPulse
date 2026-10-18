import React from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

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
  return (
    <div className="w-full animate-apple-in delay-500">
      {activeAlert ? (
        /* Active Alert Banner */
        <div className="card-apple p-5 border-[#FF4D5A]/30 bg-[#141417] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF4D5A]/10 border border-[#FF4D5A]/20 flex items-center justify-center text-[#FF4D5A] flex-shrink-0 animate-pulse">
              <ShieldAlert size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {activeAlert.type}
                </span>
                <span className="text-[11px] font-medium bg-[#FF4D5A]/15 text-[#FF4D5A] px-2 py-0.5 rounded-full">
                  {activeAlert.severity}
                </span>
              </div>
              <p className="text-xs text-[#B9B9C5] mt-0.5 leading-normal">
                {activeAlert.message}
              </p>
            </div>
          </div>
          <span className="text-xs text-[#B9B9C5]">Active Incident</span>
        </div>
      ) : (
        /* Clean Apple-style "No Active Incidents" State */
        <div className="card-apple p-5 flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1ED760]/10 border border-[#1ED760]/20 flex items-center justify-center text-[#1ED760] flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
              <CheckCircle2 size={16} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">No Active Incidents</p>
              <p className="text-xs text-[#B9B9C5] mt-0.5">
                All surveillance zones operating normally • Coverage 100% active
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-[#1ED760] bg-[#1ED760]/10 px-2.5 py-1 rounded-full border border-[#1ED760]/20">
            {alertHistory.length > 0 ? `${alertHistory.length} Resolved Today` : 'Optimal'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ActiveAlertsPanel;
