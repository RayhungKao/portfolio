/**
 * Optional titles and descriptions for series. A post joins a series with `series: <slug>` and
 * `order: <n>` in its front matter; a series with no entry here is titled from its slug.
 *
 *   'web-frontend': { title: 'Web Development: Frontend', description: 'One line shown on the series card.' },
 *
 * Inside a series, `part: <name>` on a post groups it under "Part N · <name>" on the series page. Give
 * `order` as part × 100 + position (101, 102, …, 501, …) so a new article can slot in without renumbering.
 */
export const SERIES_INFO: Record<string, { title: string; description?: string }> = {
  'web-frontend': {
    title: 'Web Development: Frontend',
    description: 'From how a website works to a shipped frontend: rendering, the toolchain, deployment, and Next.js in practice.',
  },
  'web-backend': {
    title: 'Web Development: Backend',
    description: 'When a site needs a backend, how one works, which shape to pick, and how to run it.',
  },
};
