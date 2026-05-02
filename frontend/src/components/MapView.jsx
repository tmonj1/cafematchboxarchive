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

    const controller = new AbortController();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

    // ブラウザの fetch では User-Agent は Forbidden header のため設定不可
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(results => {
        if (results.length > 0) {
          setCoords({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [address]);

  // Leaflet マップの初期化（coords が揃ったときに毎回新規作成）
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
  }, [coords]);

  // アンマウント時にマップを破棄
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
