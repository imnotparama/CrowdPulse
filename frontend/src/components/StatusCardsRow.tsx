import React from 'react';
import { Users, AlertTriangle, ShieldCheck, Wifi, Activity, Cpu } from 'lucide-react';

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
  temperature?: number;
  humidity?: number;
  noiseDb?: number;
  motionDetected?: boolean;
  fusionConfidence?: number;
  sensorStatus?: string;
  hardwareStatus?: string;
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
  temperature = 24.5,
  humidity = 52.0,
  noiseDb = 58.0,
  motionDetected = false,
  hardwareStatus = 'SIMULATED',
}) => {
  const getDensityPill = (val: number) => {
    if (val > 0.5) return <span className="pill-glowing-critical py-0.2 px-2 text-[9px]">CRITICAL</span>;
    if (val > 0.3) return <span className="pill-glowing-warning py-0.2 px-2 text-[9px]">WARNING</span>;
    if (val > 0.15) return <span className="pill-glowing-warning py-0.2 px-2 text-[9px]">ELEVATED</span>;
    return <span className="pill-glowing-safe py-0.2 px-2 text-[9px]">OPTIMAL</span>;
  };

  const getStatusPill = (st: string) => {
    if (st === 'CRITICAL' || st === 'EVACUATE') return <span className="pill-glowing-critical py-0.2 px-2 text-[9px]">CRITICAL</span>;
    if (st === 'WARNING') return <span className="pill-glowing-warning py-0.2 px-2 text-[9px]">WARNING</span>;
    return <span className="pill-glowing-safe py-0.2 px-2 text-[9px]">SAFE</span>;
  };

  return (
    <div className="w-full">
      {/* ── Single Unified Command Telemetry Ribbon ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {/* 1. People Detected */}
        <div className="card-level-2 p-2.5 flex flex-col justify-between group hover:border-emerald-500/40 border-t-2 border-t-emerald-500/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Users size={11} />
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-[11px] text-zinc-200">PEOPLE</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/[0.06]">
              <AnimatedNumber value={capacityPct} decimals={0} />% CAP
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              <AnimatedNumber value={count} decimals={0} />
            </span>
            <span className="text-[10px] font-mono text-zinc-500">/ {maxCapacity}</span>
          </div>
          {/* Micro Capacity Gauge */}
          <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, capacityPct)}%` }}
            />
          </div>
        </div>

        {/* 2. Crowd Density */}
        <div className="card-level-2 p-2.5 flex flex-col justify-between group hover:border-amber-500/40 border-t-2 border-t-amber-500/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <AlertTriangle size={11} />
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-[11px] text-zinc-200">DENSITY</span>
            </div>
            {getDensityPill(density)}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              <AnimatedNumber value={density} decimals={2} />
            </span>
            <span className="text-[10px] font-mono text-zinc-500">idx</span>
          </div>
          {/* Micro Density Bar */}
          <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                density > 0.4 ? 'bg-rose-500' : density > 0.25 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, (density / 0.6) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Threat Index */}
        <div className="card-level-2 p-2.5 flex flex-col justify-between group hover:border-rose-500/40 border-t-2 border-t-rose-500/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <div className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
                <ShieldCheck size={11} />
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-[11px] text-zinc-200">THREAT</span>
            </div>
            {getStatusPill(status)}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              <AnimatedNumber value={stampedeRisk} decimals={0} />
            </span>
            <span className="text-[10px] font-mono text-zinc-500">/ 100</span>
          </div>
          {/* Micro Threat Bar */}
          <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stampedeRisk > 50 ? 'bg-rose-500' : stampedeRisk > 25 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, stampedeRisk)}%` }}
            />
          </div>
        </div>

        {/* 4. Crowd Velocity */}
        <div className="card-level-2 p-2.5 flex flex-col justify-between group hover:border-purple-500/40 border-t-2 border-t-purple-500/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <div className="w-5 h-5 rounded-md bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <Activity size={11} />
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-[11px] text-zinc-200">VELOCITY</span>
            </div>
            <span className="text-[9px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
              PACED
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              {(avgVelocity / 25).toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">m/s</span>
          </div>
          {/* Micro Speed Bar */}
          <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (avgVelocity / 50) * 100)}%` }}
            />
          </div>
        </div>

        {/* 5. Wi-Fi Probes */}
        <div className="card-level-2 p-2.5 flex flex-col justify-between group hover:border-cyan-500/40 border-t-2 border-t-cyan-500/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <div className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <Wifi size={11} />
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-[11px] text-zinc-200">DEVICES</span>
            </div>
            <span className="text-[9px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
              {activeWifiZones} ZONES
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              {wifiProbeCount}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">probed</span>
          </div>
          {/* Micro Probes Bar */}
          <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, wifiProbeCount * 10)}%` }}
            />
          </div>
        </div>

        {/* 6. Physical Edge Sensing Node */}
        <div className="card-level-2 p-2.5 flex flex-col justify-between group hover:border-sky-500/40 border-t-2 border-t-sky-500/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <div className="w-5 h-5 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
                <Cpu size={11} />
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-[11px] text-zinc-200">EDGE IOT</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              {hardwareStatus}
            </span>
          </div>
          <div className="flex items-baseline gap-1 text-[11px] font-mono font-bold text-zinc-100">
            <span>{temperature.toFixed(1)}°C</span>
            <span className="text-zinc-600">•</span>
            <span>{humidity.toFixed(0)}%</span>
            <span className="text-zinc-600">•</span>
            <span className="text-cyan-300">{noiseDb.toFixed(0)}dB</span>
          </div>
          <div className="text-[9px] font-mono text-zinc-500 flex items-center justify-between mt-1.5">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${motionDetected ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span>{motionDetected ? 'MOTION' : 'PIR STATIC'}</span>
            </span>
            <span className="text-emerald-400">OPTIMAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusCardsRow;
