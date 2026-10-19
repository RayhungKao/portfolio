import type { MetadataRoute } from 'next';
import { SITE_ORIGIN, BASE_PATH } from '../src/site';

export const dynamic = 'force-static'; // required for output: 'export'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_ORIGIN}${BASE_PATH}/sitemap.xml`,
  };
}
