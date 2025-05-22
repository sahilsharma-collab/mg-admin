import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "s3-symbol-logo.tradingview.com",
      "booming-bulls.s3.ap-south-1.amazonaws.com",
      "png.pngtree.com",
      "mg-final-s3-bucket.s3.ap-south-1.amazonaws.com",
    ],
    unoptimized: false,
  },
};

export default nextConfig;
