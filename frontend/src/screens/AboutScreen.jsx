import { TopBar, IconBtn, icons } from '../components/TopBar.jsx';
import { UserMenu } from '../components/UserMenu.jsx';

export function AboutScreen({ nav, theme, isDesktop }) {
  return (
    <div style={{ background: theme.bg, minHeight: isDesktop ? '100vh' : '100%' }}>
      <TopBar title="ABOUT" theme={theme}
        left={<IconBtn theme={theme} onClick={() => nav('back')}>{icons.back(theme.ink)}</IconBtn>}
        right={<UserMenu nav={nav} theme={theme} />}
      />
      <div style={{ padding: isDesktop ? '60px 40px 80px' : '40px 24px 60px',
        maxWidth: isDesktop ? 720 : 'none' }}>
        <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 10,
          color: theme.accent, letterSpacing: '0.3em', marginBottom: 12 }}>ABOUT THIS SITE</div>
        <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 24,
          color: theme.ink, fontWeight: 500, lineHeight: 1.4,
          letterSpacing: '0.02em', marginBottom: 28 }}>このサイトについて</div>
        <div style={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13,
          color: theme.ink, lineHeight: 2.0, letterSpacing: '0.02em' }}>
          かつて、どの喫茶店のレジ横にも無料のマッチが置かれていました。
          それは煙草を吸うという実用のためだけでなく、店の顔、小さな広告、
          そしてお客様への心づくしでもありました。
          <br /><br />
          街から喫茶店が消え、マッチの文化も失われつつある今、
          せめてその意匠を、記憶を、分かち合う場所をつくりたい。
          そんな思いで、この蒐集サイトを始めました。
        </div>
        <div style={{ marginTop: 48, paddingTop: 24,
          borderTop: `0.5px solid ${theme.line}`,
          fontFamily: '"Work Sans", sans-serif', fontSize: 10,
          color: theme.sub, letterSpacing: '0.2em', lineHeight: 2 }}>
          CAFE MATCHBOX ARCHIVE<br />
          EST. 2024 · TOKYO
        </div>
      </div>
    </div>
  );
}
