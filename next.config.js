/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "scores.iplt20.com" },
      { protocol: "https", hostname: "h.cricapi.com" },
      { protocol: "https", hostname: "g.cricapi.com" },
    ],
  },
};

export default nextConfig;
