// Arayüzün gösterdiği bütün türetilmiş sonuçlar tek yerde hesaplanır (React'ten bağımsız).
// Her üye kendi ilçesinin NASA verisiyle hesaplanır.
import { toEngineCrop, type CropDef } from './data/crops';
import { LEGUME_PLAN_SHARE } from './data/defaults';
import { MEMBER_SEED, mulberry32, shuffled } from './data/members';
import type { ParcelInput } from './engine/bucket';
import { buildCurves, type Curves } from './engine/curves';
import { combineFarms, evaluateFarm, waterStats, type FarmEvaluation, type WaterStats } from './engine/farm';
import {
  backtest,
  commitmentRatio,
  solvePlan,
  statusOf,
  summarize,
  type Allocation,
  type PlanInput,
  type PlanResult,
  type PlanSettings,
  type PlanSummary,
  type YearOutcome,
} from './engine/plan';
import { scatterCommitments } from './engine/scatter';
import { buildRotation, soilScore, type Rotation, type SoilScore } from './engine/soil';
import { FALLOW, type Crop, type Efficiencies, type IrrigationMethod, type Member, type Soil, type Weather } from './engine/types';

export interface Inputs {
  members: Member[];
  cropDefs: CropDef[];
  soil: Soil;
  eff: Efficiencies;
  settings: PlanSettings;
}

/** Üç görünüm: bugünkü ekim, sözün gelişigüzel dağıtımı, planlı dağıtım. */
export type Mode = 'today' | 'scatter' | 'planned';

export interface MemberView {
  member: Member;
  /** üyenin ilçesinin havası */
  weather: Weather;
  quotaM3: number;
  /** bugünkü ekim toplamı tarlayı aşıyor mu / eksik mi */
  currentAreaDa: number;
  current: FarmEvaluation;
  currentParcels: ParcelInput[];
  currentSoil: SoilScore;
  currentWater: WaterStats;
  /** gelişigüzel dağıtımda bu üyeye verilen sözleşme ürünü; verilmediyse null (bugünkü ekimini sürdürür) */
  scatterCrop: string | null;
  scatter: FarmEvaluation;
  scatterParcels: ParcelInput[];
  scatterWater: WaterStats;
  plannedWater: WaterStats;
  planned: FarmEvaluation;
  plannedParcels: ParcelInput[];
  plannedAllocs: Allocation[];
  plannedSoil: SoilScore;
  plannedSummary: PlanSummary;
  rotation: Rotation;
  /** iki plan seçeneği: gelir planı ve en az %20 baklagilli "nohutlu plan"; ikincisi kurulamıyorsa null */
  options: { free: PlanOption; legume: PlanOption | null };
}

export interface PlanOption {
  revenue: number;
  soil: SoilScore;
  legumeDa: number;
  areas: { cropId: string; da: number }[];
}

/** Bir dağıtımın kooperatif düzeyindeki altı karşılaştırma sayısı. */
export interface ScenarioSummary {
  /** sözleşme ürününü (söz için) eken üye sayısı */
  growers: number;
  /** sözleşme ürününde alan ağırlıklı ortalama verim, tam sulanana göre (0-1) */
  yieldLevel: number;
  /** sözün tuttuğu yıl sayısı ve denenen yıl sayısı */
  held: number;
  total: number;
  /** sözleşme ürünlerinden 20 yıl ortalaması teslim, ton */
  deliveredT: Record<string, number>;
  usedM3: number;
  revenue: number;
  /** suyu sezon ortasında biten üye sayısı */
  exceeded: number;
  backtest: YearOutcome[];
}

