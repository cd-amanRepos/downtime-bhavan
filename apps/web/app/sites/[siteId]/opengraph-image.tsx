import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { BRAND_HI } from '@/lib/seo/constants';

// Per-site dynamic OG image. Node runtime (Drizzle + better-sqlite3 are
// Node-only). 5-minute revalidate keeps status fresh without hammering the DB
// every time someone shares a link.

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Downtime Bhavan — site status';
export const revalidate = 300;

const COLORS = {
  paper: '#F7F9FC',
  navy: '#1E3A8A',
  inkDim: '#475569',
  inkFaint: '#94A3B8',
  saffron: '#F08C2A',
  white: '#FFFFFF',
  green: '#138808',
  workingGreen: '#15803D',
  degradedAmber: '#B45309',
  downRed: '#B91C1C',
};

type StatusState = 'working' | 'degraded' | 'down';

function stateMeta(state: StatusState): { color: string; label: string } {
  switch (state) {
    case 'working':
      return { color: COLORS.workingGreen, label: 'WORKING' };
    case 'degraded':
      return { color: COLORS.degradedAmber, label: 'DEGRADED' };
    case 'down':
      return { color: COLORS.downRed, label: 'UNREACHABLE' };
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

// Satori (the ImageResponse renderer) doesn't fully support React fragments —
// only the first child of `<>...</>` renders. So this is a wrapping flex
// column instead of a fragment.
function Tricolor() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', width: '100%', height: 4, backgroundColor: COLORS.saffron }} />
      <div style={{ display: 'flex', width: '100%', height: 4, backgroundColor: COLORS.white }} />
      <div style={{ display: 'flex', width: '100%', height: 4, backgroundColor: COLORS.green }} />
    </div>
  );
}

function Wordmark() {
  return (
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
  );
}

function BrandFallback() {
  return (
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
      <Tricolor />
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '64px 80px 56px 80px',
          justifyContent: 'space-between',
        }}
      >
        <Wordmark />
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', color: COLORS.inkFaint, fontSize: 22, fontWeight: 500 }}>
            downtimebhavan.in
          </div>
          <div style={{ display: 'flex', color: COLORS.inkDim, fontSize: 20, fontWeight: 500 }}>
            live · WhatsApp alerts · free
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteCard({
  siteId,
  siteName,
  state,
  uptime30d,
}: {
  siteId: string;
  siteName: string;
  state: StatusState;
  uptime30d: number | null | undefined;
}) {
  const meta = stateMeta(state);
  const displayName = truncate(siteName, 36);

  const uptimeNode =
    typeof uptime30d === 'number' ? (
      <div
        style={{
          display: 'flex',
          color: COLORS.inkDim,
          fontSize: 32,
          fontWeight: 500,
        }}
      >
        {`30-day uptime: ${uptime30d.toFixed(1)}%`}
      </div>
    ) : (
      <div
        style={{
          display: 'flex',
          color: COLORS.inkFaint,
          fontSize: 28,
          fontWeight: 500,
          fontStyle: 'italic',
        }}
      >
        Tracking started recently
      </div>
    );

  return (
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
      <Tricolor />
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '64px 80px 56px 80px',
          justifyContent: 'space-between',
        }}
      >
        <Wordmark />

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
          {/* Site name */}
          <div
            style={{
              display: 'flex',
              color: COLORS.navy,
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
            }}
          >
            {displayName}
          </div>

          {/* Status row: dot + uppercase state */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 28,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 24,
                height: 24,
                borderRadius: 9999,
                backgroundColor: meta.color,
              }}
            />
            <div
              style={{
                display: 'flex',
                marginLeft: 18,
                color: meta.color,
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {meta.label}
            </div>
          </div>

          {/* Uptime line */}
          <div style={{ display: 'flex', marginTop: 22 }}>{uptimeNode}</div>
        </div>

        {/* Bottom row */}
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
            {`downtimebhavan.in/sites/${siteId}`}
          </div>
          <div
            style={{
              display: 'flex',
              color: COLORS.inkDim,
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            Get a WhatsApp alert · free
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const db = getDb();
  const site = db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId))
    .get();

  if (!site) {
    return new ImageResponse(<BrandFallback />, { ...size });
  }

  const status = db
    .select()
    .from(schema.siteStatus)
    .where(eq(schema.siteStatus.siteId, siteId))
    .get();

  const state: StatusState = (status?.currentState ?? 'working') as StatusState;
  const uptime30d = status?.uptime30dPct ?? null;

  return new ImageResponse(
    (
      <SiteCard
        siteId={site.id}
        siteName={site.name}
        state={state}
        uptime30d={uptime30d}
      />
    ),
    { ...size }
  );
}
