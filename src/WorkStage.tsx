'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createDesk, type DeskApi, type Rect2D } from './desk';
import { CARDS } from './content';
import { navigate } from './router';
import { Slide, type SlidePhase } from './Slide';
import { DeckContent, SLIDE_W, measureLayouts } from './DeckContent';
import { useWorkView } from './WorkViewContext';
import { ViewSwitch } from './ViewSwitch';

type SlideState = { id: string; origin: Rect2D | null; phase: SlidePhase };

/** '/work' shows the desk; '/work/<id>' also opens that card. An unknown id shows the desk. */
function cardIdFrom(pathname: string): string | null {
  const m = pathname.replace(/\/+$/, '').match(/^\/work\/([^/]+)$/);
  const id = m ? decodeURIComponent(m[1]) : null;
  return id && CARDS.some((c) => c.id === id) ? id : null;
}

/**
 * The Work page: the Fabric canvas with every card, and the slide that opens over it.
 * It lives in the /work layout, so moving between /work and /work/<id> keeps the same canvas
 * and only the open/close animations run.
 */
export default function WorkStage() {
  const pathname = usePathname();
  const targetId = cardIdFrom(pathname);
  const { view } = useWorkView();
  const [zoom, setZoom] = useState(1);
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

  // Create the Fabric desk when the canvas view is showing.
  useEffect(() => {
    const host = hostRef.current;
    if (view !== 'desk' || !host) return;
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
  }, [view]);

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
    const my = ++seq.current;

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
  }, [targetId, exitSlide, deskVersion]);

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
  const focused = slide !== null || targetId !== null;

  return (
    <div className="stage-host" ref={stageRef}>
      {/* One switch for both views, so it never moves when you toggle. */}
      <ViewSwitch hidden={focused} />
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
  );
}
