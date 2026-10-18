import type { MetadataRoute } from 'next';
import { sitemapOf } from '@/useCases/paths/searchEngines';
import { catalogEntries, site } from '@/useCases/paths/queries';

/** The catalog's pages, once the site has a domain of its own (SITE_URL); empty until then */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = site();
  return sitemapOf(origin, origin === null ? [] : await catalogEntries());
}
