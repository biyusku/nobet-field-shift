// Kabul kontrollerinin ham sayılarını yazdırır (doğrulama değil, rapor):
//   PROBE=1 npx vitest run src/engine/__tests__/probe.test.ts
//   PROBE=1 POINT=civril npx vitest run src/engine/__tests__/probe.test.ts
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { DEFAULT_ENGINE_CROPS } from '../../data/crops';
import { simulateCropYear, simulateFarmYear } from '../bucket';
import { buildWeather, dateOfIndex, sumCalendar } from '../weather';

test.runIf(process.env.PROBE)('ham sayılar', () => {
  const id = process.env.POINT ?? 'karapinar';
  const w = buildWeather(JSON.parse(readFileSync(`public/data/${id}.json`, 'utf8')));
  const soil = { taw: 130, p: 0.5 };
  const years = Array.from({ length: 20 }, (_, i) => 2006 + i);
  const f = (v: number) => v.toFixed(0);
  const lines: string[] = [];
  lines.push('yıllık ET0: ' + years.map((y) => f(sumCalendar(w, w.et0, y))).join(' '));
  lines.push('yıllık yağış: ' + years.map((y) => f(sumCalendar(w, w.prec, y))).join(' '));
  lines.push('temmuz ET0: ' + years.map((y) => f(sumCalendar(w, w.et0, y, 7))).join(' '));
  lines.push('temmuz yağış: ' + years.map((y) => sumCalendar(w, w.prec, y, 7).toFixed(1)).join(' '));
  for (const c of DEFAULT_ENGINE_CROPS) {
    const full = years.map((y) => simulateCropYear(w, y, c, null, 0.8, soil));
    const dry = years.map((y) => simulateCropYear(w, y, c, 0, 0.8, soil));
    lines.push(`${c.id} tam brüt(0.80): ` + full.map((r) => f(r.grossMm)).join(' '));
    lines.push(`${c.id} susuz göreli verim: ` + dry.map((r) => r.relYield.toFixed(2)).join(' '));
  }
  const corn = DEFAULT_ENGINE_CROPS[0];
  for (const eff of [0.5, 0.75, 0.8, 0.9]) {
    const ends = years.map((y) => {
      const r = simulateFarmYear(w, y, [{ crop: corn, areaDa: 100, capMm: null }], {
        efficiency: eff,
        soil,
        poolM3: 200 * 100,
      });
      return r.poolEndDay === null ? 'yok' : dateOfIndex(w, r.start + r.poolEndDay).toISOString().slice(5, 10);
    });
    lines.push(`mısır 200 mm kota, randıman ${eff}: su bitiş ` + ends.join(' '));
  }
  console.log(lines.join('\n'));
});
