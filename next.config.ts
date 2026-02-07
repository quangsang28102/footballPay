import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEFAULT_SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  },
};

export default nextConfig;
