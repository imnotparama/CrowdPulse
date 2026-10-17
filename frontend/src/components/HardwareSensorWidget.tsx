import React from 'react';
import { Thermometer, Droplets, Volume2, Cpu, Wifi, Zap, Activity } from 'lucide-react';

export interface HardwareSensorWidgetProps {
  temperature: number;
  humidity: number;
  noiseDb: number;
  noiseIndex?: number;
  motionDetected: boolean;
  motionActivityScore?: number;
  sensorHealth?: 'OPTIMAL' | 'DEGRADED' | 'OFFLINE';
  hardwareStatus?: 'CONNECTED' | 'TIMEOUT' | 'SIMULATED';
  buzzerState?: boolean;
  ledState?: 'GREEN' | 'YELLOW' | 'RED';
  environmentRisk?: number;
  fusionConfidence?: number;
  sensorScore?: number;
  heatStressIndex?: number;
  latencyMs?: number;
  deviceId?: string;
  onOpenSelfTest?: () => void;
  onOverrideActuator?: (buzzer: boolean | null, led: string | null) => void;
}

/**
 * Environmental Card (Apple × One UI style)
 * Merges Temperature, Humidity, Noise into one elegant widget card
 */
export const EnvironmentCard: React.FC<{
  temperature?: number;
  humidity?: number;
  noiseDb?: number;
}> = ({
  temperature = 24.5,
  humidity = 52.0,
  noiseDb = 58.0,
}) => {
  return (
    <div className="card-apple p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
        <span className="text-sm font-medium text-white">Environment</span>
        <span className="text-xs text-[#1ED760] font-medium">Optimal</span>
      </div>

      {/* 3 Metric Rows with Subtle Icons */}
      <div className="my-3 grid grid-cols-3 gap-3">
        {/* Temperature */}
        <div className="bg-[#1C1C21] p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#B9B9C5]">
            <Thermometer size={15} strokeWidth={1.75} className="text-[#B9B9C5]" />
            <span className="text-xs">Temp</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-semibold tracking-tight text-white font-sans">
              {temperature.toFixed(1)}°
            </span>
            <span className="text-xs text-[#B9B9C5] ml-0.5">C</span>
          </div>
        </div>

        {/* Humidity */}
        <div className="bg-[#1C1C21] p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#B9B9C5]">
            <Droplets size={15} strokeWidth={1.75} className="text-[#B9B9C5]" />
            <span className="text-xs">Humidity</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-semibold tracking-tight text-white font-sans">
              {humidity.toFixed(0)}
            </span>
            <span className="text-xs text-[#B9B9C5] ml-0.5">%</span>
          </div>
        </div>

        {/* Noise */}
        <div className="bg-[#1C1C21] p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#B9B9C5]">
            <Volume2 size={15} strokeWidth={1.75} className="text-[#B9B9C5]" />
            <span className="text-xs">Acoustics</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-semibold tracking-tight text-white font-sans">
              {noiseDb.toFixed(0)}
            </span>
            <span className="text-xs text-[#B9B9C5] ml-0.5">dB</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.05] pt-2.5 flex items-center justify-between text-xs text-[#B9B9C5]">
        <span>AM2302 & INMP441</span>
        <span className="text-white font-medium">Nominal Baseline</span>
      </div>
    </div>
  );
};

/**
 * Hardware Card (Apple × Tesla style)
 * Combines ESP32, WiFi, Latency, FPS into one elegant status card
 */
export const HardwareCard: React.FC<{
  hardwareStatus?: string;
  latencyMs?: number;
  fps?: number;
  onOpenSelfTest?: () => void;
}> = ({
  hardwareStatus = 'Connected',
  latencyMs = 24,
  fps = 30,
  onOpenSelfTest,
}) => {
  return (
    <div className="card-apple p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Cpu size={16} strokeWidth={1.75} className="text-[#00B5FF]" />
          <span className="text-sm font-medium text-white">Hardware</span>
        </div>
        {onOpenSelfTest && (
          <button
            onClick={onOpenSelfTest}
            className="text-xs text-[#B9B9C5] hover:text-white bg-[#1C1C21] px-2.5 py-1 rounded-full border border-white/[0.05] transition-colors"
          >
            Diagnostics
          </button>
        )}
      </div>

      {/* Hardware Status Vitals (Apple / Tesla OS style) */}
      <div className="my-3 space-y-2.5 text-xs">
        <div className="flex items-center justify-between py-1">
          <span className="text-[#B9B9C5] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1ED760]" />
            ESP32 Edge Node
          </span>
          <span className="text-white font-medium">
            {hardwareStatus === 'CONNECTED' ? 'Connected' : 'Active (Simulated)'}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
          <span className="text-[#B9B9C5] flex items-center gap-2">
            <Zap size={13} strokeWidth={1.75} className="text-[#B9B9C5]" />
            System Latency
          </span>
          <span className="text-white font-medium">{Math.round(latencyMs)}ms</span>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
          <span className="text-[#B9B9C5] flex items-center gap-2">
            <Activity size={13} strokeWidth={1.75} className="text-[#B9B9C5]" />
            Pipeline Throughput
          </span>
          <span className="text-white font-medium">{fps} FPS</span>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
          <span className="text-[#B9B9C5] flex items-center gap-2">
            <Wifi size={13} strokeWidth={1.75} className="text-[#B9B9C5]" />
            Wi-Fi Connection
          </span>
          <span className="text-[#1ED760] font-medium">Stable</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.05] pt-2.5 flex items-center justify-between text-xs text-[#B9B9C5]">
        <span>ESP32-S3 Dual-Core</span>
        <span className="text-white font-medium">Operational</span>
      </div>
    </div>
  );
};

export const HardwareSensorWidget: React.FC<HardwareSensorWidgetProps> = ({
  temperature = 24.5,
  humidity = 52.0,
  noiseDb = 58.0,
  hardwareStatus = 'CONNECTED',
  latencyMs = 24,
  onOpenSelfTest,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      <EnvironmentCard temperature={temperature} humidity={humidity} noiseDb={noiseDb} />
      <HardwareCard hardwareStatus={hardwareStatus} latencyMs={latencyMs} onOpenSelfTest={onOpenSelfTest} />
    </div>
  );
};

export default HardwareSensorWidget;
