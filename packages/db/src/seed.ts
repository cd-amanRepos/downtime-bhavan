import type { SiteConfig } from '@dtb/shared';
import type { Db } from './client.js';
import { sites } from './schema.js';

/** Idempotently insert/update a list of SiteConfigs into the sites table. */
export async function seedSites(db: Db, configs: SiteConfig[]): Promise<void> {
  for (const config of configs) {
    await db
      .insert(sites)
      .values({
        id: config.id,
        name: config.name,
        url: config.url,
        configJson: JSON.stringify(config),
        enabled: config.enabled ?? true,
      })
      .onConflictDoUpdate({
        target: sites.id,
        set: {
          name: config.name,
          url: config.url,
          configJson: JSON.stringify(config),
          enabled: config.enabled ?? true,
        },
      })
      .run();
  }
}
