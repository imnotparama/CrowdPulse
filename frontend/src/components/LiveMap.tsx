import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Map as MapIcon, Crosshair } from 'lucide-react';

const droneIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: '<div class="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_15px_#22d3ee] flex items-center justify-center animate-pulse-fast"><div class="w-1 h-1 bg-white rounded-full"></div></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LiveMapProps {
    alerts: { lat: number, lng: number, type: string }[];
}

// Evacuation routes (pre-defined paths)
const evacuationRoutes: [number, number][][] = [
    // Route 1: North exit
    [[13.0827, 80.2707], [13.0837, 80.2707], [13.0847, 80.2712], [13.0857, 80.2717]],
    // Route 2: East exit  
    [[13.0827, 80.2707], [13.0827, 80.2722], [13.0825, 80.2737], [13.0823, 80.2747]],
    // Route 3: South exit
    [[13.0827, 80.2707], [13.0817, 80.2705], [13.0807, 80.2702], [13.0797, 80.2699]],
];

const LiveMap: React.FC<LiveMapProps> = ({ alerts }) => {
    const position: [number, number] = [13.0827, 80.2707];
    const [droneActive, setDroneActive] = useState(false);
    const [dronePos, setDronePos] = useState<[number, number]>(position);

    useEffect(() => {
        if (!droneActive) {
            setDronePos(position);
            return;
        }
        
        let targetLat = position[0] + 0.003;
        let targetLng = position[1] + 0.003;
        if (alerts.length > 0) {
            targetLat = alerts[0].lat;
            targetLng = alerts[0].lng;
        }
        
        const interval = setInterval(() => {
            setDronePos(prev => {
                const dLat = targetLat - prev[0];
                const dLng = targetLng - prev[1];
                const dist = Math.sqrt(dLat*dLat + dLng*dLng);
                if (dist < 0.0001) return prev;
                return [prev[0] + dLat * 0.05, prev[1] + dLng * 0.05];
            });
        }, 100);
        
        return () => clearInterval(interval);
    }, [droneActive, alerts]);

    return (
        <div className="card h-full flex flex-col p-0 relative overflow-hidden group border-neon-green/30">
             <div className="absolute inset-0 pointer-events-none z-[400] scanlines opacity-40 mix-blend-overlay" />
             <div className="absolute top-2 left-2 z-[401] bg-black/80 px-2 py-1 border border-neon-green/50 text-[10px] text-neon-green font-mono flex items-center gap-2">
                 <MapIcon size={12}/> TACTICAL MAP
             </div>
             
             <div className="absolute top-2 right-2 z-[401]">
                <button 
                    onClick={() => setDroneActive(!droneActive)}
                    className={`px-3 py-1 font-mono text-[9px] font-bold border rounded-sm flex items-center gap-1 transition-colors ${droneActive ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400' : 'bg-black/80 text-amd-silver border-white/20 hover:border-cyan-400 hover:text-cyan-400'}`}
                >
                    <Crosshair size={12} /> {droneActive ? 'RECALL DRONE' : 'DEPLOY AERIAL UNIT'}
                </button>
             </div>
             
             <MapContainer center={position} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} className="z-0">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <Marker position={position}>
                    <Popup>
                        COMMAND CENTER <br /> Operational
                    </Popup>
                </Marker>
                
                {/* Evacuation Routes */}
                {evacuationRoutes.map((route, i) => (
                    <Polyline 
                        key={`route-${i}`}
                        positions={route}
                        pathOptions={{ 
                            color: '#0aff0a', 
                            weight: 2, 
                            opacity: 0.6,
                            dashArray: '8, 8'
                        }}
                    />
                ))}
                
                {/* Aerial Unit */}
                {droneActive && (
                    <Marker position={dronePos} icon={droneIcon}>
                        <Popup>
                            AERIAL UNIT 01<br/>
                            Status: EN ROUTE<br/>
                            Altitude: 400ft
                        </Popup>
                    </Marker>
                )}
                
                {/* Monitoring radius */}
                <Circle
                    center={position}
                    pathOptions={{ color: '#0af', fillColor: '#0af', fillOpacity: 0.05, weight: 1 }}
                    radius={500}
                />
                
                {alerts.map((alert, i) => (
                    <Circle 
                        key={i}
                        center={[alert.lat, alert.lng]}
                        pathOptions={{ color: 'red', fillColor: '#f03', fillOpacity: 0.5 }}
                        radius={150}
                    />
                ))}
            </MapContainer>
            
            {/* Legend */}
            <div className="absolute bottom-2 left-2 z-[400] bg-black/80 px-2 py-1.5 border border-white/10 text-[8px] font-mono space-y-1">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-px bg-neon-green" style={{ borderTop: '1px dashed #0aff0a' }}></div>
                    <span className="text-neon-green">EVAC ROUTE</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/60"></div>
                    <span className="text-red-400">ALERT ZONE</span>
                </div>
            </div>
        </div>
    );
};

export default LiveMap;
