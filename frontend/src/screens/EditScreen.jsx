import { useState } from 'react';
import { api } from '../api/client.js';
import { TopBar, icons } from '../components/TopBar.jsx';
import { Matchbox } from '../components/Matchbox.jsx';

function Field({ label, req, children, theme }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 9,
        color: theme.sub, letterSpacing: '0.2em', marginBottom: 8 }}>
        {label.toUpperCase()}{req && <span style={{ color: theme.accent, marginLeft: 4 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

const inputStyle = (theme) => ({
  width: '100%', padding: '10px 12px', borderRadius: 6, boxSizing: 'border-box',
  background: theme.panel, border: `0.5px solid ${theme.line}`,
  fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13, color: theme.ink, outline: 'none',
});

export function EditScreen({ cafe, nav, theme, isDesktop }) {
  const isNew = !cafe;
  const [draft, setDraft] = useState(cafe || {
    name: '', roman: '', est: '', loc: '', desc: '',
    tags: [], acquired: '', closed: null,
    style: Math.floor(Math.random() * 10),
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const set = (key, val) => setDraft(d => ({ ...d, [key]: val }));

  const addTag = () => {
    if (tagInput.trim() && !draft.tags.includes(tagInput.trim())) {
      set('tags', [...draft.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await api.createMatchbox(draft);
      } else {
        await api.updateMatchbox(cafe.matchboxId, draft);
      }
      nav('back');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !cafe?.matchboxId) return;
    setUploadingImages(true);
    try {
      const result = await api.uploadImage(cafe.matchboxId, file);
      set('imageKeys', [...(draft.imageKeys || []), result.key]);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageDelete = async (key) => {
    if (!cafe?.matchboxId) return;
    await api.deleteImage(cafe.matchboxId, key);
    set('imageKeys', draft.imageKeys.filter(k => k !== key));
  };

  const previewSection = (
    <div style={{ padding: isDesktop ? '0 0 16px' : '16px 60px 8px' }}>
      {draft.name
        ? <Matchbox cafe={draft} size="lg" />
        : <div style={{ aspectRatio: '1 / 1.25', background: theme.panel,
            border: `1px dashed ${theme.line}`, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11, color: theme.sub }}>プレビュー</div>}
    </div>
  );

  const photosSection = (
    <div style={{ padding: isDesktop ? 0 : '12px 16px' }}>
      <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 9,
        color: theme.sub, letterSpacing: '0.2em', marginBottom: 8 }}>PHOTOS (MAX 9)</div>
      <div style={{ display: 'flex', gap: 8, overflowX: isDesktop ? 'visible' : 'auto',
        flexWrap: isDesktop ? 'wrap' : 'nowrap' }}>
        {!isNew && (draft.imageKeys?.length || 0) < 9 && (
          <label style={{ flexShrink: 0, width: 56, aspectRatio: '1 / 1.25',
            borderRadius: 3, background: theme.panel, border: `1px dashed ${theme.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            {icons.upload(theme.sub)}
          </label>
        )}
        {(draft.imageKeys || []).map(key => (
          <div key={key} style={{ position: 'relative', flexShrink: 0, width: 56, aspectRatio: '1 / 1.25' }}>
            <img src={key} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 3 }} />
            <div onClick={() => handleImageDelete(key)} style={{
              position: 'absolute', top: -6, right: -6,
              width: 18, height: 18, borderRadius: 9,
              background: theme.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {icons.close(theme.bg)}
            </div>
          </div>
        ))}
        {uploadingImages && (
          <div style={{ flexShrink: 0, width: 56, aspectRatio: '1 / 1.25', borderRadius: 3,
            background: theme.panel, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Work Sans", sans-serif', fontSize: 9, color: theme.sub }}>...</div>
        )}
        {isNew && (
          <div style={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
            color: theme.sub, display: 'flex', alignItems: 'center' }}>
            保存後に画像を追加できます
          </div>
        )}
      </div>
    </div>
  );

  const fieldsSection = (
    <div style={isDesktop ? {} : { padding: '8px 16px 40px' }}>
      <Field label="店名" req theme={theme}>
        <input value={draft.name} onChange={e => set('name', e.target.value)}
          placeholder="純喫茶 ○○" style={inputStyle(theme)} />
      </Field>
      <Field label="ローマ字" theme={theme}>
        <input value={draft.roman} onChange={e => set('roman', e.target.value)}
          placeholder="CAFE NAME" style={inputStyle(theme)} />
      </Field>
      <Field label="創業年" theme={theme}>
        <input value={draft.est} onChange={e => set('est', e.target.value)}
          placeholder="1965" style={inputStyle(theme)} />
      </Field>
      <Field label="所在地" theme={theme}>
        <input value={draft.loc} onChange={e => set('loc', e.target.value)}
          placeholder="東京都○○区..." style={inputStyle(theme)} />
      </Field>
      <Field label="説明" theme={theme}>
        <textarea value={draft.desc} onChange={e => set('desc', e.target.value)}
          placeholder="お店の雰囲気や思い出を..." rows={3}
          style={{ ...inputStyle(theme), resize: 'none' }} />
      </Field>
      <Field label="取得時期" theme={theme}>
        <input value={draft.acquired} onChange={e => set('acquired', e.target.value)}
          placeholder="1990年春" style={inputStyle(theme)} />
      </Field>
      <Field label="閉店時期" theme={theme}>
        <input value={draft.closed || ''} onChange={e => set('closed', e.target.value || null)}
          placeholder="(未閉店なら空欄)" style={inputStyle(theme)} />
      </Field>
      <Field label="タグ" theme={theme}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {draft.tags.map(t => (
            <span key={t} style={{ padding: '4px 10px 4px 12px', borderRadius: 100,
              background: theme.panel, border: `0.5px solid ${theme.line}`,
              fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11, color: theme.ink,
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {t}
              <span onClick={() => set('tags', draft.tags.filter(x => x !== t))} style={{ cursor: 'pointer' }}>
                {icons.close(theme.sub)}
              </span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="タグを追加" style={inputStyle(theme)} />
          <button onClick={addTag} style={{ padding: '0 14px', borderRadius: 6,
            background: theme.panel, border: `0.5px solid ${theme.line}`,
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
            color: theme.ink, cursor: 'pointer' }}>追加</button>
        </div>
      </Field>
      {!isNew && (
        <button onClick={async () => {
          await api.deleteMatchbox(cafe.matchboxId);
          nav('mygallery');
        }} style={{ marginTop: 32, width: '100%', padding: '12px', borderRadius: 8,
          background: 'transparent', border: `0.5px solid ${theme.accent}`,
          fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12,
          color: theme.accent, cursor: 'pointer' }}>このマッチ箱を削除</button>
      )}
    </div>
  );

  return (
    <div style={{ background: theme.bg, minHeight: isDesktop ? '100vh' : '100%' }}>
      <TopBar title={isNew ? 'NEW MATCH' : 'EDIT'} theme={theme}
        left={<button onClick={() => nav('back')} style={{ background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: '"Noto Sans JP", sans-serif',
          fontSize: 12, color: theme.sub }}>キャンセル</button>}
        right={<button onClick={handleSave} disabled={saving || !draft.name.trim()} style={{
          padding: '4px 12px', borderRadius: 100, border: 'none', background: theme.ink,
          fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11, color: theme.bg,
          cursor: saving || !draft.name.trim() ? 'not-allowed' : 'pointer', fontWeight: 500,
          opacity: saving || !draft.name.trim() ? 0.6 : 1 }}>
          {saving ? '...' : '保存'}
        </button>}
      />
      {isDesktop ? (
        <div style={{ display: 'flex', gap: 48, padding: '24px 40px 60px', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, width: 240 }}>{previewSection}{photosSection}</div>
          <div style={{ flex: 1 }}>{fieldsSection}</div>
        </div>
      ) : (
        <>{previewSection}{photosSection}{fieldsSection}</>
      )}
    </div>
  );
}
