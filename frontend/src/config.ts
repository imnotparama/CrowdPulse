/**
 * CrowdPulse Dynamic API Configuration
 * Automatically resolves to current browser origin/hostname so API & WebSocket calls work
 * seamlessly whether running on localhost, 127.0.0.1, or remote Wi-Fi / Hotspot LAN IP.
 */

export const getApiBase = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    return `http://${host}:8000`;
  }
  return 'http://127.0.0.1:8000';
};

export const getWsBase = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${host}:8000`;
  }
  return 'ws://127.0.0.1:8000';
};
