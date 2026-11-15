// Sayı ve tarih biçimleri: seçili dile göre (tr-TR ya da en-US).
import { getLang, locale } from '../i18n';

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function nf(digits: number, min = digits): Intl.NumberFormat {
  const k = `n|${locale()}|${digits}|${min}`;
  let x = cache.get(k) as Intl.NumberFormat | undefined;
  if (!x) cache.set(k, (x = new Intl.NumberFormat(locale(), { minimumFractionDigits: min, maximumFractionDigits: digits })));
  return x;
}
function df(opts: Intl.DateTimeFormatOptions, key: string): Intl.DateTimeFormat {
  const k = `d|${locale()}|${key}`;
  let x = cache.get(k) as Intl.DateTimeFormat | undefined;
  if (!x) cache.set(k, (x = new Intl.DateTimeFormat(locale(), { ...opts, timeZone: 'UTC' })));
  return x;
}
const en = () => getLang() === 'en';

export const int = (v: number) => nf(0).format(Math.round(v));
export const dec1 = (v: number) => nf(1).format(v);
export const dec2 = (v: number) => nf(2).format(v);
/** dekar: 10'un altında tek ondalık */
export const da = (v: number) => (Math.abs(v) < 10 && Math.abs(v - Math.round(v)) > 0.05 ? nf(1).format(v) : nf(0).format(v));
export const pct = (v: number) => (en() ? `${nf(0).format(v * 100)}%` : `%${nf(0).format(v * 100)}`);
export const tl = (v: number) => `${nf(0).format(Math.round(v))} TL`;
/** büyük TL tutarları: 5,98 milyon TL / 5.98 million TL */
export function tlShort(v: number): string {
  if (Math.abs(v) >= 1e6) return `${nf(2).format(v / 1e6)} ${en() ? 'million' : 'milyon'} TL`;
  if (Math.abs(v) >= 1e4) return `${nf(0).format(v / 1e3)} ${en() ? 'thousand' : 'bin'} TL`;
  return tl(v);
}
export const m3 = (v: number) => `${nf(0).format(Math.round(v))} m³`;
export const mm = (v: number) => `${nf(0).format(Math.round(v))} mm`;
export const ton = (v: number) => `${Math.abs(v) < 100 ? nf(1).format(v) : nf(0).format(v)} t`;

export const fmtDayMonth = (d: Date) => df({ day: 'numeric', month: 'long' }, 'dm').format(d);
export const fmtDayMonthShort = (d: Date) => df({ day: 'numeric', month: 'short' }, 'dms').format(d);
export const fmtFull = (d: Date) => df({ day: 'numeric', month: 'long', year: 'numeric' }, 'full').format(d);

/** Pencere içi gün numarasını (1 Ekim = 0) herhangi bir yıl için gün-ay metnine çevirir. */
export function windowDayLabel(day: number, short = false): string {
  const d = new Date(Date.UTC(2001, 9, 1) + day * 86400000); // 2001-2002: artık yıl değil
  return short ? fmtDayMonthShort(d) : fmtDayMonth(d);
}

/** "20 yılın 7'sinde" için sayıya uygun ek (0-20 arası yeterli). */
export function inSuffix(n: number): string {
  if (en()) return '';
  if (n === 0) return "'ında";
  if (n === 10) return "'unda";
  if (n === 20) return "'sinde";
  return ["", "'inde", "'sinde", "'ünde", "'ünde", "'inde", "'sında", "'sinde", "'inde", "'unda"][n % 10];
}

/** "4 Temmuz'da", "12 Ağustos'ta": ay adına uygun bulunma eki. */
export function onSuffix(d: Date): string {
  if (en()) return '';
  return ["'ta", "'ta", "'ta", "'da", "'ta", "'da", "'da", "'ta", "'de", "'de", "'da", "'ta"][d.getUTCMonth()];
}
