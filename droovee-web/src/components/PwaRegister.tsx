"use client";

import { useEffect, useState } from "react";

/** Delay before the install banner appears, after the page is idle. */
const BANNER_DELAY_MS = 2500;

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // The service worker caches hashed chunks forever, which is wrong for
      // `next dev` where filenames are stable. Production only.
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => {
            console.warn("Droovee Service Worker registration failed:", err);
          });
      }

      let showTimer: number | undefined;

      const handleBeforeInstallPrompt = (e: Event) => {
        // The event is single-shot, so capture it immediately even though the
        // banner is revealed later.
        e.preventDefault();
        setDeferredPrompt(e);

        if (sessionStorage.getItem("droovee_pwa_dismissed")) return;

        // Reveal only once the page has settled. Showing during load made this
        // panel the LCP element and painted a blurred overlay on the critical path.
        const reveal = () => {
          showTimer = window.setTimeout(() => setShowInstallBanner(true), BANNER_DELAY_MS);
        };

        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(reveal, { timeout: 4000 });
        } else {
          setTimeout(reveal, 1000);
        }
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        if (showTimer !== undefined) window.clearTimeout(showTimer);
      };
    }
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setShowInstallBanner(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowInstallBanner(false);
    sessionStorage.setItem("droovee_pwa_dismissed", "true");
  }

  if (!showInstallBanner) return null;

  return (
    <div
      role="complementary"
      aria-label="Install Droovee"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-white/20 bg-brand-ink/95 p-4 text-white shadow-2xl sm:bottom-6 sm:left-auto sm:right-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent font-bold text-brand-ink">
          D
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Install Droovee App</p>
          <p className="text-xs text-slate-300">Fast 1-tap bookings on your home screen.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-accent-hover shadow-sm shadow-accent/25"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
