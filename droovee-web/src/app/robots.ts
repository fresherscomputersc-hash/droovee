import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const publicAllowed = [
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
    "/llms.txt",
    "/llms-full.txt",
    "/sitemap.xml",
  ];

  const privateDisallowed = [
    "/(console)/",
    "/admin/",
    "/driver/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/book",
    "/bookings/",
    "/track",
    "/api/",
    "/_next/",
    "/services/",
  ];

  return {
    rules: [
      // Standard search engine crawlers (Google, Bing, Yahoo, DuckDuckGo)
      {
        userAgent: "*",
        allow: publicAllowed,
        disallow: privateDisallowed,
      },
      // OpenAI / ChatGPT Search bots
      {
        userAgent: ["GPTBot", "OAI-SearchBot"],
        allow: publicAllowed,
        disallow: privateDisallowed,
      },
      // Perplexity AI
      {
        userAgent: "PerplexityBot",
        allow: publicAllowed,
        disallow: privateDisallowed,
      },
      // Anthropic Claude
      {
        userAgent: "ClaudeBot",
        allow: publicAllowed,
        disallow: privateDisallowed,
      },
      // Google AI / Gemini Search Overviews
      {
        userAgent: "Google-Extended",
        allow: publicAllowed,
        disallow: privateDisallowed,
      },
      // Apple Intelligence
      {
        userAgent: "Applebot-Extended",
        allow: publicAllowed,
        disallow: privateDisallowed,
      },
    ],
    sitemap: "https://droovee.com/sitemap.xml",
  };
}
