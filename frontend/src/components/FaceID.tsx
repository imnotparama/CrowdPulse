import React from 'react';
import { AlertTriangle, Users } from 'lucide-react';

interface AlertData {
    id: number;
    type: string;
    severity: string;
    message: string;
}

interface CrowdAlertProps {
    alert: AlertData | null;
}

const CrowdAlert: React.FC<CrowdAlertProps> = ({ alert }) => {
    if (!alert) return null;

    const getSeverityColor = () => {
        switch (alert.severity) {
            case 'CRITICAL': return 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]';
            case 'HIGH': return 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]';
            default: return 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
        }
    };

    const getSeverityBg = () => {
        switch (alert.severity) {
            case 'CRITICAL': return 'bg-red-500/20 text-red-400';
            case 'HIGH': return 'bg-orange-500/20 text-orange-400';
            default: return 'bg-yellow-500/20 text-yellow-400';
        }
    };

    return (
        <div className={`w-72 border-l-4 ${getSeverityColor()} bg-black/90 backdrop-blur-md p-4`}>
            <div className="flex justify-between items-start mb-2">
                 <h3 className="text-red-400 font-mono font-bold flex items-center gap-2 text-sm">
                     <AlertTriangle size={16} className="animate-pulse"/> CROWD ALERT
                 </h3>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${getSeverityBg()}`}>
                     {alert.severity}
                 </span>
            </div>
            
            <div className="flex gap-3 items-center mb-2">
                 <div className="w-12 h-12 bg-red-500/10 rounded-sm flex items-center justify-center border border-red-500/30">
                      <Users size={24} className="text-red-400"/>
                 </div>
                 <div>
                      <div className="text-lg text-white font-mono font-bold tracking-tight uppercase">{alert.type}</div>
                      <div className="text-[10px] text-amd-silver uppercase mt-0.5">ZONE {alert.id}</div>
                 </div>
            </div>

            <div className="text-[10px] text-justify text-amd-silver/70 font-mono leading-tight">
                 {alert.message}
            </div>
        </div>
    );
};

export default CrowdAlert;
