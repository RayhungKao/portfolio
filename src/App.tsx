import { useCallback, useEffect, useRef, useState } from 'react';
import { createDesk, type DeskApi, type Rect2D } from './desk';
import { CARDS, LINKS } from './content';
import { BlogList, BlogPost } from './Blog';
import { Home } from './Home';
import { Logo } from './Logo';
import { appPath, interceptLinkClicks, navigate, onPathChange, to } from './router';
import { Resume } from './Resume';
import { Slide, type SlidePhase } from './Slide';
import { DeckContent, SLIDE_W, measureLayouts } from './DeckContent';

type Route =
  | { name: 'home' }
  | { name: 'resume' }
  | { name: 'desk' } // the Work page: the canvas with every card
  | { name: 'work'; id: string } // the Work page with one card open
  | { name: 'blog'; category?: string }
  | { name: 'post'; slug: string };

function readRoute(): Route {
  const path = appPath().replace(/\/+$/, '') || '/';
  const work = path.match(/^\/work(?:\/([^/]+))?$/);
  if (work) return work[1] && CARDS.some((c) => c.id === work[1]) ? { name: 'work', id: work[1] } : { name: 'desk' };
  if (path === '/resume') return { name: 'resume' };
  const category = path.match(/^\/blog\/category\/([^/]+)$/);
  if (category) return { name: 'blog', category: decodeURIComponent(category[1]) };
  const blog = path.match(/^\/blog(?:\/([^/]+))?$/);
  if (blog) return blog[1] ? { name: 'post', slug: decodeURIComponent(blog[1]) } : { name: 'blog' };
  return { name: 'home' };
}

const isNarrow = () => window.matchMedia('(max-width: 767px)').matches;

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
  const [theme, setTheme] = useState<Theme>(savedTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.dispatchEvent(new Event('themechange')); // the canvas repaints its name labels
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable; the toggle still works for this visit.
    }
  }, [theme]);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="theme-toggle" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

type SlideState = { id: string; origin: Rect2D | null; phase: SlidePhase };

