// MCP araçlarının hesabı. Sitenin fonksiyonları içe aktarılır, kopyalanmaz:
// computeModel (src/model.ts), motor (src/engine), varsayılanlar ve döküm (src/data).
// Bütün araçlar salt okunur: hiçbir dosyaya ya da duruma yazmaz.
import altinekin from '../public/data/altinekin.json' with { type: 'json' };
import cihanbeyli from '../public/data/cihanbeyli.json' with { type: 'json' };
import cumra from '../public/data/cumra.json' with { type: 'json' };
import eregli from '../public/data/eregli.json' with { type: 'json' };
import karapinar from '../public/data/karapinar.json' with { type: 'json' };
import { DEFAULT_CROPS } from '../src/data/crops';
import { COOP_NAME, DEFAULT_COMMITMENT_TONS, DEFAULT_EFF, DEFAULT_SAFE_YEARS, DEFAULT_SETTINGS, DEFAULT_SOIL, METHOD_LABEL } from '../src/data/defaults';
import { buildInventory, CLASS_LABEL, CLASS_ORDER, countByClass, DEPENDENCE } from '../src/data/inventory';
import { DISTRICTS, generateMembers } from '../src/data/members';
import SOURCES from '../src/data/sources.json' with { type: 'json' };
import { climateSummary } from '../src/engine/climate';
import { plannedOutcome } from '../src/engine/plan';
import { maxCropScenario, maxSafeCommitment, mixedScenario, reachedInAtLeast } from '../src/engine/promise';
import { FALLOW, FIRST_YEAR, LAST_YEAR, type IrrigationMethod, type Member, type RawWeather, type Weather } from '../src/engine/types';
import { buildWeather, dateOfIndex } from '../src/engine/weather';
import { computeModel, type Inputs, type Model } from '../src/model';

/** Kullanıcıya gösterilecek, anlaşılır hata. */
export class InputError extends Error {}

const RAW: Record<string, unknown> = { karapinar, cumra, eregli, cihanbeyli, altinekin };
const BUYER = 'Örnek Alıcı A.Ş. (kurgusal)';
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const r0 = (v: number) => Math.round(v);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Her çıktıya eklenen dürüstlük notları. */
export const NOTLAR = [
  'Kooperatif kurgusaldır: üyeler, tarlalar, su hakları, bugünkü ekim ve alıcı gerçek değildir.',
  'Gelir brüttür: tohum, gübre, enerji, işçilik ve su maliyeti düşülmedi.',
  'Hava NASA POWER verisidir (yaklaşık 55 km ızgara); tarla ölçeğinde değildir.',
];

// ------------------------------------------------------------------ veri
let weathersCache: Record<string, Weather> | null = null;
export function weathers(): Record<string, Weather> {
  if (!weathersCache) weathersCache = Object.fromEntries(DISTRICTS.map((d) => [d.id, buildWeather(RAW[d.id] as RawWeather)]));
  return weathersCache;
}

/** Sitenin varsayılan girdileri (Pano'nun açılıştaki hali). */
export function defaultInputs(): Inputs {
  return {
    members: generateMembers(),
    cropDefs: structuredClone(DEFAULT_CROPS),
    soil: { ...DEFAULT_SOIL },
    eff: { ...DEFAULT_EFF },
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

const modelCache = new Map<string, Model>();
/** Örnek kooperatifin modeli; söz verilmişse o sözle (Pano'da "Dağıt"a basılmış hali). */
export function coopModel(commitments: Record<string, number> = DEFAULT_SETTINGS.commitments): Model {
  const key = JSON.stringify(commitments);
  let m = modelCache.get(key);
  if (!m) {
    const inp = defaultInputs();
    inp.settings.commitments = { ...commitments };
    m = computeModel(weathers(), DISTRICTS[0].id, inp);
    if (modelCache.size > 20) modelCache.clear();
    modelCache.set(key, m);
  }
  return m;
}

// ------------------------------------------------------------------ doğrulama
const norm = (s: string) =>
  s
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z]/g, '');

