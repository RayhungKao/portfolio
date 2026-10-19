import fs from 'node:fs';
import path from 'node:path';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { AppLink } from './AppLink';
import remarkCallouts from './remarkCallouts';
import remarkHashtags from './remarkHashtags';
import { to } from './router';

const DIAGRAM = 'diagram:';
const DIAGRAMS_DIR = path.join(process.cwd(), 'src', 'diagrams');

/** The SVG source for `![alt](diagram:name)`. A missing file fails the build instead of showing a broken image. */
function readDiagram(name: string): string {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Bad diagram name "${name}": use lowercase letters, digits and hyphens`);
  return fs.readFileSync(path.join(DIAGRAMS_DIR, `${name}.svg`), 'utf8');
}

/** True for a paragraph that holds nothing but one diagram image. */
function isDiagramParagraph(node?: { children?: { type: string; tagName?: string; properties?: { src?: unknown } }[] }): boolean {
  const only = node?.children?.length === 1 ? node.children[0] : undefined;
  return only?.type === 'element' && only.tagName === 'img' && String(only.properties?.src).startsWith(DIAGRAM);
}

/**
 * Server component: runs at build time, so the Markdown parser never reaches the browser.
 * remark-breaks keeps the LinkedIn-style "one newline = one line break" the posts were written with.
 * `![alt](diagram:name)` inlines src/diagrams/name.svg, so the diagram follows the light/dark theme.
 */
export default function PostMarkdown({ body }: { body: string }) {
  return (
    <div className="post-body">
      <Markdown
        remarkPlugins={[remarkGfm, remarkCallouts, remarkBreaks, remarkHashtags]}
        rehypePlugins={[rehypeSlug]}
        // The default transform blanks every URL scheme it does not know, including diagram:.
        urlTransform={(url) => (url.startsWith(DIAGRAM) ? url : defaultUrlTransform(url))}
        components={{
          // A <figure> cannot sit inside a <p>, so a paragraph that is only a diagram drops its <p>.
          p: ({ node, ...rest }) => (isDiagramParagraph(node) ? <>{rest.children}</> : <p {...rest} />),
          // App paths use next/link, http(s) links open in a new tab, and #anchors, footnotes and
          // mailto: stay in the same tab. The rest props keep footnote ids and aria attributes.
          a: ({ node: _node, href = '', ...rest }) => <AppLink href={href} {...rest} />,
          // Images in public/ are written as /x.png in a post; add the base path ('/portfolio').
          img: ({ node: _node, src, alt, ...rest }) =>
            typeof src === 'string' && src.startsWith(DIAGRAM) ? (
              // The SVG carries its own <title> and <desc>, which is what screen readers announce.
              <figure className="diagram" dangerouslySetInnerHTML={{ __html: readDiagram(src.slice(DIAGRAM.length)) }} />
            ) : (
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
