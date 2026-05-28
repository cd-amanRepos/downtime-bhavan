import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { SITE_URL } from '@/lib/seo/constants';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();
  const sites = db
    .select({ id: schema.sites.id })
    .from(schema.sites)
    .where(eq(schema.sites.enabled, true))
    .all();

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,             changeFrequency: 'hourly',  priority: 1.0, lastModified: now },
    { url: `${SITE_URL}/sites`,        changeFrequency: 'hourly',  priority: 0.9, lastModified: now },
    { url: `${SITE_URL}/leaderboard`,  changeFrequency: 'daily',   priority: 0.9, lastModified: now },
    { url: `${SITE_URL}/janta-darbar`, changeFrequency: 'hourly',  priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/methodology`,  changeFrequency: 'monthly', priority: 0.7, lastModified: now },
    { url: `${SITE_URL}/about`,        changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/press`,        changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    { url: `${SITE_URL}/contact`,      changeFrequency: 'yearly',  priority: 0.3, lastModified: now },
    { url: `${SITE_URL}/donate`,       changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    { url: `${SITE_URL}/departments`,  changeFrequency: 'daily',   priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/privacy`,      changeFrequency: 'yearly',  priority: 0.2, lastModified: now },
    // Excluded: /admin/*, /api/*, /delete-my-data
  ];

  const siteEntries: MetadataRoute.Sitemap = sites.map((s) => ({
    url: `${SITE_URL}/sites/${s.id}`,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
    lastModified: now,
  }));

  return [...staticEntries, ...siteEntries];
}
