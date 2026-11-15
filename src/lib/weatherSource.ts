// Hava verisinin kaynağı: önce yerel dosya (hazır noktalar), haritadan seçilen nokta için NASA POWER API + IndexedDB önbelleği.
import type { RawWeather } from '../engine/types';
import { L } from '../i18n';

const PARAMS = ['T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN', 'WS2M', 'RH2M'];
export const POWER_START = '20041001';
export const POWER_END = '20251231';

export function powerUrl(lat: number, lon: number): string {
  return (
    `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${PARAMS.join(',')}` +
    `&community=AG&longitude=${lon}&latitude=${lat}&start=${POWER_START}&end=${POWER_END}&format=JSON`
  );
}

export async function loadPreset(id: string): Promise<RawWeather> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${id}.json`);
  if (!res.ok) throw new Error(L(`Yerel veri dosyası bulunamadı (data/${id}.json, HTTP ${res.status}). "npm run fetch-data" çalıştırın.`, `Local data file not found (data/${id}.json, HTTP ${res.status}). Run "npm run fetch-data".`));
  return (await res.json()) as RawWeather;
}

interface PowerResponse {
  geometry: { coordinates: number[] };
  properties: { parameter: Record<string, Record<string, number>> };
}

/** POWER yanıtını gün dizilerine çevirir (scripts/fetch-power.mjs ile aynı biçim). */
export function parsePower(json: PowerResponse, lat: number, lon: number, name: string): RawWeather {
  const p = json.properties.parameter;
  const y = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  const params: RawWeather['params'] = {};
  for (const key of PARAMS) {
    const arr: (number | null)[] = [];
    for (let t = y(POWER_START); t <= y(POWER_END); t += 86400000) {
      const v = p[key]?.[new Date(t).toISOString().slice(0, 10).replaceAll('-', '')];
      arr.push(v === undefined || v === null || v <= -900 ? null : v);
    }
    params[key] = arr;
  }
  return {
    id: customId(lat, lon),
    name,
    lat,
    lon,
    elevation: json.geometry.coordinates[2],
    start: POWER_START,
    end: POWER_END,
    source: { api: 'NASA POWER Daily API (community=AG)', url: powerUrl(lat, lon), fetchedAt: new Date().toISOString() },
    params,
  };
}

export const customId = (lat: number, lon: number) => `nokta_${lat.toFixed(2)}_${lon.toFixed(2)}`;

// ---- IndexedDB önbelleği (yoksa ya da engelliyse sessizce atlanır) ----
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('nobet', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('power');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key: string): Promise<RawWeather | undefined> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const r = db.transaction('power').objectStore('power').get(key);
      r.onsuccess = () => resolve(r.result as RawWeather | undefined);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return undefined;
  }
}
async function idbPut(key: string, value: RawWeather): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('power', 'readwrite');
      tx.objectStore('power').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* önbellek yazılamadı: sorun değil */
  }
}

export class PowerFetchError extends Error {}

/** Haritadan seçilen nokta: önbellekte varsa oradan, yoksa tarayıcıdan NASA POWER API'si. */
export async function loadCustom(lat: number, lon: number): Promise<{ raw: RawWeather; fromCache: boolean }> {
  const la = +lat.toFixed(2);
  const lo = +lon.toFixed(2);
  const key = customId(la, lo);
  const cached = await idbGet(key);
  if (cached) return { raw: cached, fromCache: true };
  let res: Response;
  try {
    res = await fetch(powerUrl(la, lo));
  } catch {
    throw new PowerFetchError(
      L('NASA POWER API\'sine tarayıcıdan ulaşılamadı (ağ bağlantısı yok ya da tarayıcı çağrıyı CORS nedeniyle engelledi).', 'The NASA POWER API could not be reached from the browser (no network connection, or the browser blocked the call because of CORS).'),
    );
  }
  if (!res.ok) throw new PowerFetchError(L(`NASA POWER API'si hata döndürdü (HTTP ${res.status}).`, `The NASA POWER API returned an error (HTTP ${res.status}).`));
  let json: PowerResponse;
  try {
    json = (await res.json()) as PowerResponse;
    if (!json.properties?.parameter?.T2M_MAX) throw new Error('beklenmeyen yanıt');
  } catch {
    throw new PowerFetchError(L('NASA POWER yanıtı beklenen biçimde değil.', 'The NASA POWER response is not in the expected format.'));
  }
  const raw = parsePower(json, la, lo, L(`Seçilen nokta (${la.toFixed(2)}°K, ${lo.toFixed(2)}°D)`, `Selected point (${la.toFixed(2)}°N, ${lo.toFixed(2)}°E)`));
  await idbPut(key, raw);
  return { raw, fromCache: false };
}
