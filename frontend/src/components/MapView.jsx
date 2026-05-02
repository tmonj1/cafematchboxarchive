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

// セッション内の住所→座標キャッシュ（同一住所の重複リクエストを防止、上限 100 件）
const MAX_CACHE_SIZE = 100;
const geocodeCache = new Map();

function setCacheEntry(key, value) {
  if (geocodeCache.size >= MAX_CACHE_SIZE) {
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
    if (!address) return;

    // 住所変更時に旧マップを破棄してコンテナを再利用できる状態にする
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    setCoords(null);

    // キャッシュヒット時はネットワーク不要
    const cached = geocodeCache.get(address);
    if (cached) {
      setCoords(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

    // ブラウザの fetch では User-Agent は Forbidden header のため設定不可
    fetch(url, { signal: controller.signal })
      .then(r => { if (!r.ok) return undefined; return r.json(); })
      .then(results => {
        if (!results || cancelled) return;
        if (results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const found = { lat, lng };
            setCacheEntry(address, found);
            setCoords(found);
          }
        }
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
