export type SensorId = 1 | 2 | 3 | 4 | 5 | 6;

export interface SensorMeta {
  id: SensorId;
  shortLabel: string;
  name: string;
  anatomicalZone: string;
  /** SVG coordinates inside 320x460 viewBox */
  cx: number;
  cy: number;
}

export type PressureLevel = 'safe' | 'moderate' | 'critical';

export type ConnectionMode = 'simulation' | 'connecting' | 'connected';

export interface TelemetryState {
  fsr: [number, number, number, number, number, number];
  tempC: number;
  riskScore: number;
  lastUpdated: number;
}

export type LogSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface ClinicalLogEntry {
  id: string;
  timestamp: string;
  message: string;
  severity: LogSeverity;
}

export const BLE_DEVICE_NAME = 'Smart_Diabetic_Insole';
export const BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const BLE_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

export const FOOT_SENSORS: SensorMeta[] = [
  {
    id: 1,
    shortLabel: 'S1',
    name: 'Heel',
    anatomicalZone: 'Calcaneal Pad',
    cx: 162,
    cy: 382,
  },
  {
    id: 2,
    shortLabel: 'S2',
    name: 'Midfoot',
    anatomicalZone: 'Plantar Arch',
    cx: 174,
    cy: 274,
  },
  {
    id: 3,
    shortLabel: 'S3',
    name: 'Metatarsal 1',
    anatomicalZone: 'Inner Forefoot',
    cx: 108,
    cy: 172,
  },
  {
    id: 4,
    shortLabel: 'S4',
    name: 'Metatarsal 3',
    anatomicalZone: 'Middle Forefoot',
    cx: 164,
    cy: 166,
  },
  {
    id: 5,
    shortLabel: 'S5',
    name: 'Metatarsal 5',
    anatomicalZone: 'Outer Forefoot',
    cx: 218,
    cy: 186,
  },
  {
    id: 6,
    shortLabel: 'S6',
    name: 'Big Toe',
    anatomicalZone: 'Hallux Distal Pad',
    cx: 98,
    cy: 80,
  },
];

export const NORMAL_GAIT_VALUES: [number, number, number, number, number, number] = [
  920, 480, 1150, 1040, 890, 1210,
];

export const ULCER_ALERT_VALUES: [number, number, number, number, number, number] = [
  3180, 1950, 3640, 2920, 2140, 3490,
];

// Minimal Web Bluetooth API typings for strict TypeScript compilation
export interface WebBluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<WebBluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<WebBluetoothRemoteGATTCharacteristic>;
}

export interface WebBluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<WebBluetoothRemoteGATTCharacteristic>;
}

export interface WebBluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<WebBluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<WebBluetoothRemoteGATTService>;
}

export interface WebBluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: WebBluetoothRemoteGATTServer;
}

export interface WebBluetoothNavigator {
  requestDevice(options: {
    filters?: Array<{ name?: string; namePrefix?: string; services?: string[] }>;
    optionalServices?: string[];
    acceptAllDevices?: boolean;
  }): Promise<WebBluetoothDevice>;
}

declare global {
  interface Navigator {
    bluetooth?: WebBluetoothNavigator;
  }
}
