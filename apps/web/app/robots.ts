import type { MetadataRoute } from 'next';
import { robotsOf } from '@/useCases/paths/searchEngines';
import { site } from '@/useCases/paths/queries';

/** Closed to search engines until the site has a domain of its own (SITE_URL) */
export default function robots(): MetadataRoute.Robots {
  return robotsOf(site());
}
