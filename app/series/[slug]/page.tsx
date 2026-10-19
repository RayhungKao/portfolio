import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SeriesPage } from '../../../src/Blog';
import { CATEGORIES, POST_LIST, SERIES } from '../../../src/postData';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  // `output: 'export'` fails on an empty list, and there are no series until a post sets `series:`.
  // Until then build one placeholder URL; the page below answers it with notFound(). It is not linked.
  return SERIES.length ? SERIES.map((s) => ({ slug: s.slug })) : [{ slug: 'none' }];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const series = SERIES.find((s) => s.slug === slug);
  if (!series) return {};
  const description = series.description ?? `${series.posts.length} articles in reading order.`;
  const url = `/series/${series.slug}`;
  return { title: series.title, description, alternates: { canonical: url }, openGraph: { title: series.title, description, url, images: '/opengraph-image' }, twitter: { images: '/opengraph-image' } };
}

export default async function SeriesRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const series = SERIES.find((s) => s.slug === slug);
  if (!series) notFound();
  return <SeriesPage series={series} allSeries={SERIES} posts={POST_LIST} categories={CATEGORIES} />;
}
