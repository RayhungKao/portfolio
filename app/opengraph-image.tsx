import { ImageResponse } from 'next/og';
import { SITE_NAME } from '../src/site';

export const dynamic = 'force-static';
export const alt = 'Ray Kao, software engineer in Taipei';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default share image for every page that has none of its own (home, work, blog list, résumé). */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          background: '#f4ede2', color: '#232c2b', padding: '0 96px', gap: 20,
        }}
      >
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 700 }}>{SITE_NAME}</div>
        <div style={{ display: 'flex', fontSize: 44, color: '#4c524f' }}>Software engineer in Taipei</div>
        <div style={{ display: 'flex', fontSize: 30, color: '#7c5c46' }}>Streaming AI interfaces, async task systems, canvas editors</div>
      </div>
    ),
    { ...size },
  );
}
