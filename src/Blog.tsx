import type { ReactNode } from 'react';
import { POSTS, formatDate, type Post } from './postData';

const TOKEN = /(`[^`]+`|https?:\/\/[^\s)]+|#[\p{L}\p{N}_]+)/gu;

/** Turns a line of post text into React nodes: `code`, links, and #hashtags. */
function renderLine(line: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(line.slice(last, i));
    const t = m[0];
    out.push(
      t.startsWith('`') ? (
        <code key={`${key}-${i}`}>{t.slice(1, -1)}</code>
      ) : t.startsWith('#') ? (
        <span key={`${key}-${i}`} className="hashtag">{t}</span>
      ) : (
        <a key={`${key}-${i}`} href={t} target="_blank" rel="noreferrer">{t}</a>
      ),
    );
    last = i + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function PostBody({ body }: { body: string }) {
  const paragraphs = body.split(/\n\s*\n/);
  return (
    <div className="post-body">
      {paragraphs.map((p, pi) => (
        <p key={pi}>
          {p.split('\n').map((line, li, lines) => (
            <span key={li}>
              {renderLine(line, `${pi}-${li}`)}
              {li < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

export function BlogList() {
  return (
    <main className="blog">
      <header className="blog-head">
        <h1>Writing</h1>
        <p>Notes on building products, frontend systems, and moving toward the backend.</p>
      </header>
      {POSTS.length === 0 ? (
        <p className="blog-empty">No posts yet.</p>
      ) : (
        <ul className="post-list">
          {POSTS.map((p) => (
            <li key={p.slug}>
              <a className="post-item" href={`#/blog/${p.slug}`}>
                {p.date && <time dateTime={p.date}>{formatDate(p.date)}</time>}
                <span className="post-title">{p.title}</span>
                <span className="post-summary">{p.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export function BlogPost({ slug }: { slug: string }) {
  const post: Post | undefined = POSTS.find((p) => p.slug === slug);
  if (!post) {
    return (
      <main className="blog">
        <a className="back" href="#/blog">← All posts</a>
        <p className="blog-empty">This post doesn’t exist.</p>
      </main>
    );
  }
  return (
    <main className="blog">
      <a className="back" href="#/blog">← All posts</a>
      <article>
        {post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
        <h1>{post.title}</h1>
        <PostBody body={post.body} />
        {post.linkedin && (
          <a className="pill linkedin" href={post.linkedin} target="_blank" rel="noreferrer">
            Discuss on LinkedIn →
          </a>
        )}
      </article>
    </main>
  );
}
