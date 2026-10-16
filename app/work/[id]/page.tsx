import type { Metadata } from 'next';
import { CARDS } from '../../../src/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return CARDS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const card = CARDS.find((c) => c.id === id);
  if (!card) return {};
  const title = card.id === 'about' ? 'About' : card.title;
  const description = card.detail.lead;
  return {
    title,
    description,
    alternates: { canonical: `/work/${id}` },
    openGraph: { title, description, url: `/work/${id}`, images: '/opengraph-image' },
    twitter: { images: '/opengraph-image' },
  };
}

export default function WorkCardPage() {
  return null;
}
