import type { Metadata } from 'next';
import { Resume } from '../../src/Resume';

export const metadata: Metadata = { title: 'Résumé', alternates: { canonical: '/resume' } };

export default function ResumePage() {
  return <Resume />;
}
