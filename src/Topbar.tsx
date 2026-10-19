'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LINKS } from './content';
import { Logo } from './Logo';
import { useWorkView } from './WorkViewContext';

type Theme = 'light' | 'dark';
const THEME_KEY = 'theme';
function savedTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Light (warm paper) by default; dark uses the navy-and-white palette. The choice is remembered. */
function ThemeToggle() {
  // The page head script already applied a saved dark theme before first paint; read it back here.
  const [theme, setTheme] = useState<Theme>('light');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setTheme(savedTheme());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    window.dispatchEvent(new Event('themechange')); // the canvas repaints its name labels
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable; the toggle still works for this visit.
    }
  }, [theme, ready]);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="theme-toggle" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

const inSection = (pathname: string, section: string) => pathname === section || pathname.startsWith(`${section}/`);

export function Topbar() {
  const pathname = usePathname();
  const { view, setView } = useWorkView();
  const isHome = pathname === '/';
  const onDeskPage = inSection(pathname, '/work');
  const onBlog = inSection(pathname, '/blog');
  const onResume = inSection(pathname, LINKS.resume);
  const cur = (on: boolean) => (on ? ('page' as const) : undefined);

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <Logo />
        <strong>Ray Kao</strong>
        <span>Software Engineer</span>
      </Link>
      <nav className="actions">
        {onDeskPage && (
          <button className="pill subtle" onClick={() => setView(view === 'desk' ? 'list' : 'desk')}>
            {view === 'desk' ? 'List view' : 'Canvas view'}
          </button>
        )}
        <Link className={isHome ? 'nav-link active' : 'nav-link'} href="/" aria-current={cur(isHome)}>
          Home
        </Link>
        <Link className={onDeskPage ? 'nav-link active' : 'nav-link'} href="/work" aria-current={cur(onDeskPage)}>
          Work
        </Link>
        <Link className={onBlog ? 'nav-link active' : 'nav-link'} href="/blog" aria-current={cur(onBlog)}>
          Blog
        </Link>
        <Link className={onResume ? 'nav-link active' : 'nav-link'} href={LINKS.resume} aria-current={cur(onResume)}>
          Résumé
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
