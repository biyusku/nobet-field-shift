// Kabul kontrolleri: Karapınar'ın gerçek NASA POWER verisiyle.
// Bantlar proje tanımındaki hedeflerdir. Her kontrol 20 yılın ortalamasını banda karşı sınar ve
// ayrıca "20 yılın en az kaçında" tuttuğunu sınar; tek tek yıllar README'de olduğu gibi raporlanır.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ENGINE_CROPS } from '../../data/crops';
import { simulateCropYear, simulateFarmYear } from '../bucket';
import { buildCurves, harvestYears } from '../curves';
import { buildWeather, dateOfIndex, sumCalendar } from '../weather';

const w = buildWeather(JSON.parse(readFileSync('public/data/karapinar.json', 'utf8')));
const soil = { taw: 130, p: 0.5 };
const years = harvestYears();
const crop = (id: string) => DEFAULT_ENGINE_CROPS.find((c) => c.id === id)!;
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const within = (a: number[], lo: number, hi: number) => a.filter((v) => v >= lo && v <= hi).length;

describe('Karapınar kabul kontrolleri', () => {
  it('veri: 20 hasat yılı, eksiksiz', () => {
    expect(years).toHaveLength(20);
    expect(w.n).toBe(7762);
    expect(w.elevation).toBeGreaterThan(900);
  });

  it('yıllık ET0 yaklaşık 1140-1320 mm', () => {
    const v = years.map((y) => sumCalendar(w, w.et0, y));
    expect(mean(v)).toBeGreaterThan(1140);
    expect(mean(v)).toBeLessThan(1320);
    expect(within(v, 1140, 1320)).toBeGreaterThanOrEqual(18);
    expect(within(v, 1100, 1350)).toBe(20);
  });

  it('temmuz: yağış birkaç mm, ET0 200 mm civarı', () => {
    const rain = years.map((y) => sumCalendar(w, w.prec, y, 7));
    const et0 = years.map((y) => sumCalendar(w, w.et0, y, 7));
    expect(mean(rain)).toBeLessThan(10);
    expect(mean(et0)).toBeGreaterThan(190);
    expect(mean(et0)).toBeLessThan(235);
    expect(within(et0, 185, 235)).toBe(20);
  });

  it('mısırın tam sulama ihtiyacı (randıman 0,80) 700-870 mm brüt', () => {
    const v = years.map((y) => simulateCropYear(w, y, crop('misir'), null, 0.8, soil).grossMm);
    expect(mean(v)).toBeGreaterThan(700);
    expect(mean(v)).toBeLessThan(870);
    expect(within(v, 700, 870)).toBeGreaterThanOrEqual(18);
    expect(within(v, 670, 870)).toBe(20);
  });

  it('200 mm kota, tüm tarla mısır: su bitiş tarihi temmuzun ilk üç haftasında', () => {
    const days = years.map((y) => {
      const r = simulateFarmYear(w, y, [{ crop: crop('misir'), areaDa: 100, capMm: null }], {
        efficiency: 0.75,
        soil,
        poolM3: 200 * 100,
      });
      expect(r.poolEndDay).not.toBeNull();
      expect(r.usedM3).toBeLessThanOrEqual(200 * 100 + 1e-6);
      const d = dateOfIndex(w, r.start + r.poolEndDay!);
      expect(d.getUTCFullYear()).toBe(y);
      expect(d.getUTCMonth()).toBe(6); // her yıl temmuz
      return d.getUTCDate();
    });
    expect(within(days, 1, 21)).toBeGreaterThanOrEqual(19);
    expect(Math.max(...days)).toBeLessThanOrEqual(24);
  });

  it('susuz mısırın göreli verimi 0,1 altında; buğdayınki 0,4-0,6', () => {
    const corn = years.map((y) => simulateCropYear(w, y, crop('misir'), 0, 0.75, soil).relYield);
    const wheat = years.map((y) => simulateCropYear(w, y, crop('bugday'), 0, 0.75, soil).relYield);
    expect(mean(corn)).toBeLessThan(0.1);
    expect(within(corn, 0, 0.1)).toBeGreaterThanOrEqual(17);
    expect(Math.max(...corn)).toBeLessThan(0.2);
    expect(mean(wheat)).toBeGreaterThan(0.4);
    expect(mean(wheat)).toBeLessThan(0.6);
    expect(within(wheat, 0.4, 0.6)).toBeGreaterThanOrEqual(17);
  });
});

describe('kova modeli özellikleri', () => {
  it('tam sulamada göreli verim 1; su arttıkça verim azalmaz', () => {
    for (const c of DEFAULT_ENGINE_CROPS) {
      let prev = -1;
      for (const level of [0, 100, 200, 350, 500, null]) {
        const r = simulateCropYear(w, 2021, c, level, 0.75, soil);
        expect(r.relYield).toBeGreaterThanOrEqual(prev - 1e-9);
        if (level !== null) expect(r.grossMm).toBeLessThanOrEqual(level + 1e-6);
        prev = r.relYield;
      }
      // hasada 10 gün kala sulama kesildiği için tam sulamada bile çok küçük bir açık kalabilir
      expect(prev).toBeGreaterThan(0.97);
    }
  });

  it('düşük randıman aynı net su için daha çok brüt su ister', () => {
    const a = simulateCropYear(w, 2021, crop('misir'), null, 0.5, soil).grossMm;
    const b = simulateCropYear(w, 2021, crop('misir'), null, 0.9, soil).grossMm;
    expect(a / b).toBeCloseTo(0.9 / 0.5, 5);
  });

  it('ortak havuz: toplam kullanım kotayı aşmaz, kümülatif seri azalmaz', () => {
    const r = simulateFarmYear(
      w,
      2020,
      [
        { crop: crop('misir'), areaDa: 60, capMm: null },
        { crop: crop('bugday'), areaDa: 40, capMm: null },
      ],
      { efficiency: 0.75, soil, poolM3: 20000 },
    );
    expect(r.usedM3).toBeLessThanOrEqual(20000 + 1e-6);
    for (let i = 1; i < r.nDays; i++) expect(r.cumM3[i]).toBeGreaterThanOrEqual(r.cumM3[i - 1]);
    expect(r.cumM3[r.nDays - 1]).toBeCloseTo(r.usedM3, 6);
  });
});

describe('su-verim eğrileri', () => {
  const curves = buildCurves(w, DEFAULT_ENGINE_CROPS, 0.75, soil);
  it('her ürün için 20 yıl, seviyeler artan sırada ve sonuncusu tam', () => {
    for (const c of DEFAULT_ENGINE_CROPS) {
      const opts = curves[c.id];
      expect(opts[opts.length - 1].level).toBeNull();
      expect(opts[0].level).toBe(0);
      for (const o of opts) expect(o.relYield).toHaveLength(20);
      for (let i = 1; i < opts.length; i++) expect(opts[i].meanRel).toBeGreaterThanOrEqual(opts[i - 1].meanRel - 1e-9);
    }
  });
  it('uyarı kuralı: susuz mısır güvenilmez, susuz buğday güvenilir', () => {
    expect(curves.misir[0].reliable).toBe(false);
    expect(curves.bugday[0].reliable).toBe(true);
  });
  it('bellekte tutulur', () => {
    expect(buildCurves(w, DEFAULT_ENGINE_CROPS, 0.75, soil)).toBe(curves);
  });
});
