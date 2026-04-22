const COLORS = ['#6b7066', '#8b6f47', '#4a4d47', '#8b2d1a', '#2a3d2f'];

export function Identicon({ seed = 'user', size = 36 }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const c1 = COLORS[Math.abs(h) % COLORS.length];
  const grid = Array.from({ length: 25 }, (_, i) => ((h >> (i % 16)) ^ i) & 1);
  const cell = size / 7;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3,
      background: '#f0ede4', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {grid.map((v, i) => {
          if (!v) return null;
          const col = i % 5;
          const row = Math.floor(i / 5);
          return (
            <g key={i}>
              <rect x={(col + 1) * cell} y={(row + 1) * cell} width={cell} height={cell} fill={c1} />
              <rect x={(5 - col) * cell} y={(row + 1) * cell} width={cell} height={cell} fill={c1} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
