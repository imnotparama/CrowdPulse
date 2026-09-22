import React from 'react';

interface RiskGaugeProps {
  risk: number;
  status: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, status }) => {
  const clampedRisk = Math.min(Math.max(risk, 0), 100);

  const getTheme = () => {
    if (clampedRisk > 70) {
      return {
        color: '#ff1744',
        badge: 'badge-status-critical',
        label: 'CRITICAL',
        gradientStart: '#ff1744',
        gradientEnd: '#ff5252',
      };
    }
    if (clampedRisk > 40) {
      return {
        color: '#ff9800',
        badge: 'badge-status-warning',
        label: 'WARNING',
        gradientStart: '#ff9800',
        gradientEnd: '#ffb74d',
      };
    }
    if (clampedRisk > 20) {
      return {
        color: '#ffc107',
        badge: 'badge-status-elevated',
        label: 'ELEVATED',
        gradientStart: '#ffc107',
        gradientEnd: '#ffe082',
      };
    }
    return {
      color: '#00ff88',
      badge: 'badge-status-safe',
      label: 'SAFE',
      gradientStart: '#00ff88',
      gradientEnd: '#69f0ae',
    };
  };

  const theme = getTheme();
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedRisk / 100) * circumference;

  return (
    <div className="card-enterprise p-4 flex flex-col items-center justify-between">
      <div className="w-full flex items-center justify-between pb-1 border-b border-white/[0.06]">
        <h3 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase font-['Space_Grotesk']">
          Risk Index
        </h3>
        <span className={`badge-status ${theme.badge}`}>
          {status || theme.label}
        </span>
      </div>

      {/* Circular Progress Ring */}
      <div className="relative w-28 h-28 my-2 flex items-center justify-center">
        <svg className="w-28 h-28 -rotate-90">
          <defs>
            <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.gradientStart} />
              <stop offset="100%" stopColor={theme.gradientEnd} />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="7"
          />

          {/* Animated Progress Ring */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="url(#riskGrad)"
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            {clampedRisk.toFixed(0)}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            / 100
          </span>
        </div>
      </div>

      {/* Threshold Indicators */}
      <div className="w-full grid grid-cols-3 gap-1 pt-2 border-t border-white/[0.05] text-center">
        <div className="bg-white/[0.02] py-1 rounded">
          <div className="text-[9px] font-mono text-zinc-500">DENSITY</div>
          <div className="text-[11px] font-mono font-semibold text-zinc-300">
            {(clampedRisk * 0.4).toFixed(0)}%
          </div>
        </div>
        <div className="bg-white/[0.02] py-1 rounded">
          <div className="text-[9px] font-mono text-zinc-500">PRESSURE</div>
          <div className="text-[11px] font-mono font-semibold text-zinc-300">
            {(clampedRisk * 0.35).toFixed(0)}%
          </div>
        </div>
        <div className="bg-white/[0.02] py-1 rounded">
          <div className="text-[9px] font-mono text-zinc-500">AGITATION</div>
          <div className="text-[11px] font-mono font-semibold text-zinc-300">
            {(clampedRisk * 0.25).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskGauge;
