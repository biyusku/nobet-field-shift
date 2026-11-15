// Ağır hesapların çalıştığı iş parçacığı. Ana iş parçacığı süre sınırını aşan işi bu iş parçacığıyla birlikte öldürür.
import { parentPort } from 'node:worker_threads';
import * as core from './core';

const FNS: Record<string, (...a: never[]) => unknown> = {
  uyePlani: core.uyePlani,
  sozUrun: core.sozUrun,
  sozKarma: core.sozKarma,
  taahhutDene: core.taahhutDene,
};

parentPort!.on('message', ({ id, fn, args }: { id: number; fn: string; args: unknown[] }) => {
  try {
    const r = FNS[fn](...(args as never[]));
    parentPort!.postMessage({ id, ok: true, r });
  } catch (e) {
    parentPort!.postMessage({ id, ok: false, input: e instanceof core.InputError, msg: e instanceof Error ? e.message : String(e) });
  }
});
