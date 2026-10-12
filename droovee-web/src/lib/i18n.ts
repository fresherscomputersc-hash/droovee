"use client";
import { useEffect, useState } from "react";

export type Lang = "en" | "or";

const dict: Record<string, { en: string; or: string }> = {
  book: { en: "Book a driver", or: "ଡ୍ରାଇଭର ବୁକ୍ କରନ୍ତୁ" },
  track: { en: "Track booking", or: "ବୁକିଂ ଦେଖନ୍ତୁ" },
  signin: { en: "Sign in", or: "ଲଗ୍ ଇନ୍" },
  mybookings: { en: "My bookings", or: "ମୋ ବୁକିଂ" },
  services: { en: "Services", or: "ସେବା" },
  pricing: { en: "Pricing", or: "ମୂଲ୍ୟ" },
  signout: { en: "Sign out", or: "ଲଗ୍ ଆଉଟ୍" },
  hero: { en: "A professional driver for your own car.", or: "ଆପଣଙ୍କ ନିଜ ଗାଡ଼ି ପାଇଁ ଜଣେ ପେଶାଦର ଡ୍ରାଇଭର।" },
  herosub: { en: "Hourly, half-day, full-day, outstation, airport pickups and monthly office runs. Book in minutes and track your booking.", or: "ଘଣ୍ଟା, ଅର୍ଦ୍ଧଦିବସ, ପୂରାଦିବସ, ବାହାର ଯାତ୍ରା, ବିମାନବନ୍ଦର ଓ ମାସିକ ଅଫିସ ଯାତାୟତ। ମିନିଟରେ ବୁକ୍ କରନ୍ତୁ।" },
  createaccount: { en: "Create account", or: "ଖାତା ଖୋଲନ୍ତୁ" },
  packages: { en: "Fixed-price packages", or: "ସ୍ଥିର ମୂଲ୍ୟ ପ୍ୟାକେଜ୍" },
};

export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem("droovee-lang") === "or" ? "or" : "en";
}

export function useLang() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    setLang(getLang());
    const onChange = () => setLang(getLang());
    window.addEventListener("droovee-lang", onChange);
    return () => window.removeEventListener("droovee-lang", onChange);
  }, []);
  return lang;
}

export function toggleLang() {
  const next = getLang() === "en" ? "or" : "en";
  window.localStorage.setItem("droovee-lang", next);
  window.dispatchEvent(new Event("droovee-lang"));
}

export function t(key: keyof typeof dict, lang: Lang): string {
  return dict[key][lang];
}
