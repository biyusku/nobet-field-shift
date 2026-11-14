// Genel bakış haritası: seçili nokta, NASA POWER hücresi ve üç altlık (harita, uydu, NASA MODIS).
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { powerCell } from '../engine/climate';
import { Segmented } from './ui';

type Base = 'osm' | 'uydu' | 'modis';
/** GIBS MODIS gerçek renk katmanı için gösterilen gün (bulutsuz bir yaz günü olması amaçlandı). */
export const MODIS_DATE = '2025-07-15';

const LAYERS: Record<Base, { url: string; options: L.TileLayerOptions }> = {
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları', maxZoom: 19 },
  },
  uydu: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { attribution: 'Uydu görüntüsü &copy; Esri, Maxar, Earthstar Geographics', maxZoom: 18 },
  },
  modis: {
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${MODIS_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    options: { attribution: 'NASA EOSDIS GIBS · MODIS Terra gerçek renk', maxNativeZoom: 9, maxZoom: 12 },
  },
};

export default function OverviewMap({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const overlay = useRef<L.LayerGroup | null>(null);
  const [base, setBase] = useState<Base>('osm');
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, minZoom: 4, maxZoom: 12 });
    map.current = m;
    overlay.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // altlık
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    setTileError(false);
    tiles.current?.remove();
    const t = L.tileLayer(LAYERS[base].url, LAYERS[base].options).addTo(m);
    t.on('tileerror', () => setTileError(true));
    t.bringToBack();
    tiles.current = t;
  }, [base]);

  // nokta ve hücre
  useEffect(() => {
    const m = map.current;
    const g = overlay.current;
    if (!m || !g) return;
    g.clearLayers();
    const c = powerCell(lat, lon);
    const bounds = L.latLngBounds([c.south, c.west], [c.north, c.east]);
    const dark = base !== 'osm';
    L.rectangle(bounds, { color: dark ? '#ffffff' : '#005bd3', weight: 2, dashArray: '6 4', fillColor: dark ? '#ffffff' : '#005bd3', fillOpacity: 0.08 }).addTo(g);
    L.circleMarker([lat, lon], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#d03b3b', fillOpacity: 1 }).bindTooltip(name).addTo(g);
    m.fitBounds(bounds.pad(0.6));
    setTimeout(() => m.invalidateSize(), 50);
  }, [lat, lon, name, base]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Harita altlığı"
          value={base}
          options={[
            { id: 'osm', label: 'Harita' },
            { id: 'uydu', label: 'Uydu' },
            { id: 'modis', label: 'NASA MODIS' },
          ]}
          onChange={setBase}
        />
        <span className="tnum text-[11px] text-ink2">
          {lat.toFixed(2)}° K, {lon.toFixed(2)}° D
        </span>
      </div>
      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-lg">
        <div ref={el} className="absolute inset-0 z-0" />
        <div className="pointer-events-none absolute left-2 top-2 z-[500] max-w-[70%] rounded-md bg-[rgba(17,17,17,.82)] px-2 py-1 text-[11.5px] font-medium leading-snug text-white">
          NASA verisi bu alanın ortalamasıdır (yaklaşık 0,5° × 0,625°, ~55 km)
        </div>
      </div>
      <div className="text-[11px] text-ink2">
        {base === 'modis' && <>NASA GIBS, MODIS Terra gerçek renk, {MODIS_DATE.split('-').reverse().join('.')} günü. Yaklaştıkça bulanıklaşır (250 m çözünürlük). </>}
        {tileError && <span className="font-semibold text-warn-ink">Harita karoları yüklenemedi (ağ bağlantısı?).</span>}
      </div>
    </div>
  );
}
