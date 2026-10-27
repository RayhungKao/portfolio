import type { Metadata } from 'next';
import { Home } from '../src/Home';
import { POST_LIST, SERIES } from '../src/postData';
import { PERSON, jsonLd } from '../src/site';
import { SITE_VIEWS } from '../src/viewData';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(PERSON)} />
      <Home posts={POST_LIST} series={SERIES} siteViews={SITE_VIEWS} />
    </>
  );
}
