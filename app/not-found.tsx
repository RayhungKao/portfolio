import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found' };

/** Becomes 404.html, which GitHub Pages serves (with a real 404 status) for any URL that has no file. */
export default function NotFound() {
  return (
    <main className="not-found">
      <p className="not-found-code">404</p>
      <h1>This page doesn’t exist</h1>
      <p>The link may be mistyped, or the page has moved.</p>
      <p className="not-found-links">
        <Link href="/">Back to home</Link>
        <Link href="/blog">Read the blog</Link>
      </p>
    </main>
  );
}
