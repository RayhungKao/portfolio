'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { categorySlug, formatDate, listItems, type Category, type Post, type Series, type SeriesNav } from './postTypes';

function PostMeta({ post }: { post: Post }) {
  return (
    <div className="post-meta">
      <Link href={`/blog/category/${categorySlug(post.category)}`}>{post.category}</Link>
      {post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
      <span>{post.readingMinutes} min read</span>
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="post-tags" aria-label="Tags">
      {tags.slice(0, 6).map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

/** Two-level directory: All articles, then each category with its posts. */
function BlogNav({ category, slug, posts, categories }: { category?: string; slug?: string; posts: Post[]; categories: Category[] }) {
  const activeCategory = category ?? (slug ? categorySlug(posts.find((p) => p.slug === slug)?.category ?? '') : undefined);
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeCategory ? [activeCategory] : []));
  useEffect(() => {
    if (activeCategory) setOpen((s) => new Set(s).add(activeCategory));
  }, [activeCategory]);
  const toggle = (c: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  return (
    <nav className="blog-nav" aria-label="Blog categories">
      <Link className={!activeCategory && !slug ? 'blog-nav-all active' : 'blog-nav-all'} href="/blog">
        All articles <span>{posts.length}</span>
      </Link>
      <ul>
        {categories.map((c) => {
          const isOpen = open.has(c.slug);
          return (
            <li key={c.slug} className={activeCategory === c.slug ? 'active' : undefined}>
              <div className="blog-nav-row">
                <Link href={`/blog/category/${c.slug}`}>
                  {c.name} <span>{c.posts.length}</span>
                </Link>
                <button aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${c.name}`} aria-expanded={isOpen} onClick={() => toggle(c.slug)}>
                  {isOpen ? '▾' : '▸'}
                </button>
              </div>
              {isOpen && (
                <ul className="blog-nav-posts">
                  {c.posts.map((p) => (
                    <li key={p.slug}>
                      <Link className={p.slug === slug ? 'active' : undefined} href={`/blog/${p.slug}`}>
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BlogList({ category, posts: allPosts, categories, series }: { category?: string; posts: Post[]; categories: Category[]; series: Series[] }) {
  const current = category ? categories.find((c) => c.slug === category) : undefined;
  const posts = current ? current.posts : allPosts;
  const items = listItems(posts, series);
  return (
    <div className="blog-layout">
      <BlogNav category={current?.slug} posts={allPosts} categories={categories} />
      <main className="blog">
        <header className="blog-head">
          <h1>Writing</h1>
          <p>Notes on building products, frontend systems, and moving toward the backend.</p>
        </header>
        <h2 className="blog-section">
          {current ? current.name : 'All articles'} <span>{posts.length} {posts.length === 1 ? 'article' : 'articles'}</span>
        </h2>
        {posts.length === 0 ? (
          <p className="blog-empty">No posts yet.</p>
        ) : (
          <ul className="post-list">
            {items.map((item) =>
              item.kind === 'series' ? (
                <li key={`series-${item.series.slug}`} className="post-item series-card">
                  <div className="post-meta">
                    <span>Series</span>
                    <span>{item.series.posts.length} articles</span>
                  </div>
                  <Link className="post-title" href={`/series/${item.series.slug}`}>{item.series.title}</Link>
                  {item.series.description && <p className="post-summary">{item.series.description}</p>}
                  <Link className="post-read" href={`/series/${item.series.slug}`}>View the series →</Link>
                </li>
              ) : (
                <li key={item.post.slug} className="post-item">
                  <PostMeta post={item.post} />
                  <Link className="post-title" href={`/blog/${item.post.slug}`}>{item.post.title}</Link>
                  <p className="post-summary">{item.post.summary}</p>
                  <Tags tags={item.post.tags} />
                  <Link className="post-read" href={`/blog/${item.post.slug}`}>Read article →</Link>
                </li>
              ),
            )}
          </ul>
        )}
      </main>
    </div>
  );
}

export function BlogPost({ post, posts, categories, series, children }: { post: Post; posts: Post[]; categories: Category[]; series?: SeriesNav; children: ReactNode }) {
  const slug = post.slug;
  return (
    <div className="blog-layout">
      <BlogNav slug={slug} posts={posts} categories={categories} />
      <main className="blog">
        <Link className="back" href={`/blog/category/${categorySlug(post.category)}`}>← {post.category}</Link>
        <article>
          <PostMeta post={post} />
          {series && (
            <Link className="series-badge" href={`/series/${series.slug}`}>
              Series · {series.position} / {series.total} · {series.title}
            </Link>
          )}
          <h1>{post.title}</h1>
          {children}
          <Tags tags={post.tags} />
          <div className="post-social">
            {post.linkedin && <a className="pill" href={post.linkedin} target="_blank" rel="noreferrer">Discuss on LinkedIn →</a>}
            {post.threads && <a className="pill" href={post.threads} target="_blank" rel="noreferrer">Discuss on Threads →</a>}
            {post.instagram && <a className="pill" href={post.instagram} target="_blank" rel="noreferrer">View on Instagram →</a>}
          </div>
          {series && (series.prev || series.next) && (
            <nav className="series-nav" aria-label={`${series.title} navigation`}>
              {series.prev ? (
                <Link className="series-prev" href={`/blog/${series.prev.slug}`}>
                  <span>← Previous</span>
                  {series.prev.title}
                </Link>
              ) : <span />}
              {series.next ? (
                <Link className="series-next" href={`/blog/${series.next.slug}`}>
                  <span>Next →</span>
                  {series.next.title}
                </Link>
              ) : <span />}
            </nav>
          )}
        </article>
      </main>
    </div>
  );
}

/** /series/<slug>: the table of contents of one series, in reading order. */
export function SeriesPage({ series, posts, categories }: { series: Series; posts: Post[]; categories: Category[] }) {
  return (
    <div className="blog-layout">
      <BlogNav posts={posts} categories={categories} />
      <main className="blog">
        <Link className="back" href="/blog">← All articles</Link>
        <header className="blog-head">
          <h1>{series.title}</h1>
          {series.description && <p>{series.description}</p>}
        </header>
        <h2 className="blog-section">
          Contents <span>{series.posts.length} articles</span>
        </h2>
        <ol className="series-list">
          {series.posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`}>
                <span className="series-list-title">{p.title}</span>
                <span className="series-list-meta">
                  {p.date && formatDate(p.date)} · {p.readingMinutes} min read
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
