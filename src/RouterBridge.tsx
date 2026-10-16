'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerNavigator } from './router';

/**
 * Lets code outside React components (the Fabric desk, the home prompt box) navigate with
 * navigate() from router.ts. Links themselves use next/link and need no help.
 */
export function RouterBridge() {
  const router = useRouter();
  useEffect(() => {
    registerNavigator((path, replace) => (replace ? router.replace(path) : router.push(path)));
    return () => registerNavigator(null);
  }, [router]);
  return null;
}
