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
import { DEFAULT_SAFE_YEARS, LEGUME_PLAN_SHARE, METHOD_LABEL } from './defaults';
import { DISTRICTS, MEMBER_SEED } from './members';
import { srcName, srcTable } from './sourcesEn';
import { buyerLabel, coopLabel, cropLabel, L, locale, lower } from '../i18n';

export type InputClass = 'nasa' | 'kaynakli' | 'varsayim' | 'kurgusal';
/** Sınıf adları; seçili dile göre (Türkçe çıktı değişmez: MCP ve kanit betiği Türkçe çalışır). */
export const CLASS_LABEL: Readonly<Record<InputClass, string>> = {
  get nasa() {
    return L('NASA verisi', 'NASA data');
  },
  get kaynakli() {
    return L('Kaynaklı', 'Sourced');
  },
  get varsayim() {
    return L('Varsayım', 'Assumption');
  },
  get kurgusal() {
    return L('Kurgusal', 'Fictional');
  },
};
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
const tr = (v: number, d = 0) => v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (v: number) => L(String(v).replace('.', ','), String(v));

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
  const days = inp.days
    ? L(`${DISTRICTS.length} ilçe × ${tr(inp.days)} gün`, `${DISTRICTS.length} districts × ${tr(inp.days)} days`)
    : L(`${DISTRICTS.length} ilçe, günlük`, `${DISTRICTS.length} districts, daily`);

  // ---- NASA verisi ----
  const params: [string, string, string][] = [
    ['T2M_MAX', L('Günlük en yüksek sıcaklık (2 m)', 'Daily maximum temperature (2 m)'), '°C'],
    ['T2M_MIN', L('Günlük en düşük sıcaklık (2 m)', 'Daily minimum temperature (2 m)'), '°C'],
    ['PRECTOTCORR', L('Günlük yağış (düzeltilmiş)', 'Daily precipitation (corrected)'), L('mm/gün', 'mm/day')],
    ['ALLSKY_SFC_SW_DWN', L('Yüzeye gelen güneş radyasyonu', 'Surface solar radiation'), L('MJ/m²/gün', 'MJ/m²/day')],
    ['WS2M', L('Rüzgâr hızı (2 m)', 'Wind speed (2 m)'), 'm/s'],
    ['RH2M', L('Bağıl nem (2 m)', 'Relative humidity (2 m)'), '%'],
  ];
  for (const [code, name, unit] of params) rows.push({ name: `${name} · ${code}`, value: days, unit, cls: 'nasa', source: POWER_NAME, url: POWER_URL, table: L(`parametre ${code}`, `parameter ${code}`) });
  rows.push({
    name: L('Rakım (POWER ızgara hücresi)', 'Elevation (POWER grid cell)'),
    value: inp.elevations ? DISTRICTS.map((d) => `${d.name} ${tr(inp.elevations![d.id] ?? NaN)}`).join(' · ') : L(`${DISTRICTS.length} ilçe`, `${DISTRICTS.length} districts`),
    unit: 'm',
    cls: 'nasa',
    source: POWER_NAME,
    url: POWER_URL,
    table: L('yanıtta geometry.coordinates[2]', 'geometry.coordinates[2] in the response'),
  });

  // ---- ürün tablosu: alan alan, doğrulandıysa kaynaklı, değilse varsayım ----
  const fields: [keyof Pick<CropDef, 'plant' | 'stages' | 'kc' | 'ky' | 'yieldKgDa' | 'priceTlTon'>, string, string][] = [
    ['plant', L('ekim tarihi', 'sowing date'), L('gün.ay', 'day.month')],
    ['stages', L('evre süreleri (baş, gelişme, orta, son)', 'stage lengths (initial, development, mid, late)'), L('gün', 'days')],
    ['kc', L('Kc (baş, orta, son)', 'Kc (initial, mid, end)'), '-'],
    ['ky', L('Ky (verim tepki katsayısı)', 'Ky (yield response factor)'), '-'],
    ['yieldKgDa', L('tam sulu verim', 'fully irrigated yield'), 'kg/da'],
    ['priceTlTon', L('fiyat', 'price'), 'TL/ton'],
  ];
  for (const d of inp.cropDefs) {
    const dName = cropLabel(d.id, d.name);
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
          ? { name: `${dName}: ${label}`, value, unit, cls: 'kaynakli', source: srcName(a.ref.name), url: a.ref.url, table: srcTable(a.ref.table) }
          : { name: `${dName}: ${label}`, value, unit, cls: 'varsayim' },
      );
    }
  }
  const names = (f: (d: CropDef) => boolean) => inp.cropDefs.filter(f).map((d) => cropLabel(d.id, d.name)).join(', ') || L('yok', 'none');
  rows.push({ name: L('Baklagil sayılan ürünler', 'Crops counted as legumes'), value: names((d) => d.legume), unit: '-', cls: 'varsayim' });
  rows.push({ name: L('Pazarı küçük sayılan ürünler', 'Crops with a small market'), value: names((d) => d.smallMarket), unit: '-', cls: 'varsayim' });
  rows.push({ name: L('Yalnız sözleşmeyle ve tam sulamayla önerilen ürün', 'Crop recommended only under contract and with full irrigation'), value: names((d) => d.contractOnly), unit: '-', cls: 'varsayim' });
  rows.push({ name: L('Varsayılan olarak öneri dışında tutulan ürün', 'Crop left out of recommendations by default'), value: names((d) => d.optIn), unit: '-', cls: 'varsayim' });

  // ---- toprak, randıman, model sabitleri ----
  rows.push({ name: L('Kullanılabilir su kapasitesi (TAW)', 'Total available water (TAW)'), value: tr(inp.soil.taw), unit: 'mm', cls: 'varsayim' });
  rows.push({ name: L('İzin verilen boşalma (p)', 'Allowed depletion (p)'), value: num(inp.soil.p), unit: '-', cls: 'varsayim' });
  for (const k of ['salma', 'yagmurlama', 'damla'] as const) rows.push({ name: L(`${METHOD_LABEL[k]} sulama randımanı`, `${METHOD_LABEL[k]} irrigation efficiency`), value: num(inp.eff[k]), unit: '-', cls: 'varsayim' });
  rows.push({ name: L('Su yılı başında toprak nemi', 'Soil moisture at the start of the water year'), value: L('0,3 × TAW', '0.3 × TAW'), unit: 'mm', cls: 'varsayim' });
  rows.push({ name: L('Boş tarlada günlük kayıp', 'Daily loss on a bare field'), value: L('0,2 × ET0', '0.2 × ET0'), unit: L('mm/gün', 'mm/day'), cls: 'varsayim' });
  rows.push({ name: L('Hasattan önce sulamanın kesildiği süre', 'Irrigation cut-off before harvest'), value: '10', unit: L('gün', 'days'), cls: 'varsayim' });
  rows.push({ name: L('Denenen brüt su seviyeleri', 'Gross water levels tested'), value: LEVELS.map((l) => (l === null ? L('tam', 'full') : String(l))).join(' / '), unit: 'mm', cls: 'varsayim' });
  rows.push({ name: L('Güvenilirlik eşiği (altı plana girmez)', 'Reliability threshold (options below it are not planned)'), value: num(RELIABILITY_FLOOR), unit: L('göreli verim', 'relative yield'), cls: 'varsayim' });
  rows.push({ name: L('İlçe merkezi koordinatları (NASA sorgusu için, yaklaşık)', 'District centre coordinates (for the NASA query, approximate)'), value: DISTRICTS.map((d) => `${d.name} ${num(d.lat)}°${L('K', 'N')} ${num(d.lon)}°${L('D', 'E')}`).join(' · '), unit: L('derece', 'degrees'), cls: 'varsayim' });

  // ---- plan kuralları ----
  const s = inp.settings;
  rows.push({ name: L('Bir ürünün üyedeki en yüksek payı', "Maximum share of one crop on a member's field"), value: num(+(s.maxShare * 100).toFixed(1)), unit: '%', cls: 'varsayim' });
  rows.push({ name: L('Küçük pazarlı ürün eşiği (kooperatif alanında)', 'Small-market crop cap (of cooperative area)'), value: s.smallMarketCap === null ? L('kapalı', 'off') : num(+(s.smallMarketCap * 100).toFixed(1)), unit: '%', cls: 'varsayim' });
  rows.push({ name: L('Sulanan ürüne verilecek en az su', 'Minimum water for an irrigated crop'), value: num(+((s.minIrrigationFraction ?? DEFAULT_MIN_IRRIGATION) * 100).toFixed(0)), unit: L('tam ihtiyacın %', '% of full need'), cls: 'varsayim' });
  rows.push({ name: L(`En küçük parsel (tarlası ${SMALL_FARM_DA} dekardan küçük üyede yarısı)`, `Minimum plot (half for members with fields under ${SMALL_FARM_DA} decares)`), value: num(s.minParcelDa ?? DEFAULT_MIN_PARCEL_DA), unit: 'da', cls: 'varsayim' });
  rows.push({ name: L('Güvenle söz eşiği', 'Safe commitment threshold'), value: L(`20 yılın ${DEFAULT_SAFE_YEARS}'sı`, `${DEFAULT_SAFE_YEARS} of 20 years`), unit: L('yıl', 'years'), cls: 'varsayim' });
  rows.push({ name: L('Nohutlu planda en düşük baklagil payı', 'Minimum legume share in the chickpea plan'), value: num(LEGUME_PLAN_SHARE * 100), unit: '%', cls: 'varsayim' });
  rows.push({ name: L('Yıl şeridinde "sarı" eşiği', '"Yellow" threshold in the year strip'), value: num(YELLOW_FLOOR * 100), unit: L('sözün %', '% of commitment'), cls: 'varsayim' });
  rows.push({ name: L('Toprak puanı ağırlıkları (baklagil / çeşitlilik / baklagil hedefi)', 'Soil score weights (legume / diversity / legume target)'), value: '60 / 40 / 25', unit: L('puan / puan / %', 'points / points / %'), cls: 'varsayim' });

  // ---- kurgusal kooperatif ----
  const m = inp.members;
  const area = m.reduce((x, y) => x + y.areaDa, 0);
  const range = (v: number[]) => (v.length ? `${tr(Math.min(...v))}–${tr(Math.max(...v))}` : '–');
  const byMethod = (['salma', 'yagmurlama', 'damla'] as const).map((k) => `${METHOD_LABEL[k]} ${m.filter((y) => y.method === k).length}`).join(' · ');
  const planted = new Map<string, number>();
  for (const y of m) for (const c of y.current) planted.set(c.cropId, (planted.get(c.cropId) ?? 0) + c.da);
  const cropName = (id: string) => cropLabel(id, inp.cropDefs.find((d) => d.id === id)?.name ?? id);
  const [cId, cTons] = Object.entries(s.commitments).find(([, t]) => t > 0) ?? ['', 0];
  rows.push({ name: L('Kooperatifin adı', 'Name of the cooperative'), value: coopLabel(), unit: '-', cls: 'kurgusal' });
  rows.push({ name: L('Üye sayısı', 'Number of members'), value: tr(m.length), unit: L('üye', 'members'), cls: 'kurgusal' });
  rows.push({ name: L('Üyelerin ilçelere dağılımı', 'Members by district'), value: DISTRICTS.map((d) => `${d.name} ${m.filter((y) => y.pointId === d.id).length}`).join(' · '), unit: L('üye', 'members'), cls: 'kurgusal' });
  rows.push({ name: L('Tarla büyüklükleri (üye başına)', 'Field sizes (per member)'), value: `${range(m.map((y) => y.areaDa))}; ${L('toplam', 'total')} ${tr(area)}`, unit: 'da', cls: 'kurgusal' });
  rows.push({ name: L('Su hakları (üye başına)', 'Water allowances (per member)'), value: `${range(m.map((y) => y.quotaMm))} mm; ${L('toplam', 'total')} ${tr(m.reduce((x, y) => x + y.areaDa * y.quotaMm, 0))} m³`, unit: 'mm, m³', cls: 'kurgusal' });
  rows.push({ name: L('Sulama yöntemleri', 'Irrigation methods'), value: byMethod, unit: L('üye', 'members'), cls: 'kurgusal' });
  rows.push({ name: L('Bugünkü ekim (ürün başına toplam alan)', "Today's planting (total area per crop)"), value: [...planted].sort((a, b) => b[1] - a[1]).map(([id, v]) => `${cropName(id)} ${tr(v)}`).join(' · '), unit: 'da', cls: 'kurgusal' });
  rows.push({ name: L('Üyelerin haritadaki konumu ve tarla biçimi', 'Members\' map locations and field shapes'), value: L(`${tr(m.filter((y) => y.lat != null).length)} nokta, ilçenin NASA hücresi içinde`, `${tr(m.filter((y) => y.lat != null).length)} points, inside the district's NASA cell`), unit: L('enlem, boylam', 'latitude, longitude'), cls: 'kurgusal' });
  rows.push({ name: L('Pancar sözleşmesi olan üye', 'Members with a sugar beet contract'), value: tr(m.filter((y) => y.beetContract).length), unit: L('üye', 'members'), cls: 'kurgusal' });
  rows.push({ name: L('Üyeleri üreten rastgele tohum', 'Random seed that generates the members'), value: String(MEMBER_SEED), unit: '-', cls: 'kurgusal' });
  rows.push({ name: L('Alıcı', 'Buyer'), value: buyerLabel(inp.buyer) || '–', unit: '-', cls: 'kurgusal' });
  rows.push({ name: L('Satış sözü (sözleşme kurgusal; miktar modelle hesaplandı)', 'Sales commitment (contract fictional; amount calculated by the model)'), value: cId ? `${tr(cTons)} ${L('ton', 't')} ${lower(cropName(cId))}` : L('yok', 'none'), unit: 'ton', cls: 'kurgusal' });
  return rows;
}

