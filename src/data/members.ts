// KURGUSAL kooperatif: Konya'nın beş ilçesine yayılmış 50 üye. Sabit tohumlu rastgele; her açılışta aynı.
// Gerçek kişi, işletme ya da parsel değildir.
import { powerCell } from '../engine/climate';
import type { IrrigationMethod, Member } from '../engine/types';

/** [merkez - yarı, merkez + yarı] aralığının [lo, hi] ile kesişiminde düzgün dağılmış bir değer (kenara yığılma olmaz). */
const within = (r: number, center: number, half: number, lo: number, hi: number) => {
  const a = Math.max(lo, center - half);
  const b = Math.min(hi, center + half);
  return a + r * (b - a);
};

export interface District {
  id: string;
  name: string;
  /** ilçe merkezi, yaklaşık */
  lat: number;
  lon: number;
}

export const DISTRICTS: District[] = [
  { id: 'karapinar', name: 'Karapınar', lat: 37.72, lon: 33.55 },
  { id: 'cumra', name: 'Çumra', lat: 37.57, lon: 32.77 },
  { id: 'eregli', name: 'Ereğli', lat: 37.51, lon: 34.05 },
  { id: 'cihanbeyli', name: 'Cihanbeyli', lat: 38.66, lon: 32.93 },
  { id: 'altinekin', name: 'Altınekin', lat: 38.31, lon: 32.87 },
];

/** Küçük, hızlı, belirlenimci sözde rastgele üreteç (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Diziyi verilen üreteçle karıştırır (Fisher-Yates); girdiyi değiştirmez. */
export function shuffled<T>(items: readonly T[], rnd: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const MEMBER_SEED = 2026;

export function generateMembers(count = 50, seed = MEMBER_SEED): Member[] {
  const rnd = mulberry32(seed);
  const pick = <T,>(items: [T, number][]): T => {
    let r = rnd() * items.reduce((s, [, w]) => s + w, 0);
    for (const [v, w] of items) {
      r -= w;
      if (r <= 0) return v;
    }
    return items[items.length - 1][0];
  };
  const out: Member[] = [];
  for (let i = 0; i < count; i++) {
    const d = DISTRICTS[i % DISTRICTS.length];
    const cell = powerCell(d.lat, d.lon);
    // tarla 40-400 da; küçükler çoğunlukta
    const areaDa = Math.round(40 + 360 * Math.pow(rnd(), 1.8));
    const quotaMm = 200 + 10 * Math.floor(rnd() * 16); // 200-350
    const method = pick<IrrigationMethod>([
      ['salma', 0.4],
      ['yagmurlama', 0.4],
      ['damla', 0.2],
    ]);
    // bugünkü ekim: ağırlıklı mısır ve buğday
    const pattern = pick<string>([
      ['misir-bugday', 0.45],
      ['bugday-misir', 0.25],
      ['misir-diger', 0.15],
      ['bugday-diger', 0.15],
    ]);
    const split = (share: number) => {
      const a = Math.round(areaDa * share);
      return [a, areaDa - a];
    };
    let current: Member['current'];
    let beetContract = false;
    if (pattern === 'misir-bugday') {
      const [a, b] = split(0.6 + 0.4 * rnd());
      current = [{ cropId: 'misir', da: a }, { cropId: 'bugday', da: b }];
    } else if (pattern === 'bugday-misir') {
      const [a, b] = split(0.5 + 0.2 * rnd());
      current = [{ cropId: 'bugday', da: a }, { cropId: 'misir', da: b }];
    } else if (pattern === 'misir-diger') {
      const [a, b] = split(0.55 + 0.25 * rnd());
      current = [{ cropId: 'misir', da: a }, { cropId: pick<string>([['arpa', 0.5], ['aycicegi', 0.5]]), da: b }];
    } else {
      const [a, b] = split(0.5 + 0.3 * rnd());
      const other = pick<string>([['nohut', 0.5], ['pancar', 0.5]]);
      beetContract = other === 'pancar';
      current = [{ cropId: 'bugday', da: a }, { cropId: other, da: b }];
    }
    out.push({
      id: `u${String(i + 1).padStart(2, '0')}`,
      name: `Üye ${String(i + 1).padStart(2, '0')}`,
      areaDa,
      quotaMm,
      method,
      current: current.filter((c) => c.da > 0),
      beetContract,
      pointId: d.id,
      // ilçe merkezi ile hücre merkezinin ortası çevresine dağıt; ilçenin NASA hücresinin içinde kalsın:
      // üye o hücrenin havasıyla hesaplandığı için haritada da o hücrede görünmeli
      lat: +within(rnd(), (d.lat + (cell.south + cell.north) / 2) / 2, 0.19, cell.south + 0.03, cell.north - 0.03).toFixed(4),
      lon: +within(rnd(), (d.lon + (cell.west + cell.east) / 2) / 2, 0.22, cell.west + 0.03, cell.east - 0.03).toFixed(4),
    });
  }
  return out;
}
