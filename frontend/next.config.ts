import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Arahkan alamat lama ke halaman baru supaya bookmark lama tidak 404.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/pos", permanent: false },
      { source: "/dashboard/:path*", destination: "/pos", permanent: false },
      { source: "/admin", destination: "/pos", permanent: false },
      { source: "/staff", destination: "/login", permanent: false },
      { source: "/track", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
