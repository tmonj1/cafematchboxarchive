import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { TopBar, IconBtn, icons } from '../components/TopBar.jsx';
import { Identicon } from '../components/Identicon.jsx';
import { UserMenu } from '../components/UserMenu.jsx';

function InfoCard({ label, children, theme }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 8, background: theme.panel, marginBottom: 8 }}>
      <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 9,
        color: theme.sub, letterSpacing: '0.2em', marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13,
        color: theme.ink, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export function AccountScreen({ nav, theme, isDesktop }) {
  const { user, logout, updateProfile } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    await api.deleteAccount();
    logout();
    nav('public');
  };

  const handleEditNickname = () => {
    setNicknameInput(user?.nickname || '');
    setError(null);
    setEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ nickname: nicknameInput });
      setEditingNickname(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: theme.bg, minHeight: isDesktop ? '100vh' : '100%' }}>
      <TopBar title="ACCOUNT" theme={theme}
        left={<IconBtn theme={theme} onClick={() => nav('back')}>{icons.back(theme.ink)}</IconBtn>}
        right={<UserMenu nav={nav} theme={theme} />}
      />
      <div style={{ padding: '32px 20px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block' }}>
          <Identicon seed={user?.username || ''} size={80} />
        </div>
        <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 22,
          color: theme.ink, marginTop: 16, fontWeight: 500 }}>
          {user?.nickname || user?.username}
        </div>
        <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 10,
          color: theme.sub, letterSpacing: '0.2em', marginTop: 4 }}>MEMBER</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ padding: '14px 16px', borderRadius: 8, background: theme.panel, marginBottom: 8 }}>
          <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 9,
            color: theme.sub, letterSpacing: '0.2em', marginBottom: 4 }}>NICKNAME</div>
          {editingNickname ? (
            <div>
              <input
                value={nicknameInput}
                onChange={e => setNicknameInput(e.target.value)}
                maxLength={30}
                style={{
                  width: '100%', padding: '6px 0', background: 'transparent',
                  border: 'none', borderBottom: `1px solid ${theme.accent}`,
                  fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13,
                  color: theme.ink, outline: 'none', boxSizing: 'border-box',
                }}
              />
              {error && (
                <div style={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
                  color: theme.accent, marginTop: 6 }}>{error}</div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => setEditingNickname(false)} disabled={saving} style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, border: `0.5px solid ${theme.line}`,
                  background: 'transparent', fontFamily: '"Noto Sans JP", sans-serif',
                  fontSize: 12, color: theme.ink, cursor: 'pointer' }}>キャンセル</button>
                <button onClick={handleSaveNickname} disabled={saving} style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, border: 'none',
                  background: theme.accent, fontFamily: '"Noto Sans JP", sans-serif',
                  fontSize: 12, color: theme.bg, cursor: 'pointer', fontWeight: 500 }}>
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13,
                color: user?.nickname ? theme.ink : theme.sub, lineHeight: 1.6 }}>
                {user?.nickname || '未設定'}
              </div>
              <button onClick={handleEditNickname} style={{
                background: 'transparent', border: 'none', padding: '2px 0',
                fontFamily: '"Work Sans", sans-serif', fontSize: 11,
                color: theme.accent, cursor: 'pointer', letterSpacing: '0.05em' }}>EDIT</button>
            </div>
          )}
        </div>
        <InfoCard label="ログイン名" theme={theme}>{user?.username}</InfoCard>
        <InfoCard label="パスワード" theme={theme}>••••••••••</InfoCard>
      </div>

      <div style={{ padding: '32px 16px 80px' }}>
        {!confirm ? (
          <button onClick={() => setConfirm(true)} style={{
            width: '100%', padding: '14px', borderRadius: 8,
            background: 'transparent', border: `0.5px solid ${theme.accent}`,
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13,
            color: theme.accent, cursor: 'pointer', fontWeight: 500 }}>アカウント削除</button>
        ) : (
          <div style={{ padding: 16, borderRadius: 8,
            background: theme.panel, border: `0.5px solid ${theme.accent}` }}>
            <div style={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12,
              color: theme.ink, lineHeight: 1.7, marginBottom: 16 }}>
              本当に削除しますか？<br />登録した全てのマッチ箱も削除されます。
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirm(false)} style={{
                flex: 1, padding: 10, borderRadius: 6,
                background: 'transparent', border: `0.5px solid ${theme.line}`,
                fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12,
                color: theme.ink, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleDelete} style={{
                flex: 1, padding: 10, borderRadius: 6, border: 'none',
                background: theme.accent,
                fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12,
                color: theme.bg, cursor: 'pointer', fontWeight: 500 }}>削除する</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
