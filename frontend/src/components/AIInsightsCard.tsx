import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface AIInsightsCardProps {
  density: number;
  stampedeRisk: number;
  timeToCritical: number;
  status: string;
  fusionNarrative?: string;
  fusionConfidence?: number;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  density,
  stampedeRisk,
  status,
  fusionNarrative,
  fusionConfidence = 0.94,
}) => {
  const [horizon, setHorizon] = useState<'+3m' | '+5m' | '+10m'>('+5m');

  const getBulletPoints = () => {
    if (status === 'CRITICAL' || stampedeRisk > 60) {
      return [
        fusionNarrative || 'Crowd density is critically elevated in sector corridors',
        'Stampede risk threshold breached — action advised',
        'Physical pressure sensors report localized bottlenecking',
        'Recommend opening Gate B for diversion flow',
      ];
    }
    if (status === 'WARNING' || density > 0.3) {
      return [
        fusionNarrative || 'Crowd density is moderately elevated',
        'Pedestrian flow decelerating near main ingress points',
        'Acoustic sensors report elevated ambient chatter',
        'Monitor turnstiles for queue dissipation',
      ];
    }
    return [
      fusionNarrative || 'Crowd density is low across all monitored sectors',
      'Risk level is safe with smooth egress velocity',
      'Physical edge sensors operating within normal baselines',
      'No abnormal behavioral patterns detected',
    ];
  };

  const bullets = getBulletPoints();

  return (
    <div className="card-apple p-5 flex flex-col justify-between h-full animate-apple-in delay-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.75} className="text-[#00B5FF]" />
          <span className="text-sm font-medium text-white">AI Summary</span>
        </div>

        {/* Minimal Time-Horizon Pill Control */}
        <div className="flex items-center bg-[#1C1C21] p-0.5 rounded-full border border-white/[0.05] text-[11px]">
          {(['+3m', '+5m', '+10m'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-2.5 py-0.5 rounded-full transition-all duration-200 active:scale-95 ${
                horizon === h
                  ? 'bg-[#141417] text-white shadow-sm border border-white/[0.06]'
                  : 'text-[#B9B9C5] hover:text-white'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Apple Health Style Insights Bullet Points */}
      <div className="my-3 space-y-2.5">
        {bullets.map((bullet, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-xs text-[#B9B9C5] leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B5FF] mt-1.5 flex-shrink-0" />
            <span>{bullet}</span>
          </div>
        ))}
      </div>

      {/* Footer narrative note */}
      <div className="border-t border-white/[0.05] pt-2.5 flex items-center justify-between text-xs text-[#B9B9C5]">
        <span>Analysis Confidence</span>
        <span className="text-white font-medium">
          {(fusionConfidence * 100).toFixed(0)}% Neural Fusion
        </span>
      </div>
    </div>
  );
};

export default AIInsightsCard;
