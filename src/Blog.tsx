'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { categorySlug, formatDate, type Category, type Post } from './postTypes';
import { to } from './router';

function PostMeta({ post }: { post: Post }) {
  return (
    <div className="post-meta">
      <a href={to(`/blog/category/${categorySlug(post.category)}`)}>{post.category}</a>
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
      <a className={!activeCategory && !slug ? 'blog-nav-all active' : 'blog-nav-all'} href={to('/blog')}>
        All articles <span>{posts.length}</span>
      </a>
      <ul>
        {categories.map((c) => {
          const isOpen = open.has(c.slug);
          return (
            <li key={c.slug} className={activeCategory === c.slug ? 'active' : undefined}>
              <div className="blog-nav-row">
                <a href={to(`/blog/category/${c.slug}`)}>
                  {c.name} <span>{c.posts.length}</span>
                </a>
                <button aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${c.name}`} aria-expanded={isOpen} onClick={() => toggle(c.slug)}>
                  {isOpen ? '▾' : '▸'}
                </button>
              </div>
              {isOpen && (
                <ul className="blog-nav-posts">
                  {c.posts.map((p) => (
                    <li key={p.slug}>
                      <a className={p.slug === slug ? 'active' : undefined} href={to(`/blog/${p.slug}`)}>
                        {p.title}
                      </a>
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

export function BlogList({ category, posts: allPosts, categories }: { category?: string; posts: Post[]; categories: Category[] }) {
  const current = category ? categories.find((c) => c.slug === category) : undefined;
  const posts = current ? current.posts : allPosts;
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
            {posts.map((p) => (
              <li key={p.slug} className="post-item">
                <PostMeta post={p} />
                <a className="post-title" href={to(`/blog/${p.slug}`)}>{p.title}</a>
                <p className="post-summary">{p.summary}</p>
                <Tags tags={p.tags} />
                <a className="post-read" href={to(`/blog/${p.slug}`)}>Read article →</a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export function BlogPost({ post, posts, categories, children }: { post: Post; posts: Post[]; categories: Category[]; children: ReactNode }) {
  const slug = post.slug;
  return (
    <div className="blog-layout">
      <BlogNav slug={slug} posts={posts} categories={categories} />
      <main className="blog">
        <a className="back" href={to(`/blog/category/${categorySlug(post.category)}`)}>← {post.category}</a>
        <article>
          <PostMeta post={post} />
          <h1>{post.title}</h1>
          {children}
          <Tags tags={post.tags} />
          {post.linkedin && (
            <a className="pill linkedin" href={post.linkedin} target="_blank" rel="noreferrer">
              Discuss on LinkedIn →
            </a>
          )}
        </article>
      </main>
    </div>
  );
}
