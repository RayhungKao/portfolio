import { Home } from '../src/Home';
import { POSTS } from '../src/postData';

export default function HomePage() {
  return <Home posts={POSTS} />;
}
