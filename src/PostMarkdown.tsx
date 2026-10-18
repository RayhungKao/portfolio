import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { AppLink } from './AppLink';
import remarkHashtags from './remarkHashtags';
import { to } from './router';

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
          // App paths use next/link, http(s) links open in a new tab, and #anchors, footnotes and
          // mailto: stay in the same tab. The rest props keep footnote ids and aria attributes.
          a: ({ node: _node, href = '', ...rest }) => <AppLink href={href} {...rest} />,
          // Images in public/ are written as /x.png in a post; add the base path ('/portfolio').
          img: ({ node: _node, src, alt, ...rest }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === 'string' ? to(src) : undefined} alt={alt ?? ''} loading="lazy" {...rest} />
          ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
