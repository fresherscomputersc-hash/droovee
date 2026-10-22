"use client";
import { useState } from "react";

const PRESET_HOURS = [1, 2, 3, 4, 6, 8, 12];

interface HourSelectorProps {
  value: number;
  onChange: (hours: number) => void;
  serviceType: string;
  error?: string;
}

export function HourSelector({ value, onChange, serviceType, error }: HourSelectorProps) {
  const isPreset = PRESET_HOURS.includes(value);
  const [showCustom, setShowCustom] = useState(!isPreset && value > 0);

  function handleSelect(h: number) {
    setShowCustom(false);
    onChange(h);
  }

  function handleCustomToggle() {
    setShowCustom(true);
  }

  const rateHint =
    serviceType === "airport_pickup_drop"
      ? "₹199/hr transparent pricing (airport / station / bus stop)"
      : serviceType === "hourly"
      ? "1st hour ₹149 · Each additional hour ₹129/hr"
      : "Hourly driver dispatch";

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          Trip Duration *
        </label>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Selected: {value} {value === 1 ? "Hour" : "Hours"}
        </span>
      </div>

      {/* Preset Pill Buttons */}
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESET_HOURS.map((h) => {
          const active = !showCustom && value === h;
          return (
            <button
              key={h}
              type="button"
              onClick={() => handleSelect(h)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 ring-offset-1"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              {h} {h === 1 ? "hr" : "hrs"}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleCustomToggle}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            showCustom
              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 ring-offset-1"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
          }`}
        >
          Custom…
        </button>
      </div>

      {/* Custom Duration Input when toggled */}
      {showCustom && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Enter custom hours:
          </label>
          <input
            type="number"
            min={1}
            max={72}
            step={0.5}
            value={value}
            onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <span className="text-xs text-slate-500">hours (0.5 hr increments)</span>
        </div>
      )}

      {error ? (
        <p className="mt-1.5 text-xs text-rose-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">ℹ</span> {rateHint}
        </p>
      )}
    </div>
  );
}
