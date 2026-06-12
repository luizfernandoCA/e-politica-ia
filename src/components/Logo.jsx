
export default function Logo({ size = 36, showText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', userSelect: 'none' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 0 8px var(--accent-green-glow))' }}
      >
        {/* Outer Tech Ring (Green) */}
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke="var(--accent-green)"
          strokeWidth="3.5"
          strokeDasharray="10 6 30 6"
        />

        {/* Inner Diamond (Yellow Gold) */}
        <path
          d="M50 14L86 50L50 86L14 50Z"
          stroke="var(--accent-yellow)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeDasharray="8 4"
        />

        {/* Central Core Globe (Royal Blue with Glowing Grid) */}
        <circle
          cx="50"
          cy="50"
          r="24"
          fill="var(--accent-blue)"
          stroke="var(--accent-blue)"
          strokeWidth="4"
        />

        {/* Central Globe Lines */}
        <path
          d="M27 50H73M50 27V73M32.5 32.5C40 37.5 40 62.5 32.5 67.5M67.5 32.5C60 37.5 60 62.5 67.5 67.5"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth="2"
        />

        {/* Tech Nodes (Glows) */}
        <circle cx="50" cy="14" r="4" fill="var(--accent-yellow)" />
        <circle cx="86" cy="50" r="4" fill="var(--accent-green-bright)" />
        <circle cx="50" cy="86" r="4" fill="var(--accent-blue-bright)" />
        <circle cx="14" cy="50" r="4" fill="var(--accent-blue-bright)" />

        {/* Stylized Core 'eP' lettermark */}
        <path
          d="M44 42H54C57.5 42 59 44 59 47C59 50 57.5 52 54 52H44V58"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="42" r="1.5" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span
            className="text-gradient-brasil"
            style={{
              fontFamily: 'var(--font-title)',
              fontWeight: 800,
              fontSize: '1.4rem',
              letterSpacing: '-0.03em',
            }}
          >
            e-politica.ia
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-gray)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginTop: '1px'
            }}
          >
            Inteligência Estratégica
          </span>
        </div>
      )}
    </div>
  );
}
