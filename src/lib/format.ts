// tr-TR sayı ve tarih biçimleri.
const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayMonth = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const dayMonthShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const full = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const int = (v: number) => nf0.format(Math.round(v));
export const dec1 = (v: number) => nf1.format(v);
export const dec2 = (v: number) => nf2.format(v);
/** dekar: 10'un altında tek ondalık */
export const da = (v: number) => (Math.abs(v) < 10 && Math.abs(v - Math.round(v)) > 0.05 ? nf1.format(v) : nf0.format(v));
export const pct = (v: number) => `%${nf0.format(v * 100)}`;
export const tl = (v: number) => `${nf0.format(Math.round(v))} TL`;
/** büyük TL tutarları: 5,98 milyon TL */
export function tlShort(v: number): string {
  if (Math.abs(v) >= 1e6) return `${nf2.format(v / 1e6)} milyon TL`;
  if (Math.abs(v) >= 1e4) return `${nf0.format(v / 1e3)} bin TL`;
  return tl(v);
}
export const m3 = (v: number) => `${nf0.format(Math.round(v))} m³`;
export const mm = (v: number) => `${nf0.format(Math.round(v))} mm`;
export const ton = (v: number) => `${Math.abs(v) < 100 ? nf1.format(v) : nf0.format(v)} t`;

export const fmtDayMonth = (d: Date) => dayMonth.format(d);
export const fmtDayMonthShort = (d: Date) => dayMonthShort.format(d);
export const fmtFull = (d: Date) => full.format(d);

/** Pencere içi gün numarasını (1 Ekim = 0) herhangi bir yıl için gün-ay metnine çevirir. */
export function windowDayLabel(day: number, short = false): string {
  const d = new Date(Date.UTC(2001, 9, 1) + day * 86400000); // 2001-2002: artık yıl değil
  return short ? dayMonthShort.format(d) : dayMonth.format(d);
}

/** "20 yılın 7'sinde" için sayıya uygun ek (0-20 arası yeterli). */
export function inSuffix(n: number): string {
  if (n === 0) return "'ında";
  if (n === 10) return "'unda";
  if (n === 20) return "'sinde";
  return ["", "'inde", "'sinde", "'ünde", "'ünde", "'inde", "'sında", "'sinde", "'inde", "'unda"][n % 10];
}

/** "4 Temmuz'da", "12 Ağustos'ta": ay adına uygun bulunma eki. */
export function onSuffix(d: Date): string {
  return ["'ta", "'ta", "'ta", "'da", "'ta", "'da", "'da", "'ta", "'de", "'de", "'da", "'ta"][d.getUTCMonth()];
}
