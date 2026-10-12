import { useEffect, useMemo, useRef, useState } from 'react';
import { CARDS, LINKS } from './content';
import { POSTS, formatDate } from './postData';
import { asset, isInternal, navigate, to } from './router';
import { SocialLinks } from './SocialLinks';

/**
 * Shortcuts behind the home prompt box. It is a navigator, not a chatbot: typing filters these,
 * Enter opens the first match.
 */
const SUGGESTIONS = [
  { label: 'How I built the AI Agent', href: '/work/ai-agent', keywords: 'ai agent chat sse streaming llm assistant' },
  { label: 'Cutting load time by 95%', href: '/work/performance', keywords: 'performance video history speed load fast' },
  { label: 'Tripbook, my startup', href: '/work/tripbook', keywords: 'tripbook startup rails ruby postgres redis full-stack backend' },
  { label: 'Read the blog', href: '/blog', keywords: 'blog writing posts articles notes' },
  { label: 'Payments and subscriptions', href: '/work/payments', keywords: 'stripe payment paypal subscription billing checkout' },
  { label: 'Research: verifiable accounting', href: '/work/research', keywords: 'research blockchain ieee paper cryptography accounting' },
  { label: 'Canvas interactions', href: '/work/canvas', keywords: 'canvas fabric drag zoom snapping editor' },
  { label: 'Résumé', href: LINKS.resume, keywords: 'resume cv experience' },
];
const DEFAULT_COUNT = 4;
const SELECTED = ['ai-agent', 'performance', 'tripbook'];

function go(href: string) {
  if (isInternal(href)) navigate(href);
  else window.open(href, '_blank', 'noopener');
}

function AskBox() {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return SUGGESTIONS.slice(0, DEFAULT_COUNT);
    return SUGGESTIONS.filter((s) => terms.every((t) => `${s.label} ${s.keywords}`.toLowerCase().includes(t)));
  }, [q]);

  const submit = () => {
    if (matches[0]) go(matches[0].href);
    else inputRef.current?.focus();
  };

  return (
    <div className="ask">
      <form
        className="ask-box"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="ask-input" className="visually-hidden">Ask about my work</label>
        <input
          id="ask-input"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about my work, like “AI agent” or “performance”"
          autoComplete="off"
        />
        <button type="submit" aria-label="Go" disabled={q.trim() !== '' && matches.length === 0}>↑</button>
      </form>
      <ul className="ask-chips" aria-live="polite">
        {matches.length ? (
          matches.map((s) => (
            <li key={s.href}>
              <a href={to(s.href)} {...(isInternal(s.href) ? {} : { target: '_blank', rel: 'noreferrer' })}>{s.label}</a>
            </li>
          ))
        ) : (
          <li className="ask-empty">Nothing matches yet. Try “backend”, “startup”, or “blog”.</li>
        )}
      </ul>
    </div>
  );
}

/**
 * The photo turns into the illustrated avatar on hover (or tap on touch screens).
 * The photo is preloaded from index.html on the home page and fades in once fully downloaded, over a
 * shimmer placeholder. The illustration is fetched only after the photo (when the browser is idle) or
 * on the first hover, so it never competes with the photo for bandwidth.
 */
function Avatar() {
  const [drawn, setDrawn] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const [wantAlt, setWantAlt] = useState(false);
  const [altReady, setAltReady] = useState(false);
  const photoRef = useRef<HTMLImageElement>(null);

  // A cached photo can finish before React attaches onLoad.
  useEffect(() => {
    const img = photoRef.current;
    if (img?.complete && img.naturalWidth > 0) setPhotoReady(true);
  }, []);

  useEffect(() => {
    if (!photoReady) return;
    // Safari has no requestIdleCallback; a short timeout does the same job there.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setWantAlt(true));
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setWantAlt(true), 300);
    return () => clearTimeout(id);
  }, [photoReady]);

  const show = (on: boolean) => {
    if (on) setWantAlt(true);
    setDrawn(on);
  };

  return (
    <button
      type="button"
      className={drawn && altReady ? 'avatar drawn' : 'avatar'}
      onMouseEnter={() => show(true)}
      onMouseLeave={() => show(false)}
      onClick={() => show(!drawn)}
      aria-pressed={drawn}
      aria-label="Photo of Ray Kao. Press to switch to the illustrated version."
    >
      <span className="avatar-plate" aria-hidden="true" />
      <span className={photoReady ? 'avatar-frame ready' : 'avatar-frame'}>
        <picture>
          <source type="image/webp" srcSet={asset('avatar-photo.webp')} />
          <img
            ref={photoRef}
            className="avatar-photo"
            src={asset('avatar-photo.jpg')}
            alt=""
            width={360}
            height={360}
            fetchPriority="high"
            onLoad={() => setPhotoReady(true)}
          />
        </picture>
        {wantAlt && (
          <picture>
            <source type="image/webp" srcSet={asset('avatar-illustration.webp')} />
            <img
              className="avatar-alt"
              src={asset('avatar-illustration.jpg')}
              alt=""
              width={360}
              height={360}
              decoding="async"
              onLoad={() => setAltReady(true)}
            />
          </picture>
        )}
      </span>
    </button>
  );
}

export function Home() {
  const work = SELECTED.map((id) => CARDS.find((c) => c.id === id)!).filter(Boolean);
  const latest = POSTS.slice(0, 3);

  return (
    <main className="home">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Software engineer · Taipei</span>
          <h1>
            Hello, I’m <span className="accent">Ray</span>.
          </h1>
          <p className="tagline">From rendering performance to the backend boundary.</p>
          <p className="lede">
            Core developer on{' '}
            <a className="ext" href={LINKS.yco} target="_blank" rel="noreferrer"><strong>YouCam Online Editor</strong></a> at{' '}
            <a className="ext" href={LINKS.perfectCorp} target="_blank" rel="noreferrer">Perfect Corp</a>, an AI photo and video editor that grew
            from about 10 tools to 80+. I build <strong>streaming AI interfaces</strong>, <strong>asynchronous task systems</strong>,
            and the data layers beneath them.
          </p>
          <AskBox />
          <div className="hero-links">
            <a href={to('/work')}>Explore the interactive canvas →</a>
            <SocialLinks />
          </div>
        </div>
        <Avatar />
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>Selected work</h2>
          <a href={to('/work')}>See everything on the canvas →</a>
        </div>
        <ul className="work-list">
          {work.map((c) => (
            <li key={c.id}>
              <a href={to(`/work/${c.id}`)}>
                <span className="work-kicker">{c.kicker}</span>
                <span className="work-title">{c.title}</span>
                <span className="work-sub">{c.subtitle}</span>
                <span className="work-metric">{c.metric}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>Latest writing</h2>
          <a href={to('/blog')}>All articles →</a>
        </div>
        <ul className="latest-list">
          {latest.map((p) => (
            <li key={p.slug}>
              <a href={to(`/blog/${p.slug}`)}>
                <span className="latest-meta">
                  {p.category} · {formatDate(p.date)} · {p.readingMinutes} min read
                </span>
                <span className="latest-title">{p.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="home-footer">© {new Date().getFullYear()} Jui-Hung (Ray) Kao</footer>
    </main>
  );
}
