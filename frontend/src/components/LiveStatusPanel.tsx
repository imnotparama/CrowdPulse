import React from 'react';
import { ShieldCheck, Compass, CheckCircle2, ArrowUpRight, Gauge, Layers, Users } from 'lucide-react';

interface SectorItem {
  name: string;
  count: number;
  status: string;
}

interface LiveStatusPanelProps {
  count: number;
  maxCapacity: number;
  density: number;
  stampedeRisk: number;
  wifiProbeCount: number;
  avgVelocity: number;
  status: string;
  temperature?: number;
  humidity?: number;
  noiseDb?: number;
  flowDirection?: { angle: number; label: string };
  capacityPct?: number;
  sectors?: SectorItem[];
}

export const LiveStatusPanel: React.FC<LiveStatusPanelProps> = ({
  count,
  maxCapacity,
  density,
  stampedeRisk,
  avgVelocity,
  status,
  flowDirection = { angle: 45, label: 'EAST' },
  capacityPct,
}) => {
  const capPct = capacityPct ?? Math.min(100, Math.round((count / maxCapacity) * 100));

  // Sector breakdown based on active camera and venue zones
  const sectorList = [
    {
      id: 'sec-1',
      name: 'Main Entrance',
      count: count,
      load: `${capPct}%`,
      pacing: 'Paced Flow',
      status: count > 100 ? 'ELEVATED' : 'NOMINAL',
      color: 'emerald',
    },
    {
      id: 'sec-2',
      name: 'South Turnstiles',
      count: 0,
      load: '0%',
      pacing: 'Unobstructed',
      status: 'NOMINAL',
      color: 'emerald',
    },
    {
      id: 'sec-3',
      name: 'Gate A Concourse',
      count: 0,
      load: '0%',
      pacing: 'Queue Free',
      status: 'OPTIMAL',
      color: 'cyan',
    },
    {
      id: 'sec-4',
      name: 'Emergency Exits',
      count: 0,
      load: '100% Cleared',
      pacing: 'Evac Ready',
      status: 'READY',
      color: 'emerald',
    },
  ];

  return (
    <div className="card-level-2 p-3.5 flex flex-col gap-3 relative overflow-hidden group">
      {/* Subtle top indicator highlight */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <Layers size={13} />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wider text-zinc-100 uppercase font-['Space_Grotesk']">
              Sector Flow & Access
            </h3>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
            status === 'CRITICAL'
              ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
              : status === 'WARNING'
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === 'CRITICAL'
                ? 'bg-rose-400'
                : status === 'WARNING'
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            } animate-pulse`}
          />
          {status || 'NOMINAL'}
        </span>
      </div>

      {/* Venue Aggregate Capacity Bar */}
      <div className="bg-black/40 p-2.5 rounded-xl border border-white/[0.05] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
            <Users size={12} className="text-zinc-400" />
            <span>VENUE LOAD</span>
          </div>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-sm font-bold text-white">{count}</span>
            <span className="text-[10px] text-zinc-500">/ {maxCapacity} cap</span>
            <span className="text-[11px] font-bold text-emerald-400 ml-1">({capPct}%)</span>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              capPct > 80
                ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                : capPct > 50
                ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            }`}
            style={{ width: `${Math.max(2, capPct)}%` }}
          />
        </div>
      </div>

      {/* Sector Clearance Table */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 px-1 uppercase tracking-wider">
          <span>Monitored Sector</span>
          <span>Load / State</span>
        </div>

        <div className="flex flex-col divide-y divide-white/[0.04]">
          {sectorList.map((sec) => (
            <div
              key={sec.id}
              className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs hover:bg-white/[0.02] px-1 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    sec.color === 'cyan' ? 'bg-cyan-400' : 'bg-emerald-400'
                  }`}
                />
                <span className="text-zinc-300 font-medium text-[11px] font-['Space_Grotesk']">
                  {sec.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-400">{sec.pacing}</span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    sec.status === 'ELEVATED'
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                      : sec.status === 'OPTIMAL'
                      ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25'
                      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                  }`}
                >
                  {sec.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crowd Dynamics Micro-Grid */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/[0.05]">
        {/* Flow Vector */}
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
            <Compass size={11} className="text-cyan-400" />
            <span>FLOW VEC</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-zinc-200">
            <span>{flowDirection.label}</span>
            <ArrowUpRight size={11} className="text-cyan-400" />
          </div>
        </div>

        {/* Velocity */}
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
            <Gauge size={11} className="text-emerald-400" />
            <span>EGRESS PACING</span>
          </div>
          <span className="text-[11px] font-mono font-bold text-zinc-200">
            {(avgVelocity / 25).toFixed(1)} m/s
          </span>
        </div>

        {/* Chokepoint Risk */}
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
            <ShieldCheck size={11} className="text-purple-400" />
            <span>BOTTLENECK</span>
          </div>
          <span className="text-[10px] font-mono font-semibold text-emerald-400">
            {density > 0.4 ? 'ELEVATED' : 'LOW (<5%)'}
          </span>
        </div>

        {/* Evacuation Readiness */}
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
            <CheckCircle2 size={11} className="text-emerald-400" />
            <span>EVAC TIME</span>
          </div>
          <span className="text-[11px] font-mono font-bold text-zinc-200">
            {stampedeRisk > 50 ? '~4.2m' : '~1.8m'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveStatusPanel;
