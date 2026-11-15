import React, { useState } from 'react';
import { FOOT_SENSORS, SensorId, SensorMeta } from '../types/telemetry';
import { getPressureColor, getPressureLevel } from '../utils/alerts';

interface FootHeatmapProps {
  fsr: [number, number, number, number, number, number];
}

// Smooth anatomical right-foot plantar silhouette in 320x460 coordinate space
const FOOT_SOLE_PATH = `
  M 102 36
  C 118 36, 126 52, 124 78
  C 123 94, 119 106, 125 108
  C 131 109, 132 95, 134 78
  C 136 58, 145 48, 154 50
  C 163 52, 164 68, 160 88
  C 158 100, 162 104, 166 94
  C 170 76, 178 62, 186 65
  C 194 68, 193 84, 187 104
  C 184 114, 189 116, 194 106
  C 199 92, 207 82, 214 86
  C 221 90, 218 106, 211 122
  C 208 129, 213 132, 218 124
  C 224 113, 232 106, 238 110
  C 245 115, 241 132, 234 148
  C 246 164, 253 184, 249 208
  C 245 236, 234 264, 229 294
  C 225 322, 226 356, 218 386
  C 210 416, 188 434, 162 434
  C 134 434, 112 414, 108 384
  C 104 358, 114 330, 115 304
  C 117 272, 102 246, 84 218
  C 70 196, 65 170, 72 146
  C 76 130, 74 112, 74 88
  C 74 56, 84 36, 102 36
  Z
`;

const SHORT_NAMES: Record<SensorId, string> = {
  1: 'Heel',
  2: 'Midfoot',
  3: 'Meta 1',
  4: 'Meta 3',
  5: 'Meta 5',
  6: 'Big Toe',
};

