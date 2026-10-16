import Link from 'next/link';
import type { AnchorHTMLAttributes } from 'react';
import { isInternal } from './router';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

/**
 * For hrefs that can be an app path ('/blog/x') or an outside URL, such as content data:
 * app paths use next/link (client navigation, base path added, prefetching); http(s) URLs open
 * in a new tab; anything else (mailto:) is a plain link.
 */
export function AppLink({ href, children, ...rest }: Props) {
  if (isInternal(href)) return <Link href={href} {...rest}>{children}</Link>;
  const web = /^https?:/.test(href);
  return (
    <a href={href} {...(web ? { target: '_blank', rel: 'noreferrer' } : {})} {...rest}>
      {children}
    </a>
  );
}
