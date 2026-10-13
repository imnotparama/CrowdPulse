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

// Micro-animated smooth number transition
const AnimatedNumber: React.FC<{ value: number; decimals?: number }> = ({ value, decimals = 0 }) => {
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    const start = displayValue;
    const end = value;
    if (Math.abs(start - end) < 0.001) return;
    const duration = 350;
    const startTime = performance.now();

    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = start + (end - start) * eased;
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setDisplayValue(end);
      }
    };
    const req = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(req);
  }, [value]);

  return <span>{decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue)}</span>;
};

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
  const getDensityPill = (val: number) => {
    if (val > 0.5) return <span className="pill-glowing-critical">CRITICAL</span>;
    if (val > 0.3) return <span className="pill-glowing-warning">WARNING</span>;
    if (val > 0.15) return <span className="pill-glowing-warning">ELEVATED</span>;
    return <span className="pill-glowing-safe">OPTIMAL</span>;
  };

  const getRiskColor = (risk: number) => {
    if (risk > 70) return '#ff1744';
    if (risk > 40) return '#ff9800';
    if (risk > 20) return '#ffc107';
    return '#00ff88';
  };

  const ringColor = getRiskColor(stampedeRisk);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. People Detected */}
      <div className="card-level-2 p-3.5 flex flex-col justify-between group hover:border-white/15 transition-all">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <div className="w-5 h-5 rounded-md bg-white/[0.05] flex items-center justify-center text-zinc-300">
              <Users size={12} />
            </div>
            <span className="font-['Space_Grotesk'] font-semibold text-zinc-300">PEOPLE</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
            <AnimatedNumber value={capacityPct} decimals={0} />% CAP
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl lg:text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            <AnimatedNumber value={count} decimals={0} />
          </span>
          <span className="text-xs font-mono text-zinc-500">/ {maxCapacity}</span>
        </div>
      </div>

      {/* 2. Crowd Density */}
      <div className="card-level-2 p-3.5 flex flex-col justify-between group hover:border-white/15 transition-all">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <div className="w-5 h-5 rounded-md bg-white/[0.05] flex items-center justify-center text-zinc-300">
              <AlertTriangle size={12} />
            </div>
            <span className="font-['Space_Grotesk'] font-semibold text-zinc-300">DENSITY</span>
          </div>
          {getDensityPill(density)}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl lg:text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            <AnimatedNumber value={density} decimals={2} />
          </span>
          <span className="text-xs font-mono text-zinc-500">idx</span>
        </div>
      </div>

      {/* 3. Stampede Risk with Mini Circular Ring */}
      <div className="card-level-2 p-3.5 flex flex-col justify-between group hover:border-white/15 transition-all">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <div className="w-5 h-5 rounded-md bg-white/[0.05] flex items-center justify-center text-zinc-300">
              <ShieldCheck size={12} />
            </div>
            <span className="font-['Space_Grotesk'] font-semibold text-zinc-300">RISK</span>
          </div>
          <span className={status === 'CRITICAL' ? 'pill-glowing-critical' : status === 'WARNING' ? 'pill-glowing-warning' : 'pill-glowing-safe'}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {status}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl lg:text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              <AnimatedNumber value={stampedeRisk} decimals={0} />
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
      <div className="card-level-2 p-3.5 flex flex-col justify-between group hover:border-white/15 transition-all">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <div className="w-5 h-5 rounded-md bg-white/[0.05] flex items-center justify-center text-zinc-300">
              <Wifi size={12} />
            </div>
            <span className="font-['Space_Grotesk'] font-semibold text-zinc-300">DEVICES</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {activeWifiZones > 0 ? `${activeWifiZones} ZONES` : 'PROBE'}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl lg:text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            <AnimatedNumber value={wifiProbeCount} decimals={0} />
          </span>
          <span className="text-xs font-mono text-zinc-500">probed</span>
        </div>
      </div>

      {/* 5. Flow Velocity */}
      <div className="card-level-2 p-3.5 flex flex-col justify-between group hover:border-white/15 transition-all">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
            <div className="w-5 h-5 rounded-md bg-white/[0.05] flex items-center justify-center text-zinc-300">
              <Activity size={12} />
            </div>
            <span className="font-['Space_Grotesk'] font-semibold text-zinc-300">SPEED</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
            <ArrowUpRight size={11} />
            PACED
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl lg:text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            <AnimatedNumber value={avgVelocity / 25} decimals={1} />
          </span>
          <span className="text-xs font-mono text-zinc-500">m/s</span>
        </div>
      </div>
    </div>
  );
};

export default StatusCardsRow;
