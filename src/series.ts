/**
 * Optional titles and descriptions for series. A post joins a series with `series: <slug>` and
 * `order: <n>` in its front matter; a series with no entry here is titled from its slug.
 *
 *   'web-development': { title: 'Web Development', description: 'One line shown on the series card.' },
 */
export const SERIES_INFO: Record<string, { title: string; description?: string }> = {};
