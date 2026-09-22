import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Crosshair, Radio } from 'lucide-react';

const droneIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: '<div class="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#00e0ff] flex items-center justify-center animate-pulse"><div class="w-1.5 h-1.5 bg-white rounded-full"></div></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [20, 32],
  iconAnchor: [10, 32],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LiveMapProps {
  alerts: { lat: number; lng: number; type: string }[];
}

const evacuationRoutes: [number, number][][] = [
  // North exit
  [[13.0827, 80.2707], [13.0837, 80.2707], [13.0847, 80.2712], [13.0857, 80.2717]],
  // East exit
  [[13.0827, 80.2707], [13.0827, 80.2722], [13.0825, 80.2737], [13.0823, 80.2747]],
  // South exit
  [[13.0827, 80.2707], [13.0817, 80.2705], [13.0807, 80.2702], [13.0797, 80.2699]],
];

export const LiveMap: React.FC<LiveMapProps> = ({ alerts }) => {
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
      setDronePos((prev) => {
        const dLat = targetLat - prev[0];
        const dLng = targetLng - prev[1];
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < 0.0001) return prev;
        return [prev[0] + dLat * 0.05, prev[1] + dLng * 0.05];
      });
    }, 100);

    return () => clearInterval(interval);
  }, [droneActive, alerts]);

  return (
    <div className="card-enterprise h-full min-h-[190px] flex flex-col p-0 relative overflow-hidden group">
      {/* Top Floating Header */}
      <div className="absolute top-2.5 left-2.5 z-[401] bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/[0.08] text-[10px] text-zinc-300 font-medium flex items-center gap-1.5 shadow-lg">
        <Radio size={12} className="text-cyan-400 animate-pulse" />
        <span className="font-['Space_Grotesk'] font-semibold">TACTICAL MAP</span>
      </div>

      <div className="absolute top-2.5 right-2.5 z-[401]">
        <button
          onClick={() => setDroneActive(!droneActive)}
          className={`px-2.5 py-1 rounded-lg font-mono text-[9px] font-semibold border backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg ${
            droneActive
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
              : 'bg-black/70 text-zinc-300 border-white/[0.08] hover:border-cyan-400/40 hover:text-white'
          }`}
        >
          <Crosshair size={11} /> {droneActive ? 'RECALL UNIT' : 'DEPLOY DRONE'}
        </button>
      </div>

      <MapContainer
        center={position}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <Marker position={position}>
          <Popup>Command Center Hub</Popup>
        </Marker>

        {evacuationRoutes.map((route, i) => (
          <Polyline
            key={`route-${i}`}
            positions={route}
            pathOptions={{
              color: '#00ff88',
              weight: 2,
              opacity: 0.6,
              dashArray: '6, 6',
            }}
          />
        ))}

        {droneActive && (
          <Marker position={dronePos} icon={droneIcon}>
            <Popup>Aerial Unit 01 • En Route</Popup>
          </Marker>
        )}

        <Circle
          center={position}
          pathOptions={{ color: '#00e0ff', fillColor: '#00e0ff', fillOpacity: 0.04, weight: 1 }}
          radius={450}
        />

        {alerts.map((alert, i) => (
          <Circle
            key={i}
            center={[alert.lat, alert.lng]}
            pathOptions={{ color: '#ff1744', fillColor: '#ff1744', fillOpacity: 0.35, weight: 1 }}
            radius={120}
          />
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/[0.08] text-[9px] font-mono flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-0.5 bg-emerald-400" />
          <span className="text-zinc-400">EVAC ROUTE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/80" />
          <span className="text-zinc-400">ALERT ZONE</span>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
