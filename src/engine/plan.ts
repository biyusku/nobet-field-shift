// Planlama: doğrusal programlama ile her üyenin her (ürün, su seviyesi) çiftine dekar dağıtımı.
import solver from 'javascript-lp-solver';
import type { Curves, WaterOption } from './curves';
import { FALLOW, type Crop, type IrrigationMethod, type Member } from './types';

export interface PlanSettings {
  /** bir ürünün üyedeki en yüksek payı (varsayılan 1/3) */
  maxShare: number;
  /** küçük pazarlı ürünlerin her biri için kooperatif alanındaki en yüksek pay; null = sınır yok */
  smallMarketCap: number | null;
  /** ürün başına taahhüt, ton */
  commitments: Record<string, number>;
  /** 'revenue': geliri en yükseğe çıkar; 'minWater': taahhüdü karşılayan en az su */
  mode: 'revenue' | 'minWater';
  /** göreli verimi 0,35 altındaki seçenekleri de planlamaya kat */
  includeUnreliable: boolean;
}

export interface PlanInput {
  members: Member[];
  crops: Crop[];
  curvesByMethod: Record<IrrigationMethod, Curves>;
  settings: PlanSettings;
}

export interface Allocation {
  memberId: string;
  /** ürün kimliği ya da 'nadas' */
  cropId: string;
  /** seçilen su seçeneği; nadas için null */
  option: WaterOption | null;
  da: number;
  /** dekara ayrılan brüt su (20 yılın en yüksek kullanımı), mm */
  waterMm: number;
}

export interface PlanResult {
  /** ok: taahhütler beklenen verimle karşılanıyor; partial: karşılanamıyor, en yakın plan; empty: üye yok */
  status: 'ok' | 'partial' | 'empty' | 'error';
  allocations: Allocation[];
  /** taahhütlerin aynı oranda karşılanabilen en yüksek kesri (0-1) */
  commitmentFraction: number;
  /** partial ise: her taahhütlü ürün tek başına en çok kaç ton üretilebilir */
  maxAlone: Record<string, number>;
  message?: string;
}

type Row = Record<string, number>;
interface LpModel {
  optimize: string;
  opType: 'max' | 'min';
  constraints: Record<string, { min?: number; max?: number; equal?: number }>;
  variables: Record<string, Row>;
}
interface VarMeta {
  member: Member;
  cropId: string;
  option: WaterOption | null;
}

const lp = solver as unknown as { Solve: (m: LpModel) => Record<string, number | boolean> };

/** Seçeneğin 20 yıl ortalamasıyla dekar başına beklenen üretimi, ton. */
export function expectedTonsPerDa(crop: Crop, o: WaterOption): number {
  return (o.meanRel * crop.yieldKgDa) / 1000;
}

