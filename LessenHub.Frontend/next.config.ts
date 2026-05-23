import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  async redirects() {
    return [
      {
        source: "/lessenseries",
        destination: "/material-uploads",
        permanent: true,
      },
      {
        source: "/lessenseries/:path*",
        destination: "/material-uploads/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
