import { MetadataRoute } from "next";

const BASE = "https://droovee.vercel.app";

// Canonical public pages that should be indexed.
// Private, admin, auth and booking-flow routes are excluded.
const PUBLIC_PAGES = [
  "/",
  "/about",
  "/city",
  "/corporate",
  "/airport-transfer",
  "/monthly",
  "/outstation",
  "/cancellation",
  "/faq",
  "/how-it-works",
  "/packages",
  "/pricing",
  "/privacy",
  "/terms",
  "/testimonials",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({
    url: BASE + path,
    lastModified: new Date("2026-10-30"),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
