import { CARDS } from '../../src/content';
import { POSTS } from '../../src/postData';
import { RESUME } from '../../src/resumeData';
import { absUrl } from '../../src/site';

export const dynamic = 'force-static'; // required for output: 'export'

/**
 * /llms.txt (llmstxt.org): a plain Markdown map of the site for AI assistants and answer engines.
 * It matters most for the Work pages, whose content is drawn on a canvas and is not in their HTML.
 */
export function GET() {
  const text = [
    `# ${RESUME.name}`,
    `> ${RESUME.title} in ${RESUME.location}. ${RESUME.summary}`,
    '## Work',
    ...CARDS.map((c) => `- [${c.title}](${absUrl(`/work/${c.id}`)}): ${c.detail.lead} ${c.detail.points.join(' ')}`),
    '## Blog',
    ...POSTS.map((p) => `- [${p.title}](${absUrl(`/blog/${p.slug}`)}): ${p.summary}`),
    '## Optional',
    `- [Résumé](${absUrl('/resume')})`,
  ].join('\n\n');
  return new Response(`${text}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
