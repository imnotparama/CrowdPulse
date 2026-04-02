import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// NOTE: StrictMode is intentionally omitted.
// StrictMode double-invokes useEffect in development, which causes:
//   1. SplashScreen timers to be cancelled and restarted on each re-mount,
//      so onComplete() never fires → infinite loading screen.
//   2. WebSocket to connect, immediately close (cleanup), then reconnect —
//      this logs "CONNECTION_LOST" before the app even renders.
createRoot(document.getElementById('root')!).render(
  <App />
)
