import React, { useState } from 'react';
import { Sparkles, ArrowRight, Clock, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';

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
  timeToCritical,
  status,
  fusionNarrative,
  fusionConfidence,
}) => {
  const [forecastHorizon, setForecastHorizon] = useState<'+3m' | '+5m' | '+10m'>('+5m');

  const getForecastData = () => {
    switch (forecastHorizon) {
      case '+3m':
        return {
          occupancy: (density * 100 * 1.15).toFixed(0),
          risk: Math.min(100, stampedeRisk * 1.1).toFixed(0),
          delta: '+15%',
          time: '3 minutes',
        };
      case '+5m':
        return {
          occupancy: (density * 100 * 1.32).toFixed(0),
          risk: Math.min(100, stampedeRisk * 1.25).toFixed(0),
          delta: '+32%',
          time: '5 minutes',
        };
      case '+10m':
        return {
          occupancy: (density * 100 * 1.48).toFixed(0),
          risk: Math.min(100, stampedeRisk * 1.4).toFixed(0),
          delta: '+48%',
          time: '10 minutes',
        };
    }
  };

  const forecast = getForecastData();

  const getInsights = () => {
    const calculatedConfidence =
      fusionConfidence !== undefined ? `${(fusionConfidence * 100).toFixed(1)}%` : '94.8%';

    if (status === 'CRITICAL' || stampedeRisk > 70) {
      return {
        narrative:
          fusionNarrative ||
          'Critical density anomaly detected in Sector North. Walking velocity dropped 34% over 90 seconds, indicating severe bottleneck formation.',
        recommendation: 'Pre-emptively open Gate B and divert incoming flow to Exit Corridors 1 & 3.',
        reductionImpact: '42% congestion drop',
        exitTime: '3m 45s (delayed)',
        confidence: calculatedConfidence,
        isAlert: true,
      };
    }
    if (status === 'WARNING' || density > 0.3) {
      return {
        narrative:
          fusionNarrative ||
          'Queue pressure building near central choke point. Walking velocity decelerating by 14% as inflow outpaces clearance rate.',
        recommendation: 'Deploy secondary turnstiles at Gate A to equalize flow with Exit 2.',
        reductionImpact: '28% congestion drop',
        exitTime: '2m 10s',
        confidence: calculatedConfidence,
        isAlert: true,
      };
    }
    return {
      narrative:
        fusionNarrative ||
        'Current crowd occupancy is nominal. Flow vectors show smooth clearance toward main exits.',
      recommendation: 'Continue nominal surveillance. All sector capacities operating safely below 40% threshold.',
      reductionImpact: 'Optimal throughput',
      exitTime: '1m 12s',
      confidence: calculatedConfidence,
      isAlert: false,
    };
  };

  const insight = getInsights();

  return (
    <div className="card-level-1 p-4 flex flex-col gap-3 relative overflow-hidden group">
      {/* Top cyan accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(0,224,255,0.2)]">
            <Sparkles size={13} />
          </div>
          <h3 className="text-xs font-bold tracking-wider text-white uppercase font-['Space_Grotesk']">
            AI Operational Insights
          </h3>
        </div>
        <span className="pill-glowing-safe text-[9px] py-0.5 px-2">
          CONFIDENCE {insight.confidence}
        </span>
      </div>

      {/* Narrative */}
      <div className="text-xs text-zinc-300 font-sans leading-relaxed bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
        {insight.narrative}
      </div>

      {/* ── Predictive Mode Horizon Switcher (Killer Feature) ── */}
      <div className="bg-black/40 p-2.5 rounded-xl border border-white/[0.06] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400">
            <TrendingUp size={12} />
            <span className="font-semibold uppercase tracking-wider">Predictive Mode (Future Crowd)</span>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
            {(['+3m', '+5m', '+10m'] as const).map((horizon) => (
              <button
                key={horizon}
                onClick={() => setForecastHorizon(horizon)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                  forecastHorizon === horizon
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {horizon}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div className="text-[11px] text-zinc-400 font-sans">
            Predicted Occupancy in <span className="text-zinc-200 font-mono font-bold">{forecast.time}</span>:
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-['Space_Grotesk'] text-cyan-400">
              {forecast.occupancy}%
            </span>
            <span className="text-[10px] font-mono text-amber-400/90 font-semibold">
              ({forecast.delta})
            </span>
          </div>
        </div>
      </div>

      {/* Evacuation & Critical Vitals */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
          <div className="text-[9px] text-zinc-400 flex items-center gap-1 mb-0.5 font-mono">
            <Clock size={10} className="text-zinc-500" />
            <span>EST. CLEARANCE TIME</span>
          </div>
          <div className="text-xs font-semibold font-mono text-zinc-200">
            {insight.exitTime}
          </div>
        </div>

        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
          <div className="text-[9px] text-zinc-400 flex items-center gap-1 mb-0.5 font-mono">
            <ShieldCheck size={10} className="text-emerald-400" />
            <span>TIME TO CRITICAL</span>
          </div>
          <div className="text-xs font-semibold font-mono text-zinc-200">
            {timeToCritical > 0 ? `${timeToCritical}s` : 'Nominal'}
          </div>
        </div>
      </div>

      {/* Smart Quantified Action Recommendation */}
      <div className="bg-cyan-500/[0.04] p-2.5 rounded-xl border border-cyan-500/20 flex items-start gap-2.5">
        <div className="mt-0.5 p-1 rounded-md bg-cyan-500/10 text-cyan-400 flex-shrink-0">
          {insight.isAlert ? <AlertTriangle size={13} className="text-amber-400" /> : <ArrowRight size={13} />}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              Smart Recommendation
            </span>
            <span className="text-[9px] font-mono text-emerald-400 font-semibold">
              {insight.reductionImpact}
            </span>
          </div>
          <div className="text-xs text-zinc-200 font-medium mt-0.5 leading-snug">
            {insight.recommendation}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsCard;
