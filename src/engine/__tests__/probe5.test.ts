// Varsayılan kooperatifin başlık sayıları ve toplam çözüm süresi (rapor): PROBE=1 npx vitest run src/engine/__tests__/probe5.test.ts --disable-console-intercept
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { DEFAULT_CROPS } from '../../data/crops';
import { DEFAULT_EFF, DEFAULT_SAFE_YEARS, DEFAULT_SETTINGS, DEFAULT_SOIL } from '../../data/defaults';
import { DISTRICTS, generateMembers } from '../../data/members';
import { computeModel } from '../../model';
import { maxCropScenario, maxSafeCommitment, mixedScenario } from '../promise';
import { FALLOW, type Weather } from '../types';
import { buildWeather } from '../weather';

test.runIf(process.env.PROBE)('başlık sayıları', () => {
  const weathers: Record<string, Weather> = {};
  for (const d of DISTRICTS) weathers[d.id] = buildWeather(JSON.parse(readFileSync(`public/data/${d.id}.json`, 'utf8')));
  const inp = { members: generateMembers(), cropDefs: DEFAULT_CROPS, soil: DEFAULT_SOIL, eff: DEFAULT_EFF, settings: DEFAULT_SETTINGS };
  computeModel(weathers, 'karapinar', inp); // eğrileri ısıt
  const t0 = performance.now();
  const m = computeModel(weathers, 'karapinar', inp);
  const t1 = performance.now();
  maxCropScenario(m.planInput, 'misir');
  mixedScenario(m.planInput);
  const t2 = performance.now();
  const safe = maxSafeCommitment(m.planInput, 'misir', DEFAULT_SAFE_YEARS);
  const t3 = performance.now();
  // en küçük parseller
  const small: string[] = [];
  let minPiece = Infinity;
  for (const mv of m.members) {
    const by = new Map<string, number>();
    for (const a of mv.plannedAllocs) if (a.cropId !== FALLOW) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
    for (const [id, da] of by) {
      minPiece = Math.min(minPiece, da);
      if (da < (mv.member.areaDa < 60 ? 5 : 10) - 1e-6) small.push(`${mv.member.name}:${id}:${da.toFixed(1)}`);
    }
  }
  const s = m.scenarios;
  console.log(
    [
      `söz ${JSON.stringify(inp.settings.commitments)} | plan ${m.plan.status}`,
      `brüt gelir: bugün ${(s.today.revenue / 1e6).toFixed(2)}M gelişigüzel ${(s.scatter.revenue / 1e6).toFixed(2)}M planlı ${(s.planned.revenue / 1e6).toFixed(2)}M`,
      `güvenli mısır sözü (16/20): ${safe.toFixed(1)} t`,
      `tutan yıl: bugün ${s.today.held} gelişigüzel ${s.scatter.held} planlı ${s.planned.held}`,
      `suyu biten üye: bugün ${s.today.exceeded} gelişigüzel ${s.scatter.exceeded} planlı ${s.planned.exceeded}`,
      `süre: model ${(t1 - t0).toFixed(0)} ms (plan ${m.timing.planMs.toFixed(0)}) + senaryolar ${(t2 - t1).toFixed(0)} ms + güvenli söz ${(t3 - t2).toFixed(0)} ms = ${(t3 - t0).toFixed(0)} ms`,
      `birleştirilen parça (tur sınırı): ${m.plan.merged ?? 0} | nöbet tablosunda komşuya katılan üye: ${m.members.filter((x) => x.rotation.adjusted).length} / ${m.members.length}`,
      `eşik altı parsel: ${small.length} (en küçük ${minPiece.toFixed(2)} da) ${small.slice(0, 12).join(' ')}`,
    ].join('\n'),
  );
});
