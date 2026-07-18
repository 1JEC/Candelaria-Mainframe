import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXTAUTH_URL || "https://mainframe-hq.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/login"],
      disallow: [
        "/dashboard",
        "/leads",
        "/posts",
        "/inbox",
        "/outreach",
        "/audit-log",
        "/offertes",
        "/analytics",
        "/skills",
        "/settings",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
