import type { Crop } from '../engine/types';

/** Bir varsayım: değer, nereden geldiği ve doğrulanıp doğrulanmadığı. */
export interface Assumed<T> {
  value: T;
  source: string;
  verified: boolean;
}

export interface CropDef {
  id: string;
  name: string;
  legume: boolean;
  /** pazarı küçük ürün: kooperatif toplamında eşiklenebilir */
  smallMarket: boolean;
  /** yalnız sözleşmeli üyeye, yalnız tam sulamayla önerilir */
  contractOnly: boolean;
  plant: Assumed<{ month: number; day: number }>;
  stages: Assumed<[number, number, number, number]>;
  kc: Assumed<[number, number, number]>;
  ky: Assumed<number>;
  yieldKgDa: Assumed<number>;
  priceTlTon: Assumed<number>;
}

// Kaynak notları bilerek temkinli: değerler proje tanımında verildi, hiçbiri yerel veriyle doğrulanmadı.
const S_CAL = 'Proje tanımı (takım varsayımı). Yöre ekim takvimi ve FAO-56 Tablo 11 ile karşılaştırılmalı.';
const S_KC = 'Proje tanımı (takım varsayımı). FAO-56 Tablo 12 ile karşılaştırılmalı; yerel Kc ölçümü yok.';
const S_KY = 'Proje tanımı (takım varsayımı). FAO Sulama ve Drenaj Yayını 33 ile karşılaştırılmalı.';
const S_YIELD = 'Proje tanımı (takım varsayımı). TÜİK il/ilçe verimleriyle doğrulanmalı.';
const S_PRICE = 'Proje tanımı (takım varsayımı). TMO/borsa/Türkşeker güncel alım fiyatlarıyla doğrulanmalı.';

const a = <T,>(value: T, source: string): Assumed<T> => ({ value, source, verified: false });

function def(
  id: string,
  name: string,
  plant: [number, number],
  stages: [number, number, number, number],
  kc: [number, number, number],
  ky: number,
  yieldKgDa: number,
  priceTlTon: number,
  flags: { legume?: boolean; smallMarket?: boolean; contractOnly?: boolean } = {},
): CropDef {
  return {
    id,
    name,
    legume: !!flags.legume,
    smallMarket: !!flags.smallMarket,
    contractOnly: !!flags.contractOnly,
    plant: a({ month: plant[0], day: plant[1] }, S_CAL),
    stages: a(stages, S_CAL),
    kc: a(kc, S_KC),
    ky: a(ky, S_KY),
    yieldKgDa: a(yieldKgDa, S_YIELD),
    priceTlTon: a(priceTlTon, S_PRICE),
  };
}

const S_LENTIL =
  'Takım varsayımı (proje tanımındaki tabloda yok). Kışlık ekim kabul edildi; Konya koşullarında kırmızı mercimeğin kışlık yetişip yetişmediği, verimi ve fiyatı yerel kaynakla doğrulanmalı.';
function mercimek(): CropDef {
  const d = def('mercimek', 'Kırmızı mercimek', [11, 1], [120, 40, 35, 20], [0.4, 1.1, 0.3], 1.0, 180, 45000, { legume: true });
  for (const k of ['plant', 'stages', 'kc', 'ky', 'yieldKgDa', 'priceTlTon'] as const) d[k].source = S_LENTIL;
  return d;
}

export const DEFAULT_CROPS: CropDef[] = [
  def('misir', 'Mısır', [5, 1], [30, 40, 50, 30], [0.3, 1.2, 0.5], 1.25, 1265, 15025),
  def('pancar', 'Şeker pancarı', [4, 10], [30, 45, 80, 35], [0.35, 1.2, 0.7], 1.0, 7000, 3720, { contractOnly: true }),
  def('aycicegi', 'Ayçiçeği', [5, 1], [25, 35, 45, 25], [0.35, 1.1, 0.35], 0.95, 350, 34250, { smallMarket: true }),
  def('bugday', 'Buğday (kışlık)', [10, 20], [146, 47, 40, 25], [0.4, 1.15, 0.3], 1.05, 550, 16500),
  def('arpa', 'Arpa (kışlık)', [10, 20], [141, 42, 35, 25], [0.3, 1.15, 0.25], 1.0, 500, 12750),
  def('nohut', 'Nohut', [3, 20], [25, 30, 35, 20], [0.4, 1.0, 0.35], 1.0, 220, 34250, { legume: true, smallMarket: true }),
  // Kırmızı mercimek proje tanımındaki tabloda yoktu; sonradan istendi. Bütün değerleri takım varsayımıdır.
  mercimek(),
];

/** Motorun kullandığı düz biçim. */
export function toEngineCrop(d: CropDef): Crop {
  return {
    id: d.id,
    name: d.name,
    legume: d.legume,
    smallMarket: d.smallMarket,
    contractOnly: d.contractOnly,
    plantMonth: d.plant.value.month,
    plantDay: d.plant.value.day,
    stages: d.stages.value,
    kc: d.kc.value,
    ky: d.ky.value,
    yieldKgDa: d.yieldKgDa.value,
    priceTlTon: d.priceTlTon.value,
  };
}

export const DEFAULT_ENGINE_CROPS: Crop[] = DEFAULT_CROPS.map(toEngineCrop);
