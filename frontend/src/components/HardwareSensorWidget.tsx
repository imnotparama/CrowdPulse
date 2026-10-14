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
    <div className="card-level-2 p-3.5 flex flex-col gap-2.5 relative overflow-hidden group">
      {/* Subtle top cyan line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      {/* ── Widget Header: IoT Node Identity & Health ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(0,224,255,0.2)]">
            <Cpu size={13} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold font-['Space_Grotesk'] text-zinc-100 tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00e0ff]" />
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
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : sensorHealth === 'DEGRADED'
              ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
              : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
          }`}>
            {sensorHealth}
          </span>
        </div>
      </div>

      {/* ── Physical Actuators State: RGB LED & Buzzer ── */}
      <div className="grid grid-cols-2 gap-2 bg-black/40 p-2 rounded-xl border border-white/[0.05]">
        {/* RGB Status LED */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-zinc-950 border border-white/20 shadow-inner">
            <span className={`w-3 h-3 rounded-full ${ledStyle.bg} ${ledStyle.glow} transition-colors duration-300 animate-pulse`} />
            <span className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
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
          <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
            buzzerState
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-bounce'
              : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
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
        {/* INMP441 Microphone Decibel Level with Graphic Equalizer */}
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
              <Mic size={11} className="text-cyan-400" />
              <span>INMP441 MEMS</span>
            </span>

            {/* 6-Band Acoustic Spectrum Equalizer */}
            <div className="flex items-end gap-1 h-3.5 px-1.5 py-0.5 bg-black/40 rounded border border-white/[0.04]">
              {[45, 80, 95, 65, 85, 55].map((baseH, idx) => {
                const scaledH = Math.min(100, Math.max(18, (dbPct / 100) * baseH));
                return (
                  <div key={idx} className="w-1 bg-zinc-800 rounded-full h-full flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-full transition-all duration-200 ${
                        noiseDb > 85 ? 'bg-rose-400' : noiseDb > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ height: `${scaledH}%` }}
                    />
                  </div>
                );
              })}
            </div>

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
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                  : noiseDb > 70
                  ? 'bg-gradient-to-r from-emerald-400 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
              }`}
              style={{ width: `${dbPct}%` }}
            />
          </div>
        </div>

        {/* PIR Kinematic Radar Motion Sensor */}
        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Circular Radar Sweep Scanner */}
            <div className="relative w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {motionDetected ? (
                <>
                  <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/40 via-transparent to-transparent animate-radar-sweep rounded-full pointer-events-none" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] z-10" />
                </>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              )}
              <span className="absolute inset-0 border border-white/[0.06] rounded-full pointer-events-none" />
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
            <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-0.5 justify-end">
              <Activity size={9} />
              <span>Activity</span>
            </div>
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
          <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
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
