import type { Metadata } from 'next';
import { Resume } from '../../src/Resume';

export const metadata: Metadata = { title: 'Résumé' };

export default function ResumePage() {
  return <Resume />;
}
