import type { Paragraph, Root } from 'mdast';

/**
 * Turns a blockquote whose first line is `[!TYPE] Title` into a highlighted callout:
 *
 *   > [!WARNING] Do not queue this offline
 *   > Paying for an order must happen once, online.
 *
 * Types: WARNING, PRINCIPLE, NOTE. The title is plain text up to the end of that first line;
 * an empty title falls back to the default below. Only top-level blockquotes are checked.
 * Run it before remark-breaks, which would otherwise turn the first newline into a <br>.
 */
const MARKER = /^\[!(WARNING|PRINCIPLE|NOTE)\][ \t]*([^\n]*)(?:\n|$)/;
const DEFAULT_TITLE = { warning: 'Warning', principle: 'Core principle', note: 'Note' } as const;

export default function remarkCallouts() {
  return (tree: Root) => {
    for (const quote of tree.children) {
      if (quote.type !== 'blockquote') continue;
      const first = quote.children[0];
      const lead = first?.type === 'paragraph' ? first.children[0] : undefined;
      const match = lead?.type === 'text' ? MARKER.exec(lead.value) : null;
      if (!first || first.type !== 'paragraph' || lead?.type !== 'text' || !match) continue;

      const kind = match[1].toLowerCase() as keyof typeof DEFAULT_TITLE;
      lead.value = lead.value.slice(match[0].length); // what is left of line one is body text
      if (!lead.value) first.children.shift();
      if (first.children.length === 0) quote.children.shift();

      const title: Paragraph = {
        type: 'paragraph',
        data: { hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: match[2].trim() || DEFAULT_TITLE[kind] }],
      };
      quote.children.unshift(title);
      quote.data = { hName: 'aside', hProperties: { className: ['callout', `callout-${kind}`] } };
    }
  };
}
