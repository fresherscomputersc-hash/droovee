import { MetadataRoute } from "next";

const BASE = "https://droovee.com";

interface PageConfig {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
}

const PUBLIC_PAGES: PageConfig[] = [
  // Primary landing page
  { path: "", changeFrequency: "daily", priority: 1.0 },

  // Core Service Pages (high commercial search intent)
  { path: "/city", changeFrequency: "daily", priority: 0.9 },
  { path: "/outstation", changeFrequency: "daily", priority: 0.9 },
  { path: "/airport-transfer", changeFrequency: "daily", priority: 0.9 },
  { path: "/monthly", changeFrequency: "weekly", priority: 0.9 },
  { path: "/corporate", changeFrequency: "weekly", priority: 0.9 },

  // Commercial & Informational Hubs
  { path: "/pricing", changeFrequency: "daily", priority: 0.8 },
  { path: "/packages", changeFrequency: "weekly", priority: 0.8 },
  { path: "/how-it-works", changeFrequency: "weekly", priority: 0.8 },
  { path: "/faq", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/testimonials", changeFrequency: "weekly", priority: 0.7 },

  // Trust & Legal Policies
  { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.4 },
  { path: "/cancellation", changeFrequency: "monthly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_PAGES.map((page) => ({
    url: `${BASE}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
