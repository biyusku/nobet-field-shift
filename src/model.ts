// Arayüzün gösterdiği bütün türetilmiş sonuçlar tek yerde hesaplanır (React'ten bağımsız).
import { toEngineCrop, type CropDef } from './data/crops';
import type { ParcelInput } from './engine/bucket';
import { buildCurves, type Curves } from './engine/curves';
import { combineFarms, evaluateFarm, type FarmEvaluation } from './engine/farm';
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
  planned: FarmEvaluation;
  plannedParcels: ParcelInput[];
  plannedAllocs: Allocation[];
  plannedSoil: SoilScore;
  plannedSummary: PlanSummary;
  rotation: Rotation;
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
  current: { areaByCrop: Record<string, number>; meanRevenue: number; meanUsedM3: number; meanProductionT: Record<string, number> };
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
  const plan = solvePlan({ members: inp.members, crops, curvesByMethod, settings: inp.settings });
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
      planned,
      plannedParcels,
      plannedAllocs,
      plannedSoil: soilScore(areas, crops),
      plannedSummary: summarize(plannedAllocs, crops),
      rotation: buildRotation(areas, member.areaDa),
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
  return {
    crops,
    cropById,
    curvesByMethod,
    plan,
    planSummary,
    planBacktest,
    members,
    current: {
      areaByCrop,
      meanProductionT,
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
