interface Props { size?: number; spokeOpacity?: number; }

/** 24-spoke Ashoka-chakra-inspired mark from the v6 mockup. */
export function AshokaMark({ size = 28, spokeOpacity = 0.6 }: Props) {
  const angles = [15, 30, 45, 60, 75, 105, 120, 135, 150, 165, 195, 210, 225, 240, 255, 285, 300, 315, 330, 345];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <circle cx="50" cy="50" r="34" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
      <g strokeWidth={1.8}>
        <line x1="50" y1="20" x2="50" y2="34" />
        <line x1="50" y1="80" x2="50" y2="66" />
        <line x1="20" y1="50" x2="34" y2="50" />
        <line x1="80" y1="50" x2="66" y2="50" />
        <line x1="29" y1="29" x2="39" y2="39" />
        <line x1="71" y1="71" x2="61" y2="61" />
        <line x1="29" y1="71" x2="39" y2="61" />
        <line x1="71" y1="29" x2="61" y2="39" />
        {angles.map((a) => (
          <line key={a} x1="50" y1="22" x2="50" y2="30" opacity={spokeOpacity} transform={`rotate(${a} 50 50)`} />
        ))}
      </g>
    </svg>
  );
}
