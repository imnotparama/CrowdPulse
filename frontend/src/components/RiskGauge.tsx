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
      };
    }
    return {
      color: '#00ff88',
      pillClass: 'pill-glowing-safe',
      label: 'SAFE',
      icon: ShieldCheck,
      gradientStart: '#00ff88',
      gradientEnd: '#69f0ae',
    };
  };

  const theme = getTheme();
  // 180-degree semicircle math
  const radius = 42;
  const circumference = Math.PI * radius; // Half-circle circumference
  const strokeDashoffset = circumference - (clampedRisk / 100) * circumference;

  return (
    <div className="card-level-2 p-4 flex flex-col items-center justify-between">
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
        <h3 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase font-['Space_Grotesk']">
          Risk Index
        </h3>
        <span className={theme.pillClass}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {status || theme.label}
        </span>
      </div>

      {/* Semicircle 180° Gauge */}
      <div className="relative w-36 h-20 my-2 flex items-end justify-center overflow-hidden">
        <svg className="w-36 h-36" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="semicircleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme.gradientStart} />
              <stop offset="100%" stopColor={theme.gradientEnd} />
            </linearGradient>
          </defs>

          {/* Background Half Arc */}
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Progress Half Arc */}
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke="url(#semicircleGrad)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Readout inside Arc */}
        <div className="absolute bottom-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-0.5">
            <span className="text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              {clampedRisk.toFixed(0)}
            </span>
            <span className="text-xs font-mono text-zinc-400 font-bold">%</span>
          </div>
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
            {combinedThreatScore !== undefined ? 'FUSED THREAT' : 'STAMPEDE RISK'}
          </span>
        </div>
      </div>

      {/* Segmented Sub-indicators */}
      <div className={`w-full grid ${environmentRisk !== undefined ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 pt-2 border-t border-white/[0.05] text-center`}>
        <div className="bg-white/[0.02] py-1 px-1 rounded-lg border border-white/[0.03]">
          <div className="text-[8px] font-mono text-zinc-500">DENSITY</div>
          <div className="text-xs font-mono font-bold text-zinc-200">
            {(clampedRisk * 0.4).toFixed(0)}%
          </div>
        </div>
        <div className="bg-white/[0.02] py-1 px-1 rounded-lg border border-white/[0.03]">
          <div className="text-[8px] font-mono text-zinc-500">PRESSURE</div>
          <div className="text-xs font-mono font-bold text-zinc-200">
            {(clampedRisk * 0.35).toFixed(0)}%
          </div>
        </div>
        <div className="bg-white/[0.02] py-1 px-1 rounded-lg border border-white/[0.03]">
          <div className="text-[8px] font-mono text-zinc-500">AGITATION</div>
          <div className="text-xs font-mono font-bold text-zinc-200">
            {(clampedRisk * 0.25).toFixed(0)}%
          </div>
        </div>
        {environmentRisk !== undefined && (
          <div className="bg-white/[0.02] py-1 px-1 rounded-lg border border-white/[0.03]">
            <div className="text-[8px] font-mono text-cyan-400">ENV RISK</div>
            <div className="text-xs font-mono font-bold text-cyan-300">
              {environmentRisk.toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskGauge;
