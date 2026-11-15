import React from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';

interface SimulationPanelProps {
  onTestNormalGait: () => void;
  onTestUlcerAlert: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotifications: () => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  onTestNormalGait,
  onTestUlcerAlert,
  audioEnabled,
  onToggleAudio,
  notificationPermission,
  onRequestNotifications,
}) => {
  return (
    <section
      aria-label="Simulation Testing"
      className="rounded-2xl border border-slate-800/90 bg-[#0E141F] p-3.5"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold tracking-tight text-slate-100">
            Simulation Testing
          </h2>
          <p className="text-[11px] text-slate-400">
            Verify gait telemetry &amp; alerts without ESP32-S3 hardware
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleAudio}
            aria-label={audioEnabled ? 'Mute warning beep' : 'Enable warning beep'}
            title={audioEnabled ? 'Audio alerts on' : 'Audio alerts muted'}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
          >
            {audioEnabled ? (
              <Volume2 className="h-4 w-4 text-cyan-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {notificationPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={onRequestNotifications}
              aria-label="Enable browser notifications"
              title={
                notificationPermission === 'granted'
                  ? 'Browser notifications enabled'
                  : notificationPermission === 'denied'
                    ? 'Notifications blocked in browser settings'
                    : 'Enable browser notifications'
              }
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
            >
              {notificationPermission === 'granted' ? (
                <Bell className="h-4 w-4 text-emerald-400" />
              ) : (
                <BellOff className="h-4 w-4 text-slate-400" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onTestNormalGait}
          className="min-h-[44px] rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-3 py-2.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-[0.98] whitespace-nowrap"
        >
          Test Normal Gait
        </button>

        <button
          type="button"
          onClick={onTestUlcerAlert}
          className="min-h-[44px] rounded-xl border border-red-500/45 bg-red-500/15 px-3 py-2.5 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/25 active:scale-[0.98] whitespace-nowrap"
        >
          Test Ulcer Alert
        </button>
      </div>
    </section>
  );
};
