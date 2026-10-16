/** Where the site is served. Move to a custom domain: set SITE_ORIGIN (and BASE_PATH to '') in the deploy workflow. */
export const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://rayhungkao.github.io';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
/** Absolute site root, with a trailing slash so relative metadata URLs compose under the base path. */
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}/`;
export const SITE_NAME = 'Ray Kao';
