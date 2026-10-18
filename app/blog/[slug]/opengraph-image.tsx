import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { POSTS, SERIES } from '../../../src/postData';
import { SITE_NAME } from '../../../src/site';

export const dynamic = 'force-static';
export const alt = 'Blog post preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

/**
 * The share image for /blog/<slug>. A post's front matter `image: /og/x.png` (a PNG in public/)
 * wins; otherwise a card is drawn from the title and the category (or the series, for a series post).
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug)!;

  if (post.image) {
    const file = path.join(process.cwd(), 'public', post.image.replace(/^\/+/, ''));
    return new Response(fs.readFileSync(file), { headers: { 'Content-Type': contentType } });
  }

  const label = post.category ?? SERIES.find((s) => s.slug === post.series)?.title ?? '';
  const title = post.title.length > 110 ? `${post.title.slice(0, 107)}…` : post.title;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: '#f4ede2', color: '#232c2b', padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, color: '#7c5c46', letterSpacing: 1 }}>{label.toUpperCase()}</div>
        <div style={{ display: 'flex', fontSize: title.length > 70 ? 56 : 68, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, color: '#4c524f' }}>
          <span>{SITE_NAME}</span>
          <span>{post.date}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
