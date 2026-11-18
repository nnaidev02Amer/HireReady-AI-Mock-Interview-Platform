import React from "react";

// Circular score gauge. `value` is 0-100 (or null for "no data").
const ScoreRing = ({ value, size = 140, stroke = 10, label, sample = false, max = 100, unit }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const has = typeof value === "number";
  const pct = has ? Math.max(0, Math.min(1, value / max)) : 0;
  const id = `ring-${size}-${sample ? "s" : "r"}`;

  return (
    <div
      className={"score-ring" + (sample ? " score-ring-sample" : "")}
      style={{ width: size, height: size }}
      role="img"
      aria-label={has ? `${label || "Score"}: ${value} out of ${max}${sample ? " (sample)" : ""}` : `${label || "Score"}: no data`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} className="ring-track" strokeWidth={stroke} fill="none" />
        {has && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={sample ? "currentColor" : `url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * pct} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="ring-value"
            strokeOpacity={sample ? 0.55 : 1}
          />
        )}
      </svg>
      <div className="score-ring-center">
        <span className="score-ring-number" style={{ fontSize: size * 0.3 }}>
          {has ? Math.round(value) : "-"}
        </span>
        {unit && has && <span className="score-ring-unit">{unit}</span>}
        {label && <span className="score-ring-label">{label}</span>}
      </div>
    </div>
  );
};

export default ScoreRing;
