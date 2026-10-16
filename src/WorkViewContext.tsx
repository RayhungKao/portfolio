'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type View = 'desk' | 'list';
type WorkView = { view: View; setView: (v: View) => void };

const Ctx = createContext<WorkView>({ view: 'desk', setView: () => {} });

/** Whether the Work page shows the canvas or the plain list; the top bar toggles it. */
export function WorkViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('desk');
  // Narrow screens start on the list. Decided after mount so the server and first client render match.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setView('list');
  }, []);
  const value = useMemo(() => ({ view, setView }), [view]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useWorkView = () => useContext(Ctx);
