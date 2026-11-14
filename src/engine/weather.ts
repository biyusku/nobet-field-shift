import { et0Hargreaves, et0PenmanMonteith } from './et0';
import type { RawWeather, Weather } from './types';

const DAY = 86400000;

export function parseYmd(s: string): number {
  return Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
}

/** Verilen takvim gününün veri dizisindeki indisi. */
export function dayIndex(w: { startMs: number }, year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month - 1, day) - w.startMs) / DAY);
}

export function dateOfIndex(w: { startMs: number }, idx: number): Date {
  return new Date(w.startMs + idx * DAY);
}

/** Yılın günü (1-366), UTC. */
export function dayOfYear(ms: number): number {
  const d = new Date(ms);
  return Math.round((ms - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1;
}

/**
 * Ham veriyi temizler ve günlük ET0 hesaplar.
 * - Yağış eksikse 0.
 * - Sıcaklık eksikse bir önceki günün değeri.
 * - Güneş, rüzgâr ya da nem eksikse o gün ET0 Hargreaves ile hesaplanır (değer NaN kalır).
 */
export function buildWeather(raw: RawWeather): Weather {
  const n = raw.params.T2M_MAX.length;
  const startMs = parseYmd(raw.start);
  const missing: Record<string, number> = {};
  const num = (key: string, mode: 'zero' | 'carry' | 'nan'): Float64Array => {
    const src = raw.params[key] ?? [];
    const out = new Float64Array(n);
    let miss = 0;
    let prev = NaN;
    for (let i = 0; i < n; i++) {
      const v = src[i];
      if (v === null || v === undefined || v <= -900 || Number.isNaN(v)) {
        miss++;
        out[i] = mode === 'zero' ? 0 : mode === 'carry' ? prev : NaN;
      } else {
        out[i] = v;
        prev = v;
      }
    }
    if (mode === 'carry') {
      // baştaki boşlukları ilk geçerli değerle doldur
      let first = 0;
      while (first < n && Number.isNaN(out[first])) first++;
      for (let i = 0; i < first && first < n; i++) out[i] = out[first];
    }
    missing[key] = miss;
    return out;
  };
  const tmax = num('T2M_MAX', 'carry');
  const tmin = num('T2M_MIN', 'carry');
  const prec = num('PRECTOTCORR', 'zero');
  const rs = num('ALLSKY_SFC_SW_DWN', 'nan');
  const ws = num('WS2M', 'nan');
  const rh = num('RH2M', 'nan');

  const latRad = (raw.lat * Math.PI) / 180;
  const et0 = new Float64Array(n);
  let hargreavesDays = 0;
  for (let i = 0; i < n; i++) {
    const J = dayOfYear(startMs + i * DAY);
    if (Number.isNaN(rs[i]) || Number.isNaN(ws[i]) || Number.isNaN(rh[i])) {
      et0[i] = et0Hargreaves(tmax[i], tmin[i], J, latRad);
      hargreavesDays++;
    } else {
      et0[i] = et0PenmanMonteith({
        tmax: tmax[i],
        tmin: tmin[i],
        rs: rs[i],
        u2: ws[i],
        rh: rh[i],
        J,
        latRad,
        z: raw.elevation,
      });
    }
    if (!Number.isFinite(et0[i])) et0[i] = 0;
  }
  return {
    id: raw.id,
    name: raw.name,
    lat: raw.lat,
    lon: raw.lon,
    elevation: raw.elevation,
    startMs,
    n,
    tmax,
    tmin,
    prec,
    rs,
    ws,
    rh,
    et0,
    hargreavesDays,
    missing,
    fetchedAt: raw.source?.fetchedAt,
  };
}

/** Takvim yılı toplamı (ör. yıllık ET0 ya da yağış). */
export function sumCalendar(w: Weather, arr: Float64Array, year: number, month?: number): number {
  const a = month ? dayIndex(w, year, month, 1) : dayIndex(w, year, 1, 1);
  const b = month ? (month === 12 ? dayIndex(w, year + 1, 1, 1) : dayIndex(w, year, month + 1, 1)) : dayIndex(w, year + 1, 1, 1);
  let s = 0;
  for (let i = Math.max(0, a); i < Math.min(w.n, b); i++) s += arr[i];
  return s;
}
