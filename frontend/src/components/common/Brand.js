import React from "react";

// Logo mark: a rounded tile with a sound-wave "voice" glyph.
export const BrandMark = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hr-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7c5cff" />
        <stop offset="1" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" fill="url(#hr-grad)" />
    <g stroke="#fff" strokeWidth="3" strokeLinecap="round">
      <line x1="11" y1="17" x2="11" y2="23" />
      <line x1="16" y1="12" x2="16" y2="28" />
      <line x1="21" y1="15" x2="21" y2="25" />
      <line x1="26" y1="10" x2="26" y2="30" />
      <line x1="31" y1="16" x2="31" y2="24" />
    </g>
  </svg>
);

const Brand = ({ compact = false }) => (
  <span className="brand">
    <BrandMark />
    <span className="brand-text">
      <span className="brand-name">
        HireReady <span className="brand-ai">AI</span>
      </span>
      {!compact && <span className="brand-sub">The Interview Studio</span>}
    </span>
  </span>
);

export default Brand;
