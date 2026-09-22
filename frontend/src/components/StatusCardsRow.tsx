import React from 'react';
import { Users, AlertTriangle, ShieldCheck, Wifi, Activity, ArrowUpRight } from 'lucide-react';

interface StatusCardsRowProps {
  count: number;
  maxCapacity: number;
  capacityPct: number;
  density: number;
  status: string;
  stampedeRisk: number;
  wifiProbeCount: number;
  activeWifiZones: number;
  avgVelocity: number;
}

export const StatusCardsRow: React.FC<StatusCardsRowProps> = ({
  count,
  maxCapacity,
  capacityPct,
  density,
  status,
  stampedeRisk,
  wifiProbeCount,
  activeWifiZones,
  avgVelocity,
}) => {
  const getDensityLevel = (val: number) => {
    if (val > 0.5) return { label: 'CRITICAL', color: 'text-red-400', badge: 'badge-status-critical' };
    if (val > 0.3) return { label: 'WARNING', color: 'text-amber-400', badge: 'badge-status-warning' };
    if (val > 0.15) return { label: 'ELEVATED', color: 'text-yellow-400', badge: 'badge-status-elevated' };
    return { label: 'OPTIMAL', color: 'text-emerald-400', badge: 'badge-status-safe' };
  };

  const getRiskColor = (risk: number) => {
    if (risk > 70) return '#ff1744';
    if (risk > 40) return '#ff9800';
    if (risk > 20) return '#ffc107';
    return '#00ff88';
  };

  const densityInfo = getDensityLevel(density);
  const ringColor = getRiskColor(stampedeRisk);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. People Detected */}
      <div className="card-enterprise p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <Users size={14} className="text-zinc-300" />
            <span>PEOPLE DETECTED</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full">
            {capacityPct.toFixed(0)}% CAP
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            {count}
          </span>
          <span className="text-xs font-mono text-zinc-500">/ {maxCapacity}</span>
        </div>
      </div>

      {/* 2. Crowd Density */}
      <div className="card-enterprise p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <AlertTriangle size={14} className="text-zinc-300" />
            <span>CROWD DENSITY</span>
          </div>
          <span className={`badge-status ${densityInfo.badge}`}>
            {densityInfo.label}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            {density.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-zinc-500">idx</span>
        </div>
      </div>

      {/* 3. Stampede Risk with Mini Circular Ring */}
      <div className="card-enterprise p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <ShieldCheck size={14} className="text-zinc-300" />
            <span>STAMPEDE RISK</span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            {status}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              {stampedeRisk.toFixed(0)}
            </span>
            <span className="text-xs font-mono text-zinc-500">/ 100</span>
          </div>
          {/* Mini Ring Progress */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg className="w-8 h-8 -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="3"
              />
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke={ringColor}
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 13}
                strokeDashoffset={2 * Math.PI * 13 - (Math.min(stampedeRisk, 100) / 100) * (2 * Math.PI * 13)}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Connected Devices */}
      <div className="card-enterprise p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <Wifi size={14} className="text-zinc-300" />
            <span>DEVICES ACTIVE</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {activeWifiZones > 0 ? `${activeWifiZones} ZONES` : 'PROBE'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            {wifiProbeCount}
          </span>
          <span className="text-xs font-mono text-zinc-500">probed</span>
        </div>
      </div>

      {/* 5. Flow Velocity */}
      <div className="card-enterprise p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <Activity size={14} className="text-zinc-300" />
            <span>FLOW VELOCITY</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
            <ArrowUpRight size={12} />
            NORMAL
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            {(avgVelocity / 25).toFixed(1)}
          </span>
          <span className="text-xs font-mono text-zinc-500">m/s</span>
        </div>
      </div>
    </div>
  );
};

export default StatusCardsRow;
