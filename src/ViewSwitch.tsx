'use client';

import { useWorkView } from './WorkViewContext';

const svgProps = {
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Segmented control for the Work page: the selected side is filled, so it shows where you are, not where a click goes. */
export function ViewSwitch({ hidden = false }: { hidden?: boolean }) {
  const { view, setView } = useWorkView();
  return (
    <div className={hidden ? 'view-switch is-hidden' : 'view-switch'} role="group" aria-label="Work layout">
      <button type="button" aria-pressed={view === 'desk'} onClick={() => setView('desk')}>
        <svg {...svgProps}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
        </svg>
        Canvas
      </button>
      <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
        <svg {...svgProps}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        List
      </button>
    </div>
  );
}
