import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import remarkHashtags from './remarkHashtags';

/**
 * Server component: runs at build time, so the Markdown parser never reaches the browser.
 * remark-breaks keeps the LinkedIn-style "one newline = one line break" the posts were written with.
 */
export default function PostMarkdown({ body }: { body: string }) {
  return (
    <div className="post-body">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkHashtags]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a: ({ href = '', children }) =>
            href.startsWith('/') ? (
              <Link href={href}>{children}</Link>
            ) : (
              <a href={href} target="_blank" rel="noreferrer">{children}</a>
            ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
