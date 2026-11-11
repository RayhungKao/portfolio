import { LINKS } from './content';
import { RESUME } from './resumeData';

/**
 * Where the site is served. The deploy workflow passes SITE_ORIGIN and BASE_PATH from the Pages
 * settings, so a custom domain needs no code change. The default is for local builds.
 */
export const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://rayhungkao.github.io';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
/** Absolute site root, with a trailing slash so relative metadata URLs compose under the base path. */
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}/`;
export const SITE_NAME = 'Ray Kao';

/** An app path ('/blog/x') as an absolute URL. */
export const absUrl = (path: string) => new URL(path.replace(/^\//, ''), SITE_URL).toString();

/** Who the site is about, as schema.org data: search engines and AI answers use it to tie the pages to one person. */
export const PERSON = {
  '@type': 'Person',
  name: RESUME.name,
  alternateName: SITE_NAME,
  jobTitle: RESUME.title,
  url: SITE_URL,
  sameAs: [LINKS.github, LINKS.linkedin],
  address: { '@type': 'PostalAddress', addressLocality: 'Taipei', addressCountry: 'TW' },
};

/** A schema.org object as the body of a <script type="application/ld+json">. `<` is escaped so text can never close the tag. */
export const jsonLd = (data: object) => ({ __html: JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c') });
