/** Post types and helpers that are safe to import from client components. */

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
  /** Where the post was shared, for the "Discuss on / View on" buttons. */
  threads?: string;
  instagram?: string;
  /** Series slug and the post's place in it (1 = first). Both or neither. */
  series?: string;
  order?: number;
  /** Optional group inside a series, e.g. "Backend". The series page numbers the groups "Part 1", "Part 2", … */
  part?: string;
  /** Share image in public/, e.g. /og/x.png. Without it a card is drawn from the title. */
  image?: string;
  summary: string;
  body: string;
  /** Sidebar category. Not set for a post in a series: that post is listed under its series instead. */
  category?: string;
  /** Minutes, from the word count (about 230 words a minute, rounded up). */
  readingMinutes: number;
  tags: string[];
};

export type Series = { slug: string; title: string; description?: string; posts: Post[] };

/** What the post page needs to show "Series · 3 / 14" and the previous/next links. */
export type SeriesNav = {
  slug: string;
  title: string;
  position: number;
  total: number;
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
};

/**
 * A series' posts (already in reading order) cut into runs that share a `part`. Posts without a part form
 * a run with no heading. The same part appearing in two separate runs is an ordering mistake, so it throws.
 */
export function groupByPart(posts: Post[]): { part?: string; posts: Post[] }[] {
  const groups: { part?: string; posts: Post[] }[] = [];
  for (const post of posts) {
    const last = groups[groups.length - 1];
    if (last && last.part === post.part) last.posts.push(post);
    else groups.push({ part: post.part, posts: [post] });
  }
  const named = groups.flatMap((g) => (g.part ? [g.part] : []));
  const repeated = named.find((part, i) => named.indexOf(part) !== i);
  if (repeated) throw new Error(`Part "${repeated}" is split by posts from another part: check the order numbers`);
  return groups;
}

/** A row in a post list: a standalone post, or one collapsed card standing for a whole series. */
export type ListItem = { kind: 'post'; post: Post } | { kind: 'series'; series: Series };

/**
 * `posts` is newest first. Each series becomes one card, placed where its newest post in
 * `posts` would have been, so a 14-part series takes one row instead of fourteen.
 */
export function listItems(posts: Post[], allSeries: Series[]): ListItem[] {
  const seen = new Set<string>();
  const items: ListItem[] = [];
  for (const post of posts) {
    if (!post.series) {
      items.push({ kind: 'post', post });
      continue;
    }
    if (seen.has(post.series)) continue;
    seen.add(post.series);
    const series = allSeries.find((s) => s.slug === post.series);
    if (series) items.push({ kind: 'series', series });
  }
  return items;
}

export type Category = { name: string; slug: string; posts: Post[] };

export const categorySlug = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
