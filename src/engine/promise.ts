// "Söz vermeden önce": kooperatifin tarlaları ve su haklarıyla güvenle söz verilebilecek miktar.
import { backtest, solvePlan, summarize, type PlanInput, type PlanResult } from './plan';

export interface PromiseScenario {
  plan: PlanResult;
  /** planın 20 yıl ortalaması toplam brüt geliri, TL */
  revenue: number;
  /** ürün -> yıl yıl üretim, ton (planın alanları ve su tavanları sabit, hava o yılın havası) */
  yearly: Record<string, number[]>;
  years: number[];
}

/** Yılların en az k'sinde ulaşılan miktar: büyükten küçüğe sıralanınca k. değer. */
export function reachedInAtLeast(values: readonly number[], k: number): number {
  if (values.length === 0 || k <= 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  return sorted[Math.min(k, sorted.length) - 1];
}

/** Verilen miktara kaç yılda ulaşılıyor. */
export function yearsReached(values: readonly number[], tons: number): number {
  return values.filter((v) => v >= tons - 1e-9).length;
}

function scenarioOf(input: PlanInput, plan: PlanResult): PromiseScenario {
  const bt = backtest(plan.allocations, input.crops, {});
  const yearly: Record<string, number[]> = {};
  for (const c of input.crops) yearly[c.id] = bt.map((y) => y.productionT[c.id] ?? 0);
  return { plan, revenue: summarize(plan.allocations, input.crops).revenue, yearly, years: bt.map((y) => y.year) };
}

/** Karma senaryo: taahhüt yokken geliri en yükseğe çıkaran plan. */
export function mixedScenario(input: PlanInput): PromiseScenario {
  return scenarioOf(input, solvePlan({ ...input, settings: { ...input.settings, commitments: {}, mode: 'revenue' } }));
}

/**
 * Tek ürün senaryosu: o üründen en çok üretimi veren plan (kalan alan ve su gelire göre doldurulur).
 * Erişilemeyecek kadar büyük bir taahhüt verilir; çözücü önce ulaşılabilen en yüksek üretimi bulur,
 * sonra o düzeyi koruyarak geliri en yükseğe çıkarır.
 */
export function maxCropScenario(input: PlanInput, cropId: string): PromiseScenario {
  const crop = input.crops.find((c) => c.id === cropId);
  const upper = crop ? (input.members.reduce((s, m) => s + m.areaDa, 0) * crop.yieldKgDa) / 1000 : 0;
  const commitments = upper > 0 ? { [cropId]: upper } : {};
  return scenarioOf(input, solvePlan({ ...input, settings: { ...input.settings, commitments, mode: 'revenue' } }));
}

/** maxSafeCommitment'ın denediği ara nokta sayısı. */
export const SAFE_SCAN_STEPS = 8;

/**
 * Planlı dağıtımda güvenle verilebilecek en yüksek söz: söz T olarak girildiğinde kurulan plan,
 * 20 yılın en az k'sinde T'ye ulaşıyorsa T "tutar". Aranan, tutan en yüksek T'dir.
 *
 * Taban: taahhütsüz gelir planının k. en iyi yılı (bu T için plan değişmez ve tanım gereği tutar).
 * Üstü: T planı bağlamaya başlar; plan ortalama verime göre kurulduğu için genellikle tutmaz.
 * Yine de tabandan en yüksek üretime kadar ara noktalar denenir; tutan daha büyük bir değer varsa o döner.
 */
export function maxSafeCommitment(input: PlanInput, cropId: string, k: number, steps = SAFE_SCAN_STEPS): number {
  const base = reachedInAtLeast(mixedScenario(input).yearly[cropId] ?? [], k);
  const top = maxCropScenario(input, cropId).yearly[cropId] ?? [];
  const hi = top.length ? top.reduce((s, v) => s + v, 0) / top.length : 0;
  let best = base;
  for (let i = 1; i <= steps; i++) {
    const tons = base + ((hi - base) * i) / steps;
    if (!(tons > best)) continue;
    const plan = solvePlan({ ...input, settings: { ...input.settings, commitments: { [cropId]: tons }, mode: 'revenue' } });
    if (plan.status !== 'ok') continue;
    const yearly = backtest(plan.allocations, input.crops, {}).map((y) => y.productionT[cropId] ?? 0);
    if (yearsReached(yearly, tons) >= k) best = tons;
  }
  return best;
}