export const FootHeatmap: React.FC<FootHeatmapProps> = ({ fsr }) => {
  const [selectedId, setSelectedId] = useState<SensorId>(3);

  const selectedSensor: SensorMeta =
    FOOT_SENSORS.find((s) => s.id === selectedId) ?? FOOT_SENSORS[0];
  const selectedValue = fsr[selectedSensor.id - 1];
  const selectedLevel = getPressureLevel(selectedValue);
  const selectedColor = getPressureColor(selectedValue);
  const approxKpa = ((selectedValue / 4095) * 420).toFixed(0);

  return (
    <section
      aria-label="Interactive Anatomical Foot Pressure Heatmap"
      className="rounded-2xl border border-slate-800/90 bg-[#0E141F] p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Plantar Pressure Map
          </h2>
          <p className="text-xs text-slate-400">
            Right Foot Sole · 6-Zone FSR Telemetry (0–4095 ADC)
          </p>
        </div>
        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
          Peak {Math.max(...fsr)}
        </span>
      </div>

      {/* Anatomical SVG Canvas */}
      <div className="relative mx-auto flex max-w-[290px] items-center justify-center py-1">
        <svg
          viewBox="0 0 320 460"
          className="h-auto w-full select-none overflow-visible"
          role="img"
          aria-label="Anatomical right foot sole showing six live pressure sensors"
        >
          <defs>
            <clipPath id="foot-sole-clip">
              <path d={FOOT_SOLE_PATH} />
            </clipPath>

            {FOOT_SENSORS.map((sensor) => {
              const value = fsr[sensor.id - 1];
              const color = getPressureColor(value);
              const intensity = Math.min(0.68, Math.max(0.18, value / 4095));
              return (
                <radialGradient
                  key={`grad-${sensor.id}`}
                  id={`heat-grad-${sensor.id}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={intensity} />
                  <stop offset="55%" stopColor={color} stopOpacity={intensity * 0.42} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </radialGradient>
              );
            })}

            <linearGradient id="sole-surface" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#172032" />
              <stop offset="100%" stopColor="#101724" />
            </linearGradient>
          </defs>

          {/* Subtle clinical calibration grid */}
          <g stroke="#1E293B" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.55">
            <line x1="160" y1="24" x2="160" y2="444" />
            <line x1="48" y1="170" x2="272" y2="170" />
            <line x1="48" y1="276" x2="272" y2="276" />
            <line x1="48" y1="382" x2="272" y2="382" />
          </g>

          {/* Orientation markers */}
          <text
            x="22"
            y="240"
            fill="#64748B"
            fontSize="9"
            fontFamily="var(--font-mono)"
            letterSpacing="0.08em"
            transform="rotate(-90 22 240)"
            textAnchor="middle"
          >
            MEDIAL (INNER)
          </text>
          <text
            x="298"
            y="240"
            fill="#64748B"
            fontSize="9"
            fontFamily="var(--font-mono)"
            letterSpacing="0.08em"
            transform="rotate(90 298 240)"
            textAnchor="middle"
          >
            LATERAL (OUTER)
          </text>

          {/* Foot sole base fill */}
          <path
            d={FOOT_SOLE_PATH}
            fill="url(#sole-surface)"
            stroke="#334155"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Thermal / pressure radial plumes clipped inside foot sole */}
          <g clipPath="url(#foot-sole-clip)">
            {FOOT_SENSORS.map((sensor) => {
              const value = fsr[sensor.id - 1];
              const plumeRadius = 46 + (value / 4095) * 44;
              return (
                <circle
                  key={`plume-${sensor.id}`}
                  cx={sensor.cx}
                  cy={sensor.cy}
                  r={plumeRadius}
                  fill={`url(#heat-grad-${sensor.id})`}
                  className="transition-all duration-300"
                />
              );
            })}
            {/* Subtle anatomical insole arch contour */}
            <path
              d="M 105 220 Q 145 270 120 350"
              fill="none"
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.55"
            />
          </g>

          {/* 6 Circular Pressure Sensor Nodes */}
          {FOOT_SENSORS.map((sensor) => {
            const value = fsr[sensor.id - 1];
            const color = getPressureColor(value);
            const level = getPressureLevel(value);
            const isSelected = selectedId === sensor.id;
            const isCritical = level === 'critical';

            return (
              <g
                key={sensor.id}
                role="button"
                tabIndex={0}
                aria-label={`Sensor ${sensor.id} ${sensor.name}, ${value} ADC, ${level}`}
                onClick={() => setSelectedId(sensor.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(sensor.id);
                  }
                }}
                className={`cursor-pointer focus:outline-none ${
                  isCritical ? 'animate-critical-node' : ''
                }`}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={sensor.cx}
                    cy={sensor.cy}
                    r={28}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                    opacity="0.85"
                  />
                )}

                {/* Critical halo */}
                {isCritical && (
                  <circle
                    cx={sensor.cx}
                    cy={sensor.cy}
                    r={27}
                    fill={color}
                    fillOpacity="0.22"
                  />
                )}

                {/* Main circular sensor body */}
                <circle
                  cx={sensor.cx}
                  cy={sensor.cy}
                  r={22}
                  fill="#0B111C"
                  fillOpacity="0.92"
                  stroke={color}
                  strokeWidth={isCritical ? 3 : 2.25}
                  className="transition-colors duration-200"
                />

                {/* Tinted inner core */}
                <circle
                  cx={sensor.cx}
                  cy={sensor.cy}
                  r={19}
                  fill={color}
                  fillOpacity={isCritical ? 0.24 : 0.14}
                  className="transition-all duration-200"
                />

                {/* Sensor index tag */}
                <text
                  x={sensor.cx}
                  y={sensor.cy - 5}
                  textAnchor="middle"
                  fill={color}
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  {sensor.shortLabel}
                </text>

                {/* Live ADC reading */}
                <text
                  x={sensor.cx}
                  y={sensor.cy + 8}
                  textAnchor="middle"
                  fill="#F8FAFC"
                  fontSize="11.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {value}
                </text>

                {/* Anatomical short label beneath circle */}
                <text
                  x={sensor.cx}
                  y={sensor.cy + 34}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="9"
                  fontWeight="600"
                  fontFamily="var(--font-sans)"
                >
                  {SHORT_NAMES[sensor.id]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Sensor Anatomical Inspector Bar */}
      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs">
        <div className="min-w-0">
          <span className="font-semibold text-slate-100">
            {selectedSensor.shortLabel} · {selectedSensor.name}
          </span>
          <span className="ml-1.5 text-slate-400">
            ({selectedSensor.anatomicalZone})
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono tabular-nums">
          <span className="text-slate-300">~{approxKpa} kPa</span>
          <span
            className="font-semibold uppercase"
            style={{ color: selectedColor }}
          >
            {selectedLevel}
          </span>
        </div>
      </div>

      {/* Pressure Threshold Legend */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          <span>&lt;1800 Safe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
          <span>1800–2800 Mod</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_#ef4444]" />
          <span>&gt;2800 Critical</span>
        </div>
      </div>
    </section>
  );
};
