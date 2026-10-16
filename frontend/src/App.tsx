import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import Header from './components/Header';
import StatusCardsRow from './components/StatusCardsRow';
import LiveStatusPanel from './components/LiveStatusPanel';
import AIInsightsCard from './components/AIInsightsCard';
import RecentEvents from './components/RecentEvents';
import VideoFeed from './components/VideoFeed';
import Timeline from './components/Timeline';
import RiskGauge from './components/RiskGauge';
import LiveMap from './components/LiveMap';
import ActiveAlertsPanel from './components/ActiveAlertsPanel';
import AIChatSidebar from './components/AIChatSidebar';
import EvidenceLocker from './components/EvidenceLocker';
import SplashScreen from './components/SplashScreen';
import HardwareSensorWidget from './components/HardwareSensorWidget';
import HardwareSelfTestModal, { type SelfTestReport } from './components/HardwareSelfTestModal';
import ForensicReportModal from './components/ForensicReportModal';
import CommandPalette from './components/CommandPalette';

interface WifiZone {
  count: number;
  rssi: number;
  status: 'ACTIVE' | 'OFFLINE';
}

interface AlertItem {
  id: number;
  type: string;
  severity: string;
  message: string;
  timestamp: number;
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  // Safety net: show dashboard within 5.5s unconditionally
  useEffect(() => {
    const safetyTimer = setTimeout(() => setSplashDone(true), 5500);
    return () => clearTimeout(safetyTimer);
  }, []);

  const [activeCamera, setActiveCamera] = useState('Entrance');
  const [sosMode, setSosMode] = useState(false);

  // Video frame lives in a ref to prevent 30+ full-tree React re-renders per second
  const imageRef = useRef<string | null>(null);

  const [stats, setStats] = useState({
    count: 4,
    density: 0.12,
    agitation: 24,
    status: 'SAFE',
    timestamp: Date.now(),
    mode: 'OPTICAL',
    recording: false,
    predicted_density: 0.14,
    crowd_alert: null as { id: number; type: string; severity: string; message: string } | null,
    pressure_index: 18,
    capacity_pct: 2.0,
    max_capacity: 200,
    avg_velocity: 32,
    time_to_critical: -1,
    stampede_risk: 18,
    flow_direction: { angle: 45, label: 'EAST' },
    sectors: [] as { name: string; count: number; status: string }[],
    wifi_probe_count: 9,
    wifi_zones: {} as Record<string, WifiZone>,
    // Hardware layer
    temperature: 24.5,
    humidity: 52.0,
    noise_db: 58.0,
    motion_detected: false,
    sensor_health: 'OPTIMAL' as 'OPTIMAL' | 'DEGRADED' | 'OFFLINE',
    sensor_timestamp: Date.now(),
    buzzer_state: false,
    led_state: 'GREEN' as 'GREEN' | 'YELLOW' | 'RED',
    hardware_status: 'SIMULATED' as 'CONNECTED' | 'TIMEOUT' | 'SIMULATED',
    environment_risk: 18.0,
    fusion_confidence: 0.94,
    sensor_score: 22.0,
    heat_stress_index: 24.8,
    noise_index: 28.0,
    motion_activity_score: 15.0,
    combined_threat_score: 20.0,
    fusion_narrative: 'Nominal conditions across all visual and environmental channels.',
  });

  const [history, setHistory] = useState<
    { time: string; density: number; predicted_density: number; agitation: number }[]
  >([
    { time: '14:20', density: 0.08, predicted_density: 0.09, agitation: 18 },
    { time: '14:22', density: 0.11, predicted_density: 0.12, agitation: 20 },
    { time: '14:24', density: 0.14, predicted_density: 0.15, agitation: 26 },
    { time: '14:26', density: 0.12, predicted_density: 0.13, agitation: 22 },
  ]);

  const [recentEvents, setRecentEvents] = useState<
    { id: string; type: 'success' | 'warning' | 'info'; title: string; time: string }[]
  >([
    { id: '1', type: 'success', title: 'Camera Connected & Calibrated', time: 'Just now' },
    { id: '2', type: 'success', title: 'Crowd Density Normal (Level A)', time: '1m ago' },
    { id: '3', type: 'warning', title: 'Queue Forming at Gate A', time: '3m ago' },
    { id: '4', type: 'info', title: 'AI Farneback Optical Flow Active', time: '5m ago' },
  ]);

  const [alertHistory, setAlertHistory] = useState<AlertItem[]>([]);
  const [persistentAlert, setPersistentAlert] = useState<AlertItem | null>(null);

