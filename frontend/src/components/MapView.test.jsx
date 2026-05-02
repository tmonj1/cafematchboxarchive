import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Leaflet を完全にモック（happy-dom は canvas/WebGL 非対応のため）
vi.mock('leaflet', () => {
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  return {
    default: {
      map: vi.fn(() => mockMap),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      marker: vi.fn(() => ({ addTo: vi.fn() })),
      Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
    },
  };
});
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: '' }));
vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: '' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: '' }));

import { MapView } from './MapView.jsx';
import L from 'leaflet';

const theme = { line: '#ccc' };

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('HTTP エラー時は地図を表示しない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const { container } = render(<MapView address="東京都渋谷区" theme={theme} />);
    await waitFor(() => {
      expect(container.firstChild.style.display).toBe('none');
    });
  });

  it('0件ヒット時は地図を表示しない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
    const { container } = render(<MapView address="存在しない架空の住所zzz999" theme={theme} />);
    await waitFor(() => {
      expect(container.firstChild.style.display).toBe('none');
    });
  });

  it('日本の座標でジオコーディング成功時は zoom 13 で地図を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '35.6585', lon: '139.7454' }],
    }));
    const { container } = render(<MapView address="東京都港区_test1" theme={theme} />);
    await waitFor(() => {
      expect(container.firstChild.style.display).toBe('block');
    });
    expect(L.map).toHaveBeenCalled();
    expect(L.map().setView).toHaveBeenCalledWith([35.6585, 139.7454], 13);
  });

  it('海外の座標でジオコーディング成功時は zoom 6 で地図を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '48.8566', lon: '2.3522' }],
    }));
    const { container } = render(<MapView address="Paris_France_test1" theme={theme} />);
    await waitFor(() => {
      expect(container.firstChild.style.display).toBe('block');
    });
    expect(L.map().setView).toHaveBeenCalledWith([48.8566, 2.3522], 6);
  });
});
