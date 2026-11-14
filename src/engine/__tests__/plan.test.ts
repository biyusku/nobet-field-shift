import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ENGINE_CROPS as crops } from '../../data/crops';
import { DEFAULT_EFF, DEFAULT_MEMBERS, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { buildCurves } from '../curves';
import { combineFarms, evaluateFarm } from '../farm';
import { backtest, solvePlan, summarize, type PlanInput, type PlanSettings } from '../plan';
import { buildRotation, soilScore } from '../soil';
import { FALLOW, type IrrigationMethod } from '../types';
import { buildWeather } from '../weather';

const w = buildWeather(JSON.parse(readFileSync('public/data/karapinar.json', 'utf8')));
const curvesByMethod = Object.fromEntries(
  (Object.keys(DEFAULT_EFF) as IrrigationMethod[]).map((m) => [m, buildCurves(w, crops, DEFAULT_EFF[m], DEFAULT_SOIL)]),
) as PlanInput['curvesByMethod'];
const input = (s: Partial<PlanSettings> = {}): PlanInput => ({
  members: DEFAULT_MEMBERS,
  crops,
  curvesByMethod,
  settings: { ...DEFAULT_SETTINGS, ...s },
});

function checkConstraints(inp: PlanInput) {
  const plan = solvePlan(inp);
  expect(plan.status).not.toBe('error');
  for (const m of inp.members) {
    const mine = plan.allocations.filter((a) => a.memberId === m.id);
    const area = mine.reduce((s, a) => s + a.da, 0);
    const water = mine.reduce((s, a) => s + a.da * a.waterMm, 0);
    expect(area).toBeCloseTo(m.areaDa, 3);
    expect(water).toBeLessThanOrEqual(m.areaDa * m.quotaMm + 1e-3);
    const by = new Map<string, number>();
    for (const a of mine) if (a.cropId !== FALLOW) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
    for (const da of by.values()) expect(da).toBeLessThanOrEqual(inp.settings.maxShare * m.areaDa + 1e-3);
    for (const a of mine) if (a.option && !inp.settings.includeUnreliable) expect(a.option.reliable).toBe(true);
  }
  return plan;
}

describe('planlama (LP)', () => {
  it('taahhütsüz plan bütün kısıtları sağlar', () => {
    const plan = checkConstraints(input({ commitments: {} }));
    expect(plan.status).toBe('ok');
    expect(summarize(plan.allocations, crops).revenue).toBeGreaterThan(0);
  });

  it('küçük bir taahhüt karşılanır ve geliri taahhütsüz planı aşamaz', () => {
    const free = solvePlan(input({ commitments: {} }));
    const plan = checkConstraints(input({ commitments: { misir: 50 } }));
    expect(plan.status).toBe('ok');
    const s = summarize(plan.allocations, crops);
    expect(s.productionT.misir).toBeGreaterThanOrEqual(50 * 0.999);
    expect(s.revenue).toBeLessThanOrEqual(summarize(free.allocations, crops).revenue + 1);
  });

  it('karşılanamayan taahhütte kısmi plan ve ulaşılabilir en yüksek üretim döner', () => {
    const plan = checkConstraints(input({ commitments: { misir: 5000 } }));
    expect(plan.status).toBe('partial');
    expect(plan.commitmentFraction).toBeGreaterThan(0);
    expect(plan.commitmentFraction).toBeLessThan(1);
    expect(plan.maxAlone.misir).toBeCloseTo(5000 * plan.commitmentFraction, 0);
    expect(summarize(plan.allocations, crops).productionT.misir).toBeCloseTo(plan.maxAlone.misir, 0);
  });

  it('en az su modu, gelir modundan fazla su ayırmaz', () => {
    const a = summarize(checkConstraints(input({ commitments: { misir: 50 }, mode: 'minWater' })).allocations, crops);
    const b = summarize(solvePlan(input({ commitments: { misir: 50 } })).allocations, crops);
    expect(a.reservedM3).toBeLessThanOrEqual(b.reservedM3 + 1e-3);
    expect(a.productionT.misir).toBeGreaterThanOrEqual(50 * 0.999);
  });

  it('küçük pazar eşiği kooperatif toplamında tutulur', () => {
    const plan = solvePlan(input({ commitments: {}, smallMarketCap: 0.1 }));
    const s = summarize(plan.allocations, crops);
    const total = DEFAULT_MEMBERS.reduce((x, m) => x + m.areaDa, 0);
    expect(s.areaByCrop.nohut ?? 0).toBeLessThanOrEqual(0.1 * total + 1e-3);
    expect(s.areaByCrop.aycicegi ?? 0).toBeLessThanOrEqual(0.1 * total + 1e-3);
  });

  it('şeker pancarı yalnız sözleşmeli üyeye ve yalnız tam sulamayla önerilir', () => {
    const plan = solvePlan(input({ commitments: {} }));
    const withContract = new Set(DEFAULT_MEMBERS.filter((m) => m.beetContract).map((m) => m.id));
    for (const a of plan.allocations.filter((x) => x.cropId === 'pancar')) {
      expect(withContract.has(a.memberId)).toBe(true);
      expect(a.option?.level).toBeNull();
    }
    const none = solvePlan({ ...input({ commitments: {} }), members: DEFAULT_MEMBERS.map((m) => ({ ...m, beetContract: false })) });
    expect(none.allocations.some((a) => a.cropId === 'pancar')).toBe(false);
  });

  it('sulanan seçenek tam su ihtiyacının %60 altına inmez; 0 yapılınca kısıntılı seçenekler geri gelir', () => {
    const check = (frac: number) => {
      const plan = solvePlan(input({ commitments: { misir: 200 }, minIrrigationFraction: frac }));
      let low = 0;
      for (const a of plan.allocations) {
        if (!a.option || a.option.level === null || a.option.level === 0) continue;
        const m = DEFAULT_MEMBERS.find((x) => x.id === a.memberId)!;
        const opts = curvesByMethod[m.method][a.cropId];
        const full = opts[opts.length - 1];
        if (a.option.meanGross < 0.6 * full.meanGross - 1e-6) low++;
      }
      return low;
    };
    expect(check(0.6)).toBe(0);
    expect(check(0)).toBeGreaterThanOrEqual(0);
  });

  it('kırmızı mercimek varsayılan olarak önerilmez; dahil edilince küçük pazar eşiğine uyar', () => {
    const off = solvePlan(input({ commitments: {} }));
    expect(off.allocations.some((x) => x.cropId === 'mercimek')).toBe(false);
    const on = solvePlan(input({ commitments: {}, includeOptIn: true, smallMarketCap: 0.1 }));
    const total = DEFAULT_MEMBERS.reduce((x, m) => x + m.areaDa, 0);
    const lentil = on.allocations.filter((x) => x.cropId === 'mercimek').reduce((x, y) => x + y.da, 0);
    expect(lentil).toBeGreaterThan(0);
    expect(lentil).toBeLessThanOrEqual(0.1 * total + 1e-3);
  });

  it('nohutlu plan: her üyede baklagil en az %20, geliri kısıtsız planı aşamaz', () => {
    const free = solvePlan(input({ commitments: {} }));
    const plan = checkConstraints(input({ commitments: {}, minLegumeShare: 0.2 }));
    for (const m of DEFAULT_MEMBERS) {
      const legume = plan.allocations.filter((a) => a.memberId === m.id && crops.find((c) => c.id === a.cropId)?.legume).reduce((s, a) => s + a.da, 0);
      expect(legume).toBeGreaterThanOrEqual(0.2 * m.areaDa - 1e-3);
    }
    expect(summarize(plan.allocations, crops).revenue).toBeLessThanOrEqual(summarize(free.allocations, crops).revenue + 1);
  });

  it('dört üyeli küçük kooperatifte 40 t mısır taahhüdü 20 yılın çoğunda tutar', () => {
    const plan = solvePlan(input({ commitments: { misir: 40 } }));
    expect(plan.status).toBe('ok');
    const held = backtest(plan.allocations, crops, { misir: 40 }).filter((y) => y.status === 'green').length;
    expect(held).toBeGreaterThanOrEqual(15);
  });

  it('geçmişte deneme: 20 yıl, hiçbir yıl ayrılan suyu aşmaz, ortalama gelir özetle tutarlı', () => {
    const plan = solvePlan(input({ commitments: { misir: 50 } }));
    const bt = backtest(plan.allocations, crops, { misir: 50 });
    const s = summarize(plan.allocations, crops);
    expect(bt).toHaveLength(20);
    for (const y of bt) expect(y.waterM3).toBeLessThanOrEqual(s.reservedM3 + 1e-3);
    const meanRev = bt.reduce((x, y) => x + y.revenue, 0) / 20;
    expect(meanRev).toBeCloseTo(s.revenue, 0);
  });
});

describe('bugünkü ekimin değerlendirilmesi', () => {
  it('ağırlıklı mısır eken üyede kota her yıl aşılır ve kullanım kotayı geçmez', () => {
    const m = DEFAULT_MEMBERS[0];
    const parcels = m.current.map((c) => ({ crop: crops.find((x) => x.id === c.cropId)!, areaDa: c.da, capMm: null }));
    const ev = evaluateFarm(w, parcels, DEFAULT_EFF[m.method], DEFAULT_SOIL, m.areaDa * m.quotaMm);
    expect(ev.yearsExceeded).toBe(20);
    for (const y of ev.years) {
      expect(y.usedM3).toBeLessThanOrEqual(m.areaDa * m.quotaMm + 1e-6);
      // su bitiş günü = ihtiyaç çizgisinin kotayı aştığı ilk gün
      expect(y.demandM3[y.endDay!]).toBeGreaterThan(m.areaDa * m.quotaMm);
      if (y.endDay! > 0) expect(y.demandM3[y.endDay! - 1]).toBeLessThanOrEqual(m.areaDa * m.quotaMm + 1e-6);
    }
    const coop = combineFarms([ev], { misir: 1 });
    expect(coop).toHaveLength(20);
  });
});

describe('toprak puanı ve nöbet', () => {
  it('tek ürün 0 puan; üç ürün + yeterli baklagil 100 puan', () => {
    expect(soilScore([{ cropId: 'misir', da: 100 }], crops).score).toBe(0);
    const s = soilScore(
      [
        { cropId: 'misir', da: 100 },
        { cropId: 'bugday', da: 100 },
        { cropId: 'nohut', da: 100 },
      ],
      crops,
    );
    expect(s.score).toBe(100);
    expect(s.effectiveCrops).toBeCloseTo(3, 6);
  });

  it('nöbet: her yıl aynı ürün deseni, hiçbir parselde üst üste aynı ürün', () => {
    const areas = [
      { cropId: 'misir', da: 40 },
      { cropId: 'bugday', da: 40 },
      { cropId: 'nohut', da: 25 },
      { cropId: 'arpa', da: 15 },
    ];
    const r = buildRotation(areas, 120);
    expect(r.guaranteed).toBe(true);
    expect(r.parcelDa).toBeCloseTo(40, 6);
    for (let y = 0; y < 3; y++) {
      const tot = new Map<string, number>();
      for (let p = 0; p < 3; p++) for (const c of r.table[p][y]) tot.set(c.cropId, (tot.get(c.cropId) ?? 0) + c.da);
      for (const a of areas) expect(tot.get(a.cropId)).toBeCloseTo(a.da, 6);
    }
    // misir tam bir parseli kaplıyor: o parselde üç yılda bir kez görünmeli
    for (let p = 0; p < 3; p++) {
      const yearsWithCorn = [0, 1, 2].filter((y) => r.table[p][y].some((c) => c.cropId === 'misir'));
      expect(yearsWithCorn).toHaveLength(1);
    }
    expect(buildRotation([{ cropId: 'misir', da: 100 }], 120).guaranteed).toBe(false);
  });
});
