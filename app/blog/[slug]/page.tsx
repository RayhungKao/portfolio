import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPost } from '../../../src/Blog';
import PostMarkdown from '../../../src/PostMarkdown';
import { CATEGORIES, POSTS } from '../../../src/postData';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  return post ? { title: post.title, description: post.summary } : {};
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();
  return (
    <BlogPost post={post} posts={POSTS} categories={CATEGORIES}>
      <PostMarkdown body={post.body} />
    </BlogPost>
  );
}
