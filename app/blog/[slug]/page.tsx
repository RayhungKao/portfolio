import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPost } from '../../../src/Blog';
import PostMarkdown from '../../../src/PostMarkdown';
import { CATEGORIES, POSTS, POST_LIST, SERIES, seriesNav } from '../../../src/postData';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: post.title, description: post.summary, publishedTime: post.date || undefined },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();
  return (
    <BlogPost post={{ ...post, body: '' }} posts={POST_LIST} categories={CATEGORIES} allSeries={SERIES} series={seriesNav(post.slug)}>
      <PostMarkdown body={post.body} />
    </BlogPost>
  );
}
