import React from 'react';
import { Activity, Thermometer } from 'lucide-react';

interface DashboardMetricsProps {
  riskScore: number;
  tempC: number;
  isAlertActive: boolean;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  riskScore,
  tempC,
  isAlertActive,
}) => {
  const isHighRisk = riskScore >= 0.5;
  const riskPercent = (riskScore * 100).toFixed(1);
  const isHotTemp = isHighRisk || isAlertActive || tempC >= 35.0;

  return (
    <section
      aria-label="TinyML Risk and Temperature Dashboard"
      className="grid grid-cols-2 gap-3"
    >
      {/* Card 1: TinyML Ulcer Risk */}
      <div
        className={`rounded-2xl border p-3.5 transition-colors duration-200 ${
          isHighRisk
            ? 'border-red-500/50 bg-red-950/30'
            : 'border-slate-800/90 bg-[#0E141F]'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs font-medium text-slate-400">
            TinyML Ulcer Risk
          </span>
          <Activity
            className={`h-4 w-4 shrink-0 ${
              isHighRisk ? 'text-red-400' : 'text-emerald-400'
            }`}
            aria-hidden="true"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
          <span
            className={`font-mono text-2xl font-bold tracking-tight tabular-nums ${
              isHighRisk ? 'text-[#ef4444]' : 'text-[#22c55e]'
            }`}
          >
            {riskPercent}%
          </span>
          <span
            className={`text-xs font-bold tracking-wide ${
              isHighRisk ? 'text-[#ef4444]' : 'text-[#22c55e]'
            }`}
          >
            {isHighRisk ? 'HIGH RISK!' : 'SAFE'}
          </span>
        </div>

        {/* Visual risk bar */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isHighRisk ? 'bg-[#ef4444]' : 'bg-[#22c55e]'
            }`}
            style={{ width: `${Math.min(100, Math.max(4, riskScore * 100))}%` }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-slate-400 tabular-nums">
          Threshold &ge; 50.0%
        </p>
      </div>

      {/* Card 2: Foot Temperature */}
      <div
        className={`rounded-2xl border p-3.5 transition-colors duration-200 ${
          isHotTemp
            ? 'border-amber-500/45 bg-amber-950/20'
            : 'border-slate-800/90 bg-[#0E141F]'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs font-medium text-slate-400">
            Foot Temperature
          </span>
          <Thermometer
            className={`h-4 w-4 shrink-0 ${
              isHotTemp ? 'text-amber-400' : 'text-cyan-400'
            }`}
            aria-hidden="true"
          />
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`font-mono text-2xl font-bold tracking-tight tabular-nums ${
              isHotTemp ? 'text-amber-300' : 'text-slate-100'
            }`}
          >
            {tempC.toFixed(1)}°C
          </span>
          {isHotTemp && (
            <span className="text-lg leading-none" role="img" aria-label="elevated heat">
              🔥
            </span>
          )}
        </div>

        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isHotTemp ? 'bg-amber-400' : 'bg-cyan-400'
            }`}
            style={{
              width: `${Math.min(100, Math.max(8, ((tempC - 25) / 18) * 100))}%`,
            }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-slate-400 tabular-nums">
          {isHotTemp ? 'Thermal spike detected' : 'Baseline 30.0–34.0°C'}
        </p>
      </div>
    </section>
  );
};
