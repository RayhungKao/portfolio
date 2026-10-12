import type { CSSProperties } from 'react';
import { LINKS, type Card } from './content';
import { isInternal, to } from './router';

/** Layout width of every slide. Desk cards are this layout drawn at cardWidth / SLIDE_W. */
export const SLIDE_W = 880;
export const CARD_W = 280;
export const FEATURED_W = 440;
/** Corner radius of a card on the desk, in desk units. */
export const CARD_RADIUS = 10;

export const cardWidth = (card: Card) => (card.featured ? FEATURED_W : CARD_W);
/** Scale from slide layout to desk card. */
export const cardScale = (card: Card) => cardWidth(card) / SLIDE_W;

/**
 * Header sizes in slide px, the same for every card. The desk card is this layout scaled down, so
 * its header is small too; the desk shows each card's name in a separate label for the overview.
 */
const HEADER = { kicker: 14, title: 44, subtitle: 22, blurb: 22, metric: 20, gapKicker: 12, gapTitle: 8, gapSub: 16, gapBlurb: 16 };
/** Padding in desk units, so card padding stays 20 (30 for the featured card) on the desk. */
const padOf = (card: Card) => (card.featured ? 30 : 20);

/**
 * The full content of one card, laid out at SLIDE_W. Used three ways: as the opened slide, hidden
 * off-screen for measuring, and (via those measurements) as the source the desk card is drawn from.
 * Elements marked with data-l are the ones the desk card reproduces.
 */
export function DeckContent({ card, measureId }: { card: Card; measureId?: string }) {
  const k = cardScale(card);
  const pad = padOf(card) / k;
  const style: CSSProperties = {
    width: SLIDE_W,
    padding: `${pad}px`,
    borderRadius: CARD_RADIUS / k,
  };

  return (
    <article className="deck-slide" style={style} data-measure={measureId}>
      <span
        data-l="rect"
        className="deck-accent"
        style={{ width: 72, height: 6, top: pad + 8, right: pad, borderRadius: 3, background: card.color }}
      />
      <span data-l="text" className="deck-kicker" style={{ fontSize: HEADER.kicker, color: card.color }}>
        {card.kicker}
      </span>
      <h2 data-l="text" className="deck-title" style={{ fontSize: HEADER.title, marginTop: HEADER.gapKicker }}>
        {card.title}
      </h2>
      <p data-l="text" className="deck-subtitle" style={{ fontSize: HEADER.subtitle, marginTop: HEADER.gapTitle }}>
        {card.subtitle}
      </p>
      {card.featured && card.blurb && (
        <p data-l="text" className="deck-blurb" style={{ fontSize: HEADER.blurb, marginTop: HEADER.gapSub }}>
          {card.blurb}
        </p>
      )}
      <p
        data-l="text"
        className="deck-metric"
        style={{ fontSize: HEADER.metric, color: card.color, marginTop: card.featured ? HEADER.gapBlurb : HEADER.gapSub }}
      >
        {card.metric}
      </p>

      <div className="deck-details">
        <span data-l="rect" className="deck-rule" />
        <p data-l="text" className="deck-lead">{card.detail.lead}</p>
        <ul className="deck-points">
          {card.detail.points.map((p) => (
            <li key={p}>
              <span data-l="text" className="deck-bullet">•</span>
              <span data-l="text" className="deck-point">{p}</span>
            </li>
          ))}
        </ul>
        <div className="deck-tags">
          {card.detail.tags.map((t) => (
            <span key={t} data-l="pill" className="deck-tag" style={{ borderColor: card.color, color: card.color }}>
              {t}
            </span>
          ))}
        </div>
        {(card.links || card.id === 'about') && (
          <div className="deck-links">
            {card.links?.map((l) => (
              <a
                key={l.href}
                data-l="text"
                href={to(l.href)}
                {...(isInternal(l.href) ? {} : { target: '_blank', rel: 'noreferrer' })}
              >
                {l.label} →
              </a>
            ))}
            {card.id === 'about' && (
              <>
                <a data-l="text" href={LINKS.email}>Email</a>
                <a data-l="text" href={LINKS.github} target="_blank" rel="noreferrer">GitHub</a>
                <a data-l="text" href={LINKS.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export type LayoutItem =
  | {
      kind: 'text';
      /** Lines exactly as the browser wrapped them, each with its own glyph box. */
      lines: { text: string; x: number; y: number; h: number }[];
      fontSize: number;
      fontWeight: string;
      color: string;
      letterSpacing: number; // px
      underline: boolean;
    }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; color: string; radius: number }
  | {
      kind: 'pill';
      text: string;
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      borderWidth: number;
      fontSize: number;
      fontWeight: string;
      padX: number;
    };

export type CardLayout = { width: number; height: number; items: LayoutItem[] };

const px = (v: string) => parseFloat(v) || 0;

/** Splits an element's text into the lines the browser actually rendered. */
function renderedLines(el: HTMLElement, base: DOMRect, upper: boolean) {
  const lines: { text: string; x: number; y: number; h: number }[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let cur: { text: string; x: number; y: number; h: number } | null = null;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const s = node.data;
    for (let i = 0; i < s.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      if (!r) continue;
      const y = r.top - base.top;
      if (!cur || Math.abs(y - cur.y) > r.height / 2) {
        if (cur) lines.push(cur);
        if (s[i] === ' ') { cur = null; continue; }
        cur = { text: '', x: r.left - base.left, y, h: r.height };
      }
      cur.text += s[i];
    }
  }
  if (cur) lines.push(cur);
  return lines
    .map((l) => ({ ...l, text: (upper ? l.text.toUpperCase() : l.text).trimEnd() }))
    .filter((l) => l.text.length > 0);
}

/** Reads the off-screen slide layouts so the desk can draw each card as a scaled copy. */
export function measureLayouts(root: HTMLElement): Map<string, CardLayout> {
  const out = new Map<string, CardLayout>();
  root.querySelectorAll<HTMLElement>('[data-measure]').forEach((slide) => {
    const base = slide.getBoundingClientRect();
    const items: LayoutItem[] = [];
    slide.querySelectorAll<HTMLElement>('[data-l]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const x = r.left - base.left;
      const y = r.top - base.top;
      const kind = el.dataset.l;
      if (kind === 'rect') {
        items.push({ kind: 'rect', x, y, w: r.width, h: r.height, color: cs.backgroundColor, radius: px(cs.borderTopLeftRadius) });
      } else if (kind === 'pill') {
        items.push({
          kind: 'pill',
          text: el.textContent ?? '',
          x,
          y,
          w: r.width,
          h: r.height,
          color: cs.color,
          borderWidth: px(cs.borderTopWidth),
          fontSize: px(cs.fontSize),
          fontWeight: cs.fontWeight,
          padX: px(cs.paddingLeft),
        });
      } else {
        items.push({
          kind: 'text',
          lines: renderedLines(el, base, cs.textTransform === 'uppercase'),
          fontSize: px(cs.fontSize),
          fontWeight: cs.fontWeight,
          color: cs.color,
          letterSpacing: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing),
          underline: cs.textDecorationLine.includes('underline'),
        });
      }
    });
    out.set(slide.dataset.measure!, { width: base.width, height: base.height, items });
  });
  return out;
}
