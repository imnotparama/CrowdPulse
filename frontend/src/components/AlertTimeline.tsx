import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';

interface Alert {
    id: number;
    type: string;
    severity: string;
    message: string;
    timestamp: number;
}

interface AlertTimelineProps {
    alerts: Alert[];
}

const getRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
};

const getSeverityIcon = (severity: string) => {
    switch(severity) {
        case 'CRITICAL': return <ShieldAlert size={10} className="text-red-400" />;
        case 'HIGH': return <Zap size={10} className="text-orange-400" />;
        case 'WARNING': return <AlertTriangle size={10} className="text-yellow-400" />;
        default: return <ShieldCheck size={10} className="text-emerald-400" />;
    }
};

const getSeverityDot = (severity: string) => {
    switch(severity) {
        case 'CRITICAL': return 'bg-red-500';
        case 'HIGH': return 'bg-orange-500';
        case 'WARNING': return 'bg-yellow-500';
        default: return 'bg-emerald-500';
    }
};

const getSeverityStyle = (severity: string) => {
    switch(severity) {
        case 'CRITICAL': return 'border-red-500/30 bg-red-500/5';
        case 'HIGH': return 'border-orange-500/30 bg-orange-500/5';
        case 'WARNING': return 'border-yellow-500/30 bg-yellow-500/5';
        default: return 'border-emerald-500/20 bg-emerald-500/5';
    }
};

const AlertTimeline: React.FC<AlertTimelineProps> = ({ alerts }) => {
    if (alerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-4 gap-2 opacity-40">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="text-[9px] font-mono text-amd-silver">NO ALERTS RECORDED</span>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto scrollbar-hide h-full space-y-1 p-1">
            <AnimatePresence>
                {alerts.map((alert, i) => (
                    <motion.div
                        key={`${alert.timestamp}-${i}`}
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className={`flex items-start gap-2 p-1.5 border-l-2 rounded-r-sm ${getSeverityStyle(alert.severity)}`}
                    >
                        {/* Severity dot with pulse */}
                        <div className="relative mt-0.5 flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full ${getSeverityDot(alert.severity)}`} />
                            {i === 0 && (
                                <div className={`absolute inset-0 w-2 h-2 rounded-full ${getSeverityDot(alert.severity)} animate-ping opacity-50`} />
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                {getSeverityIcon(alert.severity)}
                                <span className="text-[9px] font-mono text-white font-bold truncate">{alert.type}</span>
                            </div>
                            <div className="text-[8px] font-mono text-amd-silver/50 mt-0.5 truncate">{alert.message}</div>
                        </div>
                        
                        <span className="text-[7px] font-mono text-amd-silver/40 flex-shrink-0 mt-0.5">
                            {getRelativeTime(alert.timestamp)}
                        </span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default AlertTimeline;
