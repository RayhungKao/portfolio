import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogList } from '../../../../src/Blog';
import { CATEGORIES, POST_LIST, SERIES } from '../../../../src/postData';

type Params = { category: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const found = CATEGORIES.find((c) => c.slug === category);
  return found ? { title: `${found.name} · Blog`, alternates: { canonical: `/blog/category/${found.slug}` } } : {};
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  if (!CATEGORIES.some((c) => c.slug === category)) notFound();
  return <BlogList category={category} posts={POST_LIST} categories={CATEGORIES} series={SERIES} />;
}
