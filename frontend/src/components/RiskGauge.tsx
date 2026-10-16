import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

interface RiskGaugeProps {
  risk: number;
  status: string;
  environmentRisk?: number;
  combinedThreatScore?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  risk,
  status,
  environmentRisk,
  combinedThreatScore,
}) => {
  const activeRisk = combinedThreatScore !== undefined ? combinedThreatScore : risk;
  const clampedRisk = Math.min(Math.max(activeRisk, 0), 100);

  const getTheme = () => {
    if (clampedRisk > 70) {
      return {
        color: '#ff1744',
        pillClass: 'pill-glowing-critical',
        label: 'CRITICAL',
        icon: ShieldAlert,
        gradientStart: '#ff1744',
        gradientEnd: '#ff5252',
        glowColor: 'rgba(255, 23, 68, 0.4)',
      };
    }
    if (clampedRisk > 40) {
      return {
        color: '#ff9800',
        pillClass: 'pill-glowing-warning',
        label: 'WARNING',
        icon: AlertTriangle,
        gradientStart: '#ff9800',
        gradientEnd: '#ffb74d',
        glowColor: 'rgba(255, 152, 0, 0.35)',
      };
    }
    if (clampedRisk > 20) {
      return {
        color: '#ffc107',
        pillClass: 'pill-glowing-warning',
        label: 'ELEVATED',
        icon: AlertTriangle,
        gradientStart: '#ffc107',
        gradientEnd: '#ffe082',
        glowColor: 'rgba(255, 193, 7, 0.3)',
      };
    }
    return {
      color: '#00ff88',
      pillClass: 'pill-glowing-safe',
      label: 'SAFE',
      icon: ShieldCheck,
      gradientStart: '#00ff88',
      gradientEnd: '#69f0ae',
      glowColor: 'rgba(0, 255, 136, 0.35)',
    };
  };

  const theme = getTheme();
  const Icon = theme.icon;

  // 180-degree semicircle math
  const radius = 38;
  const circumference = Math.PI * radius; // Half-circle circumference
  const strokeDashoffset = circumference - (clampedRisk / 100) * circumference;

  const densityPct = Math.min(100, clampedRisk * 0.4);
  const pressurePct = Math.min(100, clampedRisk * 0.35);
  const agitationPct = Math.min(100, clampedRisk * 0.25);
  const envPct = environmentRisk !== undefined ? Math.min(100, environmentRisk) : 0;

  return (
    <div className="card-level-2 p-3.5 flex flex-col items-center justify-between relative overflow-hidden group">
      {/* Subtle top indicator line matching status theme */}
      <div
        className="absolute top-0 inset-x-0 h-[2px] opacity-70 transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.color}, transparent)`,
        }}
      />

      {/* Header */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color: theme.color }} />
          <h3 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase font-['Space_Grotesk']">
            Threat Index
          </h3>
        </div>
        <span className={theme.pillClass}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {status || theme.label}
        </span>
      </div>

      {/* Semicircle Gauge (Properly scaled with zero clipping) */}
      <div className="relative w-44 h-24 my-1 flex items-end justify-center">
        {/* Soft ambient radial glow under the arc */}
        <div
          className="absolute bottom-2 w-32 h-14 rounded-full blur-xl pointer-events-none transition-all duration-700 opacity-40"
          style={{ backgroundColor: theme.glowColor }}
        />

        <svg className="w-full h-full relative z-10" viewBox="0 0 100 58">
          <defs>
            <linearGradient id="semicircleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme.gradientStart} />
              <stop offset="100%" stopColor={theme.gradientEnd} />
            </linearGradient>
            <filter id="gaugeArcGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={theme.color} floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background Track */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Active Progress Arc */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="url(#semicircleGrad)"
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#gaugeArcGlow)"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Readout inside Arc */}
        <div className="absolute bottom-1 flex flex-col items-center justify-center z-10">
          <div className="flex items-baseline gap-0.5">
            <span className="text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              {clampedRisk.toFixed(0)}
            </span>
            <span className="text-xs font-mono text-zinc-400 font-bold">%</span>
          </div>
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
            {combinedThreatScore !== undefined ? 'FUSED THREAT' : 'STAMPEDE RISK'}
          </span>
        </div>
      </div>

      {/* Segmented Sub-indicators with micro-progress bars */}
      <div className={`w-full grid ${environmentRisk !== undefined ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 pt-2 border-t border-white/[0.05] text-center`}>
        <div className="bg-white/[0.02] py-1 px-1 rounded-lg border border-white/[0.03] flex flex-col justify-between">
          <div className="text-[8px] font-mono text-zinc-500">DENSITY</div>
          <div className="text-xs font-mono font-bold text-zinc-200">
            {densityPct.toFixed(0)}%
          </div>
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${densityPct}%` }}
            />
          </div>
        </div>

        <div className="bg-white/[0.02] py-1 px-1 rounded-lg border border-white/[0.03] flex flex-col justify-between">
          <div className="text-[8px] font-mono text-zinc-500">PRESSURE</div>
          <div className="text-xs font-mono font-bold text-zinc-200">
            {pressurePct.toFixed(0)}%
          </div>
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-rose-400 rounded-full transition-all duration-500"
              style={{ width: `${pressurePct}%` }}
            />
          </div>
        </div>

        <div className="bg-white/[0.02] py-1 px-1 rounded-lg border border-white/[0.03] flex flex-col justify-between">
          <div className="text-[8px] font-mono text-zinc-500">AGITATION</div>
          <div className="text-xs font-mono font-bold text-zinc-200">
            {agitationPct.toFixed(0)}%
          </div>
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${agitationPct}%` }}
            />
          </div>
        </div>

        {environmentRisk !== undefined && (
          <div className="bg-white/[0.02] py-1 px-1 rounded-lg border border-white/[0.03] flex flex-col justify-between">
            <div className="text-[8px] font-mono text-cyan-400">ENV RISK</div>
            <div className="text-xs font-mono font-bold text-cyan-300">
              {envPct.toFixed(0)}%
            </div>
            <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${envPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskGauge;
