import type { MetadataRoute } from 'next';

/**
 * Web App Manifest for Downtime Bhavan.
 *
 * Served at `/manifest.webmanifest` (Next 15's default path for `manifest.ts`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Downtime Bhavan',
    short_name: 'Downtime Bhavan',
    description: "Live status of India's most-used government websites.",
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F9FC',
    theme_color: '#1E3A8A',
    lang: 'en-IN',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
    categories: ['utilities', 'news'],
  };
}