export interface Model {
  crops: Crop[];
  cropById: Map<string, Crop>;
  /** seçili ilçe için eğriler (Yöntem ekranındaki tablo) */
  curvesByMethod: Record<IrrigationMethod, Curves>;
  /** planı yeniden çözmek isteyen ekranlar için (taahhüt seçenekleri) */
  planInput: PlanInput;
  plan: PlanResult;
  planSummary: PlanSummary;
  planBacktest: YearOutcome[];
  members: MemberView[];
  scenarios: Record<Mode, ScenarioSummary>;
  /** bugünkü ekimin kooperatif toplamı */
  current: {
    areaByCrop: Record<string, number>;
    meanRevenue: number;
    meanUsedM3: number;
    /** tam sulama ihtiyacı, m3 */
    demandM3: number;
    meanProductionT: Record<string, number>;
    /** ürün başına kullanılan su, m3 */
    waterByCrop: Record<string, number>;
  };
  /** önerilen planda ürün başına ortalama kullanılan su, m3 */
  plannedWaterByCrop: Record<string, number>;
  plannedDemandM3: number;
  currentBacktest: YearOutcome[];
  totalAreaDa: number;
  totalQuotaM3: number;
  /** plan çözümü ve değerlendirmenin sürdüğü süre, ms */
  timing: { planMs: number; totalMs: number };
}