export function countByClass(rows: InputRow[]): Record<InputClass, number> {
  const c: Record<InputClass, number> = { nasa: 0, kaynakli: 0, varsayim: 0, kurgusal: 0 };
  for (const r of rows) c[r.cls]++;
  return c;
}

/** Üç ana sayının hangi sınıflardaki girdilere dayandığı (tek cümle; ekranda ve raporda aynı metin). MCP ve kanit Türkçesini kullanır. */
export const DEPENDENCE =
  'Üç ana sayının üçü de dört sınıfın hepsine dayanır: hava NASA verisidir; Kc, bazı evre süreleri ve Ky kaynaklıdır; verimler, kalan evre süreleri ve ekim tarihleri, toprak, randıman ve plan kuralları varsayımdır; üyeler, tarlalar ve su hakları kurgusaldır. Brüt gelir ayrıca fiyatlara dayanır (yedi fiyattan ikisi kaynaklı, beşi varsayım); suyu biten üye sayısı ve mısır sözü fiyatlara yalnızca planın ürün seçimi üzerinden bağlıdır.';

/** DEPENDENCE'ın İngilizcesi (ekran). */
export const DEPENDENCE_EN =
  'All three headline numbers depend on all four classes: the weather is NASA data; Kc, some stage lengths and Ky are sourced; yields, the remaining stage lengths and sowing dates, soil, efficiency and plan rules are assumptions; members, fields and water allowances are fictional. Gross revenue also depends on prices (two of the seven prices are sourced, five are assumptions); the number of members whose water runs out and the maize commitment depend on prices only through the crops the plan chooses.';
