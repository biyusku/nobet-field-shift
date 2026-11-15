// Üst sınır kontrolü: karşılanamaz söz çözücüye hiç gitmez (javascript-lp-solver 2.000 t nohutta dönmüyordu).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CROPS } from '../../data/crops';
import { DEFAULT_EFF, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { DISTRICTS, generateMembers } from '../../data/members';
import { computeModel } from '../../model';
import { maxProductionT, plannedOutcome } from '../plan';
import { maxCropScenario, maxSafeCommitment, reachedInAtLeast } from '../promise';
import type { Weather } from '../types';
import { buildWeather } from '../weather';

const weathers: Record<string, Weather> = {};
for (const d of DISTRICTS) weathers[d.id] = buildWeather(JSON.parse(readFileSync(`public/data/${d.id}.json`, 'utf8')));
const model = computeModel(weathers, 'karapinar', {
  members: generateMembers(),
  cropDefs: structuredClone(DEFAULT_CROPS),
  soil: { ...DEFAULT_SOIL },
  eff: { ...DEFAULT_EFF },
  settings: structuredClone(DEFAULT_SETTINGS),
});
const input = model.planInput;
const timed = <T>(f: () => T) => {
  const t0 = performance.now();
  const value = f();
  return { value, ms: performance.now() - t0 };
};

describe('üst sınır kontrolü', () => {
  it('nohut üst sınırı: kooperatif alanının %25i × 220 kg/da ≈ 505 t', () => {
    const total = input.members.reduce((s, m) => s + m.areaDa, 0);
    expect(maxProductionT(input, 'nohut')).toBeCloseTo((0.25 * total * 220) / 1000, 6);
    expect(Math.floor(maxProductionT(input, 'nohut'))).toBe(505);
  });

  for (const tons of [500, 1000, 2000, 5000]) {
    it(`nohut ${tons} t: 5 sn içinde sonuç ya da anlaşılır hata`, () => {
      const { value, ms } = timed(() => plannedOutcome(input, { nohut: tons }));
      expect(ms).toBeLessThan(5000);
      if (tons <= maxProductionT(input, 'nohut')) {
        expect(value.plan.status).not.toBe('error');
      } else {
        expect(value.plan.status).toBe('error');
        expect(value.plan.message).toMatch(/karşılanamaz: nohut için en çok yaklaşık 505 ton/);
      }
    });
  }

  it('"yalnız nohut" ve güvenli nohut sözü artık takılmıyor', () => {
    expect(timed(() => maxCropScenario(input, 'nohut')).ms).toBeLessThan(5000);
    expect(timed(() => maxSafeCommitment(input, 'nohut', 16)).ms).toBeLessThan(5000);
  });

  it('mısır sonuçları değişmedi (Pano: 1.505 t → 2.639 t, yalnız mısır 3.146 t, 2.630 t sözü 17/20)', () => {
    expect(Math.floor(reachedInAtLeast(model.scenarios.today.backtest.map((y) => y.productionT.misir ?? 0), 16))).toBe(1505);
    expect(Math.floor(maxSafeCommitment(input, 'misir', 16))).toBe(2639);
    expect(Math.floor(reachedInAtLeast(maxCropScenario(input, 'misir').yearly.misir, 16))).toBe(3146);
    expect(plannedOutcome(input, { misir: 2630 }).held).toBe(17);
  });
});