export function ilceBul(ilce: string): (typeof DISTRICTS)[number] {
  const d = DISTRICTS.find((x) => norm(x.id) === norm(ilce) || norm(x.name) === norm(ilce));
  if (!d) throw new InputError(`Bilinmeyen ilçe: "${ilce}". Geçerli ilçeler: ${DISTRICTS.map((x) => x.name).join(', ')}.`);
  return d;
}

export function urunBul(urun: string): (typeof DEFAULT_CROPS)[number] {
  const c = DEFAULT_CROPS.find((x) => norm(x.id) === norm(urun) || norm(x.name) === norm(urun) || norm(x.name).startsWith(norm(urun)));
  if (!c || !norm(urun)) throw new InputError(`Bilinmeyen ürün: "${urun}". Geçerli ürünler: ${DEFAULT_CROPS.map((x) => x.name).join(', ')}.`);
  return c;
}

export function yontemBul(y: string): IrrigationMethod {
  const k = (['salma', 'yagmurlama', 'damla'] as const).find((x) => norm(x) === norm(y) || norm(METHOD_LABEL[x]) === norm(y));
  if (!k) throw new InputError(`Bilinmeyen sulama yöntemi: "${y}". Geçerli yöntemler: salma, yağmurlama, damla.`);
  return k;
}

function pozitif(name: string, v: number, max: number) {
  if (!Number.isFinite(v)) throw new InputError(`${name} bir sayı olmalı.`);
  if (v <= 0) throw new InputError(`${name} sıfırdan büyük olmalı (verilen: ${v}).`);
  if (v > max) throw new InputError(`${name} en çok ${max} olabilir (verilen: ${v}).`);
}

// ------------------------------------------------------------------ araçlar
export function iklimOzeti(ilce: string) {
  const d = ilceBul(ilce);
  const w = weathers()[d.id];
  const cs = climateSummary(w);
  const core = cs.years.filter((y) => y.year >= FIRST_YEAR && y.year <= LAST_YEAR);
  const driest = core.reduce((a, b) => (b.prec < a.prec ? b : a));
  return {
    ilce: d.name,
    nasa_noktasi: { enlem: w.lat, boylam: w.lon, rakim_m: r0(w.elevation) },
    donem: `${FIRST_YEAR}-${LAST_YEAR} (takvim yılları)`,
    ortalama: { yillik_yagis_mm: r0(cs.meanPrec), yillik_et0_mm: r0(cs.meanEt0) },
    en_kurak_yil: { yil: driest.year, yagis_mm: r0(driest.prec), et0_mm: r0(driest.et0) },
    yillar: core.map((y) => ({ yil: y.year, yagis_mm: r0(y.prec), et0_mm: r0(y.et0) })),
    aylik_ortalama: cs.months.map((m) => ({ ay: AYLAR[m.month - 1], yagis_mm: r1(m.prec), et0_mm: r1(m.et0) })),
    girdi_siniflari: {
      'NASA verisi': 'Günlük sıcaklık, yağış, güneş radyasyonu, rüzgâr ve nem (NASA POWER, community=AG).',
      hesap: `ET0, FAO-56 Penman-Monteith ile bu verilerden hesaplandı${w.hargreavesDays ? ` (${w.hargreavesDays} günde Hargreaves)` : ''}.`,
      varsayım: 'İlçe merkezi koordinatı (NASA sorgusu için, yaklaşık).',
    },
    notlar: NOTLAR,
  };
}

export interface EkimSatiri {
  urun: string;
  dekar: number;
}

