import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Workspace packages ship TypeScript source directly; Next.js must
  // transpile them and resolve .js -> .ts (ESM interop for ts-only monorepo).
  transpilePackages: ['@dtb/db', '@dtb/shared'],
  webpack(webpackConfig) {
    // Allow `import './foo.js'` to resolve to `./foo.ts` in workspace pkgs.
    webpackConfig.resolve.extensionAlias = {
      '.js': ['.ts', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return webpackConfig;
  },
};

export default config;
