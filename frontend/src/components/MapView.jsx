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
    setCoords(null);

    const controller = new AbortController();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

    fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CafeMatchboxArchive/1.0 (tmonj1@gmail.com)' },
    })
      .then(r => r.json())
      .then(results => {
        if (results.length > 0) {
          setCoords({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [address]);

  // Leaflet マップの初期化・更新
  useEffect(() => {
    if (!coords || !containerRef.current) return;

    const { lat, lng } = coords;
    const zoom = isInJapan(lat, lng) ? 13 : 6;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    mapRef.current.setView([lat, lng], zoom);

    // 既存のマーカーを削除して再追加
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker) layer.remove();
    });
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

  if (!coords) return null;

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: 10,
        height: 200,
        borderRadius: 4,
        border: `0.5px solid ${theme.line}`,
        overflow: 'hidden',
      }}
    />
  );
}
