/**
 * Server only: page views from GA4, as scripts/fetch-views.mjs wrote them to views.json before the
 * build. The file is missing when the GA4 secrets are unset (local builds) or the request failed;
 * then every count is undefined and the pages show none.
 */

import fs from 'node:fs';
import path from 'node:path';

type Views = { total: number; pages: Record<string, number>; fetchedAt: string };

const FILE = path.join(process.cwd(), 'views.json');
const VIEWS: Views | null = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;

/** Views of the whole site, all time. */
export const SITE_VIEWS: number | undefined = VIEWS?.total;

/** Views of one app path ('/blog/x'), all time. 0 for a page GA has no row for yet. */
export const viewsOf = (appPath: string): number | undefined => (VIEWS ? VIEWS.pages[appPath] ?? 0 : undefined);