export default function App() {
  const [view, setView] = useState<'desk' | 'list'>(() => (isNarrow() ? 'list' : 'desk'));
  const [zoom, setZoom] = useState(1);
  const [route, setRoute] = useState<Route>(readRoute);
  const [slide, setSlide] = useState<SlideState | null>(null);
  // Bumps whenever a new desk is built, so the URL-driven sequence re-runs against it.
  const [deskVersion, setDeskVersion] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<DeskApi | null>(null);
  const deskReady = useRef<Promise<void>>(Promise.resolve());
  const seq = useRef(0); // bumps on every open/close so stale animations stop
  const exited = useRef<(() => void) | null>(null);
  const pushedFromHome = useRef(false);
  const slideRef = useRef<SlideState | null>(null);
  slideRef.current = slide;

  const onDeskPage = route.name === 'desk' || route.name === 'work';

  useEffect(() => {
    const onHash = () => {
      const next = readRoute();
      setRoute(next);
      if (next.name !== 'desk' && next.name !== 'work') window.scrollTo(0, 0);
    };
    const stopIntercepting = interceptLinkClicks();
    const stopListening = onPathChange(onHash);
    return () => {
      stopIntercepting();
      stopListening();
    };
  }, []);

  // Create the Fabric desk when the Work page shows it.
  useEffect(() => {
    const host = hostRef.current;
    if (!onDeskPage || view !== 'desk' || !host) return;
    let desk: DeskApi | null = null;
    let cancelled = false;
    // Wait for the web font so Fabric measures card text with the right metrics.
    const fontsReady = document.fonts
      ? Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 16px Inter`))).catch(() => undefined)
      : Promise.resolve();
    deskReady.current = fontsReady.then(() => {
      if (cancelled || !measureRef.current) return;
      // Each desk card is drawn from its slide's real layout, measured off-screen.
      const layouts = measureLayouts(measureRef.current);
      desk = createDesk(host, layouts, {
        onOpen: (id) => {
          pushedFromHome.current = true;
          navigate(`/work/${id}`);
        },
        onZoom: setZoom,
      });
      deskRef.current = desk;
      setDeskVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
      seq.current++;
      // Release any sequence waiting for a slide exit that will now never play.
      exited.current?.();
      exited.current = null;
      pushedFromHome.current = false;
      desk?.dispose();
      deskRef.current = null;
      setSlide(null);
    };
  }, [view, onDeskPage]);

  /** Plays the slide's exit animation (if one is showing) and waits for it. */
  const exitSlide = useCallback(() => {
    if (!slideRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      exited.current = resolve;
      setSlide((s) => (s ? { ...s, phase: 'exit' } : s));
    });
  }, []);

  // Drive the open / switch / close animations from the URL.
  useEffect(() => {
    if (!onDeskPage) return;
    const my = ++seq.current;
    const targetId = route.name === 'work' ? route.id : null;

    void (async () => {
      const current = slideRef.current;
      if (current && current.id === targetId && current.phase !== 'exit') return;
      await exitSlide();
      if (my !== seq.current) return;
      deskRef.current?.setFocusedHidden(false);
      setSlide(null);

      if (!targetId) {
        await deskRef.current?.unfocus();
        return;
      }
      await deskReady.current;
      if (my !== seq.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      const width = Math.min(SLIDE_W, stage.clientWidth - 64);
      const desk = deskRef.current;
      const origin = desk ? await desk.focus(targetId, width) : null;
      if (my !== seq.current || (desk && !origin)) return;
      setSlide({ id: targetId, origin, phase: 'enter' });
    })();
  }, [route, onDeskPage, exitSlide, deskVersion]);

  const close = useCallback(() => {
    if (pushedFromHome.current) {
      pushedFromHome.current = false;
      window.history.back();
    } else {
      navigate('/work', { replace: true });
    }
  }, []);

  const go = useCallback((delta: number) => {
    const s = slideRef.current;
    if (!s) return;
    const i = CARDS.findIndex((c) => c.id === s.id);
    const next = CARDS[(i + delta + CARDS.length) % CARDS.length];
    navigate(`/work/${next.id}`, { replace: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!slideRef.current) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, go]);

  const openFromList = (id: string) => {
    pushedFromHome.current = true;
    navigate(`/work/${id}`);
  };

  const card = slide ? CARDS.find((c) => c.id === slide.id) : undefined;
  const focused = slide !== null || route.name === 'work';

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={to('/')}>
          <Logo />
          <strong>Ray Kao</strong>
          <span>Software Engineer</span>
        </a>
        <nav className="actions">
          {onDeskPage && (
            <button className="pill subtle" onClick={() => setView(view === 'desk' ? 'list' : 'desk')}>
              {view === 'desk' ? 'List view' : 'Canvas view'}
            </button>
          )}
          <a className={route.name === 'home' ? 'nav-link active' : 'nav-link'} href={to('/')} aria-current={route.name === 'home' ? 'page' : undefined}>
            Home
          </a>
          <a className={onDeskPage ? 'nav-link active' : 'nav-link'} href={to('/work')} aria-current={onDeskPage ? 'page' : undefined}>
            Work
          </a>
          <a
            className={route.name === 'blog' || route.name === 'post' ? 'nav-link active' : 'nav-link'}
            href={to('/blog')}
            aria-current={route.name === 'blog' || route.name === 'post' ? 'page' : undefined}
          >
            Blog
          </a>
          <a className={route.name === 'resume' ? 'nav-link active' : 'nav-link'} href={to(LINKS.resume)} aria-current={route.name === 'resume' ? 'page' : undefined}>
            Résumé
          </a>
          <ThemeToggle />
        </nav>
      </header>

      {route.name === 'home' ? (
        <Home />
      ) : route.name === 'resume' ? (
        <Resume />
      ) : route.name === 'blog' ? (
        <BlogList category={route.category} />
      ) : route.name === 'post' ? (
        <BlogPost slug={route.slug} />
      ) : (
        <div className="stage-host" ref={stageRef}>
          {view === 'desk' ? (
            <main className={focused ? 'desk focused' : 'desk'}>
              <div className="canvas-slot" ref={hostRef} />
              <div className="measure" ref={measureRef} aria-hidden="true">
                {CARDS.map((c) => (
                  <DeckContent key={c.id} card={c} measureId={c.id} />
                ))}
              </div>
              <div className="hint">Click a card to open it · drag cards around · scroll to pan · pinch or ⌘/Ctrl + scroll to zoom</div>
              <div className="toolbar">
                <button onClick={() => deskRef.current?.zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => deskRef.current?.zoomBy(1.2)} aria-label="Zoom in">+</button>
                <button onClick={() => deskRef.current?.fit()}>Fit</button>
                <button onClick={() => deskRef.current?.tidy()}>Tidy up</button>
              </div>
            </main>
          ) : (
            <main className="list">
              {CARDS.map((c) => (
                <button
                  key={c.id}
                  className={c.featured ? 'list-card featured' : 'list-card'}
                  style={{ borderTopColor: c.color }}
                  onClick={() => openFromList(c.id)}
                >
                  <span className="kicker" style={{ color: c.color }}>{c.kicker}</span>
                  <span className="title">{c.title}</span>
                  <span className="subtitle">{c.subtitle}</span>
                  {c.featured && c.blurb && <span className="blurb">{c.blurb}</span>}
                  <span className="metric" style={{ color: c.color }}>{c.metric}</span>
                </button>
              ))}
            </main>
          )}

          {focused && view === 'list' && <div className="stage-backdrop" onClick={close} />}
          {slide && card && (
            <Slide
              key={slide.id}
              card={card}
              index={CARDS.indexOf(card)}
              total={CARDS.length}
              origin={slide.origin}
              phase={slide.phase}
              onCoverCard={(covered) => deskRef.current?.setFocusedHidden(covered)}
              onEntered={() => setSlide((s) => (s && s.id === card.id && s.phase === 'enter' ? { ...s, phase: 'open' } : s))}
              onExited={() => {
                exited.current?.();
                exited.current = null;
              }}
              onClose={close}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
            />
          )}
        </div>
      )}
    </div>
  );
}
