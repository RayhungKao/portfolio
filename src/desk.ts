import {
  Canvas,
  FabricObject,
  FabricText,
  Group,
  Point,
  Rect,
  Shadow,
  type TMat2D,
  type TPointerEvent,
} from 'fabric';
import { CARDS, type Card } from './content';
import { CARD_RADIUS, CARD_W, FEATURED_W, cardScale, cardWidth, type CardLayout } from './DeckContent';

const SNAP_PX = 8; // snapping distance in screen pixels
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const STORAGE_KEY = 'canvas-desk-layout-v3'; // bumped when card sizes or default positions change
const COL_GAP = 56;
const ROW_GAP = 44;
/** Gap between the top of the screen and a focused card, leaving room for the slide controls. */
const FOCUS_TOP = 60;

type Saved = Record<string, { left: number; top: number; angle: number; scaleX: number; scaleY: number }>;
type Guide = { x1: number; y1: number; x2: number; y2: number };

export type Rect2D = { left: number; top: number; width: number; height: number };

export type DeskApi = {
  fit: () => void;
  tidy: () => void;
  zoomBy: (factor: number) => void;
  /** Flies the camera to a card, straightens it, and resolves with its on-screen rect (relative to the host). */
  focus: (id: string, screenWidth: number) => Promise<Rect2D | null>;
  /** Flies the camera back to where it was before the first focus. */
  unfocus: () => Promise<void>;
  /** Hides the focused card while the slide covers it, so its edges never peek out. */
  setFocusedHidden: (hidden: boolean) => void;
  dispose: () => void;
};

const FLY_MS = 700;
const DIM = 0.18;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// ---------- readable label colors ----------
type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
};
const luminance = ([r, g, b]: RGB) => {
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Keeps the card's hue but mixes it toward white (dark page) or black (light page) until it reads at 4.5:1. */
function readableOn(color: string, background: string): string {
  const fg = hexToRgb(color);
  const bg = hexToRgb(background);
  const target: RGB = luminance(bg) < 0.2 ? [255, 255, 255] : [0, 0, 0];
  for (let t = 0; t <= 1; t += 0.05) {
    const mix = fg.map((c, i) => Math.round(c + (target[i] - c) * t)) as RGB;
    if (contrast(mix, bg) >= 4.5) return `rgb(${mix.join(',')})`;
  }
  return `rgb(${target.join(',')})`;
}

/** Places an object so that its top-left corner sits at (x, y). Fabric 7 positions objects by their center. */
function placeTopLeft(obj: FabricObject, x: number, y: number) {
  obj.set({ left: x + obj.width / 2, top: y + obj.height / 2 });
}

/**
 * Draws a card as a scaled-down copy of its slide layout (measured from the DOM), so zooming in
 * on the card lands exactly on the slide: same box, same positions, same proportions.
 */
function buildCard(card: Card, layout: CardLayout): Group {
  const k = cardScale(card);
  const W = cardWidth(card);
  const H = layout.height * k;
  const parts: FabricObject[] = [];

  const bg = new Rect({
    width: W,
    height: H,
    rx: CARD_RADIUS,
    ry: CARD_RADIUS,
    fill: '#ffffff',
    shadow: new Shadow({ color: 'rgba(17, 24, 39, 0.10)', blur: 24, offsetY: 8 }),
  });
  placeTopLeft(bg, 0, 0);
  parts.push(bg);

  for (const it of layout.items) {
    if (it.kind === 'rect') {
      const r = new Rect({ width: it.w * k, height: it.h * k, rx: it.radius * k, ry: it.radius * k, fill: it.color });
      placeTopLeft(r, it.x * k, it.y * k);
      parts.push(r);
    } else if (it.kind === 'pill') {
      const r = new Rect({
        width: it.w * k,
        height: it.h * k,
        rx: (it.h * k) / 2,
        ry: (it.h * k) / 2,
        fill: 'transparent',
        stroke: it.color,
        strokeWidth: it.borderWidth * k,
      });
      placeTopLeft(r, it.x * k, it.y * k);
      const t = new FabricText(it.text, { fontFamily: FONT, fontSize: it.fontSize * k, fontWeight: it.fontWeight, fill: it.color });
      placeTopLeft(t, (it.x + it.padX) * k, it.y * k + (it.h * k - t.height) / 2);
      parts.push(r, t);
    } else {
      // One text object per rendered line, so the canvas breaks lines exactly where the browser did.
      for (const line of it.lines) {
        const t = new FabricText(line.text, {
          fontFamily: FONT,
          fontSize: it.fontSize * k,
          fontWeight: it.fontWeight,
          fill: it.color,
          charSpacing: it.fontSize ? (it.letterSpacing / it.fontSize) * 1000 : 0,
          underline: it.underline,
        });
        // Center Fabric's text box on the browser's glyph box for that line.
        placeTopLeft(t, line.x * k, (line.y + line.h / 2) * k - t.height / 2);
        parts.push(t);
      }
    }
  }

  const group = new Group(parts, {
    left: 0,
    top: 0,
    angle: card.angle ?? 0,
    hoverCursor: 'grab',
    moveCursor: 'grabbing',
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    cornerStrokeColor: card.color,
    borderColor: card.color,
    transparentCorners: false,
    cornerSize: 10,
    padding: 6,
  });
  // Side handles would stretch the card; keep corners (uniform scale) and rotation.
  group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
  return group;
}

/** Default positions: About in the middle column first, then a masonry of the rest by height. */
function defaultPositions(cards: Card[], heights: Map<string, number>) {
  const side = FEATURED_W / 2 + COL_GAP + CARD_W / 2; // centre of the side columns
  const colX = [-side, 0, side];
  const bottoms = [0, 0, 0];
  const pos = new Map<string, { x: number; y: number }>();
  const ordered = [...cards.filter((c) => c.featured), ...cards.filter((c) => !c.featured)];
  for (const c of ordered) {
    const h = heights.get(c.id) ?? 200;
    const col = c.featured ? 1 : bottoms.indexOf(Math.min(...bottoms));
    pos.set(c.id, { x: colX[col], y: bottoms[col] + h / 2 });
    bottoms[col] += h + ROW_GAP;
  }
  const midY = (Math.max(...bottoms) - ROW_GAP) / 2;
  for (const p of pos.values()) p.y -= midY;
  return pos;
}

function loadSaved(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

function save(data: Saved) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the desk still works.
  }
}

