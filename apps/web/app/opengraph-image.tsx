import { ImageResponse } from 'next/og';
import { BRAND_HI } from '@/lib/seo/constants';

// Branded fallback OG image. Used by the root and any page without a more-
// specific opengraph-image.tsx route. No DB access here, no Google Fonts
// (system-ui is the only typeface — OG images don't need brand-typography
// purity).
//
// Runtime note: the plan called for `runtime = 'edge'`, but the project's
// Next.js 15.5 + transpilePackages setup hits a "Cannot find module for page"
// error during `next build`'s page-data collection when any root-level edge
// runtime route coexists with the admin/api Node routes. Node runtime keeps
// the build clean; the perf delta on a 1200x630 PNG is negligible.

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt =
  'Downtime Bhavan — an unofficial observatory of Indian government websites';

const COLORS = {
  paper: '#F7F9FC',
  navy: '#1E3A8A',
  inkDim: '#475569',
  inkFaint: '#94A3B8',
  saffron: '#F08C2A',
  white: '#FFFFFF',
  green: '#138808',
};

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: COLORS.paper,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Tricolor strip — horizontal bars top to bottom: saffron, white, green */}
        <div style={{ display: 'flex', width: '100%', height: 4, backgroundColor: COLORS.saffron }} />
        <div style={{ display: 'flex', width: '100%', height: 4, backgroundColor: COLORS.white }} />
        <div style={{ display: 'flex', width: '100%', height: 4, backgroundColor: COLORS.green }} />

        {/* Subtle Ashoka-chakra-inspired backdrop: a navy ring at low opacity,
            absolutely positioned behind content. Simple decorative element. */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            right: -120,
            width: 560,
            height: 560,
            display: 'flex',
            borderRadius: 9999,
            border: `28px solid ${COLORS.navy}`,
            opacity: 0.06,
          }}
        />

        {/* Main content column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '64px 80px 56px 80px',
            justifyContent: 'space-between',
          }}
        >
          {/* Top: wordmark + Hindi subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                color: COLORS.navy,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              Downtime Bhavan
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 8,
                color: COLORS.inkDim,
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              {BRAND_HI}
            </div>
          </div>

          {/* Middle: headline + subhead */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
            <div
              style={{
                display: 'flex',
                color: COLORS.navy,
                fontSize: 84,
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
              }}
            >
              An unofficial observatory
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 14,
                color: COLORS.inkDim,
                fontSize: 44,
                fontWeight: 500,
                lineHeight: 1.1,
              }}
            >
              of Indian government websites
            </div>
          </div>

          {/* Bottom: domain (left) + pill row (right) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                display: 'flex',
                color: COLORS.inkFaint,
                fontSize: 22,
                fontWeight: 500,
              }}
            >
              downtimebhavan.in
            </div>
            <div
              style={{
                display: 'flex',
                color: COLORS.inkDim,
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              live · WhatsApp alerts · free
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
