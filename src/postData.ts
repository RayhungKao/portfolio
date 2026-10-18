/**
 * Blog posts live as Markdown files in src/posts/*.md. A YAML header sets the metadata:
 *
 * ---
 * title: What I learned building an AI agent's cancel flow   (quote it if it contains ": ")
 * date: 2026-10-09
 * category: AI Agent
 * linkedin: https://www.linkedin.com/feed/update/urn:li:activity:...
 * image: /og/my-post.png     (optional PNG in public/; default is a card drawn from the title)
 * draft: true               (optional; hidden from the production build)
 * series: web-development    (optional; with order: 3, the post is 3rd in that series)
 * part: Backend              (optional; groups a series under "Part N · Backend", numbered in reading order)
 * threads: https://...       (optional; adds a "Discuss on Threads" button; instagram: likewise)
 * summary: Optional one-line teaser for the post list.
 * ---
 * Post body…
 *
 * The file name (without .md) becomes the URL: /blog/<file-name>.
 * Reading time and tags (the post's #hashtags) are derived from the body.
 * The body is rendered to HTML by src/PostMarkdown.tsx. Two additions to plain Markdown:
 *   ![alt](diagram:name)         inlines src/diagrams/name.svg (follows the light/dark theme)
 *   > [!WARNING] Title           a highlighted callout; also [!PRINCIPLE] and [!NOTE] (src/remarkCallouts.ts)
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CATEGORY_ORDER, UNCATEGORIZED, categorySlug, groupByPart, type Category, type Post, type Series, type SeriesNav } from './postTypes';
import { SERIES_INFO } from './series';

/** Server only: reads src/posts/*.md at build time. Client components get posts as props. */
const POSTS_DIR = path.join(process.cwd(), 'src', 'posts');

function parse(file: string, raw: string): Post & { draft: boolean } {
  const slug = file.replace(/\.md$/, '');
  const { data: meta, content } = matter(raw);
  const str = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' ? v : '');
  const body = content.trim();
  const firstLine = body.split('\n').find((l) => l.trim()) ?? '';
  const summary = str(meta.summary) || (firstLine.length > 180 ? `${firstLine.slice(0, 177)}…` : firstLine);
  const words = body.match(/[A-Za-z0-9'’-]+/g)?.length ?? 0;
  const cjk = body.match(/[\u3400-\u9fff]/g)?.length ?? 0; // CJK reads at roughly two characters per word
  const tags = [...new Set([...body.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]))];
  return {
    draft: meta.draft === true,
    slug,
    title: str(meta.title) || firstLine || slug,
    date: str(meta.date),
    linkedin: str(meta.linkedin) || undefined,
    image: str(meta.image) || undefined,
    threads: str(meta.threads) || undefined,
    instagram: str(meta.instagram) || undefined,
    series: str(meta.series) || undefined,
    order: typeof meta.order === 'number' ? meta.order : undefined,
    part: str(meta.part) || undefined,
    summary,
    body,
    category: str(meta.category) || UNCATEGORIZED,
    readingMinutes: Math.max(1, Math.ceil((words + cjk / 2) / 230)),
    tags,
  };
}

/** `draft: true` posts show up in `npm run dev` but are left out of the production build. */
const SHOW_DRAFTS = process.env.NODE_ENV !== 'production';

export const POSTS: Post[] = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => parse(f, fs.readFileSync(path.join(POSTS_DIR, f), 'utf8')))
  .filter((p) => SHOW_DRAFTS || !p.draft)
  .map(({ draft: _draft, ...post }): Post => post)
  .sort((a, b) => b.date.localeCompare(a.date));

/** The same posts without their bodies: what client components receive as props. */
export const POST_LIST: Post[] = POSTS.map((p) => ({ ...p, body: '' }));

const titleCase = (slug: string) => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Series, each with its posts in reading order. A post with `series` must also have a unique `order`. */
export const SERIES: Series[] = [...new Set(POST_LIST.flatMap((p) => (p.series ? [p.series] : [])))].map((slug) => {
  const posts = POST_LIST.filter((p) => p.series === slug).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const p of posts) {
    if (p.order === undefined) throw new Error(`${p.slug}.md: "series: ${slug}" needs an "order: <number>"`);
  }
  const orders = posts.map((p) => p.order);
  if (new Set(orders).size !== orders.length) throw new Error(`Series "${slug}" has two posts with the same order`);
  groupByPart(posts); // fail the build now if a part is split, not when the series page is rendered
  const info = SERIES_INFO[slug];
  return { slug, title: info?.title ?? titleCase(slug), description: info?.description, posts };
});

/** Series header and previous/next links for a post, or undefined if it is not in a series. */
export function seriesNav(slug: string): SeriesNav | undefined {
  const series = SERIES.find((s) => s.posts.some((p) => p.slug === slug));
  if (!series) return undefined;
  const i = series.posts.findIndex((p) => p.slug === slug);
  const pick = (p?: Post) => (p ? { slug: p.slug, title: p.title } : undefined);
  return { slug: series.slug, title: series.title, position: i + 1, total: series.posts.length, prev: pick(series.posts[i - 1]), next: pick(series.posts[i + 1]) };
}

/** Categories in sidebar order, each with its posts (newest first). Empty categories are left out. */
export const CATEGORIES: Category[] = (() => {
  const names = [...CATEGORY_ORDER, ...new Set(POST_LIST.map((p) => p.category).filter((c) => !CATEGORY_ORDER.includes(c)))];
  return names
    .map((name) => ({ name, slug: categorySlug(name), posts: POST_LIST.filter((p) => p.category === name) }))
    .filter((c) => c.posts.length > 0);
})();
