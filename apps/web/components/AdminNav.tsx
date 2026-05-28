const ITEMS = [
  { href: '/admin',            label: 'Overview' },
  { href: '/admin/grievances', label: 'Grievances' },
  { href: '/admin/sites',      label: 'Sites' },
  { href: '/admin/stats',      label: 'Stats' },
  { href: '/admin/donations',  label: 'Donations' },
];

interface Props { active?: string; }

export function AdminNav({ active = '/admin' }: Props) {
  return (
    <nav className="w-[200px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-paper)] p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--color-ink-faint)] mb-3 px-2">Admin</p>
      <ul className="space-y-0.5">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <a href={item.href}
               className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                 active === item.href
                   ? 'bg-[var(--color-blue-soft)] text-[var(--color-blue)] font-bold'
                   : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-2)]'
               }`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <form action="/api/admin/logout" method="POST" className="mt-4 px-2">
        <button type="submit" className="text-[11px] text-[var(--color-ink-faint)] hover:text-[var(--color-red)] font-semibold">
          Logout →
        </button>
      </form>
    </nav>
  );
}