function clientPoint(e: TPointerEvent): { x: number; y: number } {
  if ('touches' in e) {
    const t = e.touches[0] ?? e.changedTouches[0];
    return { x: t.clientX, y: t.clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

export function createDesk(
  host: HTMLElement,
  layouts: Map<string, CardLayout>,
  handlers: { onOpen: (id: string) => void; onZoom: (zoom: number) => void },
): DeskApi {
  // Fabric wraps and moves the <canvas> element, so it is created here instead of by React.
  const el = document.createElement('canvas');
  host.prepend(el);
  const canvas = new Canvas(el, {
    width: host.clientWidth,
    height: host.clientHeight,
    selection: false,
    preserveObjectStacking: false,
    renderOnAddRemove: false,
  });

  const cardById = new Map<string, Group>();
  const idByCard = new Map<FabricObject, string>();
  const saved = loadSaved();

  const cards = CARDS.filter((c) => layouts.has(c.id));
  const defaults = defaultPositions(
    cards,
    new Map(cards.map((c) => [c.id, layouts.get(c.id)!.height * cardScale(c)])),
  );
  for (const card of cards) {
    const group = buildCard(card, layouts.get(card.id)!);
    const d = defaults.get(card.id)!;
    group.set({ left: d.x, top: d.y });
    const s = saved[card.id];
    if (s) group.set(s);
    cardById.set(card.id, group);
    idByCard.set(group, card.id);
    canvas.add(group);
  }

  // ---------- background dot grid (CSS, follows zoom/pan) ----------
  const syncGrid = () => {
    const vpt = canvas.viewportTransform;
    const size = 24 * vpt[0];
    host.style.backgroundSize = `${size}px ${size}px`;
    host.style.backgroundPosition = `${vpt[4]}px ${vpt[5]}px`;
    handlers.onZoom(canvas.getZoom());
  };

  const setView = (vpt: TMat2D) => {
    canvas.setViewportTransform(vpt);
    syncGrid();
  };

  // ---------- fit / tidy / zoom ----------
  const fit = () => {
    const boxes = [...cardById.values()].map((g) => g.getBoundingRect());
    const minX = Math.min(...boxes.map((b) => b.left));
    const minY = Math.min(...boxes.map((b) => b.top));
    const maxX = Math.max(...boxes.map((b) => b.left + b.width));
    const maxY = Math.max(...boxes.map((b) => b.top + b.height));
    const pad = 80;
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const top = 44; // room for the hint bar and the name labels above the top row
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(w / (maxX - minX + pad * 2), (h - top) / (maxY - minY + pad * 2))));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView([z, 0, 0, z, w / 2 - cx * z, top + (h - top) / 2 - cy * z]);
  };

  const tidy = () => {
    for (const card of cards) {
      const g = cardById.get(card.id)!;
      const d = defaults.get(card.id)!;
      g.set({ left: d.x, top: d.y, angle: card.angle ?? 0, scaleX: 1, scaleY: 1 });
      g.setCoords();
    }
    save({});
    canvas.discardActiveObject();
    fit();
    canvas.requestRenderAll();
  };

  const zoomBy = (factor: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, canvas.getZoom() * factor));
    canvas.zoomToPoint(new Point(canvas.getWidth() / 2, canvas.getHeight() / 2), z);
    syncGrid();
  };

  // ---------- zoom & pan with wheel / trackpad ----------
  canvas.on('mouse:wheel', (opt) => {
    const e = opt.e;
    e.preventDefault();
    e.stopPropagation();
    if (focusedId) return;
    if (e.ctrlKey || e.metaKey) {
      // Pinch on a trackpad (or Ctrl/⌘ + wheel) zooms around the pointer.
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, canvas.getZoom() * Math.exp(-e.deltaY * 0.002)));
      canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z);
      syncGrid();
    } else {
      // Two-finger scroll (or a plain wheel) pans the desk.
      const vpt = [...canvas.viewportTransform] as TMat2D;
      vpt[4] -= e.deltaX;
      vpt[5] -= e.deltaY;
      setView(vpt);
    }
  });

  // ---------- drag empty space to pan, click a card to open it ----------
  let panning = false;
  let last = { x: 0, y: 0 };
  let downAt = { x: 0, y: 0 };
  let downTarget: FabricObject | undefined;

  canvas.on('mouse:down', (opt) => {
    if (focusedId) return;
    const p = clientPoint(opt.e);
    downAt = p;
    downTarget = opt.target;
    if (!opt.target) {
      panning = true;
      last = p;
      canvas.setCursor('grabbing');
    } else {
      canvas.bringObjectToFront(opt.target);
    }
  });

  canvas.on('mouse:move', (opt) => {
    if (!panning) return;
    const p = clientPoint(opt.e);
    const vpt = [...canvas.viewportTransform] as TMat2D;
    vpt[4] += p.x - last.x;
    vpt[5] += p.y - last.y;
    last = p;
    setView(vpt);
  });

  canvas.on('mouse:up', (opt) => {
    const p = clientPoint(opt.e);
    const moved = Math.hypot(p.x - downAt.x, p.y - downAt.y);
    if (panning) {
      panning = false;
      canvas.setCursor('default');
    } else if (downTarget && opt.target === downTarget && moved < 4 && !opt.transform?.actionPerformed) {
      const id = idByCard.get(downTarget);
      if (id) handlers.onOpen(id);
    }
    downTarget = undefined;
    guides = [];
    canvas.requestRenderAll();
  });

  // ---------- name labels (constant screen size, like frame names in Figma) ----------
  let labelAlpha = 1;
  const cardOf = new Map(cards.map((c) => [c.id, c]));
  // Label colors follow the page theme; re-read only when the theme changes, not on every frame.
  const readLabelColors = () => {
    const root = getComputedStyle(document.documentElement);
    const bg = root.getPropertyValue('--bg').trim() || '#f4ede2';
    return {
      title: root.getPropertyValue('--ink-2').trim() || '#4c524f',
      kicker: new Map(CARDS.map((c) => [c.id, readableOn(c.color, bg)])),
    };
  };
  let labelColors = readLabelColors();
  /**
   * Draws one card's name label. Called right after that card renders, so the label sits in the
   * card's own layer: cards higher in the stack cover it, exactly like frame names in Figma.
   */
  const drawLabel = (ctx: CanvasRenderingContext2D, id: string, g: Group) => {
    if (labelAlpha <= 0.01) return;
    const v = canvas.viewportTransform;
    ctx.save();
    ctx.setTransform(canvas.getRetinaScaling(), 0, 0, canvas.getRetinaScaling(), 0, 0);
    ctx.globalAlpha = labelAlpha;
    ctx.textBaseline = 'bottom';
    {
      const card = cardOf.get(id)!;
      const b = g.getBoundingRect(); // scene units
      const x = b.left * v[0] + v[4];
      const y = b.top * v[0] + v[5] - 8;
      const maxW = b.width * v[0]; // never wider than the card itself
      const kicker = card.kicker.toUpperCase();
      ctx.font = `600 10.5px ${FONT}`;
      const kw = ctx.measureText(kicker).width + 8;
      ctx.font = `600 13px ${FONT}`;
      const tw = ctx.measureText(card.title).width;
      // Drop the kicker first, then shorten the title with an ellipsis.
      const showKicker = kw + tw <= maxW;
      let title = card.title;
      if (!showKicker && tw > maxW) {
        while (title.length > 1 && ctx.measureText(`${title}…`).width > maxW) title = title.slice(0, -1);
        title = `${title.trimEnd()}…`;
      }
      if (showKicker) {
        ctx.font = `600 10.5px ${FONT}`;
        ctx.fillStyle = labelColors.kicker.get(id) ?? card.color;
        ctx.fillText(kicker, x, y);
        ctx.font = `600 13px ${FONT}`;
      }
      ctx.fillStyle = labelColors.title;
      ctx.fillText(title, showKicker ? x + kw : x, y + 1);
    }
    ctx.restore();
  };
  for (const [id, g] of cardById) {
    const renderCard = g.render.bind(g);
    g.render = (ctx: CanvasRenderingContext2D) => {
      renderCard(ctx);
      // Only on the main canvas: the top canvas (selection handles) is not cleared on every frame.
      if (ctx === canvas.getContext()) drawLabel(ctx, id, g);
    };
  }

  // ---------- snapping with alignment guides ----------
  let guides: Guide[] = [];

  canvas.on('object:moving', ({ target }) => {
    const threshold = SNAP_PX / canvas.getZoom();
    const box = target.getBoundingRect();
    const xs = [box.left, box.left + box.width / 2, box.left + box.width];
    const ys = [box.top, box.top + box.height / 2, box.top + box.height];

    let bestX: { d: number; at: number; other: { top: number; height: number } } | undefined;
    let bestY: { d: number; at: number; other: { left: number; width: number } } | undefined;

    for (const other of cardById.values()) {
      if (other === target) continue;
      const o = other.getBoundingRect();
      const oxs = [o.left, o.left + o.width / 2, o.left + o.width];
      const oys = [o.top, o.top + o.height / 2, o.top + o.height];
      for (const x of xs)
        for (const ox of oxs) {
          const d = ox - x;
          if (Math.abs(d) < threshold && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, at: ox, other: o };
        }
      for (const y of ys)
        for (const oy of oys) {
          const d = oy - y;
          if (Math.abs(d) < threshold && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, at: oy, other: o };
        }
    }

    guides = [];
    if (bestX) {
      target.set({ left: target.left + bestX.d });
      guides.push({
        x1: bestX.at,
        y1: Math.min(box.top, bestX.other.top) - 24,
        x2: bestX.at,
        y2: Math.max(box.top + box.height, bestX.other.top + bestX.other.height) + 24,
      });
    }
    if (bestY) {
      target.set({ top: target.top + bestY.d });
      guides.push({
        x1: Math.min(box.left, bestY.other.left) - 24,
        y1: bestY.at,
        x2: Math.max(box.left + box.width, bestY.other.left + bestY.other.width) + 24,
        y2: bestY.at,
      });
    }
    target.setCoords();
  });

  canvas.on('after:render', ({ ctx }) => {
    if (!guides.length || ctx !== canvas.getContext()) return;
    const v = canvas.viewportTransform;
    ctx.save();
    ctx.setTransform(v[0], v[1], v[2], v[3], v[4], v[5]);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1 / canvas.getZoom();
    ctx.setLineDash([4 / canvas.getZoom(), 4 / canvas.getZoom()]);
    for (const g of guides) {
      ctx.beginPath();
      ctx.moveTo(g.x1, g.y1);
      ctx.lineTo(g.x2, g.y2);
      ctx.stroke();
    }
    ctx.restore();
  });

  // ---------- persist layout ----------
  canvas.on('object:modified', () => {
    const data: Saved = {};
    for (const [id, g] of cardById) {
      data[id] = { left: g.left, top: g.top, angle: g.angle, scaleX: g.scaleX, scaleY: g.scaleY };
    }
    save(data);
  });

  // ---------- focus: fly the camera to a card, like a slide ----------
  let focusedId: string | null = null;
  let homeView: TMat2D | null = null;
  const restingAngle = new Map<string, number>();
  let frame = 0;
  let finishTween: (() => void) | null = null;

  const tween = (ms: number, step: (t: number) => void) =>
    new Promise<void>((resolve) => {
      cancelAnimationFrame(frame);
      finishTween?.();
      const duration = reducedMotion() ? 0 : ms;
      const start = performance.now();
      finishTween = resolve;
      const tick = (now: number) => {
        const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
        step(easeInOut(t));
        canvas.requestRenderAll();
        if (t < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          syncGrid();
          finishTween = null;
          resolve();
        }
      };
      frame = requestAnimationFrame(tick);
    });

  const viewFor = (z: number, cx: number, cy: number): TMat2D => [
    z, 0, 0, z, canvas.getWidth() / 2 - cx * z, canvas.getHeight() / 2 - cy * z,
  ];

  /** Camera as (zoom, scene point at the screen center). */
  const cameraOf = (v: TMat2D) => {
    const z = v[0];
    return { z, cx: (canvas.getWidth() / 2 - v[4]) / z, cy: (canvas.getHeight() / 2 - v[5]) / z };
  };

  const flyTo = (to: TMat2D, onStep?: (t: number) => void, arc = false) => {
    const a = cameraOf([...canvas.viewportTransform] as TMat2D);
    const b = cameraOf(to);
    // Card-to-card flights pull back mid-way, so you see where you are going on the desk.
    const dip = arc ? Math.log(0.25) : 0;
    return tween(arc ? FLY_MS * 1.25 : FLY_MS, (t) => {
      // Interpolate zoom on a log scale so zooming in and out feel equally fast.
      const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), t) + dip * Math.sin(Math.PI * t));
      canvas.setViewportTransform(viewFor(z, lerp(a.cx, b.cx, t), lerp(a.cy, b.cy, t)));
      onStep?.(t);
      syncGrid();
    });
  };

  /** Always fit the card's width to the slide width; put its top edge near the top of the screen. */
  const focusView = (g: Group, screenWidth: number): TMat2D => {
    const w = g.width * g.scaleX;
    const h = g.height * g.scaleY;
    const z = screenWidth / w;
    const c = g.getCenterPoint();
    return [z, 0, 0, z, canvas.getWidth() / 2 - c.x * z, FOCUS_TOP + (h * z) / 2 - c.y * z];
  };

  const screenRectOf = (g: Group): Rect2D => {
    const v = canvas.viewportTransform;
    const w = g.width * g.scaleX * v[0];
    const h = g.height * g.scaleY * v[0];
    const c = g.getCenterPoint();
    return { left: c.x * v[0] + v[4] - w / 2, top: c.y * v[0] + v[5] - h / 2, width: w, height: h };
  };

  const focus = async (id: string, screenWidth: number) => {
    const g = cardById.get(id);
    if (!g) return null;
    if (!focusedId) {
      homeView = [...canvas.viewportTransform] as TMat2D;
      canvas.discardActiveObject();
      canvas.skipTargetFind = true;
    }
    const prev = focusedId ? cardById.get(focusedId) : undefined;
    const prevId = focusedId;
    focusedId = id;
    if (!restingAngle.has(id)) restingAngle.set(id, g.angle);
    canvas.bringObjectToFront(g);

    const startAngle = g.angle;
    const prevStart = prev?.angle ?? 0;
    const prevRest = prevId ? (restingAngle.get(prevId) ?? 0) : 0;
    const fades = [...cardById.values()].map((o) => ({ o, from: o.opacity, to: o === g ? 1 : DIM }));
    const labelFrom = labelAlpha;

    await flyTo(focusView(g, screenWidth), (t) => {
      labelAlpha = lerp(labelFrom, 0, Math.min(1, t * 3));
      g.set({ angle: lerp(startAngle, 0, t) });
      if (prev && prev !== g) prev.set({ angle: lerp(prevStart, prevRest, t) });
      for (const f of fades) f.o.set({ opacity: lerp(f.from, f.to, t) });
    }, Boolean(prevId && prevId !== id));
    if (prevId && prevId !== id) restingAngle.delete(prevId);
    if (focusedId !== id) return null; // superseded by a newer focus
    g.setCoords();
    return screenRectOf(g);
  };

  const unfocus = async () => {
    if (!focusedId || !homeView) return;
    const id = focusedId;
    const g = cardById.get(id)!;
    const startAngle = g.angle;
    const rest = restingAngle.get(id) ?? 0;
    const fades = [...cardById.values()].map((o) => ({ o, from: o.opacity }));
    const labelFrom = labelAlpha;
    await flyTo(homeView, (t) => {
      labelAlpha = lerp(labelFrom, 1, t);
      g.set({ angle: lerp(startAngle, rest, t) });
      for (const f of fades) f.o.set({ opacity: lerp(f.from, 1, t) });
    });
    if (focusedId !== id) return;
    restingAngle.delete(id);
    for (const o of cardById.values()) o.setCoords();
    focusedId = null;
    homeView = null;
    canvas.skipTargetFind = false;
  };

  // ---------- resize ----------
  const repaint = () => {
    labelColors = readLabelColors();
    canvas.requestRenderAll();
  };
  window.addEventListener('themechange', repaint);

  let lastScreenWidth = 0;
  const ro = new ResizeObserver(() => {
    canvas.setDimensions({ width: host.clientWidth, height: host.clientHeight });
    if (focusedId && lastScreenWidth) {
      const g = cardById.get(focusedId)!;
      canvas.setViewportTransform(focusView(g, Math.min(lastScreenWidth, host.clientWidth - 64)));
    }
    syncGrid();
  });
  ro.observe(host);

  fit();
  canvas.requestRenderAll();

  return {
    fit,
    tidy,
    zoomBy,
    focus: (id, screenWidth) => {
      lastScreenWidth = screenWidth;
      return focus(id, screenWidth);
    },
    unfocus,
    setFocusedHidden: (hidden) => {
      const g = focusedId ? cardById.get(focusedId) : undefined;
      if (!g) return;
      g.set({ opacity: hidden ? 0 : 1 });
      canvas.requestRenderAll();
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      finishTween?.();
      window.removeEventListener('themechange', repaint);
      ro.disconnect();
      void canvas.dispose().then(() => host.replaceChildren());
    },
  };
}
