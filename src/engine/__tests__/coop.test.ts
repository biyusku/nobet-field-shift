// 50 üyeli kurgusal kooperatif: üye üretimi, gelişigüzel dağıtım ve üç dağıtımın tutarlılığı.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CROPS, DEFAULT_ENGINE_CROPS as crops } from '../../data/crops';
import { DEFAULT_EFF, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { DISTRICTS, generateMembers, mulberry32, shuffled } from '../../data/members';
import { computeModel } from '../../model';
import { powerCell } from '../climate';
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
  it('gelişigüzel dağıtımda söz yalnız görevlendirilen üyelerle ölçülür; özet sayıları tutarlı', () => {
    const s = m.scenarios.scatter;
    expect(s.growers).toBe(m.members.filter((mv) => mv.scatterCrop === 'misir').length);
    expect(s.growers).toBeGreaterThan(0);
    const direct = m.members.filter((mv) => mv.scatterCrop).reduce((x, mv) => x + mv.scatter.years.reduce((a, y) => a + (y.productionT.misir ?? 0), 0) / mv.scatter.years.length, 0);
    expect(s.deliveredT.misir).toBeCloseTo(direct, 6);
    expect(s.yieldLevel).toBeGreaterThan(0);
    expect(s.yieldLevel).toBeLessThanOrEqual(1);
    expect(m.scenarios.planned.total).toBe(20);
  });
  it('çözüm 3 saniyenin altında', () => {
    expect(m.timing.totalMs).toBeLessThan(3000);
  });
});
