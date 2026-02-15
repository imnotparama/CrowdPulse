import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Map as MapIcon } from 'lucide-react';

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
    [[40.7128, -74.0060], [40.7138, -74.0060], [40.7148, -74.0055], [40.7158, -74.0050]],
    // Route 2: East exit  
    [[40.7128, -74.0060], [40.7128, -74.0045], [40.7130, -74.0030], [40.7132, -74.0020]],
    // Route 3: South exit
    [[40.7128, -74.0060], [40.7118, -74.0062], [40.7108, -74.0065], [40.7098, -74.0068]],
];

const LiveMap: React.FC<LiveMapProps> = ({ alerts }) => {
    const position: [number, number] = [40.7128, -74.0060];

    return (
        <div className="card h-full flex flex-col p-0 relative overflow-hidden group border-neon-green/30">
             <div className="absolute top-2 left-2 z-[400] bg-black/80 px-2 py-1 border border-neon-green/50 text-[10px] text-neon-green font-mono flex items-center gap-2">
                 <MapIcon size={12}/> TACTICAL MAP
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
