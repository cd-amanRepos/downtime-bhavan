export function PageFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-paper)] px-4 md:px-7 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] flex flex-col md:flex-row gap-3 md:gap-6 md:justify-between md:items-center text-[11.5px] text-[var(--color-ink-faint)] font-medium">
      <div className="leading-relaxed">
        <span className="text-[var(--color-saffron)] font-bold tracking-[0.08em] uppercase text-[10.5px]">◆ Unofficial Observatory ◆</span>
        &nbsp;&nbsp;
        <b className="text-[var(--color-ink-soft)] font-bold">Downtime Bhavan</b> · Not affiliated with any government body · Data from Mumbai · Refreshed every 2 min
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 md:gap-4.5">
        <a href="/about"       className="hover:text-[var(--color-blue)]">About</a>
        <a href="/sites"       className="hover:text-[var(--color-blue)]">Sites</a>
        <a href="/methodology" className="hover:text-[var(--color-blue)]">Methodology</a>
        <a href="/api"         className="hover:text-[var(--color-blue)]">API</a>
        <a href="/press"       className="hover:text-[var(--color-blue)]">Press</a>
        <a href="/contact"     className="hover:text-[var(--color-blue)]">Contact</a>
        <a href="/privacy"     className="hover:text-[var(--color-blue)]">Privacy</a>
        <a href="/donate"      className="hover:text-[var(--color-blue)]">Donate</a>
      </div>
    </footer>
  );
}
