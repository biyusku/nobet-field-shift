// "NASA verisi ne diyor": aylık ve yıllık iklim özetleri. Saf fonksiyonlar.
import { FIRST_YEAR, LAST_YEAR, type Weather } from './types';
import { dayIndex, sumCalendar } from './weather';

export interface ClimateSummary {
  /** 12 ay: 2006-2025 ortalaması, aylık toplam mm */
  months: { month: number; prec: number; et0: number }[];
  /** tam takvim yılları (verinin izin verdiği ilk yıldan), yıllık toplam mm */
  years: { year: number; prec: number; et0: number }[];
  /** yıllık yağışın doğrusal eğilimi: mm/yıl ve başlangıç değeri (ilk yıl için) */
  trend: { slopePerYear: number; atFirstYear: number };
  driest: { year: number; prec: number };
  /** 2006-2025 ortalaması, mm/yıl */
  meanPrec: number;
  meanEt0: number;
  /** temmuz-ağustosta en yüksek sıcaklığı 35 °C'yi aşan gün sayısı */
  hotDays: { threshold: number; lastYear: number; last: number; mean: number };
}

/** Bir yılın temmuz-ağustos aylarında Tmax eşiği aşan gün sayısı. */
export function hotDaysInSummer(w: Weather, year: number, threshold = 35): number {
  const a = dayIndex(w, year, 7, 1);
  const b = dayIndex(w, year, 9, 1);
  let n = 0;
  for (let i = Math.max(0, a); i < Math.min(w.n, b); i++) if (w.tmax[i] > threshold) n++;
  return n;
}

export function climateSummary(w: Weather): ClimateSummary {
  const nYears = LAST_YEAR - FIRST_YEAR + 1;
  const months = Array.from({ length: 12 }, (_, m) => {
    let prec = 0;
    let et0 = 0;
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
      prec += sumCalendar(w, w.prec, y, m + 1);
      et0 += sumCalendar(w, w.et0, y, m + 1);
    }
    return { month: m + 1, prec: prec / nYears, et0: et0 / nYears };
  });

  // tam takvim yılı: 1 Ocak veride olmalı
  const firstFull = new Date(w.startMs).getUTCMonth() === 0 && new Date(w.startMs).getUTCDate() === 1 ? new Date(w.startMs).getUTCFullYear() : new Date(w.startMs).getUTCFullYear() + 1;
  const years: ClimateSummary['years'] = [];
  for (let y = firstFull; y <= LAST_YEAR; y++) years.push({ year: y, prec: sumCalendar(w, w.prec, y), et0: sumCalendar(w, w.et0, y) });

  // en küçük kareler doğrusu: yağış ~ yıl
  const n = years.length || 1;
  const mx = years.reduce((s, p) => s + p.year, 0) / n;
  const my = years.reduce((s, p) => s + p.prec, 0) / n;
  const sxx = years.reduce((s, p) => s + (p.year - mx) ** 2, 0);
  const sxy = years.reduce((s, p) => s + (p.year - mx) * (p.prec - my), 0);
  const slope = sxx > 0 ? sxy / sxx : 0;

  const core = years.filter((p) => p.year >= FIRST_YEAR);
  const hot = core.map((p) => hotDaysInSummer(w, p.year));
  return {
    months,
    years,
    trend: { slopePerYear: slope, atFirstYear: my + slope * ((years[0]?.year ?? mx) - mx) },
    driest: years.reduce((a, b) => (b.prec < a.prec ? b : a), years[0] ?? { year: 0, prec: 0, et0: 0 }),
    meanPrec: core.reduce((s, p) => s + p.prec, 0) / (core.length || 1),
    meanEt0: core.reduce((s, p) => s + p.et0, 0) / (core.length || 1),
    hotDays: { threshold: 35, lastYear: LAST_YEAR, last: hotDaysInSummer(w, LAST_YEAR), mean: hot.reduce((s, v) => s + v, 0) / (hot.length || 1) },
  };
}

/**
 * NASA POWER meteoroloji ızgarası (MERRA-2): 0,5° enlem x 0,625° boylam.
 * Hücre merkezleri bu adımların katlarındadır; noktanın düştüğü hücrenin yaklaşık sınırlarını verir.
 */
export function powerCell(lat: number, lon: number): { south: number; north: number; west: number; east: number } {
  const cLat = Math.round(lat / 0.5) * 0.5;
  const cLon = Math.round(lon / 0.625) * 0.625;
  return { south: cLat - 0.25, north: cLat + 0.25, west: cLon - 0.3125, east: cLon + 0.3125 };
}
