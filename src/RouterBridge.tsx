'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { interceptLinkClicks, registerNavigator } from './router';

/**
 * Connects plain <a href> links and navigate() calls to the App Router, so internal links
 * change page without a reload.
 */
export function RouterBridge() {
  const router = useRouter();
  useEffect(() => {
    registerNavigator((path, replace) => (replace ? router.replace(path) : router.push(path)));
    const stop = interceptLinkClicks();
    return () => {
      stop();
      registerNavigator(null);
    };
  }, [router]);
  return null;
}
