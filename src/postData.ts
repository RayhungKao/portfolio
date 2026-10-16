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
 * summary: Optional one-line teaser for the post list.
 * ---
 * Post body…
 *
 * The file name (without .md) becomes the URL: /blog/<file-name>.
 * Reading time and tags (the post's #hashtags) are derived from the body.
 * The body is rendered to HTML by src/PostMarkdown.tsx.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CATEGORY_ORDER, UNCATEGORIZED, categorySlug, type Category, type Post } from './postTypes';

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

/** Categories in sidebar order, each with its posts (newest first). Empty categories are left out. */
export const CATEGORIES: Category[] = (() => {
  const names = [...CATEGORY_ORDER, ...new Set(POSTS.map((p) => p.category).filter((c) => !CATEGORY_ORDER.includes(c)))];
  return names
    .map((name) => ({ name, slug: categorySlug(name), posts: POSTS.filter((p) => p.category === name) }))
    .filter((c) => c.posts.length > 0);
})();
