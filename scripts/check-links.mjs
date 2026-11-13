/**
 * Runs before `next build` (the "prebuild" script). Fails the build when a post links to a post, series
 * or #anchor that does not exist, so a renamed heading cannot silently break a link in another post.
 * A link in a src/posts-zh file is checked against the target's Chinese version when it has one.
 * Anchors are the ids rehype-slug gives the headings (src/PostMarkdown.tsx), made with the same slugger.
 */

import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.md') ? [path.join(dir, e.name)] : [],
  );
const slugOf = (file) => path.basename(file, '.md');

const EN = walk('src/posts');
const ZH = fs.existsSync('src/posts-zh') ? walk('src/posts-zh') : [];
const en = new Map(EN.map((f) => [slugOf(f), f]));
const zh = new Map(ZH.map((f) => [slugOf(f), f]));
const front = (file) => fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
const drafts = new Set(EN.filter((f) => /^draft: true$/m.test(front(f))).map(slugOf));
const series = new Set(EN.flatMap((f) => front(f).match(/^series: *(\S+)/m)?.[1] ?? []));

/** The body without front matter and code blocks, where # is not a heading. */
const body = (file) => fs.readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '');
/** The same without inline code too, where ]( is not a link. */
const prose = (file) => body(file).replace(/`[^`\n]*`/g, '');

const idCache = new Map();
function ids(file) {
  if (!idCache.has(file)) {
    const slugger = new GithubSlugger();
    // shortcut: strips only links, `*` emphasis and code marks from heading text; a heading with other inline
    // Markdown may get a different id than rehype-slug and fail here (loudly), then extend this.
    const text = (h) => h.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '');
    idCache.set(file, new Set([...body(file).matchAll(/^#{1,6} +(.+?) *#* *$/gm)].map((m) => slugger.slug(text(m[1])))));
  }
  return idCache.get(file);
}

const errors = [];
for (const file of [...EN, ...ZH]) {
  const isZh = ZH.includes(file);
  for (const [, href] of prose(file).matchAll(/\]\(((?:\/|#)[^)\s]*)\)/g)) {
    const [route, hash] = decodeURIComponent(href).split('#');
    let target = null;
    let problem = '';
    const post = route.match(/^\/blog\/([^/]+)$/)?.[1];
    const ser = route.match(/^\/series\/([^/]+)$/)?.[1];
    if (route === '') target = file;
    else if (post) {
      if (!en.has(post)) problem = 'no such post';
      else if (drafts.has(post)) problem = 'the post is a draft, so it is not built';
      else target = (isZh && zh.get(post)) || en.get(post);
    } else if (ser && !series.has(ser)) problem = 'no such series';
    if (!problem && hash && target && !ids(target).has(hash)) problem = `no heading with id "${hash}" in ${path.relative('.', target)}`;
    if (problem) errors.push(`${path.relative('.', file)}: ${href}: ${problem}`);
  }
}

if (errors.length) {
  console.error(`check-links: ${errors.length} broken link(s)\n${errors.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`check-links: links in ${EN.length + ZH.length} posts are fine`);
}
