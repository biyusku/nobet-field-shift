// NASA POWER günlük verisini indirir ve public/data/ altına sıkıştırılmış JSON olarak yazar.
// Kullanım: node scripts/fetch-power.mjs
// Anahtar gerekmez. Node 18+ (yerleşik fetch) yeterlidir.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PARAMS = ['T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN', 'WS2M', 'RH2M'];
const START = '20041001';
const END = '20251231';

const POINTS = [
  { id: 'karapinar', name: 'Karapınar, Konya', lat: 37.72, lon: 33.55 },
  { id: 'civril', name: 'Çivril, Denizli', lat: 38.3, lon: 29.74 },
  // Kurgusal kooperatifin yayıldığı Konya ilçeleri (ilçe merkezleri, yaklaşık)
  { id: 'cumra', name: 'Çumra, Konya', lat: 37.57, lon: 32.77 },
  { id: 'eregli', name: 'Ereğli, Konya', lat: 37.51, lon: 34.05 },
  { id: 'cihanbeyli', name: 'Cihanbeyli, Konya', lat: 38.66, lon: 32.93 },
  { id: 'altinekin', name: 'Altınekin, Konya', lat: 38.31, lon: 32.87 },
];

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');

function ymd(date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

/** POWER yanıtını gün dizilerine çevirir. Eksik değer (-999) null olur; temizlik motorda yapılır. */
function compact(json, point, url) {
  const p = json.properties.parameter;
  const out = {
    id: point.id,
    name: point.name,
    lat: point.lat,
    lon: point.lon,
    elevation: json.geometry.coordinates[2],
    start: START,
    end: END,
    source: { api: 'NASA POWER Daily API (community=AG)', url, fetchedAt: new Date().toISOString() },
    params: {},
  };
  const startMs = Date.UTC(+START.slice(0, 4), +START.slice(4, 6) - 1, +START.slice(6, 8));
  const endMs = Date.UTC(+END.slice(0, 4), +END.slice(4, 6) - 1, +END.slice(6, 8));
  for (const name of PARAMS) {
    const arr = [];
    for (let t = startMs; t <= endMs; t += 86400000) {
      const v = p[name]?.[ymd(new Date(t))];
      arr.push(v === undefined || v === null || v <= -900 ? null : v);
    }
    out.params[name] = arr;
  }
  return out;
}

async function fetchPoint(point) {
  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${PARAMS.join(',')}` +
    `&community=AG&longitude=${point.lon}&latitude=${point.lat}&start=${START}&end=${END}&format=JSON`;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return compact(await res.json(), point, url);
    } catch (err) {
      lastErr = err;
      console.warn(`  deneme ${attempt} başarısız: ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  throw lastErr;
}

await mkdir(outDir, { recursive: true });
const only = process.argv.slice(2);
for (const point of POINTS) {
  if (only.length && !only.includes(point.id)) continue;
  console.log(`${point.name} (${point.lat}, ${point.lon}) indiriliyor...`);
  const data = await fetchPoint(point);
  const n = data.params.T2M_MAX.length;
  const missing = Object.fromEntries(PARAMS.map((k) => [k, data.params[k].filter((v) => v === null).length]));
  const file = join(outDir, `${point.id}.json`);
  await writeFile(file, JSON.stringify(data));
  console.log(`  ${n} gün, rakım ${data.elevation} m, eksik:`, missing, `-> ${file}`);
}
