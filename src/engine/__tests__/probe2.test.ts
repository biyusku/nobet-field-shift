// Varsayılan kooperatif için planın ham özeti (rapor): PROBE=1 npx vitest run src/engine/__tests__/probe2.test.ts --disable-console-intercept
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { DEFAULT_ENGINE_CROPS as crops } from '../../data/crops';
import { DEFAULT_EFF, DEFAULT_MEMBERS, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { buildCurves, levelLabel } from '../curves';
import { backtest, solvePlan, summarize, type PlanInput } from '../plan';
import type { IrrigationMethod } from '../types';
import { buildWeather } from '../weather';

test.runIf(process.env.PROBE)('plan özeti', () => {
  const w = buildWeather(JSON.parse(readFileSync(`public/data/${process.env.POINT ?? 'karapinar'}.json`, 'utf8')));
  const curvesByMethod = Object.fromEntries(
    (Object.keys(DEFAULT_EFF) as IrrigationMethod[]).map((m) => [m, buildCurves(w, crops, DEFAULT_EFF[m], DEFAULT_SOIL)]),
  ) as PlanInput['curvesByMethod'];
  const out: string[] = [];
  for (const m of Object.keys(DEFAULT_EFF) as IrrigationMethod[]) {
    for (const c of crops)
      out.push(
        `${m} ${c.id}: ` +
          curvesByMethod[m][c.id]
            .map((o) => `${levelLabel(o.level)}→${o.meanRel.toFixed(2)}(${o.maxGross.toFixed(0)})${o.reliable ? '' : '!'}`)
            .join('  '),
      );
  }
  for (const commitments of [{ misir: 300 }, {}] as Record<string, number>[]) {
    for (const mode of ['revenue', 'minWater'] as const) {
      const t0 = performance.now();
      const plan = solvePlan({ members: DEFAULT_MEMBERS, crops, curvesByMethod, settings: { ...DEFAULT_SETTINGS, commitments, mode } });
      const s = summarize(plan.allocations, crops);
      const bt = backtest(plan.allocations, crops, commitments);
      out.push(
        `\n[${JSON.stringify(commitments)} ${mode}] ${plan.status} f=${plan.commitmentFraction.toFixed(3)} maxAlone=${JSON.stringify(plan.maxAlone)} ${(performance.now() - t0).toFixed(0)}ms`,
        `gelir ${s.revenue.toFixed(0)} ayrılan su ${s.reservedM3.toFixed(0)} üretim ${JSON.stringify(Object.fromEntries(Object.entries(s.productionT).map(([k, v]) => [k, +v.toFixed(1)])))}`,
        `alan ${JSON.stringify(Object.fromEntries(Object.entries(s.areaByCrop).map(([k, v]) => [k, +v.toFixed(1)])))}`,
        'şerit ' + bt.map((y) => y.status[0]).join('') + ' oran ' + bt.map((y) => y.ratio.toFixed(2)).join(' '),
      );
      for (const a of plan.allocations)
        out.push(`  ${a.memberId} ${a.cropId} ${a.option ? levelLabel(a.option.level) : '-'} ${a.da.toFixed(1)} da`);
    }
  }
  console.log(out.join('\n'));
});
