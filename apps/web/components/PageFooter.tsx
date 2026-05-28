export function PageFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-paper)] px-7 py-4 flex justify-between items-center text-[11.5px] text-[var(--color-ink-faint)] font-medium">
      <div>
        <span className="text-[var(--color-saffron)] font-bold tracking-[0.08em] uppercase text-[10.5px]">◆ Unofficial Observatory ◆</span>
        &nbsp;&nbsp;
        <b className="text-[var(--color-ink-soft)] font-bold">Downtime Bhavan</b> · Not affiliated with any government body · Data from Mumbai · Refreshed every 2 min
      </div>
      <div className="flex gap-4.5">
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
