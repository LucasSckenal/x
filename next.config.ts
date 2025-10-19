/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**', // Permite qualquer caminho dentro deste hostname
      },
    ],
  },
  // Configurações para PWA
  experimental: {
    appDir: true,
  },
};

// Exporta a configuração com PWA
module.exports = withPWA(nextConfig);