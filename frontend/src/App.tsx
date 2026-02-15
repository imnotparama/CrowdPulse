import { useState, useEffect, useRef } from 'react'
import { Users, Terminal, MessageSquare, Send, Film, Video, X, Gauge, Wifi, Timer, Navigation, Camera, Siren } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header'
import StatsCard from './components/StatsCard'
import VideoFeed from './components/VideoFeed'
import LiveMap from './components/LiveMap'
import VoiceCommand from './components/VoiceCommand'
import CrowdAlert from './components/FaceID'
import RiskGauge from './components/RiskGauge'
import AlertTimeline from './components/AlertTimeline'

import PAAnnouncements from './components/PAAnnouncements'

function App() {
  const [activeCamera, setActiveCamera] = useState('CAM_01')
  const [sosMode, setSosMode] = useState(false)
  const [stats, setStats] = useState({
    count: 0,
    density: 0,
    agitation: 0,
    status: 'SAFE',
    timestamp: Date.now(),
    image: null as string | null,
    mode: 'OPTICAL',
    recording: false,
    crowd_alert: null as { id: number, type: string, severity: string, message: string } | null,
    pressure_index: 0,
    capacity_pct: 0,
    max_capacity: 200,
    avg_velocity: 0,
    time_to_critical: -1,
    stampede_risk: 0,
    flow_direction: { angle: 0, label: 'STABLE' },
    sectors: [] as { name: string, count: number, status: string }[],
    wifi_probe_count: 0
  })
  const [history, setHistory] = useState<{time: string, density: number, agitation: number}[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [alertHistory, setAlertHistory] = useState<{id: number, type: string, severity: string, message: string, timestamp: number}[]>([])

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Pulse AI v3.0 Online. Crowd Safety Mode Active.' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [alerts, setAlerts] = useState<{lat: number, lng: number, type: string}[]>([])
  
  const [lockerOpen, setLockerOpen] = useState(false)
  const [recordings, setRecordings] = useState<string[]>([])
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  const [persistentAlert, setPersistentAlert] = useState<{ id: number, type: string, severity: string, message: string } | null>(null)
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ws = useRef<WebSocket | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  const playSound = (type: 'beep' | 'alert' | 'click' | 'hum') => {
    if (!soundEnabled) return
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime

    if (type === 'beep') {
        osc.frequency.setValueAtTime(800, now)
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1)
        gain.gain.setValueAtTime(0.1, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
        osc.start(now)
        osc.stop(now + 0.1)
    } else if (type === 'click') {
        osc.frequency.setValueAtTime(1200, now)
        gain.gain.setValueAtTime(0.05, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
        osc.start(now)
        osc.stop(now + 0.05)
    } else if (type === 'alert') {
        osc.frequency.setValueAtTime(400, now)
        osc.frequency.linearRampToValueAtTime(100, now + 1.0)
        osc.type = 'sawtooth'
        gain.gain.setValueAtTime(0.1, now)
        gain.gain.linearRampToValueAtTime(0, now + 1.0)
        osc.start(now)
        osc.stop(now + 1.0)
    }
  }

  const handleChatSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!chatInput.trim()) return

      const userMsg = chatInput
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
      setChatInput('')
      playSound('click')

      setTimeout(() => {
          let response = "Command not recognized."
          const lower = userMsg.toLowerCase()
          
          if (lower.includes('status') || lower.includes('report')) {
              response = `System Status: ${stats.status}. Detected: ${stats.count} people. Density: ${stats.density.toFixed(2)}. Stampede Risk: ${stats.stampede_risk.toFixed(0)}/100. Pressure: ${stats.pressure_index.toFixed(0)}/100.`
          } else if (lower.includes('capacity')) {
              response = `Current Capacity: ${stats.count}/${stats.max_capacity} (${stats.capacity_pct}%). ${stats.capacity_pct > 80 ? 'WARNING: Approaching max capacity!' : 'Within safe limits.'}`
          } else if (lower.includes('risk') || lower.includes('danger')) {
              response = `Stampede Risk Score: ${stats.stampede_risk.toFixed(0)}/100. Pressure Index: ${stats.pressure_index.toFixed(0)}/100. Status: ${stats.status}.${stats.time_to_critical > 0 ? ` Time to critical: ~${stats.time_to_critical}s.` : ''}`
          } else if (lower.includes('evacuate') || lower.includes('exit')) {
              response = "Evacuation routes displayed on tactical map. 3 exit routes available. Recommend immediate deployment of crowd control barriers."
          } else if (lower.includes('scan') || lower.includes('search')) {
              response = `Sector scan complete. ${stats.sectors.filter(s => s.status !== 'SAFE').length} zones showing elevated density. Wi-Fi probes detecting ${stats.wifi_probe_count} devices.`
          } else if (lower.includes('hello') || lower.includes('hi')) {
              response = "Greetings, Operator. CrowdPulse safety monitoring active. How can I assist?"
          } else if (lower.includes('recording') || lower.includes('evidence')) {
              response = "Accessing Evidence Locker... Encrypted files available for review."
              setLockerOpen(true)
              fetchRecordings()
          }

          setChatMessages(prev => [...prev, { role: 'ai', text: response }])
          playSound('beep')
      }, 500)
  }

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))
  }

  const fetchRecordings = async () => {
      try {
          const res = await fetch('http://localhost:8000/api/recordings')
          const data = await res.json()
          setRecordings(data)
      } catch (e) {
          console.error("Failed to fetch recordings", e)
      }
  }

  useEffect(() => {
    addLog("SYSTEM_INIT: Initializing CrowdPulse Sequence...")
    addLog("CONNECTED: Attempting handshake with backend node...")

    ws.current = new WebSocket('ws://localhost:8000/ws')

    ws.current.onopen = () => {
      addLog("CONNECTION_ESTABLISHED: Uplink secured.")
      addLog("STREAM_START: Live optical feed incoming.")
      playSound('beep')
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const isRecording = data.recording || false
      
      setStats(prev => {
          if (prev.recording && !isRecording) {
              setTimeout(() => {
                  setLockerOpen(true)
                  fetchRecordings()
                  playSound('alert')
              }, 500)
          }
          return {
            count: data.count,
            density: data.density,
            agitation: data.agitation || 0,
            status: data.status,
            timestamp: data.timestamp,
            image: data.image,
            mode: data.mode || 'OPTICAL',
            recording: isRecording,
            crowd_alert: data.crowd_alert || null,
            pressure_index: data.pressure_index || 0,
            capacity_pct: data.capacity_pct || 0,
            max_capacity: data.max_capacity || 200,
            avg_velocity: data.avg_velocity || 0,
            time_to_critical: data.time_to_critical ?? -1,
            stampede_risk: data.stampede_risk || 0,
            flow_direction: data.flow_direction || { angle: 0, label: 'STABLE' },
            sectors: data.sectors || [],
            wifi_probe_count: data.wifi_probe_count || 0
          }
      })
      
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date(data.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          density: data.density,
          agitation: data.agitation || 0
        }]
        return newHistory.slice(-20) 
      })

      // Handle Crowd Safety Alert
      if (data.crowd_alert) {
          addLog(`CROWD_ALERT: ${data.crowd_alert.severity} - ${data.crowd_alert.type} in Zone ${data.crowd_alert.id}`)
          playSound('alert')
          
          setPersistentAlert(data.crowd_alert)
          
          // Add to alert history
          setAlertHistory(prev => [{
              ...data.crowd_alert,
              timestamp: Date.now()
          }, ...prev].slice(0, 20))
          
          if (alertTimeoutRef.current) {
              clearTimeout(alertTimeoutRef.current)
          }
          alertTimeoutRef.current = setTimeout(() => {
              setPersistentAlert(null)
          }, 5000)

          setAlerts(prev => [...prev, { lat: 40.7128 + (Math.random()-0.5)*0.01, lng: -74.0060 + (Math.random()-0.5)*0.01, type: 'density' }])
      }

      if (Math.random() > 0.98) {
        addLog(`ANALYSIS_COMPLETE: Frame processed. Objects: ${data.count}`)
      }
    }

    ws.current.onclose = () => {
      addLog("CONNECTION_LOST: Backend uplink severed.")
    }

    return () => {
      ws.current?.close()
    }
  }, [])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  }, [logs])

  useEffect(() => {
      if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
  }, [chatMessages])

  const sendCommand = (action: string, payload: any = {}) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ action, ...payload }))
          playSound('click')
      }
  }

  const handleVoiceCommand = (cmd: string) => {
      addLog(`VOICE_CMD_RECEIVED: "${cmd}"`)
      if (cmd === 'status') {
      } else if (cmd === 'switch_thermal') {
          sendCommand('set_mode', { mode: 'thermal' })
      } else if (cmd === 'switch_optical') {
          sendCommand('set_mode', { mode: 'optical' })
      } else if (cmd === 'start_recording') {
          sendCommand('start_recording')
      } else if (cmd === 'stop_recording') {
          sendCommand('stop_recording')
      }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SAFE': return 'text-neon-green border-neon-green shadow-[0_0_10px_#0aff0a]';
      case 'ELEVATED': return 'text-yellow-500 border-yellow-500 shadow-[0_0_10px_#eab308]';
      case 'WARNING': return 'text-orange-500 border-orange-500 shadow-[0_0_10px_#f97316]';
      case 'CRITICAL': return 'text-red-500 border-red-500 animate-pulse shadow-[0_0_15px_#ef4444]';
      case 'EVACUATE': return 'text-red-500 border-red-500 animate-ping shadow-[0_0_25px_#ef4444]';
      default: return 'text-amd-silver border-amd-silver';
    }
  }

  const getCapacityColor = () => {
    if (stats.capacity_pct > 85) return 'bg-red-500'
    if (stats.capacity_pct > 65) return 'bg-orange-500'
    if (stats.capacity_pct > 40) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  return (
    <div className={`min-h-screen bg-amd-black font-sans selection:bg-amd-red selection:text-white overflow-hidden relative grid-bg ${sosMode ? 'sos-active' : ''}`}>

      {/* SOS Full-screen Border Flash */}
      {sosMode && (
        <div className="fixed inset-0 pointer-events-none z-[9998] border-4 border-red-500 animate-flash" />
      )}

      {/* Decorative Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50">
         <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-black to-transparent"></div>
         <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-black to-transparent"></div>
      </div>

      <Header status={sosMode ? 'EVACUATE' : stats.status} getStatusColor={getStatusColor} />

      {/* Main Grid */}
      <main className="max-w-[1920px] mx-auto px-4 py-3 grid grid-cols-12 gap-3 h-[calc(100vh-3.5rem)] overflow-hidden relative">
        
        {/* Left Column: Stats & Logs */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-2 min-h-0 overflow-y-auto scrollbar-hide">
          
          {/* Capacity Tracker */}
          <div className="card bg-black/50">
            <div className="card-header !mb-2">
                <span className="card-title"><Users size={12}/> CROWD CAPACITY</span>
                <span className="text-[10px] font-mono text-neon-blue animate-pulse">LIVE</span>
            </div>
            <div className="flex items-end justify-between mb-2">
                <div className="text-3xl font-mono font-bold tracking-tighter text-white">
                    {stats.count}<span className="text-lg text-amd-silver/40">/{stats.max_capacity}</span>
                </div>
                <div className="text-right">
                    <div className="text-xs font-mono text-amd-silver">{stats.capacity_pct}%</div>
                    <div className="text-[9px] font-mono text-amd-silver/50">CAPACITY</div>
                </div>
            </div>
            <div className="w-full h-2 bg-gray-800/80 rounded-full overflow-hidden">
                <div className={`h-full ${getCapacityColor()} transition-all duration-500 rounded-full`} style={{ width: `${stats.capacity_pct}%` }}/>
            </div>
          </div>

          {/* Pressure Index */}
          <StatsCard 
              title="PRESSURE INDEX" 
              value={stats.pressure_index.toFixed(0)} 
              icon={Gauge} 
              color={stats.pressure_index > 60 ? "text-red-400" : stats.pressure_index > 30 ? "text-yellow-400" : "text-emerald-400"}
              subtext="Physical compression between detected individuals."
              chart={
                   <div className="w-full bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
                     <div className={`${stats.pressure_index > 60 ? 'bg-red-500' : stats.pressure_index > 30 ? 'bg-yellow-500' : 'bg-emerald-500'} h-full transition-all duration-500 rounded-full`} style={{ width: `${stats.pressure_index}%` }}></div>
                   </div>
              }
          />

          {/* Wi-Fi Probe Counter */}
          <div className="card bg-black/50">
            <div className="card-header !mb-1">
                <span className="card-title"><Wifi size={12}/> WI-FI PROBES</span>
                <span className="text-[10px] font-mono text-neon-green animate-pulse">ACTIVE</span>
            </div>
            <div className="flex items-end gap-2">
                <div className="text-3xl font-mono font-bold tracking-tighter text-neon-blue">
                    {stats.wifi_probe_count}
                </div>
                <div className="text-[9px] font-mono text-amd-silver/50 pb-1">MAC ADDRESSES</div>
            </div>
            <div className="text-[9px] font-mono text-amd-silver/40 mt-1">ESP32 sensor network • Privacy: Hashed</div>
          </div>

          {/* Stampede Risk Gauge */}
          <RiskGauge risk={stats.stampede_risk} status={stats.status} />

          {/* Time to Critical — only shows when density is rising */}
          {stats.time_to_critical >= 0 && stats.time_to_critical < 300 && (
            <div className="card bg-red-900/20 border-red-500/40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Timer size={14} className="text-red-400 animate-pulse-fast" />
                        <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-widest">TIME TO CRITICAL</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-red-400">
                        {stats.time_to_critical === 0 ? 'NOW' : `${stats.time_to_critical}s`}
                    </div>
                </div>
            </div>
          )}

          {/* System Logs */}
          <div className="card flex-1 flex flex-col min-h-0 bg-black/40">
            <div className="card-header !mb-0 border-none bg-white/5 p-2">
              <span className="card-title text-amd-red"><Terminal size={12}/> SYSTEM LOGS</span>
            </div>
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-2 font-mono text-[9px] tracking-wide space-y-0.5 text-amd-silver/80 scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className="border-l border-white/10 pl-2 hover:bg-white/5 hover:text-white transition-colors cursor-default">
                  <span className="opacity-50 mr-1">{">"}</span>{log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Center Column: Main Feed */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-2 relative group min-h-0">
           {/* Multi-Camera Tabs */}
           <div className="flex items-center gap-1">
               {['CAM_01', 'CAM_02', 'CAM_03'].map(cam => (
                   <button
                       key={cam}
                       onClick={() => { setActiveCamera(cam); playSound('click') }}
                       className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-mono tracking-wider border transition-all ${
                           activeCamera === cam
                               ? 'bg-amd-red text-white border-amd-red'
                               : 'bg-black/50 text-amd-silver/60 border-white/10 hover:border-white/30'
                       }`}
                   >
                       <Camera size={10} />
                       {cam}
                       {activeCamera === cam && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                   </button>
               ))}
               
               {/* Emergency SOS Button */}
               <button
                   onClick={() => {
                       setSosMode(!sosMode)
                       playSound('alert')
                       if (!sosMode) {
                           addLog('🚨 EMERGENCY SOS ACTIVATED — ALL UNITS RESPOND')
                           setAlertHistory(prev => [{
                               id: 0,
                               type: 'EMERGENCY SOS',
                               severity: 'CRITICAL',
                               message: 'Manual evacuation triggered by operator.',
                               timestamp: Date.now()
                           }, ...prev].slice(0, 20))
                       } else {
                           addLog('SOS DEACTIVATED — Returning to normal monitoring')
                       }
                   }}
                   className={`ml-auto flex items-center gap-1.5 px-3 py-1 text-[9px] font-mono font-bold tracking-wider border transition-all ${
                       sosMode
                           ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                           : 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                   }`}
               >
                   <Siren size={12} />
                   {sosMode ? 'CANCEL SOS' : 'EMERGENCY SOS'}
               </button>
           </div>

           <VideoFeed 
               image={stats.image}
               isRecording={stats.recording}
               visionMode={stats.mode}
               soundEnabled={soundEnabled}
               flowDirection={stats.flow_direction}
               sectors={stats.sectors}
               onToggleRecord={() => sendCommand(stats.recording ? 'stop_recording' : 'start_recording')}
               onToggleVision={() => sendCommand('set_mode', { mode: stats.mode === 'OPTICAL' ? 'thermal' : 'optical' })}
               onToggleSound={() => setSoundEnabled(!soundEnabled)}
               onSetGeofence={(points) => sendCommand('set_geofence', { points })}
           />
           
           <VoiceCommand onCommand={handleVoiceCommand} />
        </div>

        {/* Right Column: Charts, Map, Alerts */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-2 min-h-0 overflow-y-auto scrollbar-hide">
           
           {/* Density & Agitation Chart */}
           <div className="card flex flex-col" style={{ minHeight: '160px', maxHeight: '200px' }}>
             <div className="card-header">
               <span className="card-title">LIVE METRICS</span>
             </div>
             <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={history}>
                    <defs>
                      <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ED1C24" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ED1C24" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, 'auto']}/>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', borderColor: '#333', fontSize: '10px' }}
                      itemStyle={{ color: '#fff', fontSize: '10px' }}
                    />
                    <Area type="monotone" dataKey="agitation" stroke="#EAB308" fill="none" strokeWidth={2} />
                    <Area type="monotone" dataKey="density" stroke="#ED1C24" fill="url(#cyberGradient)" strokeWidth={2} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Quick Stats Row */}
           <div className="card bg-black/50 !p-2">
              <div className="grid grid-cols-3 divide-x divide-white/10">
                <div className="text-center px-2">
                    <div className="text-[8px] font-mono text-amd-silver/50 uppercase">VELOCITY</div>
                    <div className="text-lg font-mono font-bold text-neon-blue">{stats.avg_velocity.toFixed(0)}<span className="text-[8px] text-amd-silver/40"> px/s</span></div>
                </div>
                <div className="text-center px-2">
                    <div className="text-[8px] font-mono text-amd-silver/50 uppercase">DENSITY</div>
                    <div className="text-lg font-mono font-bold text-amd-red">{stats.density.toFixed(2)}</div>
                </div>
                <div className="text-center px-2">
                    <div className="text-[8px] font-mono text-amd-silver/50 uppercase">FLOW</div>
                    <div className="text-sm font-mono font-bold text-neon-green flex items-center justify-center gap-1">
                        <Navigation size={12} style={{ transform: `rotate(${stats.flow_direction.angle}deg)` }} />
                        {stats.flow_direction.label}
                    </div>
                </div>
              </div>
           </div>

           {/* Live Map */}
           <div className="flex-1 min-h-0">
               <LiveMap alerts={alerts} />
           </div>

           {/* PA Announcements */}
           <PAAnnouncements
               density={stats.density}
               status={sosMode ? 'CRITICAL' : stats.status}
               sectors={stats.sectors}
               capacity_pct={stats.capacity_pct}
           />

           {/* Alert Timeline */}
           <div className="card bg-black/50 flex flex-col" style={{ minHeight: '100px', maxHeight: '150px' }}>
               <div className="card-header !mb-1">
                   <span className="card-title text-amd-red">ALERT HISTORY</span>
                   <span className="text-[9px] font-mono text-amd-silver/40">{alertHistory.length} events</span>
               </div>
               <div className="flex-1 overflow-hidden min-h-0">
                   <AlertTimeline alerts={alertHistory} />
               </div>
           </div>
            
           {/* Chat Trigger */}
           <button 
                 onClick={() => {
                     setChatOpen(!chatOpen)
                     playSound('click')
                 }}
                 className={`w-full py-2 border border-amd-silver/30 backdrop-blur-sm text-amd-silver font-mono text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors flex items-center justify-center gap-2 ${chatOpen ? 'bg-amd-red text-white border-amd-red' : ''}`}
           >
                <MessageSquare size={12}/> PULSE AI ASSISTANT
           </button>

        </div>

        {/* AI Chat Sidebar */}
        <AnimatePresence>
        {chatOpen && (
            <motion.div 
               initial={{ x: 300, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               exit={{ x: 300, opacity: 0 }}
               className="absolute right-0 top-0 h-full w-80 bg-black/95 backdrop-blur-xl border-l border-amd-red z-50 flex flex-col p-4 shadow-2xl"
            >
                <div className="flex justify-between items-center mb-4 border-b border-amd-red/30 pb-2">
                    <h3 className="text-amd-red font-mono font-bold flex items-center gap-2"><MessageSquare size={16}/> PULSE AI</h3>
                    <button onClick={() => setChatOpen(false)} className="text-amd-silver hover:text-white"><X size={16}/></button>
                </div>
                
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 mb-4 font-mono text-xs scrollbar-hide">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-2 rounded-sm ${msg.role === 'user' ? 'bg-amd-gray text-white border border-white/10' : 'bg-amd-red/10 text-amd-red border border-amd-red/30'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleChatSubmit} className="relative">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="ENTER COMMAND..." 
                        className="w-full bg-black border border-amd-silver/30 p-2 pr-8 text-xs font-mono text-white focus:border-amd-red focus:outline-none"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-amd-red">
                        <Send size={14}/>
                    </button>
                </form>
            </motion.div>
        )}
        </AnimatePresence>

        {/* Evidence Locker Modal */}
        {lockerOpen && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-12">
                <div className="w-full h-full border border-amd-red/50 bg-black/50 p-6 flex flex-col relative card shadow-2xl">
                    <button onClick={() => setLockerOpen(false)} className="absolute top-4 right-4 text-amd-silver hover:text-white">
                        <X size={24}/>
                    </button>
                    
                    <h2 className="text-2xl font-mono text-white mb-6 flex items-center gap-3">
                        <Film className="text-amd-red"/> EVIDENCE LOCKER
                    </h2>
                    
                    <div className="flex flex-1 gap-6 min-h-0">
                         <div className="w-1/3 border-r border-white/10 pr-4 overflow-y-auto">
                              <h3 className="text-xs font-mono text-amd-silver mb-4 uppercase tracking-widest">Encrypted Files</h3>
                              {recordings.length === 0 ? (
                                  <div className="text-amd-silver/50 text-sm font-mono italic">No recordings found.</div>
                              ) : (
                                  <div className="space-y-2">
                                      {recordings.map((rec, i) => (
                                          <div 
                                            key={i} 
                                            onClick={() => setSelectedVideo(rec)}
                                            className={`p-3 border ${selectedVideo === rec ? 'border-amd-red bg-amd-red/10 text-white' : 'border-white/10 text-amd-silver hover:bg-white/5'} cursor-pointer transition-all font-mono text-xs`}
                                          >
                                              <div className="flex items-center gap-2">
                                                  <Video size={14}/>
                                                  <span>{rec}</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                         </div>

                         <div className="flex-1 flex flex-col items-center justify-center bg-black/50 border border-white/5 p-4 rounded-sm">
                              {selectedVideo ? (
                                  <div className="w-full h-full flex flex-col gap-4">
                                      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden border border-amd-red/20 group">
                                          <video 
                                              id="evidence-video"
                                              src={`http://localhost:8000/recordings/${selectedVideo}`} 
                                              controls
                                              autoPlay 
                                              className="max-w-full max-h-full"
                                          />
                                      </div>
                                      <div className="text-center font-mono text-xs text-amd-silver flex flex-col gap-1">
                                          <div>PLAYING: <span className="text-white">{selectedVideo}</span></div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="text-amd-silver/30 font-mono flex flex-col items-center gap-4">
                                      <Film size={48}/>
                                      <span>SELECT FOOTAGE TO REVIEW</span>
                                  </div>
                              )}
                         </div>
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* GLOBAL OVERLAYS - CROWD ALERT */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          <AnimatePresence>
              {persistentAlert && (
                  <motion.div 
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 100, opacity: 0 }}
                      className="pointer-events-auto absolute top-20 right-8 z-50"
                  >
                      <CrowdAlert alert={persistentAlert} />
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

    </div>
  )
}

export default App
