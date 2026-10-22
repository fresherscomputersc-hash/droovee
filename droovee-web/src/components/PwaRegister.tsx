"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Droovee Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("Droovee Service Worker registration failed:", err);
        });

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        // Only show if user hasn't dismissed it in this session
        const dismissed = sessionStorage.getItem("droovee_pwa_dismissed");
        if (!dismissed) {
          setShowInstallBanner(true);
        }
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowInstallBanner(false);
    sessionStorage.setItem("droovee_pwa_dismissed", "true");
  }

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md sm:bottom-6 sm:left-auto sm:right-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">
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
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
