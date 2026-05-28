import type { HourBucket } from '@/lib/status-derive';

const COLOR_BY_STATE: Record<HourBucket['state'], string> = {
  working: 'var(--color-spark-up)',
  degraded: 'var(--color-spark-degraded)',
  down: 'var(--color-spark-down)',
  unknown: 'var(--color-spark-track)',
};

const OPACITY_BY_STATE: Record<HourBucket['state'], number> = {
  working: 0.92,
  degraded: 0.88,
  down: 0.92,
  unknown: 1,
};

interface Props { buckets: HourBucket[]; }

export function Sparkline({ buckets }: Props) {
  return (
    <div className="mt-2.5 flex gap-[2px] items-center h-3.5">
      {buckets.map((b, i) => (
        <span
          key={i}
          data-bar
          data-state={b.state}
          style={{
            flex: 1,
            height: '100%',
            background: COLOR_BY_STATE[b.state],
            opacity: OPACITY_BY_STATE[b.state],
            borderRadius: 1.5,
          }}
        />
      ))}
    </div>
  );
}
