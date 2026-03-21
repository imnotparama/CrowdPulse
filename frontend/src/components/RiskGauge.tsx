import React from 'react';
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface RiskGaugeProps {
    risk: number;
    status: string;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, status }) => {
    const getColor = () => {
        if (risk > 75) return { stroke: '#ef4444', text: 'text-red-400', glow: 'rgba(239,68,68,0.6)' };
        if (risk > 50) return { stroke: '#f97316', text: 'text-orange-400', glow: 'rgba(249,115,22,0.5)' };
        if (risk > 25) return { stroke: '#eab308', text: 'text-yellow-400', glow: 'rgba(234,179,8,0.4)' };
        return { stroke: '#10b981', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.4)' };
    };

    const getIcon = () => {
        if (status === 'CRITICAL') return <ShieldAlert size={14} className="text-red-400 animate-pulse" />;
        if (status === 'WARNING') return <AlertTriangle size={14} className="text-orange-400" />;
        if (status === 'ELEVATED') return <Shield size={14} className="text-yellow-400" />;
        return <ShieldCheck size={14} className="text-emerald-400" />;
    };

    const colors = getColor();
    const clampedRisk = Math.min(Math.max(risk, 0), 100);

    // SVG Arc gauge calculations
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    // Arc from 135deg to 405deg (270deg sweep)
    const startAngle = 135;
    const endAngle = 405;
    const sweepAngle = endAngle - startAngle;
    const filledAngle = startAngle + (clampedRisk / 100) * sweepAngle;

    const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };

    const describeArc = (cx: number, cy: number, r: number, startA: number, endA: number) => {
        const start = polarToCartesian(cx, cy, r, endA);
        const end = polarToCartesian(cx, cy, r, startA);
        const largeArc = endA - startA <= 180 ? '0' : '1';
        return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
    };

    // Needle endpoint
    const needleEnd = polarToCartesian(center, center, radius - 15, filledAngle);

    const getStatusColor = () => {
        switch(status) {
            case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/30';
            case 'WARNING': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
            case 'ELEVATED': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        }
    };

    return (
        <div className="card bg-black/50">
            <div className="card-header !mb-1">
                <span className="card-title">{getIcon()} STAMPEDE RISK</span>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border rounded-sm ${getStatusColor()}`}>
                    {status}
                </span>
            </div>
            
            {/* SVG Arc Gauge */}
            <div className="flex items-center justify-center relative" style={{ height: '90px' }}>
                <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.75}`} className="overflow-visible">
                    <defs>
                        <filter id="gaugeGlow">
                            <feGaussianBlur stdDeviation="3" result="glow" />
                            <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    
                    {/* Background track */}
                    <path
                        d={describeArc(center, center, radius, startAngle, endAngle)}
                        fill="none"
                        stroke="#222"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                    
                    {/* Filled arc */}
                    <path
                        d={describeArc(center, center, radius, startAngle, filledAngle)}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        filter="url(#gaugeGlow)"
                        style={{ transition: 'all 0.7s ease-out' }}
                    />

                    {/* Needle */}
                    <line
                        x1={center}
                        y1={center}
                        x2={needleEnd.x}
                        y2={needleEnd.y}
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        style={{ transition: 'all 0.7s ease-out' }}
                    />
                    <circle cx={center} cy={center} r="3" fill="white" />

                    {/* Threshold markers */}
                    {[25, 50, 75].map(threshold => {
                        const angle = startAngle + (threshold / 100) * sweepAngle;
                        const inner = polarToCartesian(center, center, radius - 12, angle);
                        const outer = polarToCartesian(center, center, radius + 4, angle);
                        return (
                            <line key={threshold} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                                stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                        );
                    })}
                </svg>
                
                {/* Center value */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                    <div className={`text-2xl font-mono font-bold tracking-tighter ${colors.text}`} style={{ transition: 'color 0.5s' }}>
                        {clampedRisk.toFixed(0)}
                    </div>
                    <span className="text-[8px] text-amd-silver/50 font-mono">/ 100</span>
                </div>
            </div>

            {/* Labels below gauge */}
            <div className="flex justify-between mt-1">
                <span className="text-[8px] text-emerald-500/60 font-mono">SAFE</span>
                <span className="text-[8px] text-yellow-500/60 font-mono">ELEVATED</span>
                <span className="text-[8px] text-orange-500/60 font-mono">WARNING</span>
                <span className="text-[8px] text-red-500/60 font-mono">CRITICAL</span>
            </div>
        </div>
    );
};

export default RiskGauge;
