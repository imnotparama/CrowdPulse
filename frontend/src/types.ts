export interface SectorData {
  name: string;
  count: number;
  status: string;
}

export interface WifiZone {
  count: number;
  rssi: number;
  status: 'ACTIVE' | 'OFFLINE';
}

export interface AlertItem {
  id: number;
  type: string;
  severity: string;
  message: string;
  timestamp: number;
}
