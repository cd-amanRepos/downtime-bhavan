import './globals.css';
import { Plus_Jakarta_Sans, Spectral, Noto_Sans_Devanagari } from 'next/font/google';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { BRAND_NAME, SITE_URL } from '@/lib/seo/constants';
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
} from '@/lib/seo/schema';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' });
const serif = Spectral({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['italic'], variable: '--font-serif-loaded', display: 'swap' });
const hi = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-hi-loaded', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Downtime Bhavan · An unofficial observatory of Indian government websites',
    template: '%s · Downtime Bhavan',
  },
  description:
    "Live status, 30-day uptime, and citizen grievances for India's most-used government websites. Free email alerts when a portal comes back up. Unofficial observatory.",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    siteName: BRAND_NAME,
    locale: 'en_IN',
    type: 'website',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
  },
  category: 'technology',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1E3A8A',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${serif.variable} ${hi.variable}`}>
      <body>
        <JsonLd data={[buildOrganizationSchema(), buildWebSiteSchema()]} />
        {children}
      </body>
    </html>
  );
}
