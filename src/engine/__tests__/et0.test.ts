import { describe, expect, it } from 'vitest';
import { e0, et0Hargreaves, et0PenmanMonteith, extraterrestrialRadiation } from '../et0';
import { kcAt } from '../bucket';
import { buildWeather, dayIndex, dayOfYear } from '../weather';
import type { Crop, RawWeather } from '../types';

describe('ET0 (FAO-56)', () => {
  it('FAO-56 Örnek 8: 20°G, 3 Eylül (J=246) için Ra = 32,2 MJ/m2/gün', () => {
    const Ra = extraterrestrialRadiation(246, (-20 * Math.PI) / 180);
    expect(Ra).toBeCloseTo(32.2, 1);
  });

  it('FAO-56 Örnek 18: Uccle, 6 Temmuz için ET0 = 3,9 mm/gün', () => {
    // Örnekte ea = 1,409 kPa, RHmax/RHmin'den hesaplanır. Bizim formül ea = RH/100*es kullandığı için
    // aynı ea'yı veren eşdeğer ortalama nemi geçiriyoruz.
    const es = (e0(21.5) + e0(12.3)) / 2;
    expect(es).toBeCloseTo(1.997, 2);
    const rh = (1.409 / es) * 100;
    const et0 = et0PenmanMonteith({
      tmax: 21.5,
      tmin: 12.3,
      rs: 22.07,
      u2: 2.078,
      rh,
      J: 187,
      latRad: ((50 + 48 / 60) * Math.PI) / 180,
      z: 100,
    });
    expect(et0).toBeGreaterThan(3.8);
    expect(et0).toBeLessThan(3.95);
    expect(extraterrestrialRadiation(187, ((50 + 48 / 60) * Math.PI) / 180)).toBeCloseTo(41.09, 1);
  });

  it('Hargreaves yedeği makul büyüklükte ve pozitif', () => {
    const v = et0Hargreaves(34, 16, 196, (37.72 * Math.PI) / 180);
    expect(v).toBeGreaterThan(5);
    expect(v).toBeLessThan(9);
  });

  it('kutup gecesinde çökmez', () => {
    expect(Number.isFinite(extraterrestrialRadiation(355, (80 * Math.PI) / 180))).toBe(true);
  });
});

describe('veri temizliği', () => {
  const raw: RawWeather = {
    id: 't',
    name: 't',
    lat: 37.72,
    lon: 33.55,
    elevation: 1000,
    start: '20240701',
    end: '20240704',
    params: {
      T2M_MAX: [30, null, 32, 31],
      T2M_MIN: [15, 16, null, 14],
      PRECTOTCORR: [1, null, 0, 2],
      ALLSKY_SFC_SW_DWN: [28, 28, null, 27],
      WS2M: [2, 2, 2, 2],
      RH2M: [40, 40, 40, 40],
    },
  };
  const w = buildWeather(raw);
  it('yağışta eksik 0, sıcaklıkta eksik bir önceki gün', () => {
    expect(Array.from(w.prec)).toEqual([1, 0, 0, 2]);
    expect(w.tmax[1]).toBe(30);
    expect(w.tmin[2]).toBe(16);
  });
  it('güneş eksik olan gün Hargreaves ile hesaplanır', () => {
    expect(w.hargreavesDays).toBe(1);
    expect(w.et0[2]).toBeCloseTo(et0Hargreaves(32, 16, dayOfYear(Date.UTC(2024, 6, 3)), (37.72 * Math.PI) / 180), 10);
    expect(w.et0.every((v) => v > 0)).toBe(true);
  });
  it('gün indisi', () => {
    expect(dayIndex(w, 2024, 7, 3)).toBe(2);
    expect(dayOfYear(Date.UTC(2024, 0, 1))).toBe(1);
    expect(dayOfYear(Date.UTC(2024, 11, 31))).toBe(366);
  });
});

describe('Kc eğrisi', () => {
  const corn = { stages: [30, 40, 50, 30], kc: [0.3, 1.2, 0.5] } as unknown as Crop;
  it('evre içinde doğru biçim', () => {
    expect(kcAt(corn, 0)).toBe(0.3);
    expect(kcAt(corn, 29)).toBe(0.3);
    expect(kcAt(corn, 50)).toBeCloseTo(0.75, 10); // gelişmenin ortası
    expect(kcAt(corn, 70)).toBe(1.2);
    expect(kcAt(corn, 119)).toBe(1.2);
    expect(kcAt(corn, 135)).toBeCloseTo(0.85, 10); // son evrenin ortası
    expect(kcAt(corn, 150)).toBe(0);
  });
});
