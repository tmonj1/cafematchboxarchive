import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { TopBar, IconBtn, icons } from '../components/TopBar.jsx';
import { Matchbox } from '../components/Matchbox.jsx';
import { UserMenu } from '../components/UserMenu.jsx';
import { MapView } from '../components/MapView.jsx';

function InfoRow({ label, children, theme }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 9,
        color: theme.sub, letterSpacing: '0.2em', marginBottom: 6 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13,
        color: theme.ink, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

export function CafeDetail({ cafeId, nav, theme, isDesktop }) {
  const { user } = useAuth();
  const [cafe, setCafe] = useState(null);
  const [selectedImg, setSelectedImg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMatchbox(cafeId).then(data => {
      setCafe(data);
      setLoading(false);
    });
  }, [cafeId]);

  if (loading || !cafe) {
    return (
      <div style={{ background: theme.bg, minHeight: '100%', padding: 40,
        fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12, color: theme.sub }}>
        読み込み中...
      </div>
    );
  }

  const hasImages = cafe.imageKeys?.length > 0 && cafe.imageUrls?.length === cafe.imageKeys?.length;
  const isOwner = !!user && user.sub === cafe.userId;

  const thumbnails = (
    <div style={{ display: 'flex', gap: 8, padding: isDesktop ? '16px 0' : '0 16px 16px', overflowX: 'auto' }}>
      {hasImages ? cafe.imageKeys.map((key, i) => (
        <img key={key} src={cafe.imageUrls[i]} alt={`photo-${i}`}
          onClick={() => setSelectedImg(i)}
          style={{ flexShrink: 0, width: 56, aspectRatio: '1 / 1.25', objectFit: 'cover',
            borderRadius: 3, cursor: 'pointer',
            border: i === selectedImg ? `1.5px solid ${theme.accent}` : `0.5px solid ${theme.line}` }} />
      )) : (
        ['FRONT', 'BACK', 'SIDE', '+1'].map((label, i) => (
          <div key={label} style={{ flexShrink: 0, width: 56, aspectRatio: '1 / 1.25',
            borderRadius: 3, background: theme.panel,
            border: i === 0 ? `1.5px solid ${theme.accent}` : `0.5px solid ${theme.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Work Sans", sans-serif', fontSize: 9,
            color: theme.sub, letterSpacing: '0.1em' }}>{label}</div>
        ))
      )}
    </div>
  );

  const heroSection = hasImages ? (
    <div style={{ padding: isDesktop ? 0 : '24px 48px 16px',
      background: isDesktop ? 'transparent' : `linear-gradient(to bottom, ${theme.panel}, ${theme.bg})` }}>
      <img src={cafe.imageUrls[selectedImg]} alt={cafe.name}
        style={{ width: '100%', aspectRatio: '1 / 1.25', objectFit: 'cover', borderRadius: 3 }} />
    </div>
  ) : (
    <div style={{ padding: isDesktop ? 0 : '24px 48px 16px',
      background: isDesktop ? 'transparent' : `linear-gradient(to bottom, ${theme.panel}, ${theme.bg})` }}>
      <Matchbox cafe={cafe} size="xl" />
    </div>
  );

  const infoBlock = (
    <div style={{ padding: isDesktop ? 0 : '8px 20px 40px' }}>
      <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 10,
        color: theme.accent, letterSpacing: '0.3em' }}>{cafe.roman} · EST. {cafe.est}</div>
      <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: isDesktop ? 32 : 26,
        color: theme.ink, fontWeight: 600, marginTop: 6, letterSpacing: '0.02em' }}>{cafe.name}</div>
      {cafe.closed && (
        <div style={{ display: 'inline-block', marginTop: 10, padding: '3px 10px', borderRadius: 2,
          background: theme.accent, color: theme.bg,
          fontFamily: '"Noto Sans JP", sans-serif', fontSize: 10, letterSpacing: '0.1em' }}>
          {cafe.closed} 閉店
        </div>
      )}
      {cafe.loc && <InfoRow label="所在地" theme={theme}>{cafe.loc}</InfoRow>}
      {cafe.loc && <MapView address={cafe.loc} theme={theme} />}
      {cafe.desc && <InfoRow label="説明" theme={theme}>{cafe.desc}</InfoRow>}
      {cafe.acquired && <InfoRow label="取得時期" theme={theme}>{cafe.acquired}</InfoRow>}
      {cafe.tags?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 9,
            color: theme.sub, letterSpacing: '0.2em', marginBottom: 8 }}>TAGS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cafe.tags.map(t => (
              <span key={t} style={{ padding: '4px 10px', borderRadius: 100,
                border: `0.5px solid ${theme.line}`,
                fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11, color: theme.sub }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ background: theme.bg, minHeight: isDesktop ? '100vh' : '100%' }}>
      <TopBar title="マッチ箱" theme={theme}
        left={<IconBtn theme={theme} onClick={() => nav('back')}>{icons.back(theme.ink)}</IconBtn>}
        right={isOwner ? (
          <button onClick={() => nav('edit', { cafe })} style={{
            padding: '4px 10px', borderRadius: 100,
            border: `0.5px solid ${theme.ink}`, background: 'transparent',
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
            color: theme.ink, cursor: 'pointer', fontWeight: 500 }}>編集</button>
        ) : user ? (
          <UserMenu nav={nav} theme={theme} />
        ) : null}
      />
      {isDesktop ? (
        <div style={{ display: 'flex', gap: 48, padding: '32px 40px 60px', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, width: 280 }}>{heroSection}{thumbnails}</div>
          <div style={{ flex: 1 }}>{infoBlock}</div>
        </div>
      ) : (
        <>{heroSection}{thumbnails}{infoBlock}<div style={{ height: 40 }} /></>
      )}
    </div>
  );
}