/** Tek bir üyeyi tek üyeli kooperatif gibi, sözsüz planlar (sitedeki computeModel ile). */
export function uyePlani(a: { dekar: number; su_hakki_mm: number; sulama_yontemi: string; bugunku_ekim: EkimSatiri[]; ilce?: string }) {
  pozitif('dekar', a.dekar, 100000);
  pozitif('su_hakki_mm', a.su_hakki_mm, 2000);
  const method = yontemBul(a.sulama_yontemi);
  const d = ilceBul(a.ilce ?? 'karapinar');
  if (!a.bugunku_ekim?.length) throw new InputError('bugunku_ekim boş olamaz: en az bir ürün ve dekarı verin (ör. [{"urun":"mısır","dekar":60}]).');
  const current = a.bugunku_ekim.map((e) => {
    pozitif(`bugunku_ekim içinde ${e.urun} dekarı`, e.dekar, 100000);
    return { cropId: urunBul(e.urun).id, da: e.dekar };
  });
  const toplam = current.reduce((s, c) => s + c.da, 0);
  if (toplam > a.dekar + 1e-6) throw new InputError(`bugunku_ekim toplamı (${toplam} da) tarla büyüklüğünü (${a.dekar} da) aşıyor.`);

  const member: Member = {
    id: 'mcp-uye',
    name: 'Sorgulanan üye',
    areaDa: a.dekar,
    quotaMm: a.su_hakki_mm,
    method,
    current,
    beetContract: current.some((c) => c.cropId === 'pancar'),
    pointId: d.id,
  };
  const inp = defaultInputs();
  inp.members = [member];
  inp.settings.commitments = {};
  const model = computeModel(weathers(), d.id, inp);
  const mv = model.members[0];
  const w = mv.weather;
  const names = new Map(model.crops.map((c) => [c.id, c.name]));

  const ozet = (ev: typeof mv.current, areas: { cropId: string; da: number }[]) => {
    const n = ev.years.length;
    const byCrop = new Map<string, number>();
    for (const x of areas) if (x.cropId !== FALLOW && x.da > 0.05) byCrop.set(x.cropId, (byCrop.get(x.cropId) ?? 0) + x.da);
    const urunler = [...byCrop].map(([id, da]) => ({
      urun: names.get(id) ?? id,
      dekar: r1(da),
      ortalama_ton: r1(ev.years.reduce((s, y) => s + (y.productionT[id] ?? 0), 0) / n),
    }));
    const nadas = areas.filter((x) => x.cropId === FALLOW).reduce((s, x) => s + x.da, 0);
    const mid = ev.years[ev.medianIndex];
    const md = (dt: Date) => `${dt.getUTCDate()} ${AYLAR[dt.getUTCMonth()]}`;
    return {
      urunler,
      bos_dekar: r1(nadas + Math.max(0, a.dekar - [...byCrop.values()].reduce((s, v) => s + v, 0) - nadas)),
      brut_gelir_tl_yil: r0(ev.meanRevenue),
      kullanilan_su_m3_yil: r0(ev.meanUsedM3),
      su_bitiyor: {
        yil_sayisi: ev.yearsExceeded,
        toplam_yil: n,
        ortanca_bitis_tarihi: ev.yearsExceeded > 0 && mid?.endDay != null ? md(dateOfIndex(w, mid.start + mid.endDay)) : null,
      },
    };
  };
  const plannedAreas = mv.plannedAllocs.map((x) => ({ cropId: x.cropId, da: x.da }));
  return {
    ilce: d.name,
    tarla: { dekar: a.dekar, su_hakki_mm: a.su_hakki_mm, su_hakki_m3: r0(a.dekar * a.su_hakki_mm), sulama_yontemi: METHOD_LABEL[method] },
    bugun: ozet(mv.current, current),
    onerilen: ozet(mv.planned, plannedAreas),
    aciklama:
      'Değerler 20 hasat yılının (2006-2025) ortalamasıdır. Önerilen plan bu üyeyi tek başına, satış sözü olmadan planlar; sitedeki Üyeler ekranı ise üyeyi örnek kooperatifin ortak planı içinde gösterir, bu yüzden sonuçlar farklı olabilir. Su bitiş tarihi, suyun sezon ortasında bittiği yılların ortancasıdır; bitmiyorsa null.',
    girdi_siniflari: {
      'NASA verisi': 'İlçenin günlük havası.',
      kaynaklı: 'Kc (7 ürün), Ky (4 ürün), 4 ürünün evre süreleri, buğday ve arpa fiyatı.',
      varsayım: 'Tam sulu verimler, diğer fiyatlar, toprak su kapasitesi (130 mm), sulama randımanı, ekim tarihleri, plan kuralları.',
      'kullanıcı girdisi': 'Tarla büyüklüğü, su hakkı, sulama yöntemi, bugünkü ekim.',
    },
    notlar: NOTLAR,
  };
}

function esikDenetle(esik_yil: number) {
  if (!Number.isInteger(esik_yil) || esik_yil < 1 || esik_yil > 20) throw new InputError(`esik_yil 1 ile 20 arasında bir tam sayı olmalı (verilen: ${esik_yil}).`);
}

