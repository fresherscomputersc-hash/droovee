"use client";

import { useState } from "react";

interface RoutePreviewMapProps {
  pickup: string;
  destination?: string;
  onSelectPickup?: (addr: string) => void;
  onSelectDestination?: (addr: string) => void;
}

const BHUBANESWAR_HUBS = [
  "Biju Patnaik Airport (BBI)",
  "Bhubaneswar Railway Station (Master Canteen)",
  "Patia / Infocity",
  "KIIT Square, Patia",
  "Saheed Nagar, Janpath",
  "Jaydev Vihar / Pal Heights",
  "Khandagiri / Baramunda Bus Stand",
  "Chandrasekharpur / Damana",
];

export function RoutePreviewMap({
  pickup,
  destination,
  onSelectPickup,
  onSelectDestination,
}: RoutePreviewMapProps) {
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Approximate distance calculation simulation based on text inputs
  const hasRoute = pickup.trim().length > 3 && destination && destination.trim().length > 3;
  const estimatedKm = hasRoute ? Math.max(4, Math.min(48, Math.round((pickup.length + destination.length) * 0.45))) : null;
  const estimatedMin = estimatedKm ? Math.round(estimatedKm * 2.8) : null;

  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Nominatim OpenStreetMap reverse geocoding
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const formatted = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            if (onSelectPickup) onSelectPickup(formatted);
          } else {
            if (onSelectPickup) onSelectPickup(`Near GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } catch {
          if (onSelectPickup) onSelectPickup(`Current GPS Location (Bhubaneswar)`);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setGpsError(err.code === 1 ? "Location permission denied. Please type address manually." : "Could not retrieve GPS location.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Map Header / Location Helper */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
          Bhubaneswar Service Area
        </span>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 font-medium text-brand-link hover:text-brand-ink disabled:opacity-50"
        >
          <span>🎯</span>
          {locating ? "Locating…" : "Use my current location"}
        </button>
      </div>

      {gpsError && (
        <div className="bg-amber-50 px-4 py-1.5 text-xs text-amber-800 border-b border-amber-100">
          {gpsError}
        </div>
      )}

      {/* Visual Route Preview Canvas */}
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden flex flex-col justify-between p-4">
        {/* Subtle grid pattern for map feel */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#052b66 0.75px, transparent 0.75px), radial-gradient(#001433 0.75px, #f8fafc 0.75px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px",
          }}
        />

        {/* Route Visualizer */}
        <div className="relative z-10 flex h-full flex-col justify-around">
          {/* Pickup Node */}
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-brand-ink shadow-md shadow-accent/25">
              P
            </span>
            <div className="min-w-0 flex-1 truncate text-xs font-semibold text-brand-ink">
              {pickup.trim() ? pickup : <span className="text-slate-400 italic font-normal">Enter pickup point below</span>}
            </div>
          </div>

          {/* Dotted connecting route line */}
          <div className="ml-3.5 my-1 h-8 w-0.5 border-l-2 border-dashed border-brand-link/60" />

          {/* Destination Node */}
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-ink text-xs font-bold text-white shadow-md shadow-brand-ink/30">
              D
            </span>
            <div className="min-w-0 flex-1 truncate text-xs font-semibold text-brand-ink">
              {destination && destination.trim() ? destination : <span className="text-slate-400 italic font-normal">Trip within city / or enter destination</span>}
            </div>
          </div>
        </div>

        {/* Live Distance & Time Estimate Badge */}
        {hasRoute && estimatedKm && (
          <div className="absolute right-4 bottom-4 z-10 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
            <div className="text-right">
              <p className="text-[11px] font-bold text-brand-ink">~{estimatedKm} km</p>
              <p className="text-[10px] text-slate-500">~{estimatedMin} mins driving</p>
            </div>
            <span className="text-base">🚗</span>
          </div>
        )}
      </div>

      {/* Popular City Hubs Shortcuts */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <p className="mb-1.5 text-[11px] font-medium text-slate-500">Popular Bhubaneswar Hubs:</p>
        <div className="flex flex-wrap gap-1.5">
          {BHUBANESWAR_HUBS.map((hub) => (
            <button
              key={hub}
              type="button"
              onClick={() => {
                if (!pickup.trim() && onSelectPickup) {
                  onSelectPickup(hub);
                } else if (onSelectDestination) {
                  onSelectDestination(hub);
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-brand-ink/40 hover:bg-brand-soft hover:text-brand-ink transition"
            >
              + {hub}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
