import { Home } from '../src/Home';
import { POST_LIST, SERIES } from '../src/postData';
import { SITE_VIEWS } from '../src/viewData';

export default function HomePage() {
  return <Home posts={POST_LIST} series={SERIES} siteViews={SITE_VIEWS} />;
}
