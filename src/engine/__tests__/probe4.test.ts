// "Söz vermeden önce" sayıları (rapor): PROBE=1 npx vitest run src/engine/__tests__/probe4.test.ts --disable-console-intercept
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { DEFAULT_CROPS } from '../../data/crops';
import { DEFAULT_EFF, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { DISTRICTS, generateMembers } from '../../data/members';
import { computeModel } from '../../model';
import { maxCropScenario, mixedScenario, reachedInAtLeast } from '../promise';
import type { Weather } from '../types';
import { buildWeather } from '../weather';

test.runIf(process.env.PROBE)('söz vermeden önce', () => {
  const weathers: Record<string, Weather> = {};
  for (const d of DISTRICTS) weathers[d.id] = buildWeather(JSON.parse(readFileSync(`public/data/${d.id}.json`, 'utf8')));
  const m = computeModel(weathers, 'karapinar', { members: generateMembers(), cropDefs: DEFAULT_CROPS, soil: DEFAULT_SOIL, eff: DEFAULT_EFF, settings: DEFAULT_SETTINGS });
  const out: string[] = [];
  const t0 = performance.now();
  const corn = maxCropScenario(m.planInput, 'misir');
  const mixed = mixedScenario(m.planInput);
  out.push(`süre ${(performance.now() - t0).toFixed(0)} ms`);
  const line = (name: string, sc: typeof corn) => {
    out.push(`\n${name}: gelir ${(sc.revenue / 1e6).toFixed(2)}M  durum ${sc.plan.status}`);
    for (const c of m.crops) {
      const y = sc.yearly[c.id];
      const avg = y.reduce((s, v) => s + v, 0) / y.length;
      if (avg < 0.05) continue;
      out.push(`  ${c.id}: ort ${avg.toFixed(0)}  14/20 ${reachedInAtLeast(y, 14).toFixed(0)}  16/20 ${reachedInAtLeast(y, 16).toFixed(0)}  18/20 ${reachedInAtLeast(y, 18).toFixed(0)}  min ${Math.min(...y).toFixed(0)}`);
    }
  };
  line('YALNIZ MISIR', corn);
  line('KARMA', mixed);
  out.push(`\nvarsayılan (300 t) plan geliri ${(m.planSummary.revenue / 1e6).toFixed(2)}M, alan ${JSON.stringify(Object.fromEntries(Object.entries(m.planSummary.areaByCrop).map(([a, b]) => [a, Math.round(b)])))}`);
  console.log(out.join('\n'));
});
