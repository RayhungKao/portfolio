/**
 * Small routing helpers on top of the Next.js App Router.
 * Code uses app paths ('/blog/x'). Links use next/link (see AppLink for hrefs that may be external),
 * which adds the base path itself; to() is for the few plain <a> or window calls that need it.
 * The base path is '/portfolio' on a GitHub project site and '' on a custom domain.
 */

/** The site's base path without a trailing slash. Set from next.config.ts. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//');

/** An app path ('/blog/x') as the href the browser needs ('/portfolio/blog/x'). External URLs pass through. */
export const to = (path: string) => (isInternal(path) ? BASE + path : path);

/** A file in public/, under the base path. */
export const asset = (file: string) => `${BASE}/${file}`;

type Navigator = (path: string, replace: boolean) => void;
let navigator: Navigator | null = null;

/** RouterBridge registers the App Router here, so code outside React components can navigate. */
export function registerNavigator(next: Navigator | null) {
  navigator = next;
}

/** Goes to an internal path without a page load. `replace` swaps the current history entry. */
export function navigate(path: string, { replace = false } = {}) {
  if (navigator) navigator(path, replace);
  else window.location.assign(to(path));
}
