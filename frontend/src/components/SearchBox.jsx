import { icons } from './TopBar.jsx';

export function SearchBox({ value, onChange, theme }) {
  return (
    <div style={{ padding: '8px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: theme.panel, border: `0.5px solid ${theme.line}` }}>
        {icons.search(theme.sub)}
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder="店名・場所で検索、#タグ名でタグ検索"
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13, color: theme.ink }} />
      </div>
    </div>
  );
}
