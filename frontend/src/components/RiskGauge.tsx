import React, { useState, useEffect } from 'react';

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

  // Smooth numeric counter animation
  const [animatedScore, setAnimatedScore] = useState(clampedRisk);

  useEffect(() => {
    const start = animatedScore;
    const end = clampedRisk;
    if (Math.abs(start - end) < 0.1) return;
    const duration = 500;
    const startTime = performance.now();

    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(frame);
      else setAnimatedScore(end);
    };
    const req = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(req);
  }, [clampedRisk, animatedScore]);

  const getTheme = () => {
    if (clampedRisk > 60 || status === 'CRITICAL' || status === 'EVACUATE') {
      return {
        color: '#FF4D5A',
        glowColor: 'rgba(255, 77, 90, 0.25)',
        statusLabel: 'CRITICAL',
        statusBg: 'bg-[#FF4D5A]/10 text-[#FF4D5A] border-[#FF4D5A]/25',
        defaultReason: 'Rapid density accumulation detected near exit corridors',
      };
    }
    if (clampedRisk > 30 || status === 'WARNING') {
      return {
        color: '#F5A524',
        glowColor: 'rgba(245, 165, 36, 0.2)',
        statusLabel: 'ELEVATED',
        statusBg: 'bg-[#F5A524]/10 text-[#F5A524] border-[#F5A524]/25',
        defaultReason: 'Localized queue formation monitored at Gate A',
      };
    }
    return {
      color: '#1ED760',
      glowColor: 'rgba(30, 215, 96, 0.18)',
      statusLabel: 'SAFE',
      statusBg: 'bg-[#1ED760]/10 text-[#1ED760] border-[#1ED760]/25',
      defaultReason: 'Normal pedestrian movement • No overcrowding detected',
    };
  };

  const theme = getTheme();
  const displayReason = reason || theme.defaultReason;

  // Apple Health circular activity ring geometry
  const size = 130;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedRisk / 100) * circumference;

  return (
    <div className="card-apple p-5 flex flex-col justify-between h-full animate-apple-in delay-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Risk Analysis</span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-300 ${theme.statusBg}`}
        >
          {status || theme.statusLabel}
        </span>
      </div>

      {/* Large Circular Ring Indicator with Soft Ambient Aura */}
      <div className="flex items-center justify-center my-4">
        <div className="relative w-[130px] h-[130px] flex items-center justify-center">
          {/* Subtle ambient breathing glow */}
          <div
            className="absolute inset-4 rounded-full blur-xl pointer-events-none transition-colors duration-700 opacity-60"
            style={{ backgroundColor: theme.glowColor }}
          />

          <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Active Progress Ring with smooth physics transition */}
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
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease',
              }}
            />
          </svg>

          {/* Center Readout with smooth numeric transition */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-semibold tracking-tight text-white font-sans tabular-nums">
                {Math.round(animatedScore)}
              </span>
              <span className="text-xs text-[#B9B9C5]">/ 100</span>
            </div>
            <span className="text-[10px] text-[#B9B9C5] uppercase tracking-wider font-medium mt-0.5">
              Risk Score
            </span>
          </div>
        </div>
      </div>

      {/* Confidence & Reason Footer */}
      <div className="border-t border-white/[0.05] pt-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#B9B9C5]">Confidence</span>
          <span className="text-white font-medium">
            {(fusionConfidence * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-[#B9B9C5] leading-relaxed transition-opacity duration-300">
          {displayReason}
        </p>
      </div>
    </div>
  );
};

export default RiskGauge;
