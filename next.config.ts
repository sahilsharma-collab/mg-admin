import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // `domains` is deprecated in Next 15 and slated for removal; remotePatterns
    // is the supported form and scopes each host to https rather than allowing
    // either protocol. `unoptimized: false` was the default, so it is dropped.
    remotePatterns: [
      { protocol: "https", hostname: "s3-symbol-logo.tradingview.com" },
      { protocol: "https", hostname: "booming-bulls.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "png.pngtree.com" },
      { protocol: "https", hostname: "mg-final-s3-bucket.s3.ap-south-1.amazonaws.com" },
    ],
  },
};

export default nextConfig;
