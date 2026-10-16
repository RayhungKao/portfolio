import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import WorkStageLoader from '../../src/WorkStageLoader';

export const metadata: Metadata = { title: 'Work' };

// The canvas lives here, so it stays mounted while the URL moves between /work and /work/<id>.
export default function WorkLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WorkStageLoader />
      {children}
    </>
  );
}
