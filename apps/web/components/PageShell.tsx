import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader.js';
import { PageFooter } from './PageFooter.js';
import { Tricolor } from './Tricolor.js';

type NavId = 'status' | 'janta-darbar' | 'leaderboard' | 'methodology' | 'api';

interface Props {
  active?: NavId;
  children: ReactNode;
  /** Max-width container for the content area. Default: 1100px. */
  maxWidth?: number;
}

/** Shared shell for non-homepage routes. Uses the same header + tricolor + footer
 *  as the homepage but with a centered content container. */
export function PageShell({ active, children, maxWidth = 1100 }: Props) {
  return (
    <>
      <PageHeader active={active} />
      <Tricolor />
      <main className="bg-[var(--color-bg)] min-h-[calc(100vh-160px)]">
        <div className="mx-auto px-7 py-12" style={{ maxWidth }}>
          {children}
        </div>
      </main>
      <PageFooter />
    </>
  );
}
