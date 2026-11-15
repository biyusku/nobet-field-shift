// Ağır hesabı süre sınırıyla çalıştırır.
// Neden: javascript-lp-solver bazı planlarda (ör. örnek kooperatifte 2.000 t nohut sözü) dönmüyor.
// JavaScript'te eşzamanlı bir döngü dışarıdan kesilemez; bu yüzden hesap bir worker'da çalışır,
// süre dolarsa worker öldürülür ve araç anlaşılır bir hata döner. Worker kurulamazsa (ör. sunucusuz
// ortamda dosya yoksa) hesap aynı iş parçacığında, süre sınırı olmadan çalışır; o durumda sınırı
// barındırıcının işlev süre sınırı koyar.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import * as core from './core';

export class TimeoutError extends Error {}

const DIRECT: Record<string, (...a: never[]) => unknown> = { uyePlani: core.uyePlani, sozUrun: core.sozUrun, sozKarma: core.sozKarma, taahhutDene: core.taahhutDene };
/** Worker kullanılıyor mu (rapor ve günlük için). */
export function mode(): 'worker' | 'aynı iş parçacığı' {
  return workerPath() ? 'worker' : 'aynı iş parçacığı';
}

export const LIMIT_MS = Number(process.env.MCP_TIMEOUT_MS) || 20000;

let worker: Worker | null = null;
let seq = 0;
let queue: Promise<unknown> = Promise.resolve();

/** .ts worker ancak tsx yükleyicisiyle çalışır (npm run mcp / mcp:http). Yoksa (vitest, sunucusuz) yalnız derlenmiş .js aranır. */
const TS_LOADER = process.execArgv.some((a) => a.includes('tsx'));

function workerPath(): string | null {
  for (const name of TS_LOADER ? ['worker.ts'] : ['worker.js', 'worker.mjs']) {
    const p = fileURLToPath(new URL(`./${name}`, import.meta.url));
    if (existsSync(p)) return p;
  }
  return null;
}

function getWorker(): Worker | null {
  if (worker) return worker;
  const p = workerPath();
  if (!p) return null;
  try {
    worker = new Worker(p);
    worker.unref();
    worker.on('error', () => (worker = null));
    worker.on('exit', () => (worker = null));
    return worker;
  } catch {
    return null;
  }
}

function once<T>(fn: string, args: unknown[], limitMs: number): Promise<T> {
  const w = getWorker();
  if (!w) return Promise.resolve().then(() => DIRECT[fn](...(args as never[])) as T);
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      w.off('message', onMsg);
      w.off('error', onErr);
      void w.terminate();
      worker = null;
      reject(new TimeoutError(`Hesap ${Math.round(limitMs / 1000)} saniyede bitmedi; doğrusal programlama çözücüsü bu girdide takıldı. Daha küçük bir miktar ya da başka bir ürün deneyin.`));
    }, limitMs);
    const onMsg = (m: { id: number; ok: boolean; r?: T; input?: boolean; msg?: string }) => {
      if (m.id !== id) return;
      clearTimeout(timer);
      w.off('error', onErr);
      w.off('message', onMsg);
      if (m.ok) resolve(m.r as T);
      else reject(m.input ? new core.InputError(m.msg) : new Error(m.msg));
    };
    const onErr = (e: Error) => {
      clearTimeout(timer);
      w.off('message', onMsg);
      worker = null;
      reject(new Error(`Hesap iş parçacığı çöktü: ${e.message}`));
    };
    w.once('error', onErr);
    w.on('message', onMsg);
    w.postMessage({ id, fn, args });
  });
}

/** İşleri sırayla çalıştırır (worker tek iş parçacığıdır). */
export function call<T>(fn: string, args: unknown[], limitMs = LIMIT_MS): Promise<T> {
  const p = queue.then(() => once<T>(fn, args, limitMs));
  queue = p.catch(() => undefined);
  return p;
}

export async function shutdown() {
  if (worker) await worker.terminate();
  worker = null;
}
