const MATCH_STYLES = [
  { bg: '#c9a84a', fg: '#2a1810', accent: '#8b2d1a', pattern: 'stripes' },
  { bg: '#2a3d2f', fg: '#e8dcc0', accent: '#c9a84a', pattern: 'border' },
  { bg: '#8b2d1a', fg: '#f4e9d0', accent: '#c9a84a', pattern: 'diamond' },
  { bg: '#e8dcc0', fg: '#2a1810', accent: '#6b4423', pattern: 'arch' },
  { bg: '#3a4a5c', fg: '#e8dcc0', accent: '#c9a84a', pattern: 'circle' },
  { bg: '#d4a574', fg: '#3d2a1e', accent: '#2a3d2f', pattern: 'double' },
  { bg: '#1a1a1a', fg: '#c9a84a', accent: '#e8dcc0', pattern: 'stripes' },
  { bg: '#f4e9d0', fg: '#8b2d1a', accent: '#2a3d2f', pattern: 'circle' },
  { bg: '#6b7066', fg: '#f4e9d0', accent: '#c9a84a', pattern: 'border' },
  { bg: '#8b6f47', fg: '#f4e9d0', accent: '#e8dcc0', pattern: 'diamond' },
];

const DIMS = {
  sm: { w: '100%', aspect: '1 / 1.25', fs1: 14, fs2: 9, pad: 10 },
  md: { w: '100%', aspect: '1 / 1.25', fs1: 18, fs2: 11, pad: 14 },
  lg: { w: '100%', aspect: '1 / 1.25', fs1: 24, fs2: 13, pad: 18 },
  xl: { w: '100%', aspect: '1 / 1.25', fs1: 32, fs2: 15, pad: 24 },
};

function Decoration({ s }) {
  const { accent } = s;
  switch (s.pattern) {
    case 'stripes':
      return (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '18%',
            backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0 6px, transparent 6px 12px)`,
            opacity: 0.9 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '18%',
            backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0 6px, transparent 6px 12px)`,
            opacity: 0.9 }} />
        </>
      );
    case 'border':
      return <div style={{ position: 'absolute', inset: '8%', border: `1.5px solid ${accent}`, borderRadius: 2 }} />;
    case 'diamond':
      return (
        <div style={{ position: 'absolute', inset: '10%', border: `1.5px solid ${accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '60%', aspectRatio: '1', border: `1px solid ${accent}`, transform: 'rotate(45deg)', opacity: 0.5 }} />
        </div>
      );
    case 'arch':
      return (
        <div style={{ position: 'absolute', inset: '10% 12%', border: `1.5px solid ${accent}`,
          borderRadius: '50% 50% 2px 2px / 30% 30% 2px 2px' }} />
      );
    case 'circle':
      return (
        <div style={{ position: 'absolute', inset: '50% 0 0 0',
          display: 'flex', justifyContent: 'center', transform: 'translateY(-55%)' }}>
          <div style={{ width: '58%', aspectRatio: '1', borderRadius: '50%', border: `1.5px solid ${accent}` }} />
        </div>
      );
    case 'double':
      return (
        <>
          <div style={{ position: 'absolute', inset: '8%', border: `1.5px solid ${accent}` }} />
          <div style={{ position: 'absolute', inset: '12%', border: `0.5px solid ${accent}`, opacity: 0.6 }} />
        </>
      );
    default:
      return null;
  }
}

export function Matchbox({ cafe, size = 'sm' }) {
  const s = MATCH_STYLES[(cafe.style || 0) % MATCH_STYLES.length];
  const dims = DIMS[size] || DIMS.sm;
  return (
    <div style={{
      width: dims.w, aspectRatio: dims.aspect,
      background: s.bg, color: s.fg, borderRadius: 3,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.05)',
      fontFamily: '"Noto Serif JP", serif',
    }}>
      <div style={{ position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08), transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(0,0,0,0.08), transparent 50%)`,
        pointerEvents: 'none' }} />
      <Decoration s={s} />
      <div style={{ position: 'absolute', inset: 0, padding: dims.pad,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: dims.pad * 0.3 }}>
        <div style={{ fontSize: dims.fs2, letterSpacing: '0.2em',
          fontFamily: '"Work Sans", sans-serif', fontWeight: 500,
          opacity: 0.85, textTransform: 'uppercase' }}>{cafe.roman}</div>
        <div style={{ fontSize: dims.fs1, fontWeight: 700, lineHeight: 1.15, letterSpacing: '0.05em' }}>{cafe.name}</div>
        <div style={{ fontSize: dims.fs2 * 0.85, fontFamily: '"Work Sans", sans-serif',
          opacity: 0.7, marginTop: dims.pad * 0.2, letterSpacing: '0.15em' }}>est. {cafe.est}</div>
      </div>
    </div>
  );
}
