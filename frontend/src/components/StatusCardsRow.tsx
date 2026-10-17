import React from 'react';
import { Users, Layers, TrendingUp, Smartphone } from 'lucide-react';

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

export const StatusCardsRow: React.FC<StatusCardsRowProps> = ({
  count,
  maxCapacity,
  capacityPct,
  density,
  status,
  wifiProbeCount,
  avgVelocity,
}) => {
  const getDensityStatus = (val: number) => {
    if (val > 0.5) return { label: 'Critical', color: 'text-[#FF4D5A]' };
    if (val > 0.3) return { label: 'Elevated', color: 'text-[#F5A524]' };
    return { label: 'Optimal', color: 'text-[#1ED760]' };
  };

  const getPeopleStatus = () => {
    if (status === 'CRITICAL' || capacityPct > 85) return { label: 'Near Capacity', color: 'text-[#FF4D5A]' };
    if (capacityPct > 60) return { label: 'Moderate', color: 'text-[#F5A524]' };
    return { label: 'Normal', color: 'text-[#1ED760]' };
  };

  const peopleStatus = getPeopleStatus();
  const densityStatus = getDensityStatus(density);

  const kpis = [
    {
      id: 'kpi-people',
      icon: Users,
      metric: 'People',
      value: count.toString(),
      subtext: `of ${maxCapacity} limit`,
      status: peopleStatus.label,
      statusColor: peopleStatus.color,
    },
    {
      id: 'kpi-density',
      icon: Layers,
      metric: 'Crowd Density',
      value: density.toFixed(2),
      subtext: 'index',
      status: densityStatus.label,
      statusColor: densityStatus.color,
    },
    {
      id: 'kpi-flow',
      icon: TrendingUp,
      metric: 'Pedestrian Flow',
      value: `${(avgVelocity / 25).toFixed(1)} m/s`,
      subtext: 'average',
      status: 'Normal',
      statusColor: 'text-[#1ED760]',
    },
    {
      id: 'kpi-devices',
      icon: Smartphone,
      metric: 'Active Devices',
      value: wifiProbeCount.toString(),
      subtext: 'Wi-Fi probes',
      status: 'Stable',
      statusColor: 'text-[#1ED760]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="card-apple p-5 flex flex-col justify-between min-h-[130px] hover:border-white/[0.10] transition-colors"
        >
          {/* Top row: Icon + Metric label */}
          <div className="flex items-center gap-2.5 text-[#B9B9C5]">
            <kpi.icon size={18} strokeWidth={1.75} className="text-[#B9B9C5]" />
            <span className="text-sm font-medium text-[#B9B9C5]">{kpi.metric}</span>
          </div>

          {/* Large Number & Status */}
          <div className="flex items-baseline justify-between mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight text-white font-sans">
                {kpi.value}
              </span>
            </div>
            <span className={`text-xs font-medium ${kpi.statusColor}`}>
              {kpi.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatusCardsRow;