export interface SozSatiri {
  urun: string;
  bugunku_ekimle_t: number | null;
  planli_dagitimla_t: number | null;
  yalniz_bu_urun_t: number | null;
  yalniz_bu_urun_brut_gelir_tl: number | null;
  not?: string;
}

/** Bir ürünün söz kapasitesi (Pano ile aynı fonksiyonlar). */
export function sozUrun(cropId: string, esik_yil: number): SozSatiri {
  esikDenetle(esik_yil);
  const K = esik_yil;
  const model = coopModel();
  const c = model.cropById.get(cropId);
  if (!c) throw new InputError(`Bilinmeyen ürün: ${cropId}`);
  const single = maxCropScenario(model.planInput, c.id);
  return {
    urun: c.name,
    bugunku_ekimle_t: Math.floor(reachedInAtLeast(model.scenarios.today.backtest.map((y) => y.productionT[c.id] ?? 0), K)),
    planli_dagitimla_t: Math.floor(maxSafeCommitment(model.planInput, c.id, K)),
    yalniz_bu_urun_t: single.plan.status === 'error' ? null : Math.floor(reachedInAtLeast(single.yearly[c.id] ?? [], K)),
    yalniz_bu_urun_brut_gelir_tl: single.plan.status === 'error' ? null : r0(single.revenue),
    not: single.plan.status === 'error' ? `Yalnız bu ürün senaryosu hesaplanamadı: ${single.plan.message ?? 'çözücü plan kuramadı'}` : c.contractOnly ? 'Yalnız pancar sözleşmesi olan üyelere ve tam sulamayla önerilir.' : c.optIn ? 'Varsayılan olarak öneri dışında (sitede ayrıca açılır); planlı değer bu yüzden 0 olabilir.' : undefined,
  };
}

/** Karma: söz olmadan geliri en yükseğe çıkaran plan. */
export function sozKarma(esik_yil: number) {
  esikDenetle(esik_yil);
  const model = coopModel();
  const mixed = mixedScenario(model.planInput);
  return {
    aciklama: "Söz olmadan geliri en yükseğe çıkaran plan; her ürünün yılların en az K'sında ulaşılan üretimi.",
    urunler: model.crops.map((c) => ({ urun: c.name, t: Math.floor(reachedInAtLeast(mixed.yearly[c.id] ?? [], esik_yil)) })).filter((x) => x.t >= 1),
    brut_gelir_tl_yil: r0(mixed.revenue),
  };
}

export const URUN_IDLERI = DEFAULT_CROPS.map((c) => c.id);
export const URUN_ADI: Record<string, string> = Object.fromEntries(DEFAULT_CROPS.map((c) => [c.id, c.name]));

export function sozSonuc(esik_yil: number, urunler: SozSatiri[], karma: ReturnType<typeof sozKarma>) {
  const model = coopModel();
  return {
    kooperatif: `${COOP_NAME} (kurgusal), ${model.members.length} üye, ${r0(model.totalAreaDa)} da`,
    esik: `20 yılın en az ${esik_yil}'sında ulaşılan üretim`,
    urunler,
    yalniz_misir_t: urunler.find((u) => u.urun === 'Mısır')?.yalniz_bu_urun_t ?? null,
    karma,
    aciklama:
      "bugunku_ekimle_t: kurgusal bugünkü ekimle; planli_dagitimla_t: o miktar söz verilip plan kurulduğunda yılların en az K'sında tutan en yüksek söz (Pano'daki üçüncü büyük sayı); yalniz_bu_urun_t: kooperatif bu ürüne öncelik verirse. null: hesap süre sınırında bitmedi (nota bakın).",
    girdi_siniflari: {
      'NASA verisi': 'Beş ilçenin günlük havası.',
      kaynaklı: 'Kc, Ky, bazı evre süreleri, buğday ve arpa fiyatı.',
      varsayım: 'Verimler, diğer fiyatlar, toprak, randıman, plan kuralları, güven eşiği.',
      kurgusal: 'Kooperatif, 50 üye, tarlalar, su hakları, bugünkü ekim.',
    },
    notlar: NOTLAR,
  };
}

