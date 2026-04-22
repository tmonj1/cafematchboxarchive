const ALL_TAGS = ['純喫茶', 'コーヒー', '老舗', '銀座', '新宿', '浅草', '喫茶店', 'レトロ', '昭和', 'ジャズ', '名曲喫茶', '閉店'];

export function TagBar({ selected, onSelect, theme }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
      {[null, ...ALL_TAGS].map(t => {
        const isSel = t === selected;
        return (
          <button key={t || 'all'} onClick={() => onSelect(t)} style={{
            padding: '6px 12px', borderRadius: 100, whiteSpace: 'nowrap',
            border: `0.5px solid ${isSel ? theme.ink : theme.line}`,
            background: isSel ? theme.ink : 'transparent',
            color: isSel ? theme.bg : theme.sub,
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
            fontWeight: 500, cursor: 'pointer', letterSpacing: '0.05em',
          }}>{t || 'すべて'}</button>
        );
      })}
    </div>
  );
}
