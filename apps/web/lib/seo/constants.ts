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

/**
 * Brand social handles. No separate Downtime Bhavan accounts exist yet —
 * leave empty until they're claimed. Schema builders filter empty strings
 * out of `sameAs` arrays, so emitted JSON-LD stays clean.
 */
export const SOCIAL_X = '';
export const SOCIAL_GITHUB = '';

/**
 * Operator personal social URLs — used by the /about Person schema's
 * `sameAs` to establish the human-behind-the-site E-E-A-T signal.
 */
export const OPERATOR_LINKEDIN = 'https://www.linkedin.com/in/amanthapliyal3';
export const OPERATOR_GITHUB = '';
export const OPERATOR_X = '';

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
 * The named human behind the observatory. Renders in the /about page body
 * and in the Person JSON-LD schema (E-E-A-T signal).
 */
export const OPERATOR_NAME = 'Aman Thapliyal';
