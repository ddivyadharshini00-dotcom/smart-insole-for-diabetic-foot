import { PressureLevel, TelemetryState } from '../types/telemetry';

let sharedAudioCtx: AudioContext | null = null;
let lastBeepTime = 0;
let lastNotificationTime = 0;

export function getPressureLevel(adc: number): PressureLevel {
  if (adc > 2800) return 'critical';
  if (adc >= 1800) return 'moderate';
  return 'safe';
}

export function getPressureColor(adc: number): string {
  if (adc > 2800) return '#ef4444';
  if (adc >= 1800) return '#f59e0b';
  return '#22c55e';
}

export function formatTimeStamp(date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Parses incoming BLE CSV telemetry string:
 * "FSR1,FSR2,FSR3,FSR4,FSR5,FSR6,Temp,RiskScore"
 */
export function parseBleTelemetryString(raw: string): TelemetryState | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  const parts = cleaned.split(',').map((segment) => segment.trim());
  if (parts.length < 8) return null;

  const numbers = parts.slice(0, 8).map((val) => Number.parseFloat(val));
  if (numbers.some((n) => Number.isNaN(n) || !Number.isFinite(n))) {
    return null;
  }

  const clampAdc = (v: number) => Math.max(0, Math.min(4095, Math.round(v)));
  const clampRisk = (v: number) => Math.max(0, Math.min(1, v));

  return {
    fsr: [
      clampAdc(numbers[0]),
      clampAdc(numbers[1]),
      clampAdc(numbers[2]),
      clampAdc(numbers[3]),
      clampAdc(numbers[4]),
      clampAdc(numbers[5]),
    ],
    tempC: Number(numbers[6].toFixed(1)),
    riskScore: clampRisk(numbers[7]),
    lastUpdated: Date.now(),
  };
}

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function unlockAudioContext(): void {
  ensureAudioContext();
}

export function playWarningBeep(forceImmediate = false): void {
  const nowMs = Date.now();
  if (!forceImmediate && nowMs - lastBeepTime < 2500) {
    return;
  }
  lastBeepTime = nowMs;

  const ctx = ensureAudioContext();
  if (!ctx) return;

  try {
    const start = ctx.currentTime;

    // Two-pulse clinical warning tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, start);
    osc1.frequency.setValueAtTime(660, start + 0.12);

    gain1.gain.setValueAtTime(0.001, start);
    gain1.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, start + 0.24);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(start);
    osc1.stop(start + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(987.77, start + 0.28);

    gain2.gain.setValueAtTime(0.001, start + 0.28);
    gain2.gain.exponentialRampToValueAtTime(0.16, start + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.001, start + 0.48);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(start + 0.28);
    osc2.stop(start + 0.5);
  } catch {
    // Ignore audio errors if blocked by browser policy
  }
}

export async function requestAlertNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function triggerUlcerNotification(
  riskScore: number,
  maxPressure: number,
  tempC: number,
  forceImmediate = false
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const nowMs = Date.now();
  if (!forceImmediate && nowMs - lastNotificationTime < 8000) {
    return false;
  }
  lastNotificationTime = nowMs;

  try {
    new Notification('NeuroStride Ulcer Risk Alert', {
      body: `High risk (${(riskScore * 100).toFixed(1)}%), Peak ${maxPressure} ADC, Temp ${tempC.toFixed(1)}°C. Offload weight immediately!`,
      tag: 'neurostride-ulcer-alert',
    });
    return true;
  } catch {
    return false;
  }
}
