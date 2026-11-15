import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Battery, Signal, Wifi } from 'lucide-react';
import { ClinicalLog } from './components/ClinicalLog';
import { DashboardMetrics } from './components/DashboardMetrics';
import { FootHeatmap } from './components/FootHeatmap';
import { SimulationPanel } from './components/SimulationPanel';
import {
  BLE_CHARACTERISTIC_UUID,
  BLE_DEVICE_NAME,
  BLE_SERVICE_UUID,
  ClinicalLogEntry,
  ConnectionMode,
  LogSeverity,
  NORMAL_GAIT_VALUES,
  TelemetryState,
  ULCER_ALERT_VALUES,
  WebBluetoothDevice,
  WebBluetoothRemoteGATTCharacteristic,
} from './types/telemetry';
import {
  formatTimeStamp,
  parseBleTelemetryString,
  playWarningBeep,
  requestAlertNotificationPermission,
  triggerUlcerNotification,
  unlockAudioContext,
} from './utils/alerts';

const INITIAL_TELEMETRY: TelemetryState = {
  fsr: NORMAL_GAIT_VALUES,
  tempC: 32.4,
  riskScore: 0.12,
  lastUpdated: Date.now(),
};

export default function App() {
  const [telemetry, setTelemetry] = useState<TelemetryState>(INITIAL_TELEMETRY);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('simulation');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [clockText, setClockText] = useState<string>(() =>
    new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
  );
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  const [logs, setLogs] = useState<ClinicalLogEntry[]>(() => [
    {
      id: 'init-1',
      timestamp: formatTimeStamp(),
      message: 'NeuroStride initialized in Offline Simulation Mode.',
      severity: 'info',
    },
  ]);

  const bleDeviceRef = useRef<WebBluetoothDevice | null>(null);
  const bleCharRef = useRef<WebBluetoothRemoteGATTCharacteristic | null>(null);
  const wasAlertActiveRef = useRef<boolean>(false);
  const audioEnabledRef = useRef<boolean>(audioEnabled);
  audioEnabledRef.current = audioEnabled;

  // Live Android status bar clock
  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockText(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const appendLog = useCallback((message: string, severity: LogSeverity = 'info') => {
    const entry: ClinicalLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: formatTimeStamp(),
      message,
      severity,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 60));
  }, []);

  const maxPressure = Math.max(...telemetry.fsr);
  const isAlertActive = telemetry.riskScore >= 0.5 || maxPressure > 2800;

  const fireAlerts = useCallback(
    (next: TelemetryState, forceImmediate = false) => {
      const nextMax = Math.max(...next.fsr);
      const nextIsAlert = next.riskScore >= 0.5 || nextMax > 2800;

      if (nextIsAlert) {
        if (audioEnabledRef.current) {
          playWarningBeep(forceImmediate);
        }
        triggerUlcerNotification(next.riskScore, nextMax, next.tempC, forceImmediate);

        if (!wasAlertActiveRef.current || forceImmediate) {
          appendLog(
            `ULCER RISK ALERT! Risk ${(next.riskScore * 100).toFixed(1)}%, Peak ${nextMax} ADC, Temp ${next.tempC.toFixed(1)}°C`,
            'critical'
          );
        }
      } else if (wasAlertActiveRef.current) {
        appendLog(
          `Pressure & temperature normalized (${(next.riskScore * 100).toFixed(1)}% risk, ${next.tempC.toFixed(1)}°C).`,
          'success'
        );
      }

      wasAlertActiveRef.current = nextIsAlert;
    },
    [appendLog]
  );

  // Incoming BLE characteristic notification handler
  const handleCharacteristicValueChanged = useCallback(
    (event: Event) => {
      const target = event.target as WebBluetoothRemoteGATTCharacteristic | null;
      const value = target?.value;
      if (!value) return;

      const decoder = new TextDecoder('utf-8');
      const rawString = decoder.decode(value);
      const parsed = parseBleTelemetryString(rawString);

      if (!parsed) {
        appendLog(`Ignored malformed BLE packet: "${rawString.trim()}"`, 'warning');
        return;
      }

      setTelemetry(parsed);
      fireAlerts(parsed, false);
    },
    [appendLog, fireAlerts]
  );

  const handleBleDisconnected = useCallback(() => {
    setConnectionMode('simulation');
    bleCharRef.current = null;
    appendLog('ESP32-S3 BLE disconnected. Reverted to Simulation Mode.', 'warning');
  }, [appendLog]);

  // Cleanup BLE listener on unmount
  useEffect(() => {
    return () => {
      if (bleCharRef.current) {
        bleCharRef.current.removeEventListener(
          'characteristicvaluechanged',
          handleCharacteristicValueChanged
        );
      }
      if (bleDeviceRef.current) {
        bleDeviceRef.current.removeEventListener(
          'gattserverdisconnected',
          handleBleDisconnected
        );
        if (bleDeviceRef.current.gatt?.connected) {
          bleDeviceRef.current.gatt.disconnect();
        }
      }
    };
  }, [handleBleDisconnected, handleCharacteristicValueChanged]);

  const handleConnectBle = async () => {
    unlockAudioContext();

    if (connectionMode === 'connected' && bleDeviceRef.current?.gatt?.connected) {
      bleDeviceRef.current.gatt.disconnect();
      return;
    }

    if (!navigator.bluetooth) {
      appendLog(
        'Web Bluetooth API unavailable in this browser/context. Use Chrome on Android or Desktop over HTTPS.',
        'warning'
      );
      return;
    }

    try {
      setConnectionMode('connecting');
      appendLog(`Scanning for BLE device "${BLE_DEVICE_NAME}"...`, 'info');

      if (notificationPermission === 'default') {
        const perm = await requestAlertNotificationPermission();
        setNotificationPermission(perm);
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: BLE_DEVICE_NAME }],
        optionalServices: [BLE_SERVICE_UUID],
      });

      bleDeviceRef.current = device;
      device.addEventListener('gattserverdisconnected', handleBleDisconnected);

      if (!device.gatt) {
        throw new Error('GATT server unavailable on selected BLE device.');
      }

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_UUID);

      bleCharRef.current = characteristic;
      characteristic.addEventListener(
        'characteristicvaluechanged',
        handleCharacteristicValueChanged
      );
      await characteristic.startNotifications();

      setConnectionMode('connected');
      appendLog(
        `BLE connected to ${device.name || BLE_DEVICE_NAME}. Streaming live ESP32-S3 telemetry.`,
        'success'
      );
    } catch (err) {
      setConnectionMode('simulation');
      const message =
        err instanceof Error ? err.message : 'Bluetooth connection cancelled or failed.';
      appendLog(`BLE connection aborted: ${message}`, 'warning');
    }
  };

  const handleTestNormalGait = async () => {
    unlockAudioContext();
    const next: TelemetryState = {
      fsr: NORMAL_GAIT_VALUES,
      tempC: 32.4,
      riskScore: 0.12,
      lastUpdated: Date.now(),
    };
    setTelemetry(next);
    wasAlertActiveRef.current = false;
    appendLog(
      'Simulation: Normal Gait applied (Peak 1210 ADC, 32.4°C, Risk 12.0% SAFE).',
      'success'
    );
  };

  const handleTestUlcerAlert = async () => {
    unlockAudioContext();
    if (notificationPermission === 'default') {
      const perm = await requestAlertNotificationPermission();
      setNotificationPermission(perm);
    }

    const next: TelemetryState = {
      fsr: ULCER_ALERT_VALUES,
      tempC: 36.8,
      riskScore: 0.942,
      lastUpdated: Date.now(),
    };
    setTelemetry(next);
    fireAlerts(next, true);
  };

  const handleRequestNotifications = async () => {
    const result = await requestAlertNotificationPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      appendLog('Browser push notifications enabled for ulcer risk alerts.', 'success');
    } else if (result === 'denied') {
      appendLog('Browser notifications blocked by user/browser settings.', 'warning');
    }
  };

  const handleToggleAudio = () => {
    unlockAudioContext();
    setAudioEnabled((prev) => {
      const next = !prev;
      appendLog(`Audio warning beep ${next ? 'enabled' : 'muted'}.`, 'info');
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#06090F] sm:flex sm:items-center sm:justify-center sm:px-4 sm:py-6">
      {/* Native Android Mobile Phone Container */}
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-[#090D14] sm:min-h-0 sm:max-w-[430px] sm:overflow-hidden sm:rounded-[40px] sm:border-[6px] sm:border-slate-800 sm:shadow-[0_28px_90px_rgba(0,0,0,0.85)]">
        {/* Android Status Bar (visible inside phone shell on sm+) */}
        <div className="hidden items-center justify-between bg-[#090D14] px-6 pb-1.5 pt-3 text-[11px] font-medium text-slate-300 sm:flex">
          <span className="font-mono tabular-nums">{clockText}</span>
          {/* Subtle punch-hole camera cutout */}
          <div className="h-3.5 w-3.5 rounded-full border border-slate-800 bg-black" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <Signal className="h-3 w-3" aria-hidden="true" />
            <Wifi className="h-3 w-3" aria-hidden="true" />
            <Battery className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        </div>

        {/* Main Scrollable App Viewport */}
        <main className="flex-1 space-y-3.5 px-4 pb-6 pt-3 sm:max-h-[840px] sm:overflow-y-auto clinical-scroll">
          {/* Real-Time Flashing Red Warning Banner */}
          {isAlertActive && (
            <div
              role="alert"
              aria-live="assertive"
              className="animate-alert-flash rounded-2xl border px-3.5 py-2.5 text-xs font-bold leading-snug text-white"
            >
              🚨 ULCER RISK ALERT! High pressure &amp; heat detected. Offload weight immediately!
            </div>
          )}

          {/* Header & Bluetooth Connection */}
          <header className="space-y-3 border-b border-slate-800/80 pb-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-50">
                  🦶 NeuroStride
                </h1>
                <p className="text-xs font-medium text-slate-400">
                  Smart Diabetic Foot Monitor
                </p>
              </div>

              {/* Live Connection Status Badge */}
              <div
                className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide transition-colors ${
                  connectionMode === 'connected'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : connectionMode === 'connecting'
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                      : 'border-slate-700 bg-slate-800/90 text-slate-300'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    connectionMode === 'connected'
                      ? 'bg-[#22c55e] shadow-[0_0_8px_#22c55e]'
                      : connectionMode === 'connecting'
                        ? 'bg-cyan-400 animate-pulse'
                        : 'bg-slate-400'
                  }`}
                />
                <span>
                  {connectionMode === 'connected'
                    ? 'BLE CONNECTED - ESP32-S3'
                    : connectionMode === 'connecting'
                      ? 'PAIRING ESP32-S3...'
                      : 'OFFLINE - SIMULATION MODE'}
                </span>
              </div>
            </div>

            {/* Prominent Connect ESP32-S3 Hardware Button */}
            <button
              type="button"
              onClick={handleConnectBle}
              disabled={connectionMode === 'connecting'}
              className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.985] disabled:opacity-60 ${
                connectionMode === 'connected'
                  ? 'border border-emerald-500/45 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                  : 'bg-cyan-500 text-slate-950 shadow-[0_6px_20px_rgba(6,182,212,0.25)] hover:bg-cyan-400'
              }`}
            >
              <span>
                {connectionMode === 'connected'
                  ? '📡 Disconnect ESP32-S3 Hardware'
                  : connectionMode === 'connecting'
                    ? '📡 Connecting to Smart_Diabetic_Insole...'
                    : '📡 Connect ESP32-S3 Hardware'}
              </span>
            </button>
          </header>

          {/* Interactive Anatomical Foot Heatmap */}
          <FootHeatmap fsr={telemetry.fsr} />

          {/* TinyML Risk & Temperature Dashboard */}
          <DashboardMetrics
            riskScore={telemetry.riskScore}
            tempC={telemetry.tempC}
            isAlertActive={isAlertActive}
          />

          {/* Clinical Alert & Event Log */}
          <ClinicalLog
            entries={logs}
            onClear={() => setLogs([])}
          />

          {/* Laptop Simulation Controls */}
          <SimulationPanel
            onTestNormalGait={handleTestNormalGait}
            onTestUlcerAlert={handleTestUlcerAlert}
            audioEnabled={audioEnabled}
            onToggleAudio={handleToggleAudio}
            notificationPermission={notificationPermission}
            onRequestNotifications={handleRequestNotifications}
          />
        </main>

        {/* Android Gesture Navigation Pill (sm+ phone chassis) */}
        <div className="hidden items-center justify-center bg-[#090D14] pb-2.5 pt-1 sm:flex">
          <div className="h-1 w-28 rounded-full bg-slate-700/80" />
        </div>
      </div>
    </div>
  );
}
