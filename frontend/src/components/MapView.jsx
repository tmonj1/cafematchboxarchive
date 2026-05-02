import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vite/bundler 環境での leaflet デフォルトマーカーアイコンのパス問題を修正
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const JAPAN_BOUNDS = { latMin: 24, latMax: 46, lngMin: 122, lngMax: 146 };

function isInJapan(lat, lng) {
  return lat >= JAPAN_BOUNDS.latMin && lat <= JAPAN_BOUNDS.latMax
    && lng >= JAPAN_BOUNDS.lngMin && lng <= JAPAN_BOUNDS.lngMax;
}

// ジオコーダのベース URL（VITE_NOMINATIM_URL で差し替え可能）
const NOMINATIM_BASE = import.meta.env.VITE_NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';

// セッション内の住所→座標キャッシュ（null = 正常レスポンスで 0件ヒット を記録、上限 100 件）
// HTTP エラー・fetch 失敗時はキャッシュしない（一時障害を永続化しない）
const MAX_CACHE_SIZE = 100;
const geocodeCache = new Map();

function setCacheEntry(key, value) {
  if (!geocodeCache.has(key) && geocodeCache.size >= MAX_CACHE_SIZE) {
    geocodeCache.delete(geocodeCache.keys().next().value);
  }
  geocodeCache.set(key, value);
}

export function MapView({ address, theme }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [coords, setCoords] = useState(null);

  // Nominatim でジオコーディング
  useEffect(() => {
    const normalized = address?.trim() ?? '';

    // address が空/空白に変わった場合も旧マップ・coords を確実にクリアする
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    setCoords(null);

    if (!normalized) return;

    // キャッシュヒット時はネットワーク不要（null = 0件ヒット済みも対象）
    if (geocodeCache.has(normalized)) {
      const cached = geocodeCache.get(normalized);
      if (cached !== null) setCoords(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(normalized)}&format=json&limit=1`;

    // ブラウザの fetch では User-Agent は Forbidden header のため設定不可
    fetch(url, { signal: controller.signal })
      .then(r => { if (!r.ok) return undefined; return r.json(); })
      .then(results => {
        if (cancelled) return;
        if (results === undefined) return;  // HTTP エラー時はキャッシュせず終了（一時障害を永続化しない）
        if (!Array.isArray(results)) return;  // 予期しないレスポンス形式はキャッシュせず終了
        if (results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const found = { lat, lng };
            setCacheEntry(normalized, found);
            setCoords(found);
            return;
          }
          return;  // 座標が不正な場合はキャッシュせず静かに終了
        }
        setCacheEntry(normalized, null);  // 正常な配列で length===0 の場合のみネガティブキャッシュ
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [address]);

  // Leaflet マップの初期化（クリーンアップで破棄し coords 変化・アンマウント双方に対応）
  useEffect(() => {
    if (!coords || !containerRef.current) return;

    const { lat, lng } = coords;
    const zoom = isInJapan(lat, lng) ? 13 : 6;

    mapRef.current = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);
    mapRef.current.setView([lat, lng], zoom);
    L.marker([lat, lng]).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coords]);

  // コンテナは常に描画し coords がない間は非表示（同一 DOM ノードを維持）
  return (
    <div
      ref={containerRef}
      style={{
        marginTop: 10,
        height: 200,
        display: coords ? 'block' : 'none',
        borderRadius: 4,
        border: `0.5px solid ${theme.line}`,
        overflow: 'hidden',
      }}
    />
  );
}
