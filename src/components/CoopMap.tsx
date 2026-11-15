// Kooperatif haritası: her üye bir pasta daire (büyüklük dekara, dilimler ürün paylarına göre),
// yakınlaşınca tarla dikdörtgeni; ilçelerin NASA POWER hücreleri; üç altlık.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICTS } from '../data/members';
import { climateSummary, powerCell } from '../engine/climate';
import { FALLOW, type Weather } from '../engine/types';
import { dateOfIndex } from '../engine/weather';
import { cropLabel, getLang, L as tx, memberLabel } from '../i18n';
import { da, fmtDayMonth, int, m3, pct } from '../lib/format';
import { modeParts, type MemberView, type Mode } from '../model';
import { cropColor, Segmented } from './ui';

type Base = 'osm' | 'uydu' | 'modis';
/** GIBS MODIS gerçek renk katmanı için gösterilen gün. */
export const MODIS_DATE = '2025-07-15';
// Altlıklar; kaynak notları seçili dile göre (bu yüzden işlev).
const LAYERS = (): Record<Base, { url: string; options: L.TileLayerOptions }> => ({
  osm: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', options: { attribution: tx('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları', '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'), maxZoom: 19 } },
  uydu: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', options: { attribution: tx('Uydu görüntüsü &copy; Esri, Maxar, Earthstar Geographics', 'Satellite imagery &copy; Esri, Maxar, Earthstar Geographics'), maxZoom: 18 } },
  modis: {
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${MODIS_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    options: { attribution: tx('NASA EOSDIS GIBS · MODIS Terra gerçek renk', 'NASA EOSDIS GIBS · MODIS Terra true colour'), maxNativeZoom: 9, maxZoom: 15 },
  },
});
const LABEL_PANE = 'hucre-etiketleri';
const LABEL_H = 20;
/** Bu yakınlaştırma düzeyinden itibaren daireler yerine tarla dikdörtgenleri çizilir. */
const FIELD_ZOOM = 12;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Üyenin o moddaki ürün payları (alan). */
function shares(mv: MemberView, mode: Mode): { cropId: string; name: string; da: number }[] {
  const by = new Map<string, { cropId: string; name: string; da: number }>();
  for (const p of modeParts(mv, mode).parcels) {
    if (p.areaDa < 0.05) continue;
    const r = by.get(p.crop.id) ?? { cropId: p.crop.id, name: cropLabel(p.crop.id, p.crop.name), da: 0 };
    r.da += p.areaDa;
    by.set(p.crop.id, r);
  }
  const out = [...by.values()].sort((a, b) => b.da - a.da);
  const rest = mv.member.areaDa - out.reduce((s, r) => s + r.da, 0);
  if (rest >= 0.5) out.push({ cropId: FALLOW, name: 'Nadas', da: rest });
  return out;
}

function pieSvg(parts: { cropId: string; da: number }[], r: number, ring: string): string {
  const total = parts.reduce((s, p) => s + p.da, 0) || 1;
  const size = r * 2 + 6;
  const c = size / 2;
  let a0 = -Math.PI / 2;
  let body = '';
  for (const p of parts) {
    const f = p.da / total;
    if (f >= 0.999) {
      body += `<circle cx="${c}" cy="${c}" r="${r}" fill="${cropColor(p.cropId)}"/>`;
      break;
    }
    const a1 = a0 + f * 2 * Math.PI;
    const x0 = c + r * Math.cos(a0);
    const y0 = c + r * Math.sin(a0);
    const x1 = c + r * Math.cos(a1);
    const y1 = c + r * Math.sin(a1);
    body += `<path d="M${c},${c}L${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}Z" fill="${cropColor(p.cropId)}" stroke="#fff" stroke-width="0.8"/>`;
    a0 = a1;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;overflow:visible">${body}<circle cx="${c}" cy="${c}" r="${r + 1}" fill="none" stroke="${ring}" stroke-width="2.5"/></svg>`;
}

export default function CoopMap({
  members,
  mode,
  weathers,
  districtId,
  onDistrict,
  onMember,
}: {
  members: MemberView[];
  mode: Mode;
  weathers: Record<string, Weather>;
  districtId: string;
  onDistrict: (id: string) => void;
  onMember: (id: string) => void;
}) {
  // dil değişince Leaflet içeriği (karolar, etiketler, ipuçları) yeniden çizilsin
  const lang = getLang();
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const cellsLayer = useRef<L.LayerGroup | null>(null);
  const pies = useRef<L.LayerGroup | null>(null);
  const fields = useRef<L.LayerGroup | null>(null);
  const [base, setBase] = useState<Base>('osm');
  const [zoom, setZoom] = useState(8);
  /** harita kaydıkça artar: etiketlerin kenara taşma düzeltmesi yeniden hesaplansın */
  const [view, setView] = useState(0);
  const [tileError, setTileError] = useState(false);
  const cb = useRef({ onDistrict, onMember });
  cb.current = { onDistrict, onMember };

  // hücreler: aynı hücreye düşen ilçeler birleştirilir
  const cells = useMemo(() => {
    const by = new Map<string, { bounds: ReturnType<typeof powerCell>; ids: string[]; names: string[] }>();
    for (const d of DISTRICTS) {
      const b = powerCell(d.lat, d.lon);
      const key = `${b.south},${b.west}`;
      const c = by.get(key) ?? { bounds: b, ids: [], names: [] };
      c.ids.push(d.id);
      c.names.push(d.name);
      by.set(key, c);
    }
    return [...by.values()];
  }, []);
  const climate = useMemo(() => Object.fromEntries(Object.entries(weathers).map(([id, w]) => [id, climateSummary(w)])), [weathers]);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: true, minZoom: 7.5, maxZoom: 15, zoomSnap: 0.25 });
    // hücre etiketleri üye dairelerinin (markerPane, 600) üstünde, ipucunun (650) altında dursun
    L.control.zoom({ position: 'topright' }).addTo(m);
    m.createPane(LABEL_PANE).style.zIndex = '640';
    m.getPane(LABEL_PANE)!.style.pointerEvents = 'none';
    map.current = m;
    cellsLayer.current = L.layerGroup().addTo(m);
    pies.current = L.layerGroup().addTo(m);
    fields.current = L.layerGroup();
    // Konya'ya ortalı: bütün hücreler görünsün
    const all = L.latLngBounds(cells.flatMap((c) => [L.latLng(c.bounds.south, c.bounds.west), L.latLng(c.bounds.north, c.bounds.east)]));
    // üstte etiketlere yer kalsın
    m.fitBounds(all, { paddingTopLeft: [10, LABEL_H + 12], paddingBottomRight: [10, 10] });
    setZoom(m.getZoom());
    m.on('zoomend', () => setZoom(m.getZoom()));
    m.on('moveend zoomend resize', () => setView((v) => v + 1));
    const timer = setTimeout(() => m.invalidateSize(), 60);
    return () => {
      clearTimeout(timer);
      m.remove();
      map.current = null;
    };
  }, [cells]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    setTileError(false);
    tiles.current?.remove();
    const layer = LAYERS()[base];
    const t = L.tileLayer(layer.url, layer.options).addTo(m);
    t.on('tileerror', () => setTileError(true));
    t.bringToBack();
    tiles.current = t;
  }, [base, lang]);

  // NASA hücreleri
  useEffect(() => {
    const g = cellsLayer.current;
    if (!g) return;
    g.clearLayers();
    const dark = base !== 'osm';
    for (const c of cells) {
      const selected = c.ids.includes(districtId);
      const col = dark ? '#ffffff' : '#005bd3';
      const rect = L.rectangle([[c.bounds.south, c.bounds.west], [c.bounds.north, c.bounds.east]], {
        color: col,
        weight: selected ? 2.5 : 1.2,
        dashArray: selected ? undefined : '6 5',
        fillColor: col,
        fillOpacity: selected ? 0.1 : 0.04,
      }).addTo(g);
      rect.on('click', () => cb.current.onDistrict(c.ids[0]));
      // Etiket: dikdörtgenin dışında, sol üst köşesinin hemen üstünde; beyaz yarı saydam kutu; dairelerin üstündeki katmanda.
      // Metin hep tam yazılır. Köşe görünümün dışına çıkarsa etiket, hücre görünürken haritanın içinde kalacak
      // biçimde kaydırılır (sağda yakınlaştırma düğmelerine yer bırakılır); hücre hiç görünmüyorsa etiket çizilmez.
      const m = map.current;
      const text = `${tx('NASA hücresi', 'NASA cell')} · ${c.names.join(' + ')}`;
      const estWidth = Math.ceil(text.length * 6.4) + 14;
      let dx = 0;
      let dy = -(LABEL_H + 3); // köşenin hemen üstü
      if (m) {
        const nw = m.latLngToContainerPoint([c.bounds.north, c.bounds.west]);
        const se = m.latLngToContainerPoint([c.bounds.south, c.bounds.east]);
        const size = m.getSize();
        if (se.x < 0 || nw.x > size.x || se.y < 0 || nw.y > size.y) continue;
        dx = Math.min(0, size.x - 50 - (nw.x + estWidth));
        if (nw.x + dx < 6) dx = 6 - nw.x;
        if (nw.y + dy < 4) dy = 4 - nw.y;
      }
      const label = L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="cell-label" title="${tx('NASA POWER hücresi', 'NASA POWER cell')}: ${esc(c.names.join(' + '))}" style="position:absolute;left:${dx}px;top:${dy}px;box-sizing:border-box;height:${LABEL_H}px;padding:0 6px;white-space:nowrap;border-radius:5px;background:rgba(255,255,255,.86);border:1px solid rgba(0,64,143,.35);box-shadow:0 1px 2px rgba(0,0,0,.12);font:600 11px/${LABEL_H - 2}px Inter,system-ui,sans-serif;color:#00408f">${esc(text)}</div>`,
      });
      L.marker([c.bounds.north, c.bounds.west], { icon: label, interactive: false, keyboard: false, pane: LABEL_PANE }).addTo(g);
    }
  }, [cells, districtId, base, zoom, view, lang]);

  // üyeler: pasta daireler ve tarla dikdörtgenleri
  useEffect(() => {
    const gp = pies.current;
    const gf = fields.current;
    if (!gp || !gf) return;
    gp.clearLayers();
    gf.clearLayers();
    // büyükler altta kalsın, küçükler tıklanabilsin
    const scale = zoom < 8.75 ? 0.72 : zoom < 9.75 ? 0.85 : 1;
    const sorted = [...members].filter((mv) => mv.member.lat != null && mv.member.lon != null).sort((a, b) => b.member.areaDa - a.member.areaDa);
    for (const mv of sorted) {
      const m = mv.member;
      const lat = m.lat!;
      const lon = m.lon!;
      const { ev, water } = modeParts(mv, mode);
      const parts = shares(mv, mode);
      const y = ev.years[ev.medianIndex];
      const end = ev.yearsExceeded > 0 && y?.endDay != null ? dateOfIndex(mv.weather, y.start + y.endDay) : null;
      const cl = climate[m.pointId ?? ''];
      const tip =
        `<div style="font:13px Inter,system-ui,sans-serif;min-width:210px;line-height:1.45">` +
        `<div style="font-weight:650">${esc(memberLabel(m.name))} <span style="font-weight:500;color:#b4231a;background:#fedad9;border-radius:8px;padding:0 6px;font-size:11px">${tx('kurgusal', 'fictional')}</span></div>` +
        `<div style="color:#616161;font-size:12px">${da(m.areaDa)} da · ${tx('su hakkı', 'water allowance')} ${m3(mv.quotaM3)}${mode === 'scatter' && mv.scatterCrop ? tx(' · söz bu üyeye verildi', ' · commitment given to this member') : ''}</div>` +
        `<div style="margin-top:4px">${parts.map((p) => `<span style="white-space:nowrap"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cropColor(p.cropId)};margin-right:4px"></i>${esc(p.name)} ${da(p.da)} da</span>`).join('<br>')}</div>` +
        `<div style="margin-top:4px">${end ? `<b style="color:#b4231a">${tx(`Su ${fmtDayMonth(end)} bitiyor`, `Water runs out on ${fmtDayMonth(end)}`)}</b>` : `<b style="color:#0c7a43">${tx('Su hakkı aşılmıyor', 'Water allowance not exceeded')}</b>`} · ${tx('beklenen verim', 'expected yield')} <b>${pct(water.yieldLevel)}</b></div>` +
        (cl ? `<div style="margin-top:4px;color:#616161;font-size:12px;border-top:1px solid #e3e3e3;padding-top:4px">${tx(`NASA hücresi (${esc(mv.weather.name)}): yılda ${int(cl.meanPrec)} mm yağış · temmuz ET0 ${int(cl.months[6].et0)} mm`, `NASA cell (${esc(mv.weather.name)}): ${int(cl.meanPrec)} mm rain a year · July ET0 ${int(cl.months[6].et0)} mm`)}</div>` : '') +
        `</div>`;
      // uzaktan bakarken daireler küçülür ki üst üste binmesin
      const r = Math.round((7 + 11 * Math.sqrt(Math.min(1, m.areaDa / 400))) * scale);
      const size = r * 2 + 6;
      const marker = L.marker([lat, lon], {
        icon: L.divIcon({ className: 'coop-pie', iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: pieSvg(parts, r, end ? '#d03b3b' : '#ffffff') }),
        title: memberLabel(m.name),
        riseOnHover: true,
      }).addTo(gp);
      marker.bindTooltip(tip, { direction: 'auto', offset: [r, 0], opacity: 1 });
      marker.on('click', () => cb.current.onMember(m.id));

      // tarla: gerçek alanında bir kare (1 da = 1000 m²), ürün paylarına göre şeritler
      const side = Math.sqrt(m.areaDa * 1000);
      const dLat = side / 111320;
      const dLon = side / (111320 * Math.cos((lat * Math.PI) / 180));
      let x = lon - dLon / 2;
      for (const p of parts) {
        const wdt = dLon * (p.da / m.areaDa);
        const rect = L.rectangle([[lat - dLat / 2, x], [lat + dLat / 2, x + wdt]], { color: end ? '#d03b3b' : '#ffffff', weight: 1.5, fillColor: cropColor(p.cropId), fillOpacity: 0.85 }).addTo(gf);
        rect.bindTooltip(tip, { sticky: true, opacity: 1 });
        rect.on('click', () => cb.current.onMember(m.id));
        x += wdt;
      }
    }
  }, [members, mode, climate, zoom < 8.75 ? 8 : zoom < 9.75 ? 9 : 10, lang]);

  // yakınlaşınca daireden tarlaya geç
  useEffect(() => {
    const m = map.current;
    if (!m || !pies.current || !fields.current) return;
    const showFields = zoom >= FIELD_ZOOM;
    if (showFields) {
      m.removeLayer(pies.current);
      m.addLayer(fields.current);
    } else {
      m.removeLayer(fields.current);
      m.addLayer(pies.current);
    }
  }, [zoom]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex justify-end">
        <Segmented
          label={tx('Harita altlığı', 'Base map')}
          value={base}
          options={[
            { id: 'osm', label: tx('Harita', 'Map') },
            { id: 'uydu', label: tx('Uydu', 'Satellite') },
            { id: 'modis', label: 'NASA MODIS' },
          ]}
          onChange={setBase}
        />
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg">
        <div ref={el} className="absolute inset-0 z-0" />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink2">
        <span className="flex items-center gap-1.5">
          <svg width="16" height="16" aria-hidden>
            <circle cx="8" cy="8" r="5.5" fill="var(--sunken)" stroke="#d03b3b" strokeWidth="2.5" />
          </svg>
          {tx('kırmızı halka: su sezon ortasında bitiyor', 'red ring: water runs out mid-season')}
        </span>
        <span>{tx('daire büyüklüğü: dekar · dilimler: ürün payı', 'circle size: decares · slices: crop share')}</span>
        <span>{zoom >= FIELD_ZOOM ? tx('tarlalar gerçek alanında kare olarak çizili (konum ve biçim kurgusal)', 'fields drawn as squares at their real area (location and shape fictional)') : tx('yakınlaşınca tarla dikdörtgeni görünür', 'zoom in to see field rectangles')}</span>
        {base === 'modis' && <span>NASA GIBS, MODIS Terra, {MODIS_DATE.split('-').reverse().join('.')}</span>}
        {tileError && <span className="font-semibold text-warn-ink">{tx('Harita karoları yüklenemedi (ağ bağlantısı?).', 'Map tiles could not be loaded (network connection?).')}</span>}
      </div>
    </div>
  );
}
