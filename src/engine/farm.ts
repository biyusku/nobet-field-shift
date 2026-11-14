// Bir üyenin tarlasını (bugünkü ekim ya da önerilen plan) 20 yılın her birinde çalıştırır.
import { simulateFarmYear, type ParcelInput } from './bucket';
import { harvestYears } from './curves';
import { commitmentRatio, statusOf, type YearOutcome } from './plan';
import type { Crop, Soil, Weather } from './types';

export interface FarmYear {
  year: number;
  /** pencerenin ilk günü (veri indisi) ve uzunluğu */
  start: number;
  nDays: number;
  /** kotayla sınırlı kümülatif sulama, m3 */
  cumM3: Float64Array;
  /** kota olmasaydı ihtiyaç duyulacak kümülatif sulama, m3 */
  demandM3: Float64Array;
  usedM3: number;
  demandTotalM3: number;
  /** su bitiş günü: ihtiyaç çizgisinin kotayı aştığı ilk gün (pencere içi); aşılmıyorsa null */
  endDay: number | null;
  revenue: number;
  productionT: Record<string, number>;
  relYield: number[];
  grossMm: number[];
  capEndDay: (number | null)[];
}

export interface FarmEvaluation {
  years: FarmYear[];
  meanRevenue: number;
  meanUsedM3: number;
  /** su bitiş günleri (yalnız kotanın aşıldığı yıllar), pencere içi gün no */
  endDays: number[];
  yearsExceeded: number;
  /** ortanca su bitiş gününe en yakın yılın dizideki sırası; hiç aşılmıyorsa ihtiyacı ortanca olan yıl */
  medianIndex: number;
}

function median(sorted: number[]): number {
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

export function evaluateFarm(
  w: Weather,
  parcels: ParcelInput[],
  efficiency: number,
  soil: Soil,
  /** ortak kota havuzu, m3; null = havuz yok (su yalnız parsel tavanlarıyla sınırlı) */
  quotaM3: number | null,
): FarmEvaluation {
  const live = parcels.filter((p) => p.areaDa > 0);
  const years: FarmYear[] = harvestYears().map((year) => {
    const lim = simulateFarmYear(w, year, live, { efficiency, soil, poolM3: quotaM3 });
    const dem = simulateFarmYear(
      w,
      year,
      live.map((p) => ({ ...p, capMm: null })),
      { efficiency, soil, poolM3: null },
    );
    const productionT: Record<string, number> = {};
    let revenue = 0;
    lim.parcels.forEach((r, k) => {
      const c: Crop = live[k].crop;
      const t = (r.relYield * c.yieldKgDa * live[k].areaDa) / 1000;
      productionT[c.id] = (productionT[c.id] ?? 0) + t;
      revenue += t * c.priceTlTon;
    });
    return {
      year,
      start: lim.start,
      nDays: lim.nDays,
      cumM3: lim.cumM3,
      demandM3: dem.cumM3,
      usedM3: lim.usedM3,
      demandTotalM3: dem.usedM3,
      endDay: lim.poolEndDay,
      revenue,
      productionT,
      relYield: lim.parcels.map((r) => r.relYield),
      grossMm: lim.parcels.map((r) => r.grossMm),
      capEndDay: lim.parcels.map((r) => r.capEndDay),
    };
  });
  const n = years.length || 1;
  const endDays = years.filter((y) => y.endDay !== null).map((y) => y.endDay!) as number[];
  let medianIndex = 0;
  if (endDays.length > 0) {
    const med = median([...endDays].sort((a, b) => a - b));
    medianIndex = years.findIndex((y) => y.endDay === med);
  } else if (years.length > 0) {
    const med = median(years.map((y) => y.demandTotalM3).sort((a, b) => a - b));
    medianIndex = years.findIndex((y) => y.demandTotalM3 === med);
  }
  return {
    years,
    meanRevenue: years.reduce((s, y) => s + y.revenue, 0) / n,
    meanUsedM3: years.reduce((s, y) => s + y.usedM3, 0) / n,
    endDays,
    yearsExceeded: endDays.length,
    medianIndex: Math.max(0, medianIndex),
  };
}

/** Üyelerin tarla değerlendirmelerini kooperatif düzeyinde yıl yıl toplar (bugünkü ekimin geçmişte denenmesi). */
export function combineFarms(evals: FarmEvaluation[], commitments: Record<string, number>): YearOutcome[] {
  return harvestYears().map((year, yi) => {
    const productionT: Record<string, number> = {};
    let revenue = 0;
    let waterM3 = 0;
    for (const e of evals) {
      const y = e.years[yi];
      if (!y) continue;
      revenue += y.revenue;
      waterM3 += y.usedM3;
      for (const [id, t] of Object.entries(y.productionT)) productionT[id] = (productionT[id] ?? 0) + t;
    }
    const ratio = commitmentRatio(productionT, commitments);
    return { year, productionT, revenue, waterM3, ratio, status: statusOf(ratio) };
  });
}
