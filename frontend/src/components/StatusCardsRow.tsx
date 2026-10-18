import React, { useState, useEffect } from 'react';
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

// Micro-animated smooth number interpolation (Apple Health style)
const AnimatedNumber: React.FC<{ value: number; decimals?: number; suffix?: string }> = ({
  value,
  decimals = 0,
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    if (Math.abs(start - end) < 0.001) return;
    const duration = 380;
    const startTime = performance.now();

    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Apple fluid deceleration curve: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
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
  }, [value, displayValue]);

  return (
    <span>
      {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue)}
      {suffix}
    </span>
  );
};

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
      renderValue: <AnimatedNumber value={count} decimals={0} />,
      status: `${peopleStatus.label} (${Math.round((count / (maxCapacity || 200)) * 100)}%)`,
      statusColor: peopleStatus.color,
      delayClass: 'delay-100',
    },
    {
      id: 'kpi-density',
      icon: Layers,
      metric: 'Crowd Density',
      renderValue: <AnimatedNumber value={density} decimals={2} />,
      status: densityStatus.label,
      statusColor: densityStatus.color,
      delayClass: 'delay-200',
    },
    {
      id: 'kpi-flow',
      icon: TrendingUp,
      metric: 'Pedestrian Flow',
      renderValue: <AnimatedNumber value={avgVelocity / 25} decimals={1} suffix=" m/s" />,
      status: 'Normal',
      statusColor: 'text-[#1ED760]',
      delayClass: 'delay-300',
    },
    {
      id: 'kpi-devices',
      icon: Smartphone,
      metric: 'Active Devices',
      renderValue: <AnimatedNumber value={wifiProbeCount} decimals={0} />,
      status: 'Stable',
      statusColor: 'text-[#1ED760]',
      delayClass: 'delay-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className={`card-apple p-5 flex flex-col justify-between min-h-[130px] animate-apple-in ${kpi.delayClass}`}
        >
          {/* Top row: Icon + Metric label */}
          <div className="flex items-center gap-2.5 text-[#B9B9C5]">
            <div className="w-7 h-7 rounded-lg bg-[#1C1C21] flex items-center justify-center transition-transform group-hover:scale-110">
              <kpi.icon size={16} strokeWidth={1.75} className="text-[#B9B9C5]" />
            </div>
            <span className="text-sm font-medium text-[#B9B9C5]">{kpi.metric}</span>
          </div>

          {/* Large Number & Status */}
          <div className="flex items-baseline justify-between mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight text-white font-sans tabular-nums">
                {kpi.renderValue}
              </span>
            </div>
            <span className={`text-xs font-medium transition-colors duration-300 ${kpi.statusColor}`}>
              {kpi.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatusCardsRow;
