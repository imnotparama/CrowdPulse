import React from 'react';

interface RiskGaugeProps {
  risk: number;
  status: string;
  environmentRisk?: number;
  combinedThreatScore?: number;
  fusionConfidence?: number;
  reason?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  risk,
  status,
  combinedThreatScore,
  fusionConfidence = 0.94,
  reason,
}) => {
  const activeRisk = combinedThreatScore !== undefined ? combinedThreatScore : risk;
  const clampedRisk = Math.min(Math.max(activeRisk, 0), 100);

  const getTheme = () => {
    if (clampedRisk > 60 || status === 'CRITICAL' || status === 'EVACUATE') {
      return {
        color: '#FF4D5A',
        statusLabel: 'CRITICAL',
        statusBg: 'bg-[#FF4D5A]/10 text-[#FF4D5A] border-[#FF4D5A]/25',
        defaultReason: 'Rapid density accumulation detected near exit corridors',
      };
    }
    if (clampedRisk > 30 || status === 'WARNING') {
      return {
        color: '#F5A524',
        statusLabel: 'ELEVATED',
        statusBg: 'bg-[#F5A524]/10 text-[#F5A524] border-[#F5A524]/25',
        defaultReason: 'Localized queue formation monitored at Gate A',
      };
    }
    return {
      color: '#1ED760',
      statusLabel: 'SAFE',
      statusBg: 'bg-[#1ED760]/10 text-[#1ED760] border-[#1ED760]/25',
      defaultReason: 'Normal pedestrian movement • No overcrowding detected',
    };
  };

  const theme = getTheme();
  const displayReason = reason || theme.defaultReason;

  // Apple Health / Watch style circular activity ring
  const size = 130;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedRisk / 100) * circumference;

  return (
    <div className="card-apple p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Risk Analysis</span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${theme.statusBg}`}
        >
          {status || theme.statusLabel}
        </span>
      </div>

      {/* Large Circular Ring Indicator */}
      <div className="flex items-center justify-center my-4">
        <div className="relative w-[130px] h-[130px] flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Active Progress Ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-semibold tracking-tight text-white font-sans">
                {clampedRisk.toFixed(0)}
              </span>
              <span className="text-xs text-[#B9B9C5]">/ 100</span>
            </div>
            <span className="text-[10px] text-[#B9B9C5] uppercase tracking-wider font-medium mt-0.5">
              Risk Score
            </span>
          </div>
        </div>
      </div>

      {/* Confidence & Reason Footer (Apple Health style) */}
      <div className="border-t border-white/[0.05] pt-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#B9B9C5]">Confidence</span>
          <span className="text-white font-medium">
            {(fusionConfidence * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-[#B9B9C5] leading-relaxed">
          {displayReason}
        </p>
      </div>
    </div>
  );
};

export default RiskGauge;
