import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
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
          "/services/",
        ],
        disallow: [
          "/(console)",
          "/admin",
          "/driver",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/book",
          "/bookings",
          "/track",
          "/api",
        ],
      },
    ],
    sitemap: "https://droovee.vercel.app/sitemap.xml",
  };
}
