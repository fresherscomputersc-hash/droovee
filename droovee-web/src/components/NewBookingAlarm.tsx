"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { dateTime, SERVICE_LABEL } from "@/lib/format";

type AlarmBooking = {
  id: string;
  bookingNumber: string;
  serviceType: string;
  scheduledStart: string;
  customerName: string;
  createdAt?: string;
  origin: "customer" | "staff";
};

const MUTE_KEY = "droovee.admin.alarmMuted";
const SEEN_KEY = "droovee.admin.seenBookings";
const QUEUE_KEY = "droovee.admin.alarmQueue";
const MUTE_EVENT = "droovee:alarm-mute";
const POLL_MS = 15_000;
const REPEAT_MS = 10_000;
const MAX_ALARM_MS = 120_000;
const SEEN_LIMIT = 200;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readQueue(): AlarmBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AlarmBooking[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: AlarmBooking[]) {
  try {
    window.sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* storage can be unavailable */
  }
}

function writeSeen(seen: Set<string>) {
  try {
    const ids = Array.from(seen).slice(-SEEN_LIMIT);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    /* storage can be unavailable */
  }
}

export function AlarmToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        setMuted(window.localStorage.getItem(MUTE_KEY) === "true");
      } catch {
        setMuted(false);
      }
    };
    load();
    const sync = () => load();
    window.addEventListener("storage", sync);
    window.addEventListener(MUTE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(MUTE_EVENT, sync);
    };
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    try {
      window.localStorage.setItem(MUTE_KEY, String(next));
    } catch {
      /* storage can be unavailable */
    }
    window.dispatchEvent(new Event(MUTE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      title={muted ? "Enable the new-booking alarm" : "Mute the new-booking alarm"}
      className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-700 transition hover:bg-slate-800 hover:text-white"
    >
      {muted ? "Alerts muted" : "Alerts on"}
    </button>
  );
}

