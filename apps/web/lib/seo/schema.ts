/**
 * Schema.org JSON-LD builders for Downtime Bhavan.
 *
 * All builders return `WithContext<T>` so every emitted object carries the
 * `@context` field at the top level — that's what schema validators expect.
 * Types come from `schema-dts`, which is a TS-types-only dev dependency.
 *
 * Builders here are intentionally pure functions of constants + args so they
 * can be called from server components, route handlers, or edge runtimes.
 */

import type {
  AboutPage,
  Article,
  BreadcrumbList,
  Dataset,
  DonateAction,
  ItemList,
  Organization,
  Person,
  WebSite,
  WithContext,
} from 'schema-dts';

import {
  BRAND_HI,
  BRAND_NAME,
  FOUNDING_DATE,
  ORG_LEGAL_NOTE,
  SITE_URL,
  SOCIAL_GITHUB,
  SOCIAL_X,
  WIKIDATA_QID,
} from './constants';

/** Stable @id we use to reference the Organization from other schema blocks. */
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function buildOrganizationSchema(): WithContext<Organization> {
  const sameAs = [SOCIAL_X, SOCIAL_GITHUB, WIKIDATA_QID].filter(
    (s): s is string => Boolean(s) && s.length > 0,
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BRAND_NAME,
    alternateName: BRAND_HI,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-only.png`,
    description: 'An unofficial observatory of Indian government websites.',
    disambiguatingDescription: ORG_LEGAL_NOTE,
    foundingDate: FOUNDING_DATE,
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function buildWebSiteSchema(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: BRAND_NAME,
    url: SITE_URL,
    inLanguage: 'en-IN',
    publisher: { '@id': ORG_ID },
  };
}

export function buildBreadcrumbSchema(
  items: { name: string; url: string }[],
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface PersonSchemaArgs {
  name: string;
  url: string;
  image?: string;
  sameAs?: string[];
}

export function buildPersonSchema(
  args: PersonSchemaArgs,
): WithContext<Person> {
  const sameAs = (args.sameAs ?? []).filter(
    (s): s is string => Boolean(s) && s.length > 0,
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: args.name,
    url: args.url,
    ...(args.image ? { image: args.image } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export interface DatasetSchemaArgs {
  name: string;
  description: string;
  url: string;
  /** Optional URL of a machine-readable distribution (e.g. JSON endpoint). */
  distribution?: string;
}

export function buildDatasetSchema(
  args: DatasetSchemaArgs,
): WithContext<Dataset> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: args.name,
    description: args.description,
    url: args.url,
    creator: { '@id': ORG_ID },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    keywords: [
      'India',
      'government websites',
      'uptime',
      'reliability',
      'Sarkari',
      'Downtime Bhavan',
    ],
    ...(args.distribution
      ? {
          distribution: {
            '@type': 'DataDownload',
            contentUrl: args.distribution,
            encodingFormat: 'application/json',
          },
        }
      : {}),
  };
}

export interface ArticleSchemaArgs {
  headline: string;
  url: string;
  /** ISO 8601 publish timestamp. */
  datePublished: string;
  /** ISO 8601 last-modified timestamp. */
  dateModified?: string;
  author?: string;
  image?: string;
}

export function buildArticleSchema(
  args: ArticleSchemaArgs,
): WithContext<Article> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.headline,
    url: args.url,
    datePublished: args.datePublished,
    ...(args.dateModified ? { dateModified: args.dateModified } : {}),
    ...(args.author
      ? { author: { '@type': 'Person', name: args.author } }
      : {}),
    ...(args.image ? { image: args.image } : {}),
    publisher: { '@id': ORG_ID },
  };
}

export interface AboutPageSchemaArgs {
  url: string;
  name: string;
  description: string;
}

export function buildAboutPageSchema(
  args: AboutPageSchemaArgs,
): WithContext<AboutPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: args.url,
    name: args.name,
    description: args.description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORG_ID },
  };
}

export function buildDonateActionSchema(): WithContext<DonateAction> {
  return {
    '@context': 'https://schema.org',
    '@type': 'DonateAction',
    recipient: { '@id': ORG_ID },
  };
}

export interface ItemListSchemaArgs {
  items: { url: string; name: string }[];
}

export function buildItemListSchema(
  args: ItemListSchemaArgs,
): WithContext<ItemList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: args.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
