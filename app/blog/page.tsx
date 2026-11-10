import type { Metadata } from 'next';
import { BlogList } from '../../src/Blog';
import { CATEGORIES, POST_LIST, SERIES } from '../../src/postData';

export const metadata: Metadata = { title: 'Blog', alternates: { canonical: '/blog' } };

export default function BlogPage() {
  return <BlogList posts={POST_LIST} categories={CATEGORIES} series={SERIES} />;
}
