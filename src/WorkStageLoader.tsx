'use client';

import dynamic from 'next/dynamic';

// The Work page is a Fabric canvas: it needs the browser (window, canvas), so it never renders on the server.
const WorkStage = dynamic(() => import('./WorkStage'), { ssr: false });

export default function WorkStageLoader() {
  return <WorkStage />;
}
