import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXTAUTH_URL || "https://mainframe-hq.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
  ];
}
