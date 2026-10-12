/**
 * Blog posts live as plain-text files in src/posts/*.md, written the way you would
 * write a LinkedIn post: line breaks are kept, blank lines start a new paragraph,
 * URLs become links, and #hashtags are highlighted. A small header sets the metadata:
 *
 * ---
 * title: What I learned building an AI agent's cancel flow
 * date: 2026-10-09
 * linkedin: https://www.linkedin.com/feed/update/urn:li:activity:...
 * summary: Optional one-line teaser for the post list.
 * ---
 * Post body…
 *
 * The file name (without .md) becomes the URL: #/blog/<file-name>.
 */

export type Post = {
  slug: string;
  title: string;
  date: string;
  linkedin?: string;
  summary: string;
  body: string;
};

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
  return {
    slug,
    title: meta.title || firstLine || slug,
    date: meta.date || '',
    linkedin: meta.linkedin || undefined,
    summary,
    body,
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
