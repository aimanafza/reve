/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.aimlapi.com' },
      { protocol: 'https', hostname: '*.aimlapi.com' },
    ],
  },
};

export default nextConfig;
