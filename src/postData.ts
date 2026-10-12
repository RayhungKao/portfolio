/**
 * Blog posts live as plain-text files in src/posts/*.md, written the way you would
 * write a LinkedIn post: line breaks are kept, blank lines start a new paragraph,
 * URLs become links, and #hashtags are highlighted. A small header sets the metadata:
 *
 * ---
 * title: What I learned building an AI agent's cancel flow
 * date: 2026-10-09
 * category: AI Agent
 * linkedin: https://www.linkedin.com/feed/update/urn:li:activity:...
 * summary: Optional one-line teaser for the post list.
 * ---
 * Post body…
 *
 * The file name (without .md) becomes the URL: /blog/<file-name>.
 * Reading time and tags (the post's #hashtags) are derived from the body.
 */

/** Sidebar order of the blog categories. A post with an unlisted category is shown after these. */
export const CATEGORY_ORDER = [
  'AI Agent',
  'System Design',
  'Performance',
  'Frontend Architecture',
  'Canvas & Animation',
  'Building with AI',
  'Industry Insights',
];
export const UNCATEGORIZED = 'Notes';

export type Post = {
  slug: string;
  title: string;
  date: string;
  linkedin?: string;
  summary: string;
  body: string;
  category: string;
  /** Minutes, from the word count (about 230 words a minute, rounded up). */
  readingMinutes: number;
  tags: string[];
};

export const categorySlug = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const files = import.meta.glob('./posts/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

function parse(path: string, raw: string): Post {
  const slug = path.replace(/^.*\/(.+)\.md$/, '$1');
  const meta: Record<string, string> = {};
  let body = raw.replace(/\r\n/g, '\n');
  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    body = body.slice(fm[0].length);
  }
  body = body.trim();
  const firstLine = body.split('\n').find((l) => l.trim()) ?? '';
  const summary = meta.summary || (firstLine.length > 180 ? `${firstLine.slice(0, 177)}…` : firstLine);
  const words = body.match(/[A-Za-z0-9'’-]+/g)?.length ?? 0;
  const cjk = body.match(/[\u3400-\u9fff]/g)?.length ?? 0; // CJK reads at roughly two characters per word
  const tags = [...new Set([...body.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]))];
  return {
    slug,
    title: meta.title || firstLine || slug,
    date: meta.date || '',
    linkedin: meta.linkedin || undefined,
    summary,
    body,
    category: meta.category || UNCATEGORIZED,
    readingMinutes: Math.max(1, Math.ceil((words + cjk / 2) / 230)),
    tags,
  };
}

export const POSTS: Post[] = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => b.date.localeCompare(a.date));

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Categories in sidebar order, each with its posts (newest first). Empty categories are left out. */
export const CATEGORIES: { name: string; slug: string; posts: Post[] }[] = (() => {
  const names = [...CATEGORY_ORDER, ...new Set(POSTS.map((p) => p.category).filter((c) => !CATEGORY_ORDER.includes(c)))];
  return names
    .map((name) => ({ name, slug: categorySlug(name), posts: POSTS.filter((p) => p.category === name) }))
    .filter((c) => c.posts.length > 0);
})();