function buildBase(input: PlanInput) {
  const { members, crops, curvesByMethod, settings } = input;
  const constraints: LpModel['constraints'] = {};
  const variables: Record<string, Row> = {};
  const meta = new Map<string, VarMeta>();
  const active = members.filter((m) => m.areaDa > 0);
  const totalArea = active.reduce((s, m) => s + m.areaDa, 0);

  active.forEach((m, mi) => {
    constraints[`alan_${mi}`] = { equal: m.areaDa };
    constraints[`su_${mi}`] = { max: m.areaDa * m.quotaMm };
    const curves = curvesByMethod[m.method];
    for (const c of crops) {
      constraints[`pay_${mi}_${c.id}`] = { max: settings.maxShare * m.areaDa };
      (curves[c.id] ?? []).forEach((o, oi) => {
        if (!o.reliable && !settings.includeUnreliable) return;
        const tons = expectedTonsPerDa(c, o);
        const key = `x|${mi}|${c.id}|${oi}`;
        const row: Row = {
          [`alan_${mi}`]: 1,
          [`su_${mi}`]: o.maxGross,
          [`pay_${mi}_${c.id}`]: 1,
          [`uretim_${c.id}`]: tons,
          gelir: tons * c.priceTlTon,
          su: o.maxGross,
        };
        if (c.smallMarket) row[`pazar_${c.id}`] = 1;
        variables[key] = row;
        meta.set(key, { member: m, cropId: c.id, option: o });
      });
    }
    // nadas: su ve gelir yok; alan eşitliğinin her zaman sağlanabilmesi için
    const fk = `x|${mi}|${FALLOW}`;
    variables[fk] = { [`alan_${mi}`]: 1 };
    meta.set(fk, { member: m, cropId: FALLOW, option: null });
  });

  if (settings.smallMarketCap !== null) {
    for (const c of crops) if (c.smallMarket) constraints[`pazar_${c.id}`] = { max: settings.smallMarketCap * totalArea };
  }
  return { constraints, variables, meta, active };
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Taahhütlerin aynı oranda karşılanabilen en yüksek kesri (0-1).
 * f: ortak karşılama oranı; üretim(ürün) >= taahhüt(ürün) x f kısıtıyla f en büyüklenir.
 */
export function maxCommitmentFraction(input: PlanInput): number {
  const base = buildBase(input);
  const commits = Object.entries(input.settings.commitments).filter(([id, t]) => t > 0 && input.crops.some((c) => c.id === id));
  if (commits.length === 0) return 1;
  if (base.active.length === 0) return 0;
  const constraints: LpModel['constraints'] = { ...base.constraints, f_ust: { max: 1 } };
  const fVar: Row = { f_ust: 1, hedef: 1 };
  for (const [id, tons] of commits) {
    constraints[`uretim_${id}`] = { min: 0 };
    fVar[`uretim_${id}`] = -tons;
  }
  const r = lp.Solve({ optimize: 'hedef', opType: 'max', constraints, variables: { ...base.variables, f: fVar } });
  const f = r.feasible ? Math.max(0, Math.min(1, Number(r.f ?? 0))) : 0;
  return f > 1 - 1e-6 ? 1 : f;
}

export function solvePlan(input: PlanInput): PlanResult {
  const base = buildBase(input);
  if (base.active.length === 0)
    return { status: 'empty', allocations: [], commitmentFraction: 1, maxAlone: {}, message: 'Üye yok.' };
  const { settings, crops } = input;
  const commits = Object.entries(settings.commitments).filter(
    ([id, t]) => t > 0 && crops.some((c) => c.id === id),
  );

  const run = (
    optimize: string,
    opType: 'max' | 'min',
    extraC: LpModel['constraints'] = {},
    extraV: Record<string, Row> = {},
  ) =>
    lp.Solve({
      optimize,
      opType,
      constraints: { ...clone(base.constraints), ...extraC },
      variables: { ...clone(base.variables), ...extraV },
    });

  // 1) Taahhütlerin ne kadarı karşılanabilir?
  const fraction = maxCommitmentFraction(input);
  const maxAlone: Record<string, number> = {};
  if (fraction < 1) {
    for (const [id] of commits) {
      const r = run(`uretim_${id}`, 'max');
      maxAlone[id] = r.feasible ? Number(r.result) : 0;
    }
  }

  // 2) Karşılanabilen düzeyde taahhüt kısıtıyla asıl amaç.
  const slack = 1 - 1e-7;
  const cc: LpModel['constraints'] = {};
  for (const [id, tons] of commits) cc[`uretim_${id}`] = { min: tons * fraction * slack };

  let res: Record<string, number | boolean>;
  if (settings.mode === 'minWater') {
    const rw = run('su', 'min', cc);
    if (!rw.feasible) return fail('En az su modeli çözülemedi.');
    const wStar = Number(rw.result);
    res = run('gelir', 'max', { ...cc, su_toplam: { max: wStar * (1 + 1e-6) + 1e-6 } }, suToplamColumns(base.variables));
  } else {
    res = run('gelir', 'max', cc);
  }
  if (!res.feasible) return fail('Plan bulunamadı: kısıtlar birlikte sağlanamıyor.');

  const allocations: Allocation[] = [];
  for (const [key, m] of base.meta) {
    const da = Number(res[key] ?? 0);
    if (da < 0.005) continue;
    allocations.push({
      memberId: m.member.id,
      cropId: m.cropId,
      option: m.option,
      da,
      waterMm: m.option ? m.option.maxGross : 0,
    });
  }
  // Çözücüden gelen kırıntılar (< 0,005 da) atıldı; alan eşitliği bozulmasın diye farkı nadasa yaz.
  for (const m of base.active) {
    const mine = allocations.filter((a) => a.memberId === m.id);
    const rest = m.areaDa - mine.reduce((s, a) => s + a.da, 0);
    if (rest > 1e-9) {
      const f = mine.find((a) => a.cropId === FALLOW);
      if (f) f.da += rest;
      else allocations.push({ memberId: m.id, cropId: FALLOW, option: null, da: rest, waterMm: 0 });
    }
  }
  return {
    status: fraction < 1 ? 'partial' : 'ok',
    allocations,
    commitmentFraction: fraction,
    maxAlone,
  };

  function fail(message: string): PlanResult {
    return { status: 'error', allocations: [], commitmentFraction: fraction, maxAlone, message };
  }
}

/** 'su_toplam' kısıtı için her değişkene su katsayısını ekler (yalnız en-az-su modunun ikinci adımında). */
function suToplamColumns(vars: Record<string, Row>): Record<string, Row> {
  const out: Record<string, Row> = {};
  for (const [k, row] of Object.entries(vars)) out[k] = { ...row, su_toplam: row.su ?? 0 };
  return out;
}

// ---------- Planın özeti ve geçmişte denenmesi ----------

export interface YearOutcome {
  year: number;
  productionT: Record<string, number>;
  revenue: number;
  waterM3: number;
  /** taahhütlü ürünlerde üretim/taahhüt oranlarının en küçüğü; taahhüt yoksa 1 */
  ratio: number;
  status: 'green' | 'yellow' | 'red';
}

export const YELLOW_FLOOR = 0.9;

export function statusOf(ratio: number): YearOutcome['status'] {
  return ratio >= 1 - 1e-6 ? 'green' : ratio >= YELLOW_FLOOR ? 'yellow' : 'red';
}

export function commitmentRatio(productionT: Record<string, number>, commitments: Record<string, number>): number {
  let ratio = Infinity;
  for (const [id, tons] of Object.entries(commitments)) {
    if (tons > 0) ratio = Math.min(ratio, (productionT[id] ?? 0) / tons);
  }
  return ratio === Infinity ? 1 : ratio;
}

/** Planı 2006-2025'in her yılında o yılın gerçek havasıyla çalıştırır. */
export function backtest(allocations: Allocation[], crops: Crop[], commitments: Record<string, number>): YearOutcome[] {
  const byId = new Map(crops.map((c) => [c.id, c]));
  const years = allocations.find((a) => a.option)?.option?.years ?? [];
  return years.map((year, yi) => {
    const productionT: Record<string, number> = {};
    let revenue = 0;
    let waterM3 = 0;
    for (const a of allocations) {
      if (!a.option) continue;
      const c = byId.get(a.cropId)!;
      const t = (a.option.relYield[yi] * c.yieldKgDa * a.da) / 1000;
      productionT[a.cropId] = (productionT[a.cropId] ?? 0) + t;
      revenue += t * c.priceTlTon;
      waterM3 += a.option.grossMm[yi] * a.da;
    }
    const ratio = commitmentRatio(productionT, commitments);
    return { year, productionT, revenue, waterM3, ratio, status: statusOf(ratio) };
  });
}

export interface PlanSummary {
  areaByCrop: Record<string, number>;
  /** 20 yıl ortalaması, ton */
  productionT: Record<string, number>;
  revenue: number;
  /** ayrılan (garantili) su, m3 */
  reservedM3: number;
  /** 20 yıl ortalaması kullanılan su, m3 */
  meanUsedM3: number;
}

export function summarize(allocations: Allocation[], crops: Crop[]): PlanSummary {
  const byId = new Map(crops.map((c) => [c.id, c]));
  const s: PlanSummary = { areaByCrop: {}, productionT: {}, revenue: 0, reservedM3: 0, meanUsedM3: 0 };
  for (const a of allocations) {
    s.areaByCrop[a.cropId] = (s.areaByCrop[a.cropId] ?? 0) + a.da;
    if (!a.option) continue;
    const c = byId.get(a.cropId)!;
    const t = expectedTonsPerDa(c, a.option) * a.da;
    s.productionT[a.cropId] = (s.productionT[a.cropId] ?? 0) + t;
    s.revenue += t * c.priceTlTon;
    s.reservedM3 += a.waterMm * a.da;
    s.meanUsedM3 += a.option.meanGross * a.da;
  }
  return s;
}
