import { findAndReplace } from 'mdast-util-find-and-replace';
import type { Emphasis, Root } from 'mdast';

/**
 * Markdown has no hashtag syntax, so this small remark plugin wraps #tags in
 * <span class="hashtag">. findAndReplace only visits text, so #tags inside code and
 * links are left alone, and `# Heading` is already a heading by the time we run.
 */
export default function remarkHashtags() {
  return (tree: Root) => {
    findAndReplace(tree, [
      /#([\p{L}\p{N}_]+)/gu,
      // An emphasis node, rewritten to <span class="hashtag"> on the way to HTML.
      // (A `text` node here makes findAndReplace drop the text after the first match.)
      (tag: string): Emphasis => ({
        type: 'emphasis',
        data: { hName: 'span', hProperties: { className: ['hashtag'] } },
        children: [{ type: 'text', value: tag }],
      }),
    ]);
  };
}
