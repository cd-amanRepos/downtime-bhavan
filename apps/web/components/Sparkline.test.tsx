import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline.js';
import type { HourBucket } from '@/lib/status-derive';

const bucket = (state: HourBucket['state']): HourBucket => ({ hourStart: 0, state });

describe('Sparkline', () => {
  it('renders 24 bars', () => {
    const buckets = Array.from({ length: 24 }, () => bucket('working'));
    const { container } = render(<Sparkline buckets={buckets} />);
    expect(container.querySelectorAll('[data-bar]')).toHaveLength(24);
  });

  it('applies the correct class per state', () => {
    const buckets = [bucket('working'), bucket('degraded'), bucket('down'), bucket('unknown'), ...Array.from({ length: 20 }, () => bucket('working'))];
    const { container } = render(<Sparkline buckets={buckets} />);
    const bars = container.querySelectorAll('[data-bar]');
    expect(bars[0]!.getAttribute('data-state')).toBe('working');
    expect(bars[1]!.getAttribute('data-state')).toBe('degraded');
    expect(bars[2]!.getAttribute('data-state')).toBe('down');
    expect(bars[3]!.getAttribute('data-state')).toBe('unknown');
  });
});
