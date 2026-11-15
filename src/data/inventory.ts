// Girdi dökümü: modele giren her değer ve nereden geldiği. Liste koddan üretilir; etiketler elle yazılmaz.
// Dört sınıf:
//   nasa      NASA POWER'dan indirilen
//   kaynakli  sources.json'da, sayfası bu projede açılıp görülmüş
//   varsayim  kaynağı bulunamamış
//   kurgusal  kooperatif, üyeler, tarlalar, su hakları, alıcı
import { LEVELS, RELIABILITY_FLOOR } from '../engine/curves';
import { DEFAULT_MIN_IRRIGATION, DEFAULT_MIN_PARCEL_DA, SMALL_FARM_DA, YELLOW_FLOOR, type PlanSettings } from '../engine/plan';
import type { Efficiencies, Member, Soil } from '../engine/types';
import type { CropDef } from './crops';
import { COOP_NAME, DEFAULT_SAFE_YEARS, LEGUME_PLAN_SHARE, METHOD_LABEL } from './defaults';
import { DISTRICTS, MEMBER_SEED } from './members';

export type InputClass = 'nasa' | 'kaynakli' | 'varsayim' | 'kurgusal';
export const CLASS_LABEL: Record<InputClass, string> = { nasa: 'NASA verisi', kaynakli: 'Kaynaklı', varsayim: 'Varsayım', kurgusal: 'Kurgusal' };
export const CLASS_ORDER: InputClass[] = ['nasa', 'kaynakli', 'varsayim', 'kurgusal'];

export interface InputRow {
  name: string;
  value: string;
  unit: string;
  cls: InputClass;
  source?: string;
  url?: string;
  /** tablo ya da sayfa */
  table?: string;
}

const POWER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';
const POWER_NAME = 'NASA POWER Daily API (community=AG), NASA Langley Research Center';
const tr = (v: number, d = 0) => v.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (v: number) => String(v).replace('.', ',');

export interface InventoryInput {
  cropDefs: CropDef[];
  soil: Soil;
  eff: Efficiencies;
  settings: PlanSettings;
  members: Member[];
  buyer: string;
  /** veri dosyalarından: gün sayısı ve ilçe rakımları (yoksa satırlar yine listelenir) */
  days?: number;
  elevations?: Record<string, number>;
}

