import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  images: {
    // The Playground includes a 66 MB original PNG.
    maximumResponseBody: 100_000_000,
    remotePatterns: [
      { protocol: "https", hostname: "vemxhbrbdkojmuhatymo.supabase.co" },
      { protocol: "https", hostname: "i.scdn.co" },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/blog", destination: "/journal", permanent: true },
      { source: "/blog/:slug", destination: "/journal/:slug", permanent: true },
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
