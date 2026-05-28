/**
 * Per-route Metadata builder for Downtime Bhavan.
 *
 * The root layout sets `metadataBase`, the brand-level OG defaults, and the
 * title template (`%s · Downtime Bhavan`). Pages pass a short `title`
 * fragment + description here; this helper fills in canonical, OG, Twitter,
 * and robots so individual pages stay one-liners.
 */

import type { Metadata } from 'next';
import { BRAND_NAME, SITE_URL } from './constants';

export interface BuildMetadataArgs {
  /**
   * Short title fragment — root layout's template appends ` · Downtime Bhavan`.
   * Keep under ~48 chars so the rendered title stays ≤ 60 chars.
   */
  title: string;
  description: string;
  /**
   * Path relative to the site root, leading slash included (e.g. `/sites/aadhaar-ssup`).
   * Next.js combines this with `metadataBase` for the canonical + OG URL.
   */
  path: string;
  /**
   * Optional override of the OG/Twitter image. When omitted, Next.js falls
   * back to the per-route `opengraph-image.tsx` or the root branded fallback.
   */
  image?: string;
  /** OpenGraph type — defaults to `'website'`. Use `'article'` on long-form. */
  type?: 'website' | 'article';
  /** When true, the page is excluded from indexing but still followed. */
  noindex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
}: BuildMetadataArgs): Metadata {
  const absoluteUrl = `${SITE_URL}${path}`;
  const images = image ? [{ url: image }] : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl,
      siteName: BRAND_NAME,
      locale: 'en_IN',
      type,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(images ? { images } : {}),
    },
    robots: noindex
      ? { index: false, follow: true }
      : {
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
  };
}
