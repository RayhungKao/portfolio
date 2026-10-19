import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../src/styles.css';
import { RouterBridge } from '../src/RouterBridge';
import { Topbar } from '../src/Topbar';
import { WorkViewProvider } from '../src/WorkViewContext';
import { SITE_NAME, SITE_URL } from '../src/site';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const DESCRIPTION =
  'Ray Kao, software engineer in Taipei: streaming AI interfaces, asynchronous task systems, and the data layers beneath them.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Jui-Hung (Ray) Kao · Software Engineer', template: '%s | Ray Kao' },
  description: DESCRIPTION,
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  icons: { icon: `${BASE}/favicon.svg`, apple: `${BASE}/apple-touch-icon.png` },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Apply a saved dark theme before first paint, so it never flashes light.
const THEME_SCRIPT = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

// Home page only: start downloading the avatar photo in parallel with the app's JS.
const AVATAR_SCRIPT = `(function(){var b=${JSON.stringify(BASE)};var p=location.pathname.replace(/\\/+$/,'');if(p!==b)return;var l=document.createElement('link');l.rel='preload';l.as='image';l.type='image/webp';l.href=b+'/avatar-photo.webp';l.setAttribute('fetchpriority','high');document.head.appendChild(l)})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: AVATAR_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="root">
          <RouterBridge />
          <WorkViewProvider>
            <div className="app">
              <Topbar />
              {children}
            </div>
          </WorkViewProvider>
        </div>
      </body>
    </html>
  );
}
