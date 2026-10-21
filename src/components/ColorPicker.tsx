import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { PALETTE } from "../lib/model";
export function ColorPicker({
  value,
  onChange,
  recent,
  label = "Cor",
}: {
  value: string;
  onChange: (value: string) => void;
  recent: string[];
  label?: string;
}) {
  const [custom, setCustom] = useState(value);
  useEffect(() => setCustom(value), [value]);
  return (
    <div className="color-picker">
      <div className="field-heading">
        <span>{label}</span>
        <span className="color-value">{value.toUpperCase()}</span>
      </div>
      <div className="swatches">
        {PALETTE.map((color) => (
          <button
            type="button"
            key={color}
            aria-label={`${label} ${color}`}
            title={color}
            className={value.toLowerCase() === color ? "active" : ""}
            style={{ background: color }}
            onClick={() => onChange(color)}
          >
            {value.toLowerCase() === color && <Check size={13} />}
          </button>
        ))}
      </div>
      {recent.length > 0 && (
        <>
          <span className="micro-label">Cores recentes</span>
          <div className="swatches recent-colors">
            {recent.map((color) => (
              <button
                type="button"
                key={color}
                aria-label={`Cor recente ${color}`}
                title={color}
                className={value.toLowerCase() === color ? "active" : ""}
                style={{ background: color }}
                onClick={() => onChange(color)}
              />
            ))}
          </div>
        </>
      )}
      <div className="custom-color">
        <Palette size={14} />
        <span>Personalizar</span>
        <input
          aria-label={`${label} personalizada`}
          type="color"
          value={custom}
          onInput={(event) => setCustom(event.currentTarget.value)}
          onChange={(event) => {
            setCustom(event.currentTarget.value);
            onChange(event.currentTarget.value);
          }}
        />
        <input
          aria-label={`${label} hexadecimal`}
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            if (/^#[a-f\d]{6}$/i.test(event.target.value))
              onChange(event.target.value);
          }}
          maxLength={7}
        />
      </div>
    </div>
  );
}
