import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/admin',
          '/api/admin/',
          '/api/notify/',
          '/api/webhook',
          '/api/webhook/',
          '/delete-my-data',
        ],
      },
      // Explicitly allow AI crawlers — GEO is a primary KPI per the SEO strategy
      { userAgent: 'GPTBot',          allow: '/' },
      { userAgent: 'PerplexityBot',   allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'ClaudeBot',       allow: '/' },
      { userAgent: 'CCBot',           allow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
