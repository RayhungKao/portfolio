import type { MetadataRoute } from 'next';
import { CARDS } from '../src/content';
import { CATEGORIES, POSTS } from '../src/postData';
import { SITE_URL } from '../src/site';

export const dynamic = 'force-static'; // required for output: 'export'

const abs = (path: string) => new URL(path.replace(/^\//, ''), SITE_URL).toString();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: abs('/') },
    { url: abs('/work') },
    ...CARDS.map((c) => ({ url: abs(`/work/${c.id}`) })),
    { url: abs('/blog') },
    ...CATEGORIES.map((c) => ({ url: abs(`/blog/category/${c.slug}`) })),
    ...POSTS.map((p) => ({ url: abs(`/blog/${p.slug}`), lastModified: p.date || undefined })),
    { url: abs('/resume') },
  ];
}
