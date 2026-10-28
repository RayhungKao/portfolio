'use client';

import { useState, type KeyboardEvent } from 'react';
import type { Card, TalkSlide } from './content';

function Body({ s }: { s: TalkSlide }) {
  if (!s.items) return null;
  return (
    <div className={`talk-items ${s.layout ?? 'cards'}${s.warn ? ' warn' : ''}`}>
      {s.items.map((it) => (
        <div key={it.title} className={it.accent ? 'talk-item accent' : 'talk-item'}>
          {it.n && <span className="talk-n">{it.n}</span>}
          <div>
            <h4>{it.title}</h4>
            {it.body && <p>{it.body}</p>}
            {it.points && (
              <ul>
                {it.points.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The card's talk, flipped with the buttons or ← → while focused. Every slide is rendered into the
 * same grid cell, so the deck is as tall as its tallest slide and flipping never changes its height.
 */
export function Talk({ card, slides }: { card: Card; slides: TalkSlide[] }) {
  const [i, setI] = useState(0);
  const n = slides.length;
  const flip = (d: number) => setI((v) => Math.min(n - 1, Math.max(0, v + d)));

  // Inside the talk the arrows flip slides; stopping here keeps the window handler from switching cards.
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.stopPropagation();
    flip(e.key === 'ArrowRight' ? 1 : -1);
  };

  return (
    <section className="talk" tabIndex={0} onKeyDown={onKey} aria-roledescription="carousel" aria-label={`${card.title} talk`}>
      <p className="talk-label">Walkthrough · {n} slides</p>
      <div className="talk-deck">
        {slides.map((s, j) => (
          <div key={s.title} className={`talk-slide${s.layout === 'cover' ? ' cover' : ''}${j === i ? ' on' : ''}`}>
            <div className="talk-head">
              <span className="talk-eyebrow">{s.eyebrow}</span>
              <h3>{s.title}</h3>
            </div>
            <Body s={s} />
            {s.callout && (
              <div className="talk-callout">
                <h4>{s.callout.title}</h4>
                <p>{s.callout.body}</p>
              </div>
            )}
            {s.note && <p className="talk-note">{s.note}</p>}
          </div>
        ))}
      </div>
      <div className="talk-nav">
        <button onClick={() => flip(-1)} disabled={i === 0} aria-label="Previous slide">‹</button>
        <span aria-live="polite">{i + 1} / {n}</span>
        <button onClick={() => flip(1)} disabled={i === n - 1} aria-label="Next slide">›</button>
      </div>
    </section>
  );
}
