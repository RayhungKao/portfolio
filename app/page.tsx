import { Home } from '../src/Home';
import { POST_LIST, SERIES } from '../src/postData';

export default function HomePage() {
  return <Home posts={POST_LIST} series={SERIES} />;
}
