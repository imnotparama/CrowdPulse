import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface AlertEntry {
    id: number;
    type: string;
    severity: string;
    message: string;
    timestamp: number;
}

interface AlertTimelineProps {
    alerts: AlertEntry[];
}

const AlertTimeline: React.FC<AlertTimelineProps> = ({ alerts }) => {
    const getSeverityColor = (severity: string) => {
        switch(severity) {
            case 'CRITICAL': return 'border-red-500 bg-red-500/5';
            case 'HIGH': return 'border-orange-500 bg-orange-500/5';
            case 'WARNING': return 'border-yellow-500 bg-yellow-500/5';
            default: return 'border-amd-silver/30 bg-white/5';
        }
    };

    const getSeverityDot = (severity: string) => {
        switch(severity) {
            case 'CRITICAL': return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]';
            case 'HIGH': return 'bg-orange-500';
            case 'WARNING': return 'bg-yellow-500';
            default: return 'bg-amd-silver';
        }
    };

    if (alerts.length === 0) {
        return (
            <div className="flex items-center gap-2 text-amd-silver/30 font-mono text-[10px] py-4 justify-center">
                <AlertTriangle size={12} />
                <span>NO ALERTS RECORDED</span>
            </div>
        );
    }

    return (
        <div className="space-y-1.5 overflow-y-auto max-h-full scrollbar-hide">
            {alerts.map((alert, i) => (
                <div 
                    key={i} 
                    className={`border-l-2 ${getSeverityColor(alert.severity)} px-2 py-1.5 transition-colors hover:bg-white/5`}
                >
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${getSeverityDot(alert.severity)}`} />
                        <span className="text-[10px] font-mono font-bold text-white">{alert.type}</span>
                        <span className="text-[8px] font-mono text-amd-silver/50 ml-auto">
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                    <div className="text-[9px] font-mono text-amd-silver/60 pl-3.5 leading-tight truncate">
                        Zone {alert.id} — {alert.severity}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AlertTimeline;
