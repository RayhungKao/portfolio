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
  /** Share image in public/, e.g. /og/x.png. Without it a card is drawn from the title. */
  image?: string;
  summary: string;
  body: string;
  category: string;
  /** Minutes, from the word count (about 230 words a minute, rounded up). */
  readingMinutes: number;
  tags: string[];
};

export type Category = { name: string; slug: string; posts: Post[] };

export const categorySlug = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
