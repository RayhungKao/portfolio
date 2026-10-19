/**
 * Where the site is served. The deploy workflow passes SITE_ORIGIN and BASE_PATH from the Pages
 * settings, so a custom domain needs no code change. The default is for local builds.
 */
export const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://rayhungkao.github.io';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
/** Absolute site root, with a trailing slash so relative metadata URLs compose under the base path. */
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}/`;
export const SITE_NAME = 'Ray Kao';
