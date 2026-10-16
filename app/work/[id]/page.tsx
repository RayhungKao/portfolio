import { CARDS } from '../../../src/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return CARDS.map((c) => ({ id: c.id }));
}

export default function WorkCardPage() {
  return null;
}