  const wsMessageCount = useRef(0);
  const STATS_UPDATE_INTERVAL = 3;

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.05;
    msg.pitch = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(
      (v) => v.lang.startsWith('en-') && (v.name.includes('Google') || v.name.includes('Natural'))
    );
    if (enVoice) msg.voice = enVoice;
    window.speechSynthesis.speak(msg);
  };

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'CrowdPulse AI Core Online. All surveillance zones monitored.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [mapAlerts, setMapAlerts] = useState<{ lat: number; lng: number; type: string }[]>([]);

  const [lockerOpen, setLockerOpen] = useState(false);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const [selfTestOpen, setSelfTestOpen] = useState(false);
  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [selfTestReport, setSelfTestReport] = useState<SelfTestReport | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [wsConnected, setWsConnected] = useState(false);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeWifiZones, setActiveWifiZones] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const playSound = (type: 'beep' | 'alert' | 'click') => {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'beep') {
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'click') {
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'alert') {
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.8);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    playSound('click');

    setTimeout(() => {
      let response = 'Analyzing query against crowd safety metrics. All sectors currently nominal.';
      const lower = userMsg.toLowerCase();

      if (lower.includes('status') || lower.includes('report')) {
        response = `System Status: ${stats.status}. Detected: ${stats.count} individuals. Density: ${stats.density.toFixed(2)}. Stampede Risk: ${stats.stampede_risk.toFixed(0)}/100.`;
      } else if (lower.includes('capacity') || lower.includes('people')) {
        response = `Venue Capacity: ${stats.count}/${stats.max_capacity} (${stats.capacity_pct.toFixed(0)}%). Safe operating margins.`;
      } else if (lower.includes('evacuate') || lower.includes('gate')) {
        response = 'Evacuation routes A, B, and C are clear. Recommend opening Gate B if density exceeds 0.4.';
      }

      setChatMessages((prev) => [...prev, { role: 'ai', text: response }]);
      playSound('beep');
    }, 500);
  };

  const fetchRecordings = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/recordings');
      const data = await res.json();
      setRecordings(data);
    } catch (e) {
      console.error('Failed to fetch recordings', e);
    }
  };

  const connectWebSocket = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket('ws://127.0.0.1:8000/ws');

    ws.current.onopen = () => {
      setWsConnected(true);
      reconnectAttempt.current = 0;
      playSound('beep');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'selftest_result' && data.report) {
        setSelfTestReport(data.report);
        setSelfTestRunning(false);
        setSelfTestOpen(true);
        playSound('beep');
        return;
      }

      if (data.image) {
        imageRef.current = data.image;
      }

      wsMessageCount.current += 1;
      const shouldUpdateStats = wsMessageCount.current % STATS_UPDATE_INTERVAL === 0;

      if (data.crowd_alert) {
        playSound('alert');
        if (data.crowd_alert.severity === 'CRITICAL') {
          speakText(`Priority Alert: ${data.crowd_alert.message}`);
        }

        const alertItem: AlertItem = {
          id: data.crowd_alert.id || Date.now(),
          type: data.crowd_alert.type,
          severity: data.crowd_alert.severity,
          message: data.crowd_alert.message,
          timestamp: Date.now(),
        };

        setPersistentAlert(alertItem);
        setAlertHistory((prev) => [alertItem, ...prev].slice(0, 15));
        setMapAlerts((prev) => [
          ...prev,
          { lat: 13.0827 + (Math.random() - 0.5) * 0.01, lng: 80.2707 + (Math.random() - 0.5) * 0.01, type: 'density' },
        ]);

        setRecentEvents((prev) => [
          {
            id: String(Date.now()),
            type: data.crowd_alert.severity === 'CRITICAL' ? 'warning' : 'info',
            title: `${data.crowd_alert.type} in Zone ${data.crowd_alert.id}`,
            time: 'Just now',
          },
          ...prev.slice(0, 4),
        ]);
      }

      if (!shouldUpdateStats) return;

      const isRecording = data.recording || false;

      setStats((prev) => {
        if (prev.recording && !isRecording) {
          setTimeout(() => {
            setLockerOpen(true);
            fetchRecordings();
          }, 500);
        }
        return {
          count: data.count ?? prev.count,
          density: data.density ?? prev.density,
          agitation: data.agitation ?? prev.agitation,
          status: data.status || 'SAFE',
          timestamp: data.timestamp || Date.now(),
          mode: data.mode || 'OPTICAL',
          recording: isRecording,
          predicted_density: data.predicted_density ?? data.density,
          crowd_alert: data.crowd_alert || null,
          pressure_index: data.pressure_index ?? prev.pressure_index,
          capacity_pct: data.capacity_pct ?? prev.capacity_pct,
          max_capacity: data.max_capacity ?? 200,
          avg_velocity: data.avg_velocity ?? prev.avg_velocity,
          time_to_critical: data.time_to_critical ?? -1,
          stampede_risk: data.stampede_risk ?? prev.stampede_risk,
          flow_direction: data.flow_direction || prev.flow_direction,
          sectors: data.sectors || prev.sectors,
          wifi_probe_count: data.wifi_probe_count ?? prev.wifi_probe_count,
          wifi_zones: data.wifi_zones || prev.wifi_zones,
          temperature: data.temperature ?? prev.temperature,
          humidity: data.humidity ?? prev.humidity,
          noise_db: data.noise_db ?? prev.noise_db,
          motion_detected: data.motion_detected ?? prev.motion_detected,
          sensor_health: data.sensor_health ?? prev.sensor_health,
          sensor_timestamp: data.sensor_timestamp ?? prev.sensor_timestamp,
          buzzer_state: data.buzzer_state ?? prev.buzzer_state,
          led_state: data.led_state ?? prev.led_state,
          hardware_status: data.hardware_status ?? prev.hardware_status,
          environment_risk: data.environment_risk ?? prev.environment_risk,
          fusion_confidence: data.fusion_confidence ?? prev.fusion_confidence,
          sensor_score: data.sensor_score ?? prev.sensor_score,
          heat_stress_index: data.heat_stress_index ?? prev.heat_stress_index,
          noise_index: data.noise_index ?? prev.noise_index,
          motion_activity_score: data.motion_activity_score ?? prev.motion_activity_score,
          combined_threat_score: data.combined_threat_score ?? prev.combined_threat_score,
          fusion_narrative: data.fusion_narrative ?? prev.fusion_narrative,
        };
      });

      const zones: Record<string, WifiZone> = data.wifi_zones || {};
      const activeCount = Object.values(zones).filter((z) => z.status === 'ACTIVE').length;
      setActiveWifiZones(activeCount);

      setHistory((prev) => {
        const newHistory = [
          ...prev,
          {
            time: new Date((data.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            density: data.density ?? 0,
            predicted_density: data.predicted_density || data.density || 0,
            agitation: data.agitation || 0,
          },
        ];
        return newHistory.slice(-20);
      });
    };

    ws.current.onclose = () => {
      setWsConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 10000);
      reconnectAttempt.current += 1;
      reconnectTimer.current = setTimeout(connectWebSocket, delay);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        playSound('click');
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 's':
          if (e.ctrlKey || e.metaKey) return;
          setSosMode((prev) => {
            playSound('alert');
            speakText(!prev ? 'Emergency SOS activated' : 'Emergency SOS deactivated');
            return !prev;
          });
          break;
        case 't':
          sendCommand('set_mode', { mode: stats.mode === 'OPTICAL' ? 'thermal' : 'optical' });
          break;
        case 'r':
          sendCommand(stats.recording ? 'stop_recording' : 'start_recording');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stats.mode, stats.recording]);

  const sendCommand = (action: string, payload: any = {}) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action, ...payload }));
      playSound('click');
    }
  };

  const runHardwareSelfTest = async () => {
    setSelfTestRunning(true);
    playSound('beep');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/hardware/self-test', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSelfTestReport(data);
      }
    } catch {
      // Fallback via WebSocket
      sendCommand('hardware_selftest');
    } finally {
      setSelfTestRunning(false);
      setSelfTestOpen(true);
    }
  };

  const overrideHardwareActuator = async (buzzer: boolean | null, led: string | null) => {
    playSound('click');
    sendCommand('hardware_override', { buzzer, led });
    try {
      await fetch('http://127.0.0.1:8000/api/hardware/actuators/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buzzer, led }),
      });
    } catch {
      // ignore
    }
  };

  const resetHardwareActuators = async () => {
    playSound('click');
    sendCommand('hardware_reset');
    try {
      await fetch('http://127.0.0.1:8000/api/hardware/actuators/reset', { method: 'POST' });
    } catch {
      // ignore
    }
  };

  const handleCameraChange = (cam: string) => {
    if (cam === activeCamera) return;
    playSound('click');
    setActiveCamera(cam);
    speakText(`Switching feed to ${cam}`);
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SAFE':
        return 'text-emerald-400 border-emerald-500/30';
      case 'ELEVATED':
        return 'text-yellow-400 border-yellow-500/30';
      case 'WARNING':
        return 'text-amber-400 border-amber-500/30';
      case 'CRITICAL':
      case 'EVACUATE':
        return 'text-red-400 border-red-500/30';
      default:
        return 'text-zinc-400 border-white/10';
    }
  };

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  if (!splashDone) return <SplashScreen onComplete={handleSplashComplete} />;

  return (
    <div className="min-h-screen tactical-grid-bg text-zinc-100 font-sans flex flex-col antialiased selection:bg-red-500 selection:text-white relative">
      {/* Emergency Full-Screen Flash */}
      {sosMode && (
        <div className="fixed inset-0 pointer-events-none z-[9998] border-4 border-red-500 animate-pulse" />
      )}

      {/* ── Executive Header ── */}
      <Header
        status={sosMode ? 'EVACUATE' : stats.status}
        getStatusColor={getStatusColor}
        wsConnected={wsConnected}
        activeWifiZones={activeWifiZones}
        sosMode={sosMode}
        onToggleSos={() => setSosMode(!sosMode)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenLocker={() => {
          setLockerOpen(true);
          fetchRecordings();
        }}
        onOpenReport={() => setReportOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* ── Main Viewport Container ── */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 lg:p-4 flex flex-col gap-3">
        {/* ── Top Status Cards Row ── */}
        <StatusCardsRow
          count={stats.count}
          maxCapacity={stats.max_capacity}
          capacityPct={stats.capacity_pct}
          density={stats.density}
          status={sosMode ? 'EVACUATE' : stats.status}
          stampedeRisk={stats.stampede_risk}
          wifiProbeCount={stats.wifi_probe_count}
          activeWifiZones={activeWifiZones}
          avgVelocity={stats.avg_velocity}
          temperature={stats.temperature}
          humidity={stats.humidity}
          noiseDb={stats.noise_db}
          motionDetected={stats.motion_detected}
          fusionConfidence={stats.fusion_confidence}
          sensorStatus={stats.sensor_health}
          hardwareStatus={stats.hardware_status}
        />

        {/* ── Three-Column Main Layout: Left (~280px) | Center Hero (~70% flex-1) | Right (~310px) ── */}
        <div className="flex flex-col lg:flex-row gap-3.5 flex-1 min-h-0">
          {/* ── LEFT COLUMN: Scannable Live Status, Hardware IoT Node, AI Insights (Level 1), Recent Events ── */}
          <div className="w-full lg:w-[280px] xl:w-[300px] flex-shrink-0 flex flex-col gap-3">
            <LiveStatusPanel
              count={stats.count}
              maxCapacity={stats.max_capacity}
              density={stats.density}
              stampedeRisk={stats.stampede_risk}
              wifiProbeCount={stats.wifi_probe_count}
              avgVelocity={stats.avg_velocity}
              status={stats.status}
              temperature={stats.temperature}
              humidity={stats.humidity}
              noiseDb={stats.noise_db}
            />

            <HardwareSensorWidget
              temperature={stats.temperature}
              humidity={stats.humidity}
              noiseDb={stats.noise_db}
              noiseIndex={stats.noise_index}
              motionDetected={stats.motion_detected}
              motionActivityScore={stats.motion_activity_score}
              sensorHealth={stats.sensor_health}
              hardwareStatus={stats.hardware_status}
              buzzerState={stats.buzzer_state}
              ledState={stats.led_state}
              environmentRisk={stats.environment_risk}
              fusionConfidence={stats.fusion_confidence}
              sensorScore={stats.sensor_score}
              heatStressIndex={stats.heat_stress_index}
              onOpenSelfTest={runHardwareSelfTest}
              onOverrideActuator={overrideHardwareActuator}
            />

            <AIInsightsCard
              density={stats.density}
              stampedeRisk={stats.stampede_risk}
              timeToCritical={stats.time_to_critical}
              status={stats.status}
              fusionNarrative={stats.fusion_narrative}
              fusionConfidence={stats.fusion_confidence}
            />

            <RecentEvents events={recentEvents} />
          </div>

          {/* ── CENTER COLUMN: Dominant Camera Hero (~70%) & Bottom Event Timeline ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex-1 flex flex-col min-h-[480px] lg:min-h-[580px]">
              <VideoFeed
                imageRef={imageRef}
                isRecording={stats.recording}
                visionMode={stats.mode}
                activeCamera={activeCamera}
                soundEnabled={soundEnabled}
                status={sosMode ? 'EVACUATE' : stats.status}
                flowDirection={stats.flow_direction}
                sectors={stats.sectors}
                onToggleRecord={() => sendCommand(stats.recording ? 'stop_recording' : 'start_recording')}
                onToggleVision={() =>
                  sendCommand('set_mode', { mode: stats.mode === 'OPTICAL' ? 'thermal' : 'optical' })
                }
                onToggleSound={() => setSoundEnabled(!soundEnabled)}
                onSetGeofence={(points) => sendCommand('set_geofence', { points })}
                onSelectCamera={handleCameraChange}
              />
            </div>

            {/* Bottom Event Timeline */}
            <Timeline currentDensity={stats.density} />
          </div>

          {/* ── RIGHT COLUMN: Mini Analytics, Semicircle Risk, Tactical Map, Active Alerts, Assistant ── */}
          <div className="w-full lg:w-[290px] xl:w-[320px] flex-shrink-0 flex flex-col gap-3">
            {/* Semicircle Risk Gauge */}
            <RiskGauge
              risk={stats.stampede_risk}
              status={stats.status}
              environmentRisk={stats.environment_risk}
              combinedThreatScore={stats.combined_threat_score}
            />

            {/* Active Alerts Panel */}
            <ActiveAlertsPanel activeAlert={persistentAlert} alertHistory={alertHistory} />

            {/* Mini Analytics Chart */}
            <div className="card-level-2 p-3 flex flex-col h-[170px]">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <h3 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase font-['Space_Grotesk']">
                  Density Telemetry
                </h3>
                <div className="flex items-center gap-2 text-[9px] font-mono">
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Density
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Agitation
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full min-h-0 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff3b3b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ff3b3b" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="agitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffc107" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffc107" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        borderColor: 'rgba(255,255,255,0.1)',
                        fontSize: '11px',
                        borderRadius: '8px',
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="agitation"
                      stroke="#ffc107"
                      fill="url(#agitGrad)"
                      strokeWidth={1.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="density"
                      stroke="#ff3b3b"
                      fill="url(#densityGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tactical Map */}
            <div className="h-[185px]">
              <LiveMap alerts={mapAlerts} />
            </div>

            {/* AI Assistant Drawer Trigger */}
            <button
              onClick={() => {
                setChatOpen(!chatOpen);
                playSound('click');
              }}
              className="card-level-2 p-3 flex items-center justify-between text-xs font-semibold font-['Space_Grotesk'] text-zinc-200 hover:border-cyan-500/40 hover:text-white transition-all group shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                  <Sparkles size={13} />
                </div>
                <span>CROWDPULSE AI ASSISTANT</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">
                {chatOpen ? 'OPEN' : 'ASK'}
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* ── AI Assistant Sidebar ── */}
      <AIChatSidebar
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleChatSubmit={handleChatSubmit}
        chatContainerRef={chatContainerRef}
      />

      {/* ── Evidence Locker Modal ── */}
      <EvidenceLocker
        lockerOpen={lockerOpen}
        setLockerOpen={setLockerOpen}
        recordings={recordings}
        selectedVideo={selectedVideo}
        setSelectedVideo={setSelectedVideo}
      />

      {/* ── Hardware Self-Test Benchmark Modal ── */}
      <HardwareSelfTestModal
        isOpen={selfTestOpen}
        onClose={() => setSelfTestOpen(false)}
        report={selfTestReport}
        isRunning={selfTestRunning}
        onRunTest={runHardwareSelfTest}
        onOverrideActuator={overrideHardwareActuator}
      />

      {/* ── Forensic Incident Audit Report Modal ── */}
      <ForensicReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        stats={stats}
        activeCamera={activeCamera}
        imageRef={imageRef}
        alertHistory={alertHistory}
      />

      {/* ── Operational Command Palette (Ctrl+K) ── */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectCamera={handleCameraChange}
        onToggleVision={() => sendCommand('set_mode', { mode: stats.mode === 'OPTICAL' ? 'thermal' : 'optical' })}
        onOpenReport={() => setReportOpen(true)}
        onOpenSelfTest={runHardwareSelfTest}
        onOpenVault={() => {
          setLockerOpen(true);
          fetchRecordings();
        }}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onToggleSos={() => {
          setSosMode((prev) => {
            playSound('alert');
            speakText(!prev ? 'Emergency SOS activated' : 'Emergency SOS deactivated');
            return !prev;
          });
        }}
        onSnapshot={() => playSound('beep')}
        onPulseBuzzer={() => {
          overrideHardwareActuator(true, 'RED');
          setTimeout(() => overrideHardwareActuator(false, 'GREEN'), 3000);
        }}
        onPoliceLed={() => overrideHardwareActuator(null, 'POLICE')}
        onResetActuators={resetHardwareActuators}
      />
    </div>
  );
}

export default App;
