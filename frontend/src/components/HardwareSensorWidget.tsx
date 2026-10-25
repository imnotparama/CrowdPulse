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
 * Merges Temperature, Humidity, Noise into one elegant widget card with subtle live animation
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
    <div className="card-apple p-5 flex flex-col justify-between h-full animate-apple-in delay-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
        <span className="text-sm font-medium text-white">Environment</span>
        <span className="text-xs text-[#1ED760] font-medium bg-[#1ED760]/10 px-2 py-0.5 rounded-full border border-[#1ED760]/20">
          Optimal
        </span>
      </div>

      {/* 3 Metric Rows with Subtle Icons */}
      <div className="my-3 grid grid-cols-3 gap-3">
        {/* Temperature */}
        <div className="card-sub-surface p-3 flex flex-col justify-between group">
          <div className="flex items-center gap-1.5 text-[#B9B9C5]">
            <Thermometer size={15} strokeWidth={1.75} className="text-[#B9B9C5] group-hover:text-white transition-colors" />
            <span className="text-xs">Temp</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-semibold tracking-tight text-white font-sans tabular-nums">
              {temperature.toFixed(1)}°
            </span>
            <span className="text-xs text-[#B9B9C5] ml-0.5">C</span>
          </div>
        </div>

        {/* Humidity */}
        <div className="card-sub-surface p-3 flex flex-col justify-between group">
          <div className="flex items-center gap-1.5 text-[#B9B9C5]">
            <Droplets size={15} strokeWidth={1.75} className="text-[#B9B9C5] group-hover:text-white transition-colors" />
            <span className="text-xs">Humidity</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-semibold tracking-tight text-white font-sans tabular-nums">
              {humidity.toFixed(0)}
            </span>
            <span className="text-xs text-[#B9B9C5] ml-0.5">%</span>
          </div>
        </div>

        {/* Noise with subtle micro-equalizer bars */}
        <div className="card-sub-surface p-3 flex flex-col justify-between group">
          <div className="flex items-center justify-between text-[#B9B9C5]">
            <div className="flex items-center gap-1.5">
              <Volume2 size={15} strokeWidth={1.75} className="text-[#B9B9C5] group-hover:text-white transition-colors" />
              <span className="text-xs">Acoustics</span>
            </div>
            {/* Subtle Live MEMS wave */}
            <div className="flex items-end gap-0.5 h-2.5">
              <span className="w-0.5 bg-[#00B5FF] rounded-full animate-acoustic-1" />
              <span className="w-0.5 bg-[#00B5FF] rounded-full animate-acoustic-2" />
              <span className="w-0.5 bg-[#00B5FF] rounded-full animate-acoustic-3" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-semibold tracking-tight text-white font-sans tabular-nums">
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
 * Combines ESP32, WiFi, Latency, FPS into one elegant status card with breathing beacon
 */
export const HardwareCard: React.FC<{
  hardwareStatus?: string;
  connectionType?: string;
  latencyMs?: number;
  fps?: number;
  onOpenSelfTest?: () => void;
  onOpenHardwareSetup?: () => void;
}> = ({
  hardwareStatus = 'Connected',
  connectionType = 'SIMULATED',
  latencyMs = 24,
  fps = 30,
  onOpenSelfTest,
  onOpenHardwareSetup,
}) => {
  return (
    <div className="card-apple p-5 flex flex-col justify-between h-full animate-apple-in delay-400">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Cpu size={16} strokeWidth={1.75} className="text-[#00B5FF]" />
          <span className="text-sm font-medium text-white">Hardware</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(onOpenHardwareSetup || onOpenSelfTest) && (
            <button
              onClick={onOpenHardwareSetup || onOpenSelfTest}
              className="text-xs text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-500/30 transition-all transform active:scale-95 font-medium"
              title="Connect physical ESP32 or Arduino via USB or Wi-Fi"
            >
              + Connect Hardware
            </button>
          )}
          {onOpenSelfTest && (
            <button
              onClick={onOpenSelfTest}
              className="text-xs text-[#B9B9C5] hover:text-white bg-[#1C1C21] hover:bg-[#24242A] px-2.5 py-1 rounded-full border border-white/[0.05] transition-all transform active:scale-95"
            >
              Diagnostics
            </button>
          )}
        </div>
      </div>

      {/* Hardware Status Vitals (Apple / Tesla OS style) */}
      <div className="my-3 space-y-2.5 text-xs">
        <div className="flex items-center justify-between py-1">
          <span className="text-[#B9B9C5] flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              connectionType === 'USB_SERIAL' || connectionType === 'WIFI' || hardwareStatus === 'CONNECTED'
                ? 'bg-[#1ED760] animate-beacon-green'
                : 'bg-amber-400'
            }`} />
            Edge Microcontroller
          </span>
          <span className="text-white font-medium">
            {connectionType === 'USB_SERIAL'
              ? 'Connected (USB COM)'
              : connectionType === 'WIFI'
              ? 'Connected (Wi-Fi)'
              : hardwareStatus === 'CONNECTED'
              ? 'Connected (Live)'
              : 'Active (Simulated)'}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
          <span className="text-[#B9B9C5] flex items-center gap-2">
            <Zap size={13} strokeWidth={1.75} className="text-[#B9B9C5]" />
            System Latency
          </span>
          <span className="text-white font-medium tabular-nums">{Math.round(latencyMs)}ms</span>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
          <span className="text-[#B9B9C5] flex items-center gap-2">
            <Activity size={13} strokeWidth={1.75} className="text-[#B9B9C5]" />
            Pipeline Throughput
          </span>
          <span className="text-white font-medium tabular-nums">{fps} FPS</span>
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