export function NewBookingAlarm() {
  const [queue, setQueue] = useState<AlarmBooking[]>([]);
  const [muted, setMuted] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<AudioContext | null>(null);
  const inFlightRef = useRef(false);

  const ensureAudio = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (audioRef.current?.state === "closed") audioRef.current = null;
    if (!audioRef.current) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        audioRef.current = new Ctx();
      } catch {
        return null;
      }
    }
    return audioRef.current;
  }, []);

  const unlockAudio = useCallback(async () => {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") await ctx.resume();
      setSoundReady(ctx.state === "running");
      if (ctx.state === "running") setSoundBlocked(false);
    } catch {
      setSoundReady(false);
      setSoundBlocked(true);
    }
  }, [ensureAudio]);

  const playAlarm = useCallback(() => {
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== "running") {
      // Browsers can suspend the context after backgrounding. Re-arm the
      // "Enable sound" prompt instead of silently repeating a dead alarm.
      setSoundReady(false);
      setSoundBlocked(true);
      return;
    }
    const start = ctx.currentTime;
    const tones = [
      { at: 0, freq: 880 },
      { at: 0.2, freq: 660 },
      { at: 0.4, freq: 880 },
    ];
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(0.0001, start + tone.at);
      gain.gain.exponentialRampToValueAtTime(0.2, start + tone.at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + tone.at);
      osc.stop(start + tone.at + 0.16);
    }
  }, [ensureAudio]);

  // Persisted mute + first-poll acknowledgement state.
  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(MUTE_KEY) === "true");
      const seen = readJson<string[]>(SEEN_KEY, []);
      seenRef.current = new Set(seen);
      const storedQueue = readQueue().filter((b) => !seenRef.current.has(b.id));
      if (storedQueue.length) setQueue(storedQueue);
    } catch {
      /* storage can be unavailable */
    }
  }, []);

  // Unlock audio on the first interaction with the console. Browsers will not
  // play an alarm before a user gesture.
  useEffect(() => {
    const onGesture = () => {
      void unlockAudio();
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    const onMute = () => {
      try {
        setMuted(window.localStorage.getItem(MUTE_KEY) === "true");
      } catch {
        setMuted(false);
      }
    };
    window.addEventListener(MUTE_EVENT, onMute);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener(MUTE_EVENT, onMute);
    };
  }, [unlockAudio]);

  // Repeat the alarm while there is an unacknowledged booking.
  useEffect(() => {
    if (!queue.length || muted || !soundReady) return;
    playAlarm();
    const repeat = window.setInterval(playAlarm, REPEAT_MS);
    const stop = window.setTimeout(() => window.clearInterval(repeat), MAX_ALARM_MS);
    return () => {
      window.clearInterval(repeat);
      window.clearTimeout(stop);
    };
  }, [queue.length, muted, soundReady, playAlarm]);

  const acknowledge = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setQueue((prev) => {
      const next = prev.filter((b) => !idSet.has(b.id));
      writeQueue(next);
      return next;
    });
    for (const id of ids) seenRef.current.add(id);
    writeSeen(seenRef.current);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MUTE_KEY) {
        try {
          setMuted(window.localStorage.getItem(MUTE_KEY) === "true");
        } catch {
          setMuted(false);
        }
      }
      if (e.key === SEEN_KEY) {
        const seen = readJson<string[]>(SEEN_KEY, []);
        seenRef.current = new Set(seen);
        setQueue((prev) => {
          const next = prev.filter((b) => !seenRef.current.has(b.id));
          writeQueue(next);
          return next;
        });
      }
      if (e.key === QUEUE_KEY) {
        setQueue(readQueue());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Poll for new bookings. The first response only establishes a cursor, so
  // existing bookings never alarm on page load.
  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      if (stopped || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const qs = cursorRef.current ? `?after=${encodeURIComponent(cursorRef.current)}` : "";
        const r = await api<{ items: AlarmBooking[]; cursor: string }>(`/admin/notifications/new-bookings${qs}`);
        // Keep the cursor even if this mounted effect was replaced (React dev
        // StrictMode runs effects twice); only skip state updates on unmount.
        cursorRef.current = r.cursor;
        if (stopped || !r.items?.length) return;
        const fresh = r.items.filter((b) => b.origin !== "staff" && !seenRef.current.has(b.id));
        if (!fresh.length) return;
        setQueue((prev) => {
          const existing = new Set(prev.map((b) => b.id));
          const next = [...prev, ...fresh.filter((b) => !existing.has(b.id))];
          writeQueue(next);
          return next;
        });
      } catch {
        /* the next poll retries */
      } finally {
        inFlightRef.current = false;
      }
    };

    void tick();
    const timer = window.setInterval(tick, POLL_MS);
    const onFocus = () => void tick();
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    const onOnline = () => void tick();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const current = queue[0];

  if (!current) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[min(380px,calc(100vw-2rem))]" aria-live="assertive">
      <div role="alert" className="overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">New booking</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{current.bookingNumber}</p>
          </div>
          <button
            type="button"
            onClick={() => acknowledge(queue.map((b) => b.id))}
            aria-label="Acknowledge all new bookings"
            className="rounded-md px-2 py-1 text-lg leading-none text-slate-500 hover:bg-amber-100 hover:text-slate-900"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">{SERVICE_LABEL[current.serviceType] ?? current.serviceType}</p>
          <p className="mt-1 text-xs text-slate-500">{dateTime(current.scheduledStart)}</p>
          {current.customerName && <p className="mt-1 text-xs text-slate-500">{current.customerName}</p>}
          {queue.length > 1 && <p className="mt-2 text-[11px] font-medium text-amber-700">+{queue.length - 1} more new booking{queue.length === 2 ? "" : "s"}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/admin/bookings/${current.id}`}
              onClick={() => acknowledge([current.id])}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              View booking
            </Link>
            <button
              type="button"
              onClick={() => acknowledge([current.id])}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              Acknowledge
            </button>
            {queue.length > 1 && (
              <button
                type="button"
                onClick={() => acknowledge(queue.map((b) => b.id))}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Acknowledge all
              </button>
            )}
            {!soundReady && !muted && (
              <button
                type="button"
                onClick={() => void unlockAudio()}
                className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-200"
              >
                Enable sound
              </button>
            )}
          </div>
          {soundBlocked && !soundReady && !muted && (
            <p className="mt-2 text-[11px] text-slate-500">Your browser blocked audio. Click “Enable sound” to allow the alarm.</p>
          )}
        </div>
      </div>
    </div>
  );
}
