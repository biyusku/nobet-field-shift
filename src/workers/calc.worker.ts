// Pano'nun ağır hesapları (söz senaryoları) bu Web Worker'da çalışır; ana iş parçacığı 5 sn sonra worker'ı
// sonlandırır, böylece çözücü takılsa da sekme donmaz. Model, ana iş parçacığıyla aynı girdilerden burada da
// kurulur (computeModel deterministiktir) ve girdiler değişene kadar saklanır.
import { plannedOutcome } from '../engine/plan';
import { maxCropScenario, maxSafeCommitment, mixedScenario } from '../engine/promise';
import type { Weather } from '../engine/types';
import { setLang, type Lang } from '../i18n';
import { computeModel, type Inputs, type Model } from '../model';

export type CalcTask =
  | { kind: 'single'; crop: string }
  | { kind: 'mixed' }
  | { kind: 'safe'; crop: string; k: number }
  | { kind: 'draft'; crop: string; tons: number };

export interface CalcRequest {
  id: number;
  modelKey: number;
  /** motor mesajlarının dili */
  lang: Lang;
  /** yalnız worker'daki model eskiyse gönderilir */
  setup?: { weathers: Record<string, Weather>; fallbackId: string; inputs: Inputs };
  task: CalcTask;
}

let key = -1;
let model: Model | null = null;

function run(task: CalcTask): unknown {
  const input = model!.planInput;
  const pick = (s: ReturnType<typeof mixedScenario>) => ({ revenue: s.revenue, yearly: s.yearly, status: s.plan.status, message: s.plan.message });
  if (task.kind === 'single') return pick(maxCropScenario(input, task.crop));
  if (task.kind === 'mixed') return pick(mixedScenario(input));
  if (task.kind === 'safe') return maxSafeCommitment(input, task.crop, task.k);
  const r = plannedOutcome(input, { [task.crop]: task.tons });
  return { held: r.held, status: r.plan.status, message: r.plan.message };
}

self.onmessage = (e: MessageEvent<CalcRequest>) => {
  const { id, modelKey, setup, task, lang } = e.data;
  setLang(lang);
  try {
    if (setup) {
      model = computeModel(setup.weathers, setup.fallbackId, setup.inputs);
      key = modelKey;
    }
    if (!model || key !== modelKey) throw new Error('model eksik');
    self.postMessage({ id, ok: true, value: run(task) });
  } catch (err) {
    self.postMessage({ id, ok: false, message: err instanceof Error ? err.message : String(err) });
  }
};
