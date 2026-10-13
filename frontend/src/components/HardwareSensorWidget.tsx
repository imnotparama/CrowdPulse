import React from 'react';
import { Cpu, Mic, Activity, Thermometer, Droplets, Volume2, Zap } from 'lucide-react';

export interface HardwareSensorWidgetProps {
  temperature: number;
  humidity: number;
  noiseDb: number;
  noiseIndex?: number;
  motionDetected: boolean;
  motionActivityScore?: number;
  sensorHealth: 'OPTIMAL' | 'DEGRADED' | 'OFFLINE';
  hardwareStatus: 'CONNECTED' | 'TIMEOUT' | 'SIMULATED';
  buzzerState: boolean;
  ledState: 'GREEN' | 'YELLOW' | 'RED';
  environmentRisk: number;
  fusionConfidence: number;
  sensorScore?: number;
  heatStressIndex?: number;
  latencyMs?: number;
  deviceId?: string;
}

export const HardwareSensorWidget: React.FC<HardwareSensorWidgetProps> = ({
  temperature = 24.5,
  humidity = 52.0,
  noiseDb = 58.0,
  motionDetected = false,
  motionActivityScore = 15.0,
  sensorHealth = 'OPTIMAL',
  hardwareStatus = 'SIMULATED',
  buzzerState = false,
  ledState = 'GREEN',
  environmentRisk = 18.0,
  fusionConfidence = 0.94,
  heatStressIndex = 24.8,
  latencyMs = 12.0,
  deviceId = 'ESP32-S3-01',
}) => {
  // Acoustic dB bar calculation (30dB min, 110dB max)
  const dbPct = Math.min(100, Math.max(0, ((noiseDb - 30) / (110 - 30)) * 100));

  const getNoiseLabel = (db: number) => {
    if (db > 85) return { text: 'ACOUSTIC SPIKE', color: 'text-rose-400' };
    if (db > 75) return { text: 'HIGH AMBIENT', color: 'text-amber-400' };
    if (db > 60) return { text: 'NORMAL CHATTER', color: 'text-zinc-300' };
    return { text: 'QUIET', color: 'text-emerald-400' };
  };

  const noiseInfo = getNoiseLabel(noiseDb);

  const getLedStyle = (state: 'GREEN' | 'YELLOW' | 'RED') => {
    switch (state) {
      case 'RED':
        return {
          bg: 'bg-rose-500',
          border: 'border-rose-400',
          glow: 'shadow-[0_0_12px_rgba(244,63,94,0.8)]',
          text: 'CRITICAL',
        };
      case 'YELLOW':
        return {
          bg: 'bg-amber-400',
          border: 'border-amber-300',
          glow: 'shadow-[0_0_12px_rgba(251,191,36,0.8)]',
          text: 'WARNING',
        };
      case 'GREEN':
      default:
        return {
          bg: 'bg-emerald-400',
          border: 'border-emerald-300',
          glow: 'shadow-[0_0_12px_rgba(52,211,153,0.8)]',
          text: 'NORMAL',
        };
    }
  };

  const ledStyle = getLedStyle(ledState);

  return (
    <div className="card-level-2 p-3.5 flex flex-col gap-2.5">
      {/* ── Widget Header: IoT Node Identity & Health ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
            <Cpu size={13} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold font-['Space_Grotesk'] text-zinc-100 tracking-wider">
                {deviceId}
              </span>
              <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded-full border ${
                hardwareStatus === 'CONNECTED'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
              }`}>
                {hardwareStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-zinc-500">{latencyMs.toFixed(0)}ms</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            sensorHealth === 'OPTIMAL'
              ? 'text-emerald-400 bg-emerald-500/10'
              : sensorHealth === 'DEGRADED'
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-rose-400 bg-rose-500/10'
          }`}>
            {sensorHealth}
          </span>
        </div>
      </div>

      {/* ── Physical Actuators State: RGB LED & Buzzer ── */}
      <div className="grid grid-cols-2 gap-2 bg-black/30 p-2 rounded-lg border border-white/[0.04]">
        {/* RGB Status LED */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className={`w-3.5 h-3.5 rounded-full ${ledStyle.bg} ${ledStyle.border} ${ledStyle.glow} border animate-pulse`} />
          </div>
          <div>
            <div className="text-[9px] font-mono text-zinc-400 uppercase">RGB LED</div>
            <div className="text-[11px] font-mono font-bold text-zinc-200">
              {ledStyle.text}
            </div>
          </div>
        </div>

        {/* Active Buzzer State */}
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
            buzzerState
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-bounce'
              : 'bg-white/[0.04] text-zinc-400'
          }`}>
            <Volume2 size={13} />
          </div>
          <div>
            <div className="text-[9px] font-mono text-zinc-400 uppercase">BUZZER</div>
            <div className={`text-[11px] font-mono font-bold ${
              buzzerState ? 'text-rose-400' : 'text-zinc-300'
            }`}>
              {buzzerState ? 'TRIGGERED' : 'ARMED'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Acoustic & Motion Telemetry ── */}
      <div className="flex flex-col gap-2">
        {/* INMP441 Microphone Decibel Level */}
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
              <Mic size={11} className="text-cyan-400" />
              <span>INMP441 NOISE</span>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold font-mono text-white">
                {noiseDb.toFixed(0)}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">dB</span>
              <span className={`text-[9px] font-mono ml-1 font-semibold ${noiseInfo.color}`}>
                ({noiseInfo.text})
              </span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                noiseDb > 85
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                  : noiseDb > 70
                  ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${dbPct}%` }}
            />
          </div>
        </div>

        {/* PIR Motion Sensor */}
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
              motionDetected
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/[0.04] text-zinc-400'
            }`}>
              <Activity size={12} className={motionDetected ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">PIR SENSOR</div>
              <div className="text-[11px] font-semibold text-zinc-200">
                {motionDetected ? 'Kinematic Motion' : 'Static Baseline'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-zinc-200">
              {motionActivityScore.toFixed(0)}%
            </div>
            <div className="text-[9px] font-mono text-zinc-500">Activity</div>
          </div>
        </div>

        {/* AM2302 (DHT22) Temperature, Humidity & Heat Stress Index */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* Temperature */}
          <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.03] flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
              <Thermometer size={11} />
            </div>
            <div>
              <div className="text-[8px] font-mono text-zinc-400">TEMP</div>
              <div className="text-[11px] font-bold font-mono text-white">
                {temperature.toFixed(1)}°C
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.03] flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <Droplets size={11} />
            </div>
            <div>
              <div className="text-[8px] font-mono text-zinc-400">HUMID</div>
              <div className="text-[11px] font-bold font-mono text-white">
                {humidity.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Heat Stress Index */}
          <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.03] flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Thermometer size={11} />
            </div>
            <div>
              <div className="text-[8px] font-mono text-zinc-400">HEAT IDX</div>
              <div className="text-[11px] font-bold font-mono text-amber-300">
                {heatStressIndex.toFixed(1)}°C
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Multi-Sensor Fusion Metric Footer ── */}
      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Zap size={11} className="text-cyan-400" />
          <span>FUSION CONFIDENCE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">
            {(fusionConfidence * 100).toFixed(0)}%
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">
            ENV RISK <span className="text-amber-400 font-bold">{environmentRisk.toFixed(0)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default HardwareSensorWidget;
