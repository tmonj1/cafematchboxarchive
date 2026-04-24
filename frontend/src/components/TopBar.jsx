export function TopBar({ title, left, right, theme }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
      padding: '12px 16px', minHeight: 48,
      borderBottom: `0.5px solid ${theme.line}`,
      background: theme.bg,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>{left}</div>
      <div style={{
        fontFamily: '"Noto Sans JP", sans-serif', fontSize: 15, fontWeight: 600,
        color: theme.ink, letterSpacing: '0.05em', whiteSpace: 'nowrap',
      }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>{right}</div>
    </div>
  );
}

export function IconBtn({ children, onClick, theme }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      padding: 6, color: theme.ink, display: 'flex', alignItems: 'center',
    }}>{children}</button>
  );
}

export const icons = {
  back: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  search: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.8" /><path d="M20 20l-4-4" stroke={c} strokeWidth="1.8" strokeLinecap="round" /></svg>,
  close: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="1.8" strokeLinecap="round" /></svg>,
  upload: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 16V5m0 0l-4 4m4-4l4 4M5 19h14" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  trash: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13M9 7V4h6v3" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};
