export function Tricolor() {
  return (
    <div style={{ height: 3, display: 'flex' }}>
      <span style={{ flex: 1, background: 'var(--color-saffron)' }} />
      <span style={{ flex: 1, background: 'var(--color-paper)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }} />
      <span style={{ flex: 1, background: 'var(--color-green)' }} />
    </div>
  );
}
