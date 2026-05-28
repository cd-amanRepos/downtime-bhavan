/**
 * SEO + brand constants for Downtime Bhavan.
 *
 * Single source of truth referenced by metadata, schema, manifest, sitemap,
 * robots, OG images, and per-route helpers. Only SITE_URL is environment-
 * overridable so local/preview deploys can point at a non-prod origin.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://downtimebhavan.in';

export const BRAND_NAME = 'Downtime Bhavan';
export const BRAND_HI = 'डाउनटाइम भवन';
export const BRAND_TAGLINE = 'An unofficial observatory';

export const ORG_LEGAL_NOTE =
  'Independent civic project. Not affiliated with the Government of India or any government body.';

export const SOCIAL_X = 'https://x.com/downtimebhavan';
export const SOCIAL_GITHUB = 'https://github.com/downtimebhavan';

/**
 * Wikidata QID URL — left empty until the Wikidata entity is created.
 * Schema builders filter empty strings out of `sameAs` arrays so this is safe
 * to leave blank in v1.
 */
export const WIKIDATA_QID = '';

export const FOUNDING_DATE = '2026-05';
export const LOCALE = 'en-IN';
export const COUNTRY = 'IN';

/**
 * Provisional operator placeholder — the named human behind the observatory.
 * Replace with the real operator's name before the /about page goes public
 * with a real human.
 */
export const OPERATOR_NAME = 'Downtime Bhavan team';
