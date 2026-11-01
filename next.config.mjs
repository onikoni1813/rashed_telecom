/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 60, // 60 seconds client router cache
      static: 300,
    },
  },
};

export default nextConfig;
