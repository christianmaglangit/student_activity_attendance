/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your other configs might be here...

  // Add this line:

  // Optional but recommended for Capacitor:
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;