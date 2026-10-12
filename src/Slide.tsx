import { useLayoutEffect, useRef } from 'react';
import type { Card } from './content';
import { LINKS } from './content';
import type { Rect2D } from './desk';
import { DeckContent, SLIDE_W } from './DeckContent';

export type SlidePhase = 'enter' | 'open' | 'exit';

const FADE_MS = 180; // cross-fade between the canvas card and the slide
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = {
  card: Card;
  index: number;
  total: number;
  /** The zoomed card's on-screen rect. The slide sits exactly on it. Null (list view) = plain fade. */
  origin: Rect2D | null;
  phase: SlidePhase;
  /** Hides (true) or shows (false) the canvas card underneath. */
  onCoverCard: (covered: boolean) => void;
  onEntered: () => void;
  onExited: () => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

/** Waits until a smooth scroll back to the top has finished (or gives up after a short while). */
function scrollToTop(el: HTMLElement) {
  if (el.scrollTop < 1) return Promise.resolve();
  el.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (el.scrollTop < 1 || performance.now() - start > 600) {
        el.scrollTop = 0;
        resolve();
      } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * The opened card. On the desk it is laid over the zoomed card at exactly the same box (the card is
 * drawn from this same layout), so opening is only a cross-fade: no resizing, no stretching.
 * Every hand-off waits for the fade animation to actually finish, never on a timer.
 */
export function Slide({ card, index, total, origin, phase, onCoverCard, onEntered, onExited, onClose, onPrev, onNext }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;
    let alive = true;
    const duration = reducedMotion() ? 0 : FADE_MS;

    const run = async () => {
      if (phase === 'enter') {
        // The canvas card is still fully visible underneath, so there is never an empty frame.
        const keyframes = origin
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }];
        await layer.animate(keyframes, { duration: origin ? duration : duration * 1.6, easing: 'ease-out', fill: 'both' }).finished;
        if (!alive) return;
        onCoverCard(true); // only now is the slide fully opaque over the card
        stage.focus({ preventScroll: true });
        onEntered();
      } else if (phase === 'exit') {
        await scrollToTop(stage);
        if (!alive) return;
        onCoverCard(false); // card back underneath before the slide starts fading
        const keyframes = origin
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px)' }];
        await layer.animate(keyframes, { duration, easing: 'ease-in', fill: 'both' }).finished;
        if (!alive) return;
        onExited();
      }
    };
    void run().catch(() => undefined); // an animation cancelled by unmount rejects; nothing to do
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const controls = (
    <div className="slide-controls">
      <button className="slide-back" onClick={onClose}>← Back to the desk</button>
      <div className="slide-nav">
        <button onClick={onPrev} aria-label="Previous">‹</button>
        <span>{index + 1} / {total}</span>
        <button onClick={onNext} aria-label="Next">›</button>
      </div>
    </div>
  );

  if (origin) {
    const zoom = origin.width / SLIDE_W;
    return (
      <>
      <div
        className="stage deck"
        ref={stageRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          ref={layerRef}
          className="deck-layer"
          style={{ opacity: 0, paddingLeft: origin.left, paddingTop: origin.top }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div style={{ zoom }}>
            <DeckContent card={card} />
          </div>
          <p className="slide-keys">← → to flip through · Esc to go back</p>
        </div>
      </div>
      {controls}
      </>
    );
  }

  // List view (narrow screens): a regular page-sized slide that fades in.
  return (
    <div className="stage page" ref={stageRef} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <article ref={layerRef} className="slide" role="dialog" aria-modal="true" aria-label={card.title} style={{ opacity: 0 }}>
        <div className="slide-body">
          {controls}
          <span className="kicker" style={{ color: card.color }}>{card.kicker}</span>
          <h2>{card.title}</h2>
          <p className="lead">{card.detail.lead}</p>
          <ul>
            {card.detail.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="tags">
            {card.detail.tags.map((t) => (
              <span key={t} style={{ borderColor: card.color, color: card.color }}>{t}</span>
            ))}
          </div>
          {card.links && (
            <div className="links">
              {card.links.map((l) => (
                <a key={l.href} href={l.href} {...(l.href.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer' })}>
                  {l.label} →
                </a>
              ))}
            </div>
          )}
          {card.id === 'about' && (
            <div className="links">
              <a href={LINKS.email}>Email</a>
              <a href={LINKS.github} target="_blank" rel="noreferrer">GitHub</a>
              <a href={LINKS.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
