import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pino', 'pino-pretty'],
  experimental: {
    instrumentationHook: true
  }
}

export default nextConfig
