/**
 * Runs before `next build` (the "prebuild" script). Asks the GA4 Data API for all-time page views and
 * writes them to views.json (git-ignored), which src/viewData.ts reads while the pages are built.
 *
 * Needs GA4_PROPERTY_ID (the numeric property ID, not the G- measurement ID) and GA4_CREDENTIALS (a
 * service account's JSON key, with Viewer access to the property). Without them, as in local builds, it
 * does nothing and the site shows no counts. A failed request only warns on a push, so the site still
 * deploys; on the daily scheduled run it fails the build instead, so the live site keeps its last counts.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';

const OUT = 'views.json';
const { GA4_PROPERTY_ID, GA4_CREDENTIALS } = process.env;
const BASE_PATH = process.env.BASE_PATH ?? '';
// Count only the live site, not a local build someone opened with GTM on.
const HOST = new URL(process.env.SITE_ORIGIN ?? 'https://rayhungkao.github.io').host;

/** A service account signs a short-lived JWT and trades it for an OAuth access token. */
async function accessToken({ client_email, private_key }) {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 600,
  })}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

/** '/portfolio/blog/x/' → '/blog/x', the app path the pages look themselves up by. */
function appPath(pagePath) {
  const path = pagePath.startsWith(BASE_PATH) ? pagePath.slice(BASE_PATH.length) : pagePath;
  return path.replace(/\/+$/, '') || '/';
}

async function main() {
  if (!GA4_PROPERTY_ID || !GA4_CREDENTIALS) {
    console.log('fetch-views: GA4_PROPERTY_ID or GA4_CREDENTIALS not set, skipping view counts');
    return;
  }
  const token = await accessToken(JSON.parse(GA4_CREDENTIALS));
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // GA4's earliest allowed date: in effect "all time".
      dateRanges: [{ startDate: '2015-08-14', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: HOST } } },
      limit: 100000,
    }),
  });
  if (!res.ok) throw new Error(`runReport failed: ${res.status} ${await res.text()}`);
  const { rows = [] } = await res.json();

  // '/blog/x' and '/blog/x/' are one page, so their rows are added together.
  const pages = {};
  let total = 0;
  for (const row of rows) {
    const views = Number(row.metricValues[0].value);
    const path = appPath(row.dimensionValues[0].value);
    pages[path] = (pages[path] ?? 0) + views;
    total += views;
  }
  fs.writeFileSync(OUT, `${JSON.stringify({ total, pages, fetchedAt: new Date().toISOString() }, null, 2)}\n`);
  console.log(`fetch-views: ${total} views on ${Object.keys(pages).length} paths`);
}

main().catch((err) => {
  // The scheduled run exists only to refresh the counts: deploying without them would be a step back.
  // `::error::` and `::warning::` show up as annotations on the GitHub Actions run.
  if (process.env.GITHUB_EVENT_NAME === 'schedule') {
    console.error(`::error::fetch-views: ${err.message}; not deploying, the live site keeps its last counts`);
    process.exitCode = 1;
  } else {
    console.warn(`::warning::fetch-views: ${err.message}; building without view counts`);
  }
});
