// Su-verim eğrileri: her ürün, her su seviyesi ve 2006-2025 arası her hasat yılı için göreli verim.
import { simulateCropYear } from './bucket';
import { FIRST_YEAR, LAST_YEAR, type Crop, type Soil, type Weather } from './types';

/** Brüt su seviyeleri (mm). null = tam sulama. */
export const LEVELS: (number | null)[] = [0, 100, 200, 350, 500, null];
export const RELIABILITY_FLOOR = 0.35;

export function harvestYears(): number[] {
  const out: number[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) out.push(y);
  return out;
}

export interface WaterOption {
  cropId: string;
  /** brüt su tavanı (mm); null = tam */
  level: number | null;
  years: number[];
  relYield: number[];
  /** o yıl gerçekten kullanılan brüt su, mm */
  grossMm: number[];
  /** tavanın yetmediği gün (pencere içi); null = yetti */
  capEndDay: (number | null)[];
  meanRel: number;
  minRel: number;
  meanGross: number;
  /** 20 yılın en yüksek kullanımı: planlamada bu kadar su ayrılır, böylece hiçbir yıl kota aşılmaz */
  maxGross: number;
  /** ortalama göreli verim 0,35'in altındaysa false */
  reliable: boolean;
}

export type Curves = Record<string, WaterOption[]>;

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1);

export function buildCropOptions(w: Weather, crop: Crop, efficiency: number, soil: Soil): WaterOption[] {
  const years = harvestYears();
  const make = (level: number | null): WaterOption => {
    const res = years.map((y) => simulateCropYear(w, y, crop, level, efficiency, soil));
    const rel = res.map((r) => r.relYield);
    const gross = res.map((r) => r.grossMm);
    const m = mean(rel);
    return {
      cropId: crop.id,
      level,
      years,
      relYield: rel,
      grossMm: gross,
      capEndDay: res.map((r) => r.capEndDay),
      meanRel: m,
      minRel: Math.min(...rel),
      meanGross: mean(gross),
      maxGross: Math.max(...gross),
      reliable: m >= RELIABILITY_FLOOR,
    };
  };
  const full = make(null);
  const out: WaterOption[] = [];
  for (const level of LEVELS) {
    if (level === null) continue;
    // tavan hiçbir yıl bağlamıyorsa "tam" ile aynıdır; yinelemeyi at
    if (level > 0 && level >= full.maxGross - 1e-6) continue;
    out.push(make(level));
  }
  out.push(full);
  return out;
}

const cache = new Map<string, Curves>();

/** Sonuçlar bir kez hesaplanıp bellekte tutulur (anahtar: nokta + ürün tablosu + randıman + toprak). */
export function buildCurves(w: Weather, crops: Crop[], efficiency: number, soil: Soil): Curves {
  const key = JSON.stringify([w.id, w.n, w.fetchedAt, crops, efficiency, soil]);
  const hit = cache.get(key);
  if (hit) return hit;
  const curves: Curves = {};
  for (const c of crops) curves[c.id] = buildCropOptions(w, c, efficiency, soil);
  if (cache.size > 40) cache.clear();
  cache.set(key, curves);
  return curves;
}

export function levelLabel(level: number | null): string {
  return level === null ? 'tam' : level === 0 ? 'susuz' : `${level} mm`;
}
