import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables <ViewTransition> so the month deck can animate exits (experimental).
    viewTransition: true,
  },
};

export default nextConfig;