export function modeParts(mv: MemberView, mode: Mode): { ev: FarmEvaluation; parcels: ParcelInput[]; water: WaterStats } {
  if (mode === 'planned') return { ev: mv.planned, parcels: mv.plannedParcels, water: mv.plannedWater };
  if (mode === 'scatter') return { ev: mv.scatter, parcels: mv.scatterParcels, water: mv.scatterWater };
  return { ev: mv.current, parcels: mv.currentParcels, water: mv.currentWater };
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function computeModel(weathers: Record<string, Weather>, fallbackId: string, inp: Inputs): Model {
  const t0 = now();
  const crops = inp.cropDefs.map(toEngineCrop);
  const cropById = new Map(crops.map((c) => [c.id, c]));
  const fallback = weathers[fallbackId] ?? Object.values(weathers)[0];
  const weatherOf = (m: Member): Weather => (m.pointId && weathers[m.pointId]) || fallback;
  // eğriler (ilçe, yöntem) başına bir kez hesaplanır; buildCurves kendi içinde bellekte tutar
  const curvesOf = (m: Member): Curves => buildCurves(weatherOf(m), crops, inp.eff[m.method], inp.soil);
  const curvesByMethod = {
    salma: buildCurves(fallback, crops, inp.eff.salma, inp.soil),
    yagmurlama: buildCurves(fallback, crops, inp.eff.yagmurlama, inp.soil),
    damla: buildCurves(fallback, crops, inp.eff.damla, inp.soil),
  };
  const planInput: PlanInput = { members: inp.members, crops, curvesByMethod, curvesOf, settings: inp.settings };

  // İki seçenek her zaman çözülür: baklagil kısıtsız (gelir planı) ve her üyede en az %20 baklagil (nohutlu plan).
  const planFree = solvePlan({ ...planInput, settings: { ...inp.settings, minLegumeShare: 0 } });
  const planLegume = solvePlan({ ...planInput, settings: { ...inp.settings, minLegumeShare: LEGUME_PLAN_SHARE } });
  const planMs = now() - t0;
  const legumeOk = planLegume.status === 'ok' || planLegume.status === 'partial';
  const plan = (inp.settings.minLegumeShare ?? 0) > 0 && legumeOk ? planLegume : planFree;
  const optionOf = (p: PlanResult, memberId: string): PlanOption => {
    const mine = p.allocations.filter((a) => a.memberId === memberId);
    const areas = mine.map((a) => ({ cropId: a.cropId, da: a.da }));
    return {
      revenue: summarize(mine, crops).revenue,
      soil: soilScore(areas, crops),
      legumeDa: mine.reduce((s, a) => s + (cropById.get(a.cropId)?.legume ? a.da : 0), 0),
      areas,
    };
  };
  const planSummary = summarize(plan.allocations, crops);
  const planBacktest = backtest(plan.allocations, crops, inp.settings.commitments);

  // Gelişigüzel dağıtım: üyeler sabit tohumla karıştırılır, söz dolana dek sıradakinin bütün tarlası o ürüne ayrılır.
  const order = shuffled(inp.members, mulberry32(MEMBER_SEED + 7));
  const scat = scatterCommitments(order, crops, inp.settings.commitments);

  const members: MemberView[] = inp.members.map((member) => {
    const w = weatherOf(member);
    const quotaM3 = member.areaDa * member.quotaMm;
    const eff = inp.eff[member.method];
    const currentParcels: ParcelInput[] = member.current
      .filter((c) => cropById.has(c.cropId) && c.da > 0)
      .map((c) => ({ crop: cropById.get(c.cropId)!, areaDa: c.da, capMm: null }));
    const currentAreaDa = currentParcels.reduce((s, p) => s + p.areaDa, 0);
    const current = evaluateFarm(w, currentParcels, eff, inp.soil, quotaM3);
    const currentWater = waterStats(current, currentParcels.map((p) => p.areaDa));
    const fallowNow = Math.max(0, member.areaDa - currentAreaDa);
    const currentSoil = soilScore(
      [...currentParcels.map((p) => ({ cropId: p.crop.id, da: p.areaDa })), { cropId: FALLOW, da: fallowNow }].filter((a) => a.da > 0),
      crops,
    );

    const scatterCrop = scat.assigned.get(member.id) ?? null;
    const scatterParcels: ParcelInput[] = scatterCrop ? [{ crop: cropById.get(scatterCrop)!, areaDa: member.areaDa, capMm: null }] : currentParcels;
    const scatter = scatterCrop ? evaluateFarm(w, scatterParcels, eff, inp.soil, quotaM3) : current;
    const scatterWater = scatterCrop ? waterStats(scatter, scatterParcels.map((p) => p.areaDa)) : currentWater;

    const plannedAllocs = plan.allocations.filter((a) => a.memberId === member.id);
    const plannedParcels: ParcelInput[] = plannedAllocs
      .filter((a) => a.option)
      .map((a) => ({ crop: cropById.get(a.cropId)!, areaDa: a.da, capMm: a.option!.level ?? a.option!.maxGross }));
    // Önerilen planda su parsellere önceden ayrılmıştır (ayrılanların toplamı <= kota, LP kısıtı);
    // bu yüzden ortak havuz yok, her parsel kendi tavanıyla sınırlı.
    const planned = evaluateFarm(w, plannedParcels, eff, inp.soil, null);
    const areas = plannedAllocs.map((a) => ({ cropId: a.cropId, da: a.da }));
    return {
      member,
      weather: w,
      quotaM3,
      currentAreaDa,
      current,
      currentParcels,
      currentSoil,
      currentWater,
      scatterCrop,
      scatter,
      scatterParcels,
      scatterWater,
      plannedWater: waterStats(planned, plannedParcels.map((p) => p.areaDa)),
      planned,
      plannedParcels,
      plannedAllocs,
      plannedSoil: soilScore(areas, crops),
      plannedSummary: summarize(plannedAllocs, crops),
      rotation: buildRotation(areas, member.areaDa),
      options: { free: optionOf(planFree, member.id), legume: legumeOk ? optionOf(planLegume, member.id) : null },
    };
  });

  const areaByCrop: Record<string, number> = {};
  const meanProductionT: Record<string, number> = {};
  const waterByCrop: Record<string, number> = {};
  const plannedWaterByCrop: Record<string, number> = {};
  for (const mv of members) {
    for (const p of mv.currentParcels) areaByCrop[p.crop.id] = (areaByCrop[p.crop.id] ?? 0) + p.areaDa;
    const fallow = mv.member.areaDa - mv.currentAreaDa;
    if (fallow > 0.05) areaByCrop[FALLOW] = (areaByCrop[FALLOW] ?? 0) + fallow;
    for (const y of mv.current.years)
      for (const [id, t] of Object.entries(y.productionT)) meanProductionT[id] = (meanProductionT[id] ?? 0) + t / mv.current.years.length;
    mv.currentParcels.forEach((p, k) => (waterByCrop[p.crop.id] = (waterByCrop[p.crop.id] ?? 0) + mv.currentWater.parcels[k].usedMm * p.areaDa));
    mv.plannedParcels.forEach((p, k) => (plannedWaterByCrop[p.crop.id] = (plannedWaterByCrop[p.crop.id] ?? 0) + mv.plannedWater.parcels[k].usedMm * p.areaDa));
  }
  const currentBacktest = combineFarms(
    members.map((m) => m.current),
    inp.settings.commitments,
  );

  // ---- üç dağıtımın özeti ----
  const committed = Object.entries(inp.settings.commitments)
    .filter(([id, t]) => t > 0 && cropById.has(id))
    .map(([id]) => id);
  const isCommitted = (id: string) => committed.includes(id);
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const summaryOf = (mode: Mode, bt: YearOutcome[], counts: (mv: MemberView) => boolean): ScenarioSummary => {
    let area = 0;
    let relArea = 0;
    let growers = 0;
    for (const mv of members) {
      if (!counts(mv)) continue;
      const { parcels, water } = modeParts(mv, mode);
      let grows = false;
      parcels.forEach((p, k) => {
        if (!isCommitted(p.crop.id) || p.areaDa < 0.05 || !water.parcels[k]) return;
        grows = true;
        area += p.areaDa;
        relArea += p.areaDa * water.parcels[k].relYield;
      });
      if (grows) growers++;
    }
    const deliveredT: Record<string, number> = {};
    for (const id of committed) deliveredT[id] = mean(bt.map((y) => y.productionT[id] ?? 0));
    return {
      growers,
      yieldLevel: area > 0 ? relArea / area : 0,
      held: committed.length ? bt.filter((y) => y.status === 'green').length : 0,
      total: bt.length,
      deliveredT,
      usedM3: mean(bt.map((y) => y.waterM3)),
      revenue: mean(bt.map((y) => y.revenue)),
      exceeded: members.filter((mv) => modeParts(mv, mode).ev.yearsExceeded > 0).length,
      backtest: bt,
    };
  };
  // Gelişigüzel dağıtımda söz yalnız görevlendirilen üyelerin teslimatıyla ölçülür; gelir ve su bütün kooperatifindir.
  const scatterAll = combineFarms(
    members.map((m) => m.scatter),
    inp.settings.commitments,
  );
  const scatterBacktest: YearOutcome[] = scatterAll.map((y, yi) => {
    const productionT: Record<string, number> = {};
    for (const mv of members) {
      if (!mv.scatterCrop) continue;
      const t = mv.scatter.years[yi]?.productionT[mv.scatterCrop] ?? 0;
      productionT[mv.scatterCrop] = (productionT[mv.scatterCrop] ?? 0) + t;
    }
    const ratio = commitmentRatio(productionT, inp.settings.commitments);
    return { ...y, productionT, ratio, status: statusOf(ratio) };
  });
  const scenarios: Record<Mode, ScenarioSummary> = {
    today: summaryOf('today', currentBacktest, () => true),
    scatter: summaryOf('scatter', scatterBacktest, (mv) => mv.scatterCrop !== null),
    planned: summaryOf('planned', planBacktest, () => true),
  };
  // planlı dağıtımda su ve gelir, plan özetiyle aynı kaynaktan (seçenek ortalamaları) okunur
  scenarios.planned.usedM3 = planSummary.meanUsedM3;
  scenarios.planned.revenue = planSummary.revenue;

  return {
    crops,
    cropById,
    plannedWaterByCrop,
    plannedDemandM3: members.reduce((s, m) => s + m.plannedWater.demandM3, 0),
    curvesByMethod,
    planInput,
    plan,
    planSummary,
    planBacktest,
    members,
    scenarios,
    current: {
      areaByCrop,
      meanProductionT,
      waterByCrop,
      demandM3: members.reduce((s, m) => s + m.currentWater.demandM3, 0),
      meanRevenue: members.reduce((s, m) => s + m.current.meanRevenue, 0),
      meanUsedM3: members.reduce((s, m) => s + m.current.meanUsedM3, 0),
    },
    currentBacktest,
    totalAreaDa: inp.members.reduce((s, m) => s + m.areaDa, 0),
    totalQuotaM3: inp.members.reduce((s, m) => s + m.areaDa * m.quotaMm, 0),
    timing: { planMs, totalMs: now() - t0 },
  };
}
