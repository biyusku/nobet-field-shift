// 50 üyeli kurgusal kooperatif: üye üretimi, gelişigüzel dağıtım ve üç dağıtımın tutarlılığı.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CROPS, DEFAULT_ENGINE_CROPS as crops } from '../../data/crops';
import { DEFAULT_EFF, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { DISTRICTS, generateMembers, mulberry32, shuffled } from '../../data/members';
import { computeModel } from '../../model';
import { powerCell } from '../climate';
import { minParcelFor, smallParcels, solvePlan, SMALL_FARM_DA, type PlanSettings } from '../plan';
import { maxCropScenario, mixedScenario } from '../promise';
import { scatterCommitments } from '../scatter';
import { FALLOW, type Weather } from '../types';
import { buildWeather } from '../weather';

const weathers: Record<string, Weather> = {};
for (const d of DISTRICTS) weathers[d.id] = buildWeather(JSON.parse(readFileSync(`public/data/${d.id}.json`, 'utf8')));
const members = generateMembers();

describe('kurgusal üyeler', () => {
  it('belirlenimci: aynı tohum aynı üyeleri verir', () => {
    expect(generateMembers()).toEqual(members);
    expect(generateMembers(50, 1)).not.toEqual(members);
  });
  it('50 üye, beş ilçeye eşit, sınırlar içinde', () => {
    expect(members).toHaveLength(50);
    for (const d of DISTRICTS) expect(members.filter((m) => m.pointId === d.id)).toHaveLength(10);
    for (const m of members) {
      expect(m.areaDa).toBeGreaterThanOrEqual(40);
      expect(m.areaDa).toBeLessThanOrEqual(400);
      expect(m.quotaMm).toBeGreaterThanOrEqual(200);
      expect(m.quotaMm).toBeLessThanOrEqual(350);
      expect(m.current.reduce((s, c) => s + c.da, 0)).toBe(m.areaDa);
      // üye, havasıyla hesaplandığı NASA hücresinin içinde durur
      const d = DISTRICTS.find((x) => x.id === m.pointId)!;
      const c = powerCell(d.lat, d.lon);
      expect(m.lat!).toBeGreaterThan(c.south);
      expect(m.lat!).toBeLessThan(c.north);
      expect(m.lon!).toBeGreaterThan(c.west);
      expect(m.lon!).toBeLessThan(c.east);
    }
  });
  it('bugünkü ekim ağırlıklı mısır ve buğday', () => {
    const area = (id: string) => members.reduce((s, m) => s + m.current.filter((c) => c.cropId === id).reduce((x, c) => x + c.da, 0), 0);
    const total = members.reduce((s, m) => s + m.areaDa, 0);
    expect((area('misir') + area('bugday')) / total).toBeGreaterThan(0.7);
  });
});

describe('gelişigüzel dağıtım', () => {
  const order = shuffled(members, mulberry32(7));
  it('tam verim varsayımıyla söz dolana kadar üye seçer, fazlasını seçmez', () => {
    const r = scatterCommitments(order, crops, { misir: 300 });
    expect(r.nominalTons.misir).toBeGreaterThanOrEqual(300);
    const ids = [...r.assigned.keys()];
    const last = members.find((m) => m.id === ids[ids.length - 1])!;
    expect(r.nominalTons.misir - (last.areaDa * 1265) / 1000).toBeLessThan(300);
    expect(scatterCommitments(order, crops, {}).assigned.size).toBe(0);
  });
  it('söz bütün kooperatiften büyükse herkesi seçer ve durur', () => {
    expect(scatterCommitments(order, crops, { misir: 1e9 }).assigned.size).toBe(50);
  });
});

describe('üç dağıtım (300 ton mısır)', () => {
  const m = computeModel(weathers, 'karapinar', { members, cropDefs: DEFAULT_CROPS, soil: DEFAULT_SOIL, eff: DEFAULT_EFF, settings: { ...DEFAULT_SETTINGS, commitments: { misir: 300 } } });
  it('her üye kendi ilçesinin havasıyla hesaplanır', () => {
    for (const mv of m.members) expect(mv.weather).toBe(weathers[mv.member.pointId!]);
  });
  it('hiçbir dağıtımda hiçbir üye su hakkını aşmaz', () => {
    for (const mv of m.members) {
      for (const ev of [mv.current, mv.scatter, mv.planned]) for (const y of ev.years) expect(y.usedM3).toBeLessThanOrEqual(mv.quotaM3 + 1e-3);
    }
  });
  it('planlı dağıtım: kimsenin suyu bitmez, alan ve pay kısıtları sağlanır, pancar yalnız sözleşmeliye', () => {
    expect(m.scenarios.planned.exceeded).toBe(0);
    for (const mv of m.members) {
      expect(mv.plannedAllocs.reduce((s, a) => s + a.da, 0)).toBeCloseTo(mv.member.areaDa, 3);
      const by = new Map<string, number>();
      for (const a of mv.plannedAllocs) if (a.cropId !== FALLOW) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
      for (const v of by.values()) expect(v).toBeLessThanOrEqual(mv.member.areaDa / 3 + 1e-3);
      if (!mv.member.beetContract) expect(by.has('pancar')).toBe(false);
    }
  });
  it('üç senaryo aynı ölçüyle: söz kooperatifin o üründeki TOPLAM üretimine bakar', () => {
    const modes = { today: 'current', scatter: 'scatter', planned: 'planned' } as const;
    for (const [mode, key] of Object.entries(modes) as [keyof typeof modes, (typeof modes)[keyof typeof modes]][]) {
      const sc = m.scenarios[mode];
      expect(sc.total).toBe(20);
      sc.backtest.forEach((y, yi) => {
        const total = m.members.reduce((x, mv) => x + (mv[key].years[yi]?.productionT.misir ?? 0), 0);
        expect(y.productionT.misir ?? 0).toBeCloseTo(total, 4);
        expect(y.ratio).toBeCloseTo(total / 300, 6);
      });
      expect(sc.held).toBe(sc.backtest.filter((y) => (y.productionT.misir ?? 0) >= 300 - 1e-6).length);
      expect(sc.exceeded).toBe(m.members.filter((mv) => mv[key].yearsExceeded > 0).length);
    }
    // gelişigüzel dağıtımda görevlendirilmeyen üyeler bugünkü ekimini sürdürür
    for (const mv of m.members) if (!mv.scatterCrop) expect(mv.scatter).toBe(mv.current);
    expect(m.members.some((mv) => mv.scatterCrop === 'misir')).toBe(true);
  });
  it('çözüm 3 saniyenin altında', () => {
    expect(m.timing.totalMs).toBeLessThan(3000);
  });
});

describe('en küçük parsel kuralı', () => {
  const base = { members, cropDefs: DEFAULT_CROPS, soil: DEFAULT_SOIL, eff: DEFAULT_EFF };
  const model = computeModel(weathers, 'karapinar', { ...base, settings: DEFAULT_SETTINGS });
  const check = (allocations: Parameters<typeof smallParcels>[0], settings = DEFAULT_SETTINGS) => {
    for (const m of members) {
      const thr = m.areaDa < SMALL_FARM_DA ? 5 : 10;
      expect(minParcelFor(m, settings)).toBe(thr);
      const by = new Map<string, number>();
      for (const a of allocations) if (a.memberId === m.id && a.cropId !== FALLOW) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
      for (const [cropId, da] of by) expect(da, `${m.name} ${cropId}`).toBeGreaterThanOrEqual(thr - 1e-6);
    }
    expect(smallParcels(allocations, members, settings)).toEqual([]);
  };

  it('eşik: 10 da; tarlası 60 dekardan küçük üyede 5 da; 0 kuralı kapatır', () => {
    expect(members.some((m) => m.areaDa < SMALL_FARM_DA)).toBe(true);
    expect(minParcelFor({ ...members[0], areaDa: 200 }, DEFAULT_SETTINGS)).toBe(10);
    expect(minParcelFor({ ...members[0], areaDa: 50 }, DEFAULT_SETTINGS)).toBe(5);
    expect(minParcelFor({ ...members[0], areaDa: 200 }, { ...DEFAULT_SETTINGS, minParcelDa: 0 })).toBe(0);
  });

  it('kural kapalıyken eşik altı parsel çıkıyor (kuralın bir işe yaradığının kanıtı)', () => {
    const off = solvePlan({ ...model.planInput, settings: { ...DEFAULT_SETTINGS, minParcelDa: 0 } });
    expect(smallParcels(off.allocations, members, DEFAULT_SETTINGS).length).toBeGreaterThan(0);
  });

  it('hiçbir üyede eşik altı parsel yok: üye önerisi ve planlı dağıtım', () => {
    check(model.plan.allocations);
    for (const mv of model.members) check(mv.plannedAllocs);
  });

  it('hiçbir üyede eşik altı parsel yok: taahhütsüz, büyük sözlü, en az su ve nohutlu planlar', () => {
    const patches: Partial<PlanSettings>[] = [{ commitments: {} }, { commitments: { misir: 3100 } }, { commitments: { misir: 500, bugday: 600 } }, { mode: 'minWater' }, { minLegumeShare: 0.2 }];
    for (const patch of patches) {
      const settings = { ...DEFAULT_SETTINGS, ...patch };
      const plan = solvePlan({ ...model.planInput, settings });
      expect(plan.status).not.toBe('error');
      check(plan.allocations, settings);
    }
  });

  it('hiçbir üyede eşik altı parsel yok: "söz vermeden önce" senaryoları', () => {
    check(mixedScenario(model.planInput).plan.allocations);
    check(maxCropScenario(model.planInput, 'misir').plan.allocations);
    check(maxCropScenario(model.planInput, 'bugday').plan.allocations);
  });

  it('kural su hakkını, alan eşitliğini ve pay sınırını bozmaz', () => {
    for (const mv of model.members) {
      expect(mv.plannedAllocs.reduce((s, a) => s + a.da, 0)).toBeCloseTo(mv.member.areaDa, 3);
      expect(mv.plannedAllocs.reduce((s, a) => s + a.da * a.waterMm, 0)).toBeLessThanOrEqual(mv.quotaM3 + 1e-3);
      const by = new Map<string, number>();
      for (const a of mv.plannedAllocs) if (a.cropId !== FALLOW) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
      for (const v of by.values()) expect(v).toBeLessThanOrEqual(mv.member.areaDa / 3 + 1e-3);
    }
    expect(model.scenarios.planned.exceeded).toBe(0);
  });

  it('üç yıllık nöbet tablosunda eşik altı parça yok', () => {
    for (const mv of model.members) {
      const thr = minParcelFor(mv.member, DEFAULT_SETTINGS);
      for (const row of mv.rotation.table) for (const cells of row) for (const c of cells) if (c.cropId !== FALLOW) expect(c.da, `${mv.member.name} ${c.cropId}`).toBeGreaterThanOrEqual(thr - 1e-6);
    }
  });

  it('toplam çözüm 5 saniyenin altında', () => {
    expect(model.timing.totalMs).toBeLessThan(5000);
  });
});

