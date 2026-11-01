/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30, // 30 seconds router cache for instant switching between menus
      static: 180,
    },
  },
};

export default nextConfig;