export function buildInventory(inp: InventoryInput): InputRow[] {
  const rows: InputRow[] = [];
  const days = inp.days ? `${DISTRICTS.length} ilçe × ${tr(inp.days)} gün` : `${DISTRICTS.length} ilçe, günlük`;

  // ---- NASA verisi ----
  const params: [string, string, string][] = [
    ['T2M_MAX', 'Günlük en yüksek sıcaklık (2 m)', '°C'],
    ['T2M_MIN', 'Günlük en düşük sıcaklık (2 m)', '°C'],
    ['PRECTOTCORR', 'Günlük yağış (düzeltilmiş)', 'mm/gün'],
    ['ALLSKY_SFC_SW_DWN', 'Yüzeye gelen güneş radyasyonu', 'MJ/m²/gün'],
    ['WS2M', 'Rüzgâr hızı (2 m)', 'm/s'],
    ['RH2M', 'Bağıl nem (2 m)', '%'],
  ];
  for (const [code, name, unit] of params) rows.push({ name: `${name} · ${code}`, value: days, unit, cls: 'nasa', source: POWER_NAME, url: POWER_URL, table: `parametre ${code}` });
  rows.push({
    name: 'Rakım (POWER ızgara hücresi)',
    value: inp.elevations ? DISTRICTS.map((d) => `${d.name} ${tr(inp.elevations![d.id] ?? NaN)}`).join(' · ') : `${DISTRICTS.length} ilçe`,
    unit: 'm',
    cls: 'nasa',
    source: POWER_NAME,
    url: POWER_URL,
    table: 'yanıtta geometry.coordinates[2]',
  });

  // ---- ürün tablosu: alan alan, doğrulandıysa kaynaklı, değilse varsayım ----
  const fields: [keyof Pick<CropDef, 'plant' | 'stages' | 'kc' | 'ky' | 'yieldKgDa' | 'priceTlTon'>, string, string][] = [
    ['plant', 'ekim tarihi', 'gün.ay'],
    ['stages', 'evre süreleri (baş, gelişme, orta, son)', 'gün'],
    ['kc', 'Kc (baş, orta, son)', '-'],
    ['ky', 'Ky (verim tepki katsayısı)', '-'],
    ['yieldKgDa', 'tam sulu verim', 'kg/da'],
    ['priceTlTon', 'fiyat', 'TL/ton'],
  ];
  for (const d of inp.cropDefs) {
    for (const [key, label, unit] of fields) {
      const a = d[key];
      const v = a.value as unknown;
      const value =
        key === 'plant'
          ? `${(v as { day: number; month: number }).day}.${(v as { day: number; month: number }).month}`
          : Array.isArray(v)
            ? v.map((x) => num(x as number)).join(' / ')
            : key === 'priceTlTon' || key === 'yieldKgDa'
              ? tr(v as number)
              : num(v as number);
      rows.push(
        a.verified && a.ref
          ? { name: `${d.name}: ${label}`, value, unit, cls: 'kaynakli', source: a.ref.name, url: a.ref.url, table: a.ref.table }
          : { name: `${d.name}: ${label}`, value, unit, cls: 'varsayim' },
      );
    }
  }
  const names = (f: (d: CropDef) => boolean) => inp.cropDefs.filter(f).map((d) => d.name).join(', ') || 'yok';
  rows.push({ name: 'Baklagil sayılan ürünler', value: names((d) => d.legume), unit: '-', cls: 'varsayim' });
  rows.push({ name: 'Pazarı küçük sayılan ürünler', value: names((d) => d.smallMarket), unit: '-', cls: 'varsayim' });
  rows.push({ name: 'Yalnız sözleşmeyle ve tam sulamayla önerilen ürün', value: names((d) => d.contractOnly), unit: '-', cls: 'varsayim' });
  rows.push({ name: 'Varsayılan olarak öneri dışında tutulan ürün', value: names((d) => d.optIn), unit: '-', cls: 'varsayim' });

  // ---- toprak, randıman, model sabitleri ----
  rows.push({ name: 'Kullanılabilir su kapasitesi (TAW)', value: tr(inp.soil.taw), unit: 'mm', cls: 'varsayim' });
  rows.push({ name: 'İzin verilen boşalma (p)', value: num(inp.soil.p), unit: '-', cls: 'varsayim' });
  for (const k of ['salma', 'yagmurlama', 'damla'] as const) rows.push({ name: `${METHOD_LABEL[k]} sulama randımanı`, value: num(inp.eff[k]), unit: '-', cls: 'varsayim' });
  rows.push({ name: 'Su yılı başında toprak nemi', value: '0,3 × TAW', unit: 'mm', cls: 'varsayim' });
  rows.push({ name: 'Boş tarlada günlük kayıp', value: '0,2 × ET0', unit: 'mm/gün', cls: 'varsayim' });
  rows.push({ name: 'Hasattan önce sulamanın kesildiği süre', value: '10', unit: 'gün', cls: 'varsayim' });
  rows.push({ name: 'Denenen brüt su seviyeleri', value: LEVELS.map((l) => (l === null ? 'tam' : String(l))).join(' / '), unit: 'mm', cls: 'varsayim' });
  rows.push({ name: 'Güvenilirlik eşiği (altı plana girmez)', value: num(RELIABILITY_FLOOR), unit: 'göreli verim', cls: 'varsayim' });
  rows.push({ name: 'İlçe merkezi koordinatları (NASA sorgusu için, yaklaşık)', value: DISTRICTS.map((d) => `${d.name} ${num(d.lat)}°K ${num(d.lon)}°D`).join(' · '), unit: 'derece', cls: 'varsayim' });

  // ---- plan kuralları ----
  const s = inp.settings;
  rows.push({ name: 'Bir ürünün üyedeki en yüksek payı', value: num(+(s.maxShare * 100).toFixed(1)), unit: '%', cls: 'varsayim' });
  rows.push({ name: 'Küçük pazarlı ürün eşiği (kooperatif alanında)', value: s.smallMarketCap === null ? 'kapalı' : num(+(s.smallMarketCap * 100).toFixed(1)), unit: '%', cls: 'varsayim' });
  rows.push({ name: 'Sulanan ürüne verilecek en az su', value: num(+((s.minIrrigationFraction ?? DEFAULT_MIN_IRRIGATION) * 100).toFixed(0)), unit: 'tam ihtiyacın %', cls: 'varsayim' });
  rows.push({ name: `En küçük parsel (tarlası ${SMALL_FARM_DA} dekardan küçük üyede yarısı)`, value: num(s.minParcelDa ?? DEFAULT_MIN_PARCEL_DA), unit: 'da', cls: 'varsayim' });
  rows.push({ name: 'Güvenle söz eşiği', value: `20 yılın ${DEFAULT_SAFE_YEARS}'sı`, unit: 'yıl', cls: 'varsayim' });
  rows.push({ name: 'Nohutlu planda en düşük baklagil payı', value: num(LEGUME_PLAN_SHARE * 100), unit: '%', cls: 'varsayim' });
  rows.push({ name: 'Yıl şeridinde "sarı" eşiği', value: num(YELLOW_FLOOR * 100), unit: 'sözün %', cls: 'varsayim' });
  rows.push({ name: 'Toprak puanı ağırlıkları (baklagil / çeşitlilik / baklagil hedefi)', value: '60 / 40 / 25', unit: 'puan / puan / %', cls: 'varsayim' });

  // ---- kurgusal kooperatif ----
  const m = inp.members;
  const area = m.reduce((x, y) => x + y.areaDa, 0);
  const range = (v: number[]) => (v.length ? `${tr(Math.min(...v))}–${tr(Math.max(...v))}` : '–');
  const byMethod = (['salma', 'yagmurlama', 'damla'] as const).map((k) => `${METHOD_LABEL[k]} ${m.filter((y) => y.method === k).length}`).join(' · ');
  const planted = new Map<string, number>();
  for (const y of m) for (const c of y.current) planted.set(c.cropId, (planted.get(c.cropId) ?? 0) + c.da);
  const cropName = (id: string) => inp.cropDefs.find((d) => d.id === id)?.name ?? id;
  const [cId, cTons] = Object.entries(s.commitments).find(([, t]) => t > 0) ?? ['', 0];
  rows.push({ name: 'Kooperatifin adı', value: COOP_NAME, unit: '-', cls: 'kurgusal' });
  rows.push({ name: 'Üye sayısı', value: tr(m.length), unit: 'üye', cls: 'kurgusal' });
  rows.push({ name: 'Üyelerin ilçelere dağılımı', value: DISTRICTS.map((d) => `${d.name} ${m.filter((y) => y.pointId === d.id).length}`).join(' · '), unit: 'üye', cls: 'kurgusal' });
  rows.push({ name: 'Tarla büyüklükleri (üye başına)', value: `${range(m.map((y) => y.areaDa))}; toplam ${tr(area)}`, unit: 'da', cls: 'kurgusal' });
  rows.push({ name: 'Su hakları (üye başına)', value: `${range(m.map((y) => y.quotaMm))} mm; toplam ${tr(m.reduce((x, y) => x + y.areaDa * y.quotaMm, 0))} m³`, unit: 'mm, m³', cls: 'kurgusal' });
  rows.push({ name: 'Sulama yöntemleri', value: byMethod, unit: 'üye', cls: 'kurgusal' });
  rows.push({ name: 'Bugünkü ekim (ürün başına toplam alan)', value: [...planted].sort((a, b) => b[1] - a[1]).map(([id, v]) => `${cropName(id)} ${tr(v)}`).join(' · '), unit: 'da', cls: 'kurgusal' });
  rows.push({ name: 'Üyelerin haritadaki konumu ve tarla biçimi', value: `${tr(m.filter((y) => y.lat != null).length)} nokta, ilçenin NASA hücresi içinde`, unit: 'enlem, boylam', cls: 'kurgusal' });
  rows.push({ name: 'Pancar sözleşmesi olan üye', value: tr(m.filter((y) => y.beetContract).length), unit: 'üye', cls: 'kurgusal' });
  rows.push({ name: 'Üyeleri üreten rastgele tohum', value: String(MEMBER_SEED), unit: '-', cls: 'kurgusal' });
  rows.push({ name: 'Alıcı', value: inp.buyer || '–', unit: '-', cls: 'kurgusal' });
  rows.push({ name: 'Satış sözü (sözleşme kurgusal; miktar modelle hesaplandı)', value: cId ? `${tr(cTons)} ton ${cropName(cId).toLocaleLowerCase('tr')}` : 'yok', unit: 'ton', cls: 'kurgusal' });
  return rows;
}

export function countByClass(rows: InputRow[]): Record<InputClass, number> {
  const c: Record<InputClass, number> = { nasa: 0, kaynakli: 0, varsayim: 0, kurgusal: 0 };
  for (const r of rows) c[r.cls]++;
  return c;
}

/** Üç ana sayının hangi sınıflardaki girdilere dayandığı (tek cümle; ekranda ve raporda aynı metin). */
export const DEPENDENCE =
  'Üç ana sayının üçü de dört sınıfın hepsine dayanır: hava NASA verisidir; Kc, bazı evre süreleri ve Ky kaynaklıdır; verimler, kalan evre süreleri ve ekim tarihleri, toprak, randıman ve plan kuralları varsayımdır; üyeler, tarlalar ve su hakları kurgusaldır. Brüt gelir ayrıca fiyatlara dayanır (yedi fiyattan ikisi kaynaklı, beşi varsayım); suyu biten üye sayısı ve mısır sözü fiyatlara yalnızca planın ürün seçimi üzerinden bağlıdır.';
