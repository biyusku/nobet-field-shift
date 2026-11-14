// 50 üyeli kooperatif: çözüm süresi ve üç dağıtımın özeti (rapor): PROBE=1 npx vitest run src/engine/__tests__/probe3.test.ts --disable-console-intercept
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { DEFAULT_CROPS } from '../../data/crops';
import { DEFAULT_EFF, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { DISTRICTS, generateMembers } from '../../data/members';
import { computeModel } from '../../model';
import type { Weather } from '../types';
import { buildWeather } from '../weather';

test.runIf(process.env.PROBE)('50 üye', () => {
  const weathers: Record<string, Weather> = {};
  for (const d of DISTRICTS) weathers[d.id] = buildWeather(JSON.parse(readFileSync(`public/data/${d.id}.json`, 'utf8')));
  const members = generateMembers();
  const out: string[] = [];
  for (const tons of (process.env.TONS ?? '300').split(',').map(Number)) {
    const run = () => computeModel(weathers, 'karapinar', { members, cropDefs: DEFAULT_CROPS, soil: DEFAULT_SOIL, eff: DEFAULT_EFF, settings: { ...DEFAULT_SETTINGS, commitments: { misir: tons } } });
    run();
    const m = run();
    out.push(`\n== ${tons} t mısır | plan ${m.plan.status} f=${m.plan.commitmentFraction.toFixed(2)} | plan ${m.timing.planMs.toFixed(0)} ms, toplam ${m.timing.totalMs.toFixed(0)} ms | alan ${m.totalAreaDa} da kota ${m.totalQuotaM3} m3`);
    for (const k of ['today', 'scatter', 'planned'] as const) {
      const s = m.scenarios[k];
      out.push(`${k}: eken ${s.growers} verim ${(s.yieldLevel * 100).toFixed(0)}% tutan ${s.held}/${s.total} teslim ${JSON.stringify(Object.fromEntries(Object.entries(s.deliveredT).map(([a, b]) => [a, Math.round(b)])))} su ${Math.round(s.usedM3)} gelir ${(s.revenue / 1e6).toFixed(2)}M biten ${s.exceeded}`);
    }
    out.push('plan alan ' + JSON.stringify(Object.fromEntries(Object.entries(m.planSummary.areaByCrop).map(([a, b]) => [a, Math.round(b)]))));
  }
  console.log(out.join('\n'));
});
