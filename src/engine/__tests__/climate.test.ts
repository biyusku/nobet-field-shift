import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { climateSummary, hotDaysInSummer, powerCell } from '../climate';
import { buildWeather, sumCalendar } from '../weather';

const w = buildWeather(JSON.parse(readFileSync('public/data/karapinar.json', 'utf8')));
const c = climateSummary(w);

describe('iklim özeti (Karapınar)', () => {
  it('12 ay; aylık ortalamaların toplamı yıllık ortalamayı verir', () => {
    expect(c.months).toHaveLength(12);
    expect(c.months.reduce((s, m) => s + m.prec, 0)).toBeCloseTo(c.meanPrec, 6);
    expect(c.months.reduce((s, m) => s + m.et0, 0)).toBeCloseTo(c.meanEt0, 6);
  });
  it('temmuz: yağış birkaç mm, ET0 200 mm civarı', () => {
    expect(c.months[6].prec).toBeLessThan(10);
    expect(c.months[6].et0).toBeGreaterThan(190);
  });
  it('yıllık seri 2005-2025; en kurak yıl seriden; eğilim doğrusu ortalamadan geçer', () => {
    expect(c.years[0].year).toBe(2005);
    expect(c.years[c.years.length - 1].year).toBe(2025);
    expect(c.driest.prec).toBe(Math.min(...c.years.map((y) => y.prec)));
    expect(c.years.find((y) => y.year === 2010)!.prec).toBeCloseTo(sumCalendar(w, w.prec, 2010), 9);
    const mid = (c.years[0].year + c.years[c.years.length - 1].year) / 2;
    const mean = c.years.reduce((s, y) => s + y.prec, 0) / c.years.length;
    expect(c.trend.atFirstYear + c.trend.slopePerYear * (mid - c.years[0].year)).toBeCloseTo(mean, 6);
  });
  it('sıcak gün sayısı 0-62 arasında', () => {
    expect(c.hotDays.last).toBe(hotDaysInSummer(w, 2025));
    expect(c.hotDays.mean).toBeGreaterThanOrEqual(0);
    expect(c.hotDays.mean).toBeLessThanOrEqual(62);
  });
  it('POWER hücresi 0,5° x 0,625° ve noktayı içerir', () => {
    const b = powerCell(37.72, 33.55);
    expect(b.north - b.south).toBeCloseTo(0.5, 9);
    expect(b.east - b.west).toBeCloseTo(0.625, 9);
    expect(b.south).toBeLessThanOrEqual(37.72);
    expect(b.north).toBeGreaterThanOrEqual(37.72);
    expect(b.west).toBeLessThanOrEqual(33.55);
    expect(b.east).toBeGreaterThanOrEqual(33.55);
  });
});
