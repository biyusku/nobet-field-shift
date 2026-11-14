// Haritadan nokta seçimi (Leaflet + OpenStreetMap). Yalnız açıldığında yüklenir.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { PRESET_POINTS } from '../data/defaults';

export default function MapModal({ initial, onPick, onClose }: { initial: { lat: number; lon: number }; onPick: (lat: number, lon: number) => void; onClose: () => void }) {
  const el = useRef<HTMLDivElement | null>(null);
  const [pt, setPt] = useState<{ lat: number; lon: number } | null>(null);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { center: [initial.lat, initial.lon], zoom: 7, minZoom: 3, maxZoom: 12 });
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları',
      maxZoom: 19,
    }).addTo(map);
    tiles.on('tileerror', () => setTileError(true));
    for (const p of PRESET_POINTS) {
      L.circleMarker([p.lat, p.lon], { radius: 6, color: '#52514e', weight: 2, fillColor: '#fcfcfb', fillOpacity: 1 }).bindTooltip(`${p.name} (hazır veri)`).addTo(map);
    }
    let marker: L.CircleMarker | null = null;
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = +e.latlng.lat.toFixed(2);
      const lon = +(((e.latlng.lng + 540) % 360) - 180).toFixed(2);
      if (marker) marker.remove();
      marker = L.circleMarker([lat, lon], { radius: 8, color: '#d03b3b', weight: 3, fillColor: '#d03b3b', fillOpacity: 0.35 }).addTo(map);
      setPt({ lat, lon });
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    setTimeout(() => map.invalidateSize(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Haritadan nokta seç" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-[760px] flex-col rounded-lg border border-line bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="m-0 text-[17px] font-semibold">Haritadan nokta seç</h2>
          <button type="button" className="btn" onClick={onClose}>
            Vazgeç
          </button>
        </div>
        <p className="m-0 mb-2 text-[13px] text-ink2">
          Haritaya tıklayın. Seçilen noktanın 2004-2025 günlük verisi NASA POWER'dan tarayıcınıza indirilir (genellikle 5-30 saniye) ve bu tarayıcıda saklanır. Veri yaklaşık 55 km çözünürlüklüdür:
          yakın noktalar aynı sonucu verebilir.
        </p>
        <div ref={el} className="h-[52vh] min-h-[260px] w-full rounded-md border border-line" />
        {tileError && <p className="m-0 mt-2 text-[12.5px] text-warn-ink">Harita karoları yüklenemedi (ağ bağlantısı?). Koordinat seçimi yine de çalışır, ama haritayı göremeyebilirsiniz.</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13.5px] tnum">{pt ? `Seçilen: ${pt.lat.toFixed(2)}° K, ${pt.lon.toFixed(2)}° D` : 'Henüz nokta seçilmedi.'}</span>
          <button type="button" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40" disabled={!pt} onClick={() => pt && onPick(pt.lat, pt.lon)}>
            Bu noktayı kullan
          </button>
        </div>
      </div>
    </div>
  );
}
