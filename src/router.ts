/**
 * Small routing helpers on top of the Next.js App Router.
 * Code uses app paths ('/blog/x'); hrefs go through to(), which adds the base path
 * ('/portfolio' on a GitHub project site, '' on a custom domain).
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

/**
 * Turns plain clicks on internal links into in-app navigation. Modified clicks (⌘/Ctrl/Shift,
 * middle button) and links with a target keep the browser's default, so "open in new tab" works.
 */
export function interceptLinkClicks() {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a');
    if (!a || a.target || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || !isInternal(href)) return;
    if (BASE && href !== BASE && !href.startsWith(BASE + '/')) return; // outside this site: let the browser go
    e.preventDefault();
    navigate(href.slice(BASE.length) || '/');
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
