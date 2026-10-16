import type { Metadata } from 'next';
import { BlogList } from '../../src/Blog';
import { CATEGORIES, POSTS } from '../../src/postData';

export const metadata: Metadata = { title: 'Blog' };

export default function BlogPage() {
  return <BlogList posts={POSTS} categories={CATEGORIES} />;
}
