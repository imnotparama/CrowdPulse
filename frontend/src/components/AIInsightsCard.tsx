import React from 'react';
import { Sparkles, ArrowRight, Clock } from 'lucide-react';

interface AIInsightsCardProps {
  density: number;
  stampedeRisk: number;
  timeToCritical: number;
  status: string;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  density,
  stampedeRisk,
  timeToCritical,
  status,
}) => {
  const getInsights = () => {
    if (status === 'CRITICAL' || stampedeRisk > 70) {
      return {
        headline: 'Critical congestion detected in primary quadrant.',
        recommendation: 'Immediate dispatch: Open evacuation gates A & C.',
        exitTime: '3m 45s (delayed)',
        severity: 'critical',
      };
    }
    if (status === 'WARNING' || density > 0.3) {
      return {
        headline: 'Queue density building near central bottleneck.',
        recommendation: 'Pre-stage response personnel at Gate B.',
        exitTime: '2m 10s',
        severity: 'warning',
      };
    }
    return {
      headline: 'Crowd moving normally. No congestion detected.',
      recommendation: 'None required. Continue standard telemetry.',
      exitTime: '1m 12s',
      severity: 'normal',
    };
  };

  const insight = getInsights();

  return (
    <div className="card-enterprise p-4 flex flex-col gap-3 relative overflow-hidden group">
      {/* Subtle top gradient glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Sparkles size={12} />
          </div>
          <h3 className="text-xs font-semibold tracking-wider text-zinc-200 uppercase font-['Space_Grotesk']">
            AI Insights
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
          PREDICTIVE
        </span>
      </div>

      <div className="text-xs text-zinc-300 font-medium leading-relaxed">
        {insight.headline}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.05]">
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
          <div className="text-[10px] text-zinc-500 flex items-center gap-1 mb-0.5">
            <Clock size={10} />
            <span>EST. EXIT TIME</span>
          </div>
          <div className="text-xs font-semibold font-mono text-zinc-200">
            {insight.exitTime}
          </div>
        </div>

        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
          <div className="text-[10px] text-zinc-500 mb-0.5">TIME TO CRITICAL</div>
          <div className="text-xs font-semibold font-mono text-zinc-200">
            {timeToCritical > 0 ? `${timeToCritical}s` : 'Safe'}
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.06] flex items-start gap-2">
        <div className="mt-0.5 text-zinc-400 flex-shrink-0">
          <ArrowRight size={12} className="text-cyan-400" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Suggested Action</div>
          <div className="text-xs text-zinc-200 font-medium">{insight.recommendation}</div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsCard;
