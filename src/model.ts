// Arayüzün gösterdiği bütün türetilmiş sonuçlar tek yerde hesaplanır (React'ten bağımsız).
import { toEngineCrop, type CropDef } from './data/crops';
import { LEGUME_PLAN_SHARE } from './data/defaults';
import type { ParcelInput } from './engine/bucket';
import { buildCurves, type Curves } from './engine/curves';
import { combineFarms, evaluateFarm, waterStats, type FarmEvaluation, type WaterStats } from './engine/farm';
import { backtest, solvePlan, summarize, type Allocation, type PlanResult, type PlanSettings, type PlanSummary, type YearOutcome } from './engine/plan';
import { buildRotation, soilScore, type Rotation, type SoilScore } from './engine/soil';
import { FALLOW, type Crop, type Efficiencies, type IrrigationMethod, type Member, type Soil, type Weather } from './engine/types';

export interface Inputs {
  members: Member[];
  cropDefs: CropDef[];
  soil: Soil;
  eff: Efficiencies;
  settings: PlanSettings;
}

export interface MemberView {
  member: Member;
  quotaM3: number;
  /** bugünkü ekim toplamı tarlayı aşıyor mu / eksik mi */
  currentAreaDa: number;
  current: FarmEvaluation;
  currentParcels: ParcelInput[];
  currentSoil: SoilScore;
  currentWater: WaterStats;
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

export interface Model {
  crops: Crop[];
  cropById: Map<string, Crop>;
  curvesByMethod: Record<IrrigationMethod, Curves>;
  plan: PlanResult;
  planSummary: PlanSummary;
  planBacktest: YearOutcome[];
  members: MemberView[];
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
}

export function computeModel(w: Weather, inp: Inputs): Model {
  const crops = inp.cropDefs.map(toEngineCrop);
  const cropById = new Map(crops.map((c) => [c.id, c]));
  const curvesByMethod = {
    salma: buildCurves(w, crops, inp.eff.salma, inp.soil),
    yagmurlama: buildCurves(w, crops, inp.eff.yagmurlama, inp.soil),
    damla: buildCurves(w, crops, inp.eff.damla, inp.soil),
  };
  // İki seçenek her zaman çözülür: baklagil kısıtsız (gelir planı) ve her üyede en az %20 baklagil (nohutlu plan).
  const planFree = solvePlan({ members: inp.members, crops, curvesByMethod, settings: { ...inp.settings, minLegumeShare: 0 } });
  const planLegume = solvePlan({ members: inp.members, crops, curvesByMethod, settings: { ...inp.settings, minLegumeShare: LEGUME_PLAN_SHARE } });
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

  const members: MemberView[] = inp.members.map((member) => {
    const quotaM3 = member.areaDa * member.quotaMm;
    const eff = inp.eff[member.method];
    const currentParcels: ParcelInput[] = member.current
      .filter((c) => cropById.has(c.cropId) && c.da > 0)
      .map((c) => ({ crop: cropById.get(c.cropId)!, areaDa: c.da, capMm: null }));
    const currentAreaDa = currentParcels.reduce((s, p) => s + p.areaDa, 0);
    const current = evaluateFarm(w, currentParcels, eff, inp.soil, quotaM3);
    const fallowNow = Math.max(0, member.areaDa - currentAreaDa);
    const currentSoil = soilScore(
      [...currentParcels.map((p) => ({ cropId: p.crop.id, da: p.areaDa })), { cropId: FALLOW, da: fallowNow }].filter((a) => a.da > 0),
      crops,
    );
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
      quotaM3,
      currentAreaDa,
      current,
      currentParcels,
      currentSoil,
      currentWater: waterStats(current, currentParcels.map((p) => p.areaDa)),
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
  for (const mv of members) {
    for (const p of mv.currentParcels) areaByCrop[p.crop.id] = (areaByCrop[p.crop.id] ?? 0) + p.areaDa;
    const fallow = mv.member.areaDa - mv.currentAreaDa;
    if (fallow > 0.05) areaByCrop[FALLOW] = (areaByCrop[FALLOW] ?? 0) + fallow;
    for (const y of mv.current.years)
      for (const [id, t] of Object.entries(y.productionT)) meanProductionT[id] = (meanProductionT[id] ?? 0) + t / mv.current.years.length;
  }
  const waterByCrop: Record<string, number> = {};
  const plannedWaterByCrop: Record<string, number> = {};
  for (const mv of members) {
    mv.currentParcels.forEach((p, k) => (waterByCrop[p.crop.id] = (waterByCrop[p.crop.id] ?? 0) + mv.currentWater.parcels[k].usedMm * p.areaDa));
    mv.plannedParcels.forEach((p, k) => (plannedWaterByCrop[p.crop.id] = (plannedWaterByCrop[p.crop.id] ?? 0) + mv.plannedWater.parcels[k].usedMm * p.areaDa));
  }
  return {
    crops,
    cropById,
    plannedWaterByCrop,
    plannedDemandM3: members.reduce((s, m) => s + m.plannedWater.demandM3, 0),
    curvesByMethod,
    plan,
    planSummary,
    planBacktest,
    members,
    current: {
      areaByCrop,
      meanProductionT,
      waterByCrop,
      demandM3: members.reduce((s, m) => s + m.currentWater.demandM3, 0),
      meanRevenue: members.reduce((s, m) => s + m.current.meanRevenue, 0),
      meanUsedM3: members.reduce((s, m) => s + m.current.meanUsedM3, 0),
    },
    currentBacktest: combineFarms(
      members.map((m) => m.current),
      inp.settings.commitments,
    ),
    totalAreaDa: inp.members.reduce((s, m) => s + m.areaDa, 0),
    totalQuotaM3: inp.members.reduce((s, m) => s + m.areaDa * m.quotaMm, 0),
  };
}
