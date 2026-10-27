import type { MetadataRoute } from 'next';
import { CARDS } from '../src/content';
import { CATEGORIES, POSTS, SERIES } from '../src/postData';
import { absUrl as abs } from '../src/site';

export const dynamic = 'force-static'; // required for output: 'export'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: abs('/') },
    { url: abs('/work') },
    ...CARDS.map((c) => ({ url: abs(`/work/${c.id}`) })),
    { url: abs('/blog') },
    ...CATEGORIES.map((c) => ({ url: abs(`/blog/category/${c.slug}`) })),
    ...SERIES.map((s) => ({ url: abs(`/series/${s.slug}`) })),
    ...POSTS.map((p) => ({ url: abs(`/blog/${p.slug}`), lastModified: p.date || undefined })),
    { url: abs('/resume') },
  ];
}
