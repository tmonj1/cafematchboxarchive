import { Matchbox } from './Matchbox.jsx';

export function MatchGrid({ items, onItemClick, layout, theme, isDesktop }) {
  if (isDesktop) {
    return (
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 24, padding: '0 24px' }}>
        {items.map(c => (
          <div key={c.matchboxId} onClick={() => onItemClick(c)} style={{ cursor: 'pointer' }}>
            <Matchbox cafe={c} size="sm" />
            <div style={{ fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 13, color: theme.ink, marginTop: 10, fontWeight: 500 }}>{c.name}</div>
            <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 10,
              color: theme.sub, marginTop: 3, letterSpacing: '0.1em' }}>{c.roman}</div>
          </div>
        ))}
      </div>
    );
  }
  if (layout === 'uniform') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: '0 16px' }}>
        {items.map(c => (
          <div key={c.matchboxId} onClick={() => onItemClick(c)} style={{ cursor: 'pointer' }}>
            <Matchbox cafe={c} size="sm" />
            <div style={{ fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 12, color: theme.ink, marginTop: 8, fontWeight: 500 }}>{c.name}</div>
          </div>
        ))}
      </div>
    );
  }
  // mosaic
  return (
    <div style={{ columnCount: 2, columnGap: 12, padding: '0 16px' }}>
      {items.map((c, i) => {
        const big = i % 5 === 0 || i % 7 === 3;
        return (
          <div key={c.matchboxId} onClick={() => onItemClick(c)}
            style={{ breakInside: 'avoid', marginBottom: 18, cursor: 'pointer' }}>
            <Matchbox cafe={c} size={big ? 'md' : 'sm'} />
            <div style={{ fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: big ? 13 : 12, color: theme.ink, marginTop: 8, fontWeight: 500 }}>{c.name}</div>
            <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 10,
              color: theme.sub, marginTop: 2, letterSpacing: '0.08em' }}>{c.roman}</div>
          </div>
        );
      })}
    </div>
  );
}
