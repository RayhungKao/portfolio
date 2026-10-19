/**
 * Optional titles and descriptions for series. A post joins a series with `series: <slug>` and
 * `order: <n>` in its front matter; a series with no entry here is titled from its slug.
 *
 *   'web-development': { title: 'Web Development', description: 'One line shown on the series card.' },
 *
 * Inside a series, `part: <name>` on a post groups it under "Part N · <name>" on the series page. Give
 * `order` as part × 100 + position (101, 102, …, 601, …) so a new article can slot in without renumbering.
 */
export const SERIES_INFO: Record<string, { title: string; description?: string }> = {
  'web-development': {
    title: 'Web Development',
    description: 'From how a website works to choosing a stack: rendering, state, the backend, and what to pick for which project.',
  },
};