/** Süre sınırı olmadan, tek seferde (testler için; nohut gibi takılan ürünü vermeyin). */
export function sozKapasitesi(esik_yil = DEFAULT_SAFE_YEARS, urunIdleri = URUN_IDLERI) {
  return sozSonuc(esik_yil, urunIdleri.map((id) => sozUrun(id, esik_yil)), sozKarma(esik_yil));
}

export function taahhutDene(urun: string, ton: number) {
  const c = urunBul(urun);
  pozitif('ton', ton, 1e7);
  const model = coopModel({ [c.id]: ton });
  // üst sınırı aşan söz ya da kurulamayan plan: motorun mesajı (ör. "en çok yaklaşık 505 ton")
  if (model.plan.status === 'error') throw new InputError(model.plan.message ?? 'Bu sözle plan kurulamadı.');
  const sc = model.scenarios;
  const worst = (bt: typeof sc.planned.backtest) => {
    const y = bt.reduce((a, b) => ((b.productionT[c.id] ?? 0) < (a.productionT[c.id] ?? 0) ? b : a));
    return { yil: y.year, uretim_t: r0(y.productionT[c.id] ?? 0), sozun_yuzdesi: r0(((y.productionT[c.id] ?? 0) / ton) * 100) };
  };
  const row = (s: typeof sc.today) => ({ tuttugu_yil: s.held, toplam_yil: s.total, en_kotu_yil: worst(s.backtest), brut_gelir_tl_yil: r0(s.revenue) });
  return {
    soz: `${ton} ton ${c.name.toLocaleLowerCase('tr')}`,
    bugun: row(sc.today),
    gelisiguzel: row(sc.scatter),
    planli: row(sc.planned),
    plan_durumu: model.plan.status,
    aciklama:
      'Söz bir yıl tutar: o yılın havasıyla üretilen miktar söze ulaşırsa. bugun: kurgusal bugünkü ekim; gelisiguzel: söz rastgele üyelere dağıtılır; planli: Nöbet planı. Pano\'da bu söz "Dağıt" ile uygulandığında görülen sayılarla aynıdır.',
    girdi_siniflari: {
      'NASA verisi': 'Beş ilçenin günlük havası (2006-2025).',
      kaynaklı: 'Kc, Ky, bazı evre süreleri, buğday ve arpa fiyatı.',
      varsayım: 'Verimler, diğer fiyatlar, toprak, randıman, plan kuralları.',
      kurgusal: 'Kooperatif, üyeler, su hakları, bugünkü ekim, alıcı ve söz.',
    },
    notlar: NOTLAR,
  };
}

export function kaynaklar() {
  const inp = defaultInputs();
  const ws = weathers();
  const rows = buildInventory({
    ...inp,
    buyer: BUYER,
    days: ws[DISTRICTS[0].id].n,
    elevations: Object.fromEntries(DISTRICTS.map((d) => [d.id, ws[d.id].elevation])),
  });
  const counts = countByClass(rows);
  return {
    sayim: Object.fromEntries(CLASS_ORDER.map((c) => [CLASS_LABEL[c], counts[c]])),
    toplam: rows.length,
    uc_ana_sayi_neye_dayanir: DEPENDENCE,
    girdiler: rows.map((r) => ({ girdi: r.name, deger: r.value, birim: r.unit, sinif: CLASS_LABEL[r.cls], kaynak: r.source ?? null, baglanti: r.url ?? null, tablo: r.table ?? null })),
    bulunamayanlar: SOURCES.notFound,
    aciklama: 'Sayım dökümün satır sayısıdır; ağırlık ya da önem ölçüsü değildir. Kaynaklı değerlerin sayfası bu projede açılıp içinde görüldü (erişim 15.11.2026).',
    girdi_siniflari: { açıklama: 'Bu aracın çıktısı girdilerin kendisidir; her satırda sınıfı yazar.' },
    notlar: NOTLAR,
  };
}

/** Pano'nun varsayılan sözü (test ve örnekler için). */
export const VARSAYILAN_SOZ = { urun: 'misir', ton: DEFAULT_COMMITMENT_TONS };
export { plannedOutcome };
