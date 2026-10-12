/**
 * Path routing on the History API (/work, /blog/<slug>, /resume …), under Vite's base path.
 * Code uses app paths ('/blog/x'); hrefs go through to(), which adds the base path.
 * GitHub Pages has no server-side rewrites, so the build also writes 404.html (a copy of
 * index.html): a deep link that matches no file loads the app, which then reads the path.
 */

const NAV_EVENT = 'app:navigate';

/** The site's base path without a trailing slash: '' at a domain root, '/portfolio' on a GitHub project site. */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** An app path ('/blog/x') as the href the browser needs ('/portfolio/blog/x'). External URLs pass through. */
export const to = (path: string) => (isInternal(path) ? BASE + path : path);

/** A file in public/, under the base path. */
export const asset = (file: string) => import.meta.env.BASE_URL + file;

/** The current path inside the app, with the base path removed. */
export function appPath(pathname = window.location.pathname) {
  const inside = BASE && (pathname === BASE || pathname.startsWith(BASE + '/')) ? pathname.slice(BASE.length) : pathname;
  return inside || '/';
}

/** Goes to an internal path without a page load. `replace` swaps the current history entry. */
export function navigate(path: string, { replace = false } = {}) {
  const current = appPath() + window.location.search;
  if (path === current && !replace) return;
  if (replace) window.history.replaceState(null, '', BASE + path);
  else window.history.pushState(null, '', BASE + path);
  window.dispatchEvent(new Event(NAV_EVENT));
}

/** Calls `listener` whenever the path changes: in-app navigation and the Back/Forward buttons. */
export function onPathChange(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener(NAV_EVENT, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(NAV_EVENT, listener);
  };
}

export const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//');

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
    navigate(appPath(href));
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

/** Links from before path routing (#/blog/…) land on the matching path. */
export function upgradeHashUrl() {
  const { hash } = window.location;
  if (hash.startsWith('#/')) window.history.replaceState(null, '', BASE + hash.slice(1));
}
