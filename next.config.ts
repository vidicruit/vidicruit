import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // nu mai opri build-ul dacă ESLint găsește probleme
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
