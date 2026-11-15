// Ağır hesabı Web Worker'da, süre sınırıyla çalıştıran kanca. Süre dolarsa worker sonlandırılır
// (çözücünün içindeki döngü başka türlü kesilemez) ve sonuç "timeout" olur; sekme donmaz.
import { useEffect, useState } from 'react';
import type { CalcRequest, CalcTask } from '../workers/calc.worker';
import type { Inputs, Model } from '../model';
import type { Weather } from '../engine/types';

export const CALC_LIMIT_MS = 5000;

export type CalcState<T> = { status: 'loading' } | { status: 'done'; value: T } | { status: 'timeout' } | { status: 'error'; message: string };

export interface CalcContext {
  model: Model;
  weathers: Record<string, Weather>;
  fallbackId: string;
  inputs: Inputs;
}

let worker: Worker | null = null;
let workerKey = -1;
let seq = 0;
const keys = new WeakMap<Model, number>();
let nextKey = 0;
const keyOf = (m: Model) => {
  let k = keys.get(m);
  if (k === undefined) keys.set(m, (k = nextKey++));
  return k;
};

type Job = { ctx: CalcContext; task: CalcTask; done: (s: CalcState<unknown>) => void; cancelled: boolean };
const queue: Job[] = [];
let busy = false;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/calc.worker.ts', import.meta.url), { type: 'module' });
    workerKey = -1;
  }
  return worker;
}

function pump() {
  if (busy) return;
  const job = queue.shift();
  if (!job) return;
  if (job.cancelled) return pump();
  busy = true;
  const w = getWorker();
  const modelKey = keyOf(job.ctx.model);
  const id = ++seq;
  const req: CalcRequest = { id, modelKey, task: job.task };
  if (workerKey !== modelKey) req.setup = { weathers: job.ctx.weathers, fallbackId: job.ctx.fallbackId, inputs: job.ctx.inputs };
  const finish = (s: CalcState<unknown>) => {
    clearTimeout(timer);
    w.removeEventListener('message', onMsg);
    busy = false;
    if (!job.cancelled) job.done(s);
    pump();
  };
  const timer = setTimeout(() => {
    w.terminate();
    if (worker === w) worker = null;
    finish({ status: 'timeout' });
  }, CALC_LIMIT_MS);
  const onMsg = (e: MessageEvent<{ id: number; ok: boolean; value?: unknown; message?: string }>) => {
    if (e.data.id !== id) return;
    if (e.data.ok) workerKey = modelKey;
    finish(e.data.ok ? { status: 'done', value: e.data.value } : { status: 'error', message: e.data.message ?? 'bilinmeyen hata' });
  };
  w.addEventListener('message', onMsg);
  w.postMessage(req);
}

/** task null ise hesap yapılmaz. depKey değişince yeniden hesaplanır. */
export function useCalc<T>(ctx: CalcContext | null, task: CalcTask | null, depKey: string): CalcState<T> {
  const [state, setState] = useState<CalcState<T>>({ status: 'loading' });
  useEffect(() => {
    if (!ctx || !task) return;
    setState({ status: 'loading' });
    const job: Job = { ctx, task, done: (s) => setState(s as CalcState<T>), cancelled: false };
    queue.push(job);
    pump();
    return () => {
      job.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.model, depKey]);
  return state;
}
