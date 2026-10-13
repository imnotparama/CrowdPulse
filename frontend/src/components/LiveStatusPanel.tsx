import React from 'react';
import { Users, AlertTriangle, Shield, Smartphone, Gauge, Mic, Thermometer } from 'lucide-react';

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
}

export const LiveStatusPanel: React.FC<LiveStatusPanelProps> = ({
  count,
  maxCapacity,
  density,
  stampedeRisk,
  wifiProbeCount,
  avgVelocity,
  status,
  temperature,
  humidity,
  noiseDb,
}) => {
  const getDensityText = (val: number) => {
    if (val > 0.5) return 'Critical';
    if (val > 0.3) return 'High';
    if (val > 0.15) return 'Moderate';
    return 'Low';
  };

  const getRiskText = (risk: number) => {
    if (risk > 70) return 'High';
    if (risk > 35) return 'Medium';
    return 'Low';
  };

  const statusItems = [
    {
      icon: Users,
      label: 'People',
      value: `${count} / ${maxCapacity}`,
      subtext: `${((count / maxCapacity) * 100).toFixed(0)}% of venue limit`,
      color: 'text-zinc-100',
    },
    {
      icon: AlertTriangle,
      label: 'Density',
      value: getDensityText(density),
      subtext: `${density.toFixed(2)} density index`,
      color: density > 0.3 ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      icon: Smartphone,
      label: 'Devices',
      value: `${wifiProbeCount}`,
      subtext: 'ESP32 Wi-Fi probes active',
      color: 'text-cyan-400',
    },
    {
      icon: Shield,
      label: 'Risk',
      value: getRiskText(stampedeRisk),
      subtext: `${stampedeRisk.toFixed(0)}/100 threshold`,
      color: stampedeRisk > 40 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      icon: Gauge,
      label: 'Average Speed',
      value: `${(avgVelocity / 25).toFixed(1)} m/s`,
      subtext: 'Paced pedestrian flow',
      color: 'text-zinc-100',
    },
    ...(noiseDb !== undefined
      ? [
          {
            icon: Mic,
            label: 'Acoustics',
            value: `${noiseDb.toFixed(0)} dB`,
            subtext: noiseDb > 80 ? 'Elevated noise spike' : 'INMP441 MEMS baseline',
            color: noiseDb > 80 ? 'text-amber-400' : 'text-zinc-100',
          },
        ]
      : []),
    ...(temperature !== undefined && humidity !== undefined
      ? [
          {
            icon: Thermometer,
            label: 'Environment',
            value: `${temperature.toFixed(1)}°C`,
            subtext: `${humidity.toFixed(0)}% RH (AM2302)`,
            color: temperature > 32 ? 'text-rose-400' : 'text-zinc-100',
          },
        ]
      : []),
  ];

  return (
    <div className="card-level-2 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <h3 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase font-['Space_Grotesk']">
          Live Status
        </h3>
        <span className={`flex items-center gap-1.5 text-[10px] font-mono ${
          status === 'CRITICAL' ? 'text-red-400' : status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'CRITICAL' ? 'bg-red-400' : status === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'
          } animate-pulse`} />
          {status || 'NOMINAL'}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.04]">
        {statusItems.map((item, idx) => (
          <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-zinc-400">
                <item.icon size={14} />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-300">{item.label}</div>
                <div className="text-[10px] font-mono text-zinc-500">{item.subtext}</div>
              </div>
            </div>
            <div className={`text-sm font-semibold font-['Space_Grotesk'] ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveStatusPanel;
