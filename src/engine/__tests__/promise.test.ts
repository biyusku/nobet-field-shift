import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CROPS } from '../../data/crops';
import { DEFAULT_COMMITMENT_TONS, DEFAULT_EFF, DEFAULT_SAFE_YEARS, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { DISTRICTS, generateMembers } from '../../data/members';
import { computeModel } from '../../model';
import { maxCropScenario, maxSafeCommitment, mixedScenario, reachedInAtLeast, yearsReached } from '../promise';
import type { Weather } from '../types';
import { buildWeather } from '../weather';

const weathers: Record<string, Weather> = {};
for (const d of DISTRICTS) weathers[d.id] = buildWeather(JSON.parse(readFileSync(`public/data/${d.id}.json`, 'utf8')));
const model = computeModel(weathers, 'karapinar', { members: generateMembers(), cropDefs: DEFAULT_CROPS, soil: DEFAULT_SOIL, eff: DEFAULT_EFF, settings: DEFAULT_SETTINGS });
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

describe('güvenle söz verilebilecek miktar', () => {
  it('k. en iyi yıl: en az k yılda ulaşılan miktar', () => {
    const v = [5, 9, 1, 7, 3];
    expect(reachedInAtLeast(v, 1)).toBe(9);
    expect(reachedInAtLeast(v, 3)).toBe(5);
    expect(reachedInAtLeast(v, 5)).toBe(1);
    expect(yearsReached(v, 5)).toBe(3);
    expect(yearsReached(v, reachedInAtLeast(v, 4))).toBeGreaterThanOrEqual(4);
  });

  const corn = maxCropScenario(model.planInput, 'misir');
  const mixed = mixedScenario(model.planInput);

  it('yalnız mısır: 20 yıl; eşik sıkılaştıkça verilebilecek söz azalır ve ortalamayı aşmaz', () => {
    const y = corn.yearly.misir;
    expect(y).toHaveLength(20);
    const s14 = reachedInAtLeast(y, 14);
    const s16 = reachedInAtLeast(y, 16);
    const s18 = reachedInAtLeast(y, 18);
    expect(s14).toBeGreaterThanOrEqual(s16);
    expect(s16).toBeGreaterThanOrEqual(s18);
    expect(s16).toBeLessThanOrEqual(mean(y) + 1e-6);
    expect(yearsReached(y, s16)).toBeGreaterThanOrEqual(16);
    expect(yearsReached(y, s16 * 1.2)).toBeLessThan(16);
  });

  it('yalnız mısır planı karma plandan çok mısır üretir, karma plan daha çok gelir getirir', () => {
    expect(mean(corn.yearly.misir)).toBeGreaterThanOrEqual(mean(mixed.yearly.misir) - 1e-6);
    expect(mixed.revenue).toBeGreaterThanOrEqual(corn.revenue - 1);
  });

  it('sözleşmesi olmayan kooperatifte pancar için verilebilecek söz sıfırdır', () => {
    const none = { ...model.planInput, members: model.planInput.members.map((m) => ({ ...m, beetContract: false })) };
    expect(reachedInAtLeast(maxCropScenario(none, 'pancar').yearly.pancar, 16)).toBe(0);
  });

  it('varsayılan söz hesaptan gelir: planlı dağıtımda 20 yılın en az 16\'sında tutan en yüksek mısır, 10 tona aşağı yuvarlanmış', () => {
    const safe = maxSafeCommitment(model.planInput, 'misir', DEFAULT_SAFE_YEARS);
    expect(DEFAULT_COMMITMENT_TONS).toBe(Math.floor(safe / 10) * 10);
    expect(DEFAULT_SETTINGS.commitments).toEqual({ misir: DEFAULT_COMMITMENT_TONS });
    // daha sık taranınca daha büyük bir değer çıkmıyor
    expect(maxSafeCommitment(model.planInput, 'misir', DEFAULT_SAFE_YEARS, 32)).toBeCloseTo(safe, 6);
    // varsayılan sözle: planlı dağıtım eşiği tutturur
    expect(model.scenarios.planned.held).toBeGreaterThanOrEqual(DEFAULT_SAFE_YEARS);
  });
});
