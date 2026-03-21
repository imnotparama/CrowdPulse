import React from 'react';
import { AlertTriangle, ShieldAlert, Zap } from 'lucide-react';

interface CrowdAlertProps {
    alert: {
        id: number;
        type: string;
        severity: string;
        message: string;
    };
}

const CrowdAlert: React.FC<CrowdAlertProps> = ({ alert }) => {
    const getSeverityStyle = () => {
        switch(alert.severity) {
            case 'CRITICAL':
                return {
                    border: 'border-red-500',
                    bg: 'bg-red-950/90',
                    accent: 'bg-red-500',
                    text: 'text-red-400',
                    icon: <ShieldAlert size={18} className="text-red-400" />,
                    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                };
            case 'HIGH':
                return {
                    border: 'border-orange-500',
                    bg: 'bg-orange-950/90',
                    accent: 'bg-orange-500',
                    text: 'text-orange-400',
                    icon: <Zap size={18} className="text-orange-400" />,
                    glow: 'shadow-[0_0_25px_rgba(249,115,22,0.25)]'
                };
            default:
                return {
                    border: 'border-yellow-500',
                    bg: 'bg-yellow-950/90',
                    accent: 'bg-yellow-500',
                    text: 'text-yellow-400',
                    icon: <AlertTriangle size={18} className="text-yellow-400" />,
                    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                };
        }
    };

    const style = getSeverityStyle();

    return (
        <div className={`w-80 ${style.bg} backdrop-blur-md border ${style.border} ${style.glow} rounded-sm overflow-hidden animate-fade-in relative`}>
            <div className="absolute inset-0 pointer-events-none scanlines opacity-50 mix-blend-overlay z-0" />
            
            {/* Severity Accent Strip */}
            <div className={`relative z-10 h-1 ${style.accent} w-full`} />
            
            <div className="p-3">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    {style.icon}
                    <div className="flex-1">
                        <div className={`text-xs font-mono font-bold ${style.text} tracking-wider`}>
                            {alert.type}
                        </div>
                        <div className="text-[8px] font-mono text-amd-silver/50">
                            ZONE {alert.id} • {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border rounded-sm ${style.text} border-current animate-pulse-fast`}>
                        {alert.severity}
                    </span>
                </div>
                
                {/* Message */}
                <p className="text-[10px] font-mono text-white/80 leading-relaxed">
                    {alert.message}
                </p>
            </div>

            {/* Auto-dismiss progress bar */}
            <div className="h-0.5 bg-black/50">
                <div className={`h-full ${style.accent} auto-dismiss-bar`} />
            </div>
        </div>
    );
};

export default CrowdAlert;
