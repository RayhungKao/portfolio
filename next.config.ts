import type { NextConfig } from 'next';

// The deploy workflow passes BASE_PATH: '/portfolio' on rayhungkao.github.io/portfolio and '' once a
// custom domain is set, so the build follows the Pages settings with no code change.
const basePath = process.env.BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  // Client code builds asset and link URLs with the same prefix.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
