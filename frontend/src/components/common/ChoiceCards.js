import React from "react";

// Accessible radio-card group, usable as an antd <Form.Item> control (value / onChange).
const ChoiceCards = ({ value, onChange, options, columns = options.length, label }) => {
  const move = (index, delta) => {
    const next = options[(index + delta + options.length) % options.length];
    onChange?.(next.value);
  };

  return (
    <div
      className="choice-grid"
      role="radiogroup"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!value && i === 0) ? 0 : -1}
            className={"choice-card" + (selected ? " choice-card-selected" : "")}
            onClick={() => onChange?.(opt.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(i, 1); }
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(i, -1); }
            }}
          >
            {opt.icon && <span className="choice-icon">{opt.icon}</span>}
            <span className="choice-title">{opt.title}</span>
            {opt.description && <span className="choice-desc">{opt.description}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ChoiceCards;
