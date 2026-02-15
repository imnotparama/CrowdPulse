import React from 'react';
import { Megaphone } from 'lucide-react';

interface PAAnnouncementsProps {
    density: number;
    status: string;
    sectors: { name: string; count: number; status: string }[];
    capacity_pct: number;
}

const PAAnnouncements: React.FC<PAAnnouncementsProps> = ({ status, sectors, capacity_pct }) => {
    const getAnnouncements = () => {
        const msgs: { text: string; priority: 'info' | 'warning' | 'critical' }[] = [];

        if (status === 'CRITICAL') {
            msgs.push({ text: "ATTENTION: All personnel deploy to crowd control positions. Density at critical levels.", priority: 'critical' });
        }
        
        const critSectors = sectors.filter(s => s.status === 'CRITICAL');
        if (critSectors.length > 0) {
            msgs.push({ text: `Sector${critSectors.length > 1 ? 's' : ''} ${critSectors.map(s => s.name).join(', ')} at maximum density. Redirect foot traffic immediately.`, priority: 'critical' });
        }

        if (capacity_pct > 85) {
            msgs.push({ text: "Venue approaching maximum capacity. Close Entry Gates A and C. Divert to Gate D.", priority: 'warning' });
        } else if (capacity_pct > 60) {
            msgs.push({ text: "Crowd volume increasing. Pre-stage response teams at Gates B and D.", priority: 'warning' });
        }

        const warnSectors = sectors.filter(s => s.status === 'WARNING');
        if (warnSectors.length > 0) {
            msgs.push({ text: `Please move away from ${warnSectors.map(s => s.name).join(', ')} zone. Use alternate pathways for your safety.`, priority: 'warning' });
        }

        if (msgs.length === 0) {
            msgs.push({ text: "All zones nominal. Continue monitoring.", priority: 'info' });
        }

        return msgs.slice(0, 3);
    };

    const announcements = getAnnouncements();

    const getPriorityStyle = (p: string) => {
        switch(p) {
            case 'critical': return 'border-red-500/50 bg-red-500/5 text-red-300';
            case 'warning': return 'border-orange-500/40 bg-orange-500/5 text-orange-300';
            default: return 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300';
        }
    };

    return (
        <div className="card bg-black/50">
            <div className="card-header !mb-2">
                <span className="card-title"><Megaphone size={12} /> PA SYSTEM</span>
                <span className="text-[9px] font-mono text-amd-silver/40">AUTO</span>
            </div>
            <div className="space-y-1.5">
                {announcements.map((ann, i) => (
                    <div key={i} className={`border-l-2 px-2 py-1 text-[9px] font-mono leading-tight ${getPriorityStyle(ann.priority)}`}>
                        {ann.text}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PAAnnouncements;
