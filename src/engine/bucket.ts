// Günlük toprak-su dengesi (kova modeli). Bir üyenin bütün parselleri aynı gün döngüsünde yürür;
// böylece ortak kota havuzu (ilk isteyen alır) doğru paylaşılır.
import { dayIndex } from './weather';
import type { Crop, Soil, Weather } from './types';

/** Kc eğrisi: baş evrede sabit, gelişmede doğrusal artış, ortada sabit, sonda doğrusal iniş. */
export function kcAt(crop: Crop, daysSincePlanting: number): number {
  const [l1, l2, l3, l4] = crop.stages;
  const [ini, mid, end] = crop.kc;
  const t = daysSincePlanting;
  if (t < 0) return 0;
  if (t < l1) return ini;
  if (t < l1 + l2) return ini + ((mid - ini) * (t - l1)) / l2;
  if (t < l1 + l2 + l3) return mid;
  if (t < l1 + l2 + l3 + l4) return mid + ((end - mid) * (t - l1 - l2 - l3)) / l4;
  return 0;
}

export function seasonLength(crop: Crop): number {
  return crop.stages[0] + crop.stages[1] + crop.stages[2] + crop.stages[3];
}

/** Kışlık ürün: hasat yılından bir önceki sonbaharda ekilir. */
export function isWinterCrop(crop: Crop): boolean {
  return crop.plantMonth >= 8;
}

/** Su yılı penceresi: 1 Ekim (Y-1) .. 31 Ekim (Y). Pancar gibi ekimde sökülen ürünler de sığar. */
export function seasonWindow(w: Weather, year: number): { start: number; nDays: number } {
  const start = dayIndex(w, year - 1, 10, 1);
  const end = dayIndex(w, year, 10, 31);
  return { start, nDays: end - start + 1 };
}

export interface ParcelInput {
  crop: Crop;
  areaDa: number;
  /** bu parsele ayrılan brüt su tavanı (mm); null = tavan yok */
  capMm: number | null;
}

export interface ParcelResult {
  /** sezonluk brüt sulama, mm */
  grossMm: number;
  relYield: number;
  eta: number;
  etc: number;
  /** parselin kendi tavanının yetmediği ilk gün (pencere içi gün no); yoksa null */
  capEndDay: number | null;
  plantDay: number;
  harvestDay: number;
}

export interface FarmYearResult {
  year: number;
  /** pencerenin ilk gününün veri dizisindeki indisi */
  start: number;
  nDays: number;
  parcels: ParcelResult[];
  /** gün gün kümülatif brüt sulama, m3 (bütün parseller) */
  cumM3: Float64Array;
  usedM3: number;
  /** ortak havuzun (kota) yetmediği ilk gün; yoksa null */
  poolEndDay: number | null;
}

export interface FarmOptions {
  /** sulama randımanı (0-1) */
  efficiency: number;
  soil: Soil;
  /** üyenin toplam kotası, m3; null = sınırsız */
  poolM3: number | null;
}

const EPS = 1e-6;

export function simulateFarmYear(w: Weather, year: number, parcels: ParcelInput[], opt: FarmOptions): FarmYearResult {
  const { start, nDays } = seasonWindow(w, year);
  if (start < 0 || start + nDays > w.n) throw new Error(`${year} hasat yılı için veri yok`);
  const taw = opt.soil.taw;
  const threshold = taw * (1 - opt.soil.p);
  const eff = opt.efficiency;

  const st = parcels.map((p) => {
    const py = isWinterCrop(p.crop) ? year - 1 : year;
    const plant = Math.max(0, dayIndex(w, py, p.crop.plantMonth, p.crop.plantDay) - start);
    const harvest = Math.min(nDays, plant + seasonLength(p.crop));
    return {
      S: 0.3 * taw,
      plant,
      harvest,
      capLeft: p.capMm === null ? Infinity : p.capMm,
      gross: 0,
      eta: 0,
      etc: 0,
      capEnd: null as number | null,
    };
  });

  let poolLeft = opt.poolM3 === null ? Infinity : opt.poolM3;
  let poolEndDay: number | null = null;
  let cum = 0;
  const cumM3 = new Float64Array(nDays);

  for (let d = 0; d < nDays; d++) {
    const et0 = w.et0[start + d];
    const rain = w.prec[start + d];
    for (let k = 0; k < parcels.length; k++) {
      const s = st[k];
      const area = parcels[k].areaDa;
      s.S = Math.min(taw, s.S + rain);
      if (d >= s.plant && d < s.harvest) {
        if (s.S < threshold && s.harvest - d > 10 && area > 0) {
          const want = (taw - s.S) / eff; // brüt mm
          const poolMm = poolLeft / area;
          const give = Math.max(0, Math.min(want, s.capLeft, poolMm));
          if (give < want - EPS) {
            // su yetmedi: hangisi bağladıysa onu işaretle
            if (poolMm <= s.capLeft) {
              if (poolEndDay === null) poolEndDay = d;
            } else if (s.capEnd === null) s.capEnd = d;
          }
          if (give > EPS) {
            s.S += give * eff;
            s.capLeft -= give;
            s.gross += give;
            poolLeft -= give * area;
            cum += give * area;
          }
        }
        const etc = kcAt(parcels[k].crop, d - s.plant) * et0;
        const ks = Math.min(1, s.S / threshold);
        const eta = Math.min(s.S, ks * etc);
        s.S -= eta;
        s.eta += eta;
        s.etc += etc;
      } else {
        // tarla boş: çıplak toprak buharlaşması
        s.S = Math.max(0, s.S - 0.2 * et0);
      }
    }
    cumM3[d] = cum;
  }

  return {
    year,
    start,
    nDays,
    cumM3,
    usedM3: cum,
    poolEndDay,
    parcels: st.map((s, k) => ({
      grossMm: s.gross,
      relYield: s.etc > 0 ? Math.max(0, 1 - parcels[k].crop.ky * (1 - s.eta / s.etc)) : 0,
      eta: s.eta,
      etc: s.etc,
      capEndDay: s.capEnd,
      plantDay: s.plant,
      harvestDay: s.harvest,
    })),
  };
}

/** Tek ürün, tek parsel: su-verim eğrileri için. quotaMm null = tam sulama. */
export function simulateCropYear(
  w: Weather,
  year: number,
  crop: Crop,
  quotaMm: number | null,
  efficiency: number,
  soil: Soil,
): ParcelResult {
  return simulateFarmYear(w, year, [{ crop, areaDa: 1, capMm: quotaMm }], { efficiency, soil, poolM3: null }).parcels[0];
}
