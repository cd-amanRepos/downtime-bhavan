import './globals.css';
import { Plus_Jakarta_Sans, Spectral, Noto_Sans_Devanagari } from 'next/font/google';
import type { ReactNode } from 'react';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' });
const serif = Spectral({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['italic'], variable: '--font-serif-loaded', display: 'swap' });
const hi = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-hi-loaded', display: 'swap' });

export const metadata = {
  title: 'Downtime Bhavan · An unofficial observatory',
  description: 'Live status of India\'s most-used government websites. Get a free WhatsApp alert when your Sarkari site comes back up.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${hi.variable}`}>
      <body>{children}</body>
    </html>
  );
}
