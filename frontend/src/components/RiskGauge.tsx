import React from 'react';
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface RiskGaugeProps {
    risk: number;
    status: string;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, status }) => {
    const getColor = () => {
        if (risk > 75) return { bar: 'bg-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]', text: 'text-red-400' };
        if (risk > 50) return { bar: 'bg-orange-500', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.4)]', text: 'text-orange-400' };
        if (risk > 25) return { bar: 'bg-yellow-500', glow: 'shadow-[0_0_8px_rgba(234,179,8,0.3)]', text: 'text-yellow-400' };
        return { bar: 'bg-emerald-500', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]', text: 'text-emerald-400' };
    };

    const getIcon = () => {
        if (status === 'CRITICAL') return <ShieldAlert size={14} className="text-red-400 animate-pulse" />;
        if (status === 'WARNING') return <AlertTriangle size={14} className="text-orange-400" />;
        if (status === 'ELEVATED') return <Shield size={14} className="text-yellow-400" />;
        return <ShieldCheck size={14} className="text-emerald-400" />;
    };

    const colors = getColor();

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
            <div className="card-header !mb-3">
                <span className="card-title">{getIcon()} STAMPEDE RISK</span>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border rounded-sm ${getStatusColor()}`}>
                    {status}
                </span>
            </div>
            <div className="flex items-end gap-3 mb-3">
                <div className={`text-4xl font-mono font-bold tracking-tighter ${colors.text}`}>
                    {risk.toFixed(0)}
                </div>
                <span className="text-[10px] text-amd-silver/50 font-mono pb-1">/ 100</span>
            </div>
            {/* Gauge Bar */}
            <div className="w-full h-3 bg-gray-800/80 rounded-full overflow-hidden relative">
                <div 
                    className={`h-full ${colors.bar} ${colors.glow} transition-all duration-700 ease-out rounded-full`}
                    style={{ width: `${Math.min(risk, 100)}%` }}
                />
                {/* Threshold markers */}
                <div className="absolute top-0 left-[25%] w-px h-full bg-white/20" />
                <div className="absolute top-0 left-[50%] w-px h-full bg-white/20" />
                <div className="absolute top-0 left-[75%] w-px h-full bg-white/20" />
            </div>
            <div className="flex justify-between mt-1.5">
                <span className="text-[8px] text-emerald-500/60 font-mono">SAFE</span>
                <span className="text-[8px] text-yellow-500/60 font-mono">ELEVATED</span>
                <span className="text-[8px] text-orange-500/60 font-mono">WARNING</span>
                <span className="text-[8px] text-red-500/60 font-mono">CRITICAL</span>
            </div>
        </div>
    );
};

export default RiskGauge;
