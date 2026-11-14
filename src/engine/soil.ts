// Toprak puanı ve üç yıllık nöbet tablosu.
import { FALLOW, type Crop } from './types';

export interface SoilScore {
  /** 0-100 */
  score: number;
  legumeShare: number;
  /** etkin ürün sayısı = 1 / Σ pay² */
  effectiveCrops: number;
  legumePoints: number;
  diversityPoints: number;
}

export const SOIL_FORMULA =
  'Puan = 60 × min(1, baklagil payı ÷ 0,25) + 40 × min(1, (etkin ürün sayısı − 1) ÷ 2);  etkin ürün sayısı = 1 ÷ Σ(pay²)';

/**
 * Basit, ekranda formülü yazan bir gösterge; toprak analizi değildir.
 * Paylar ekili + nadas toplam alana göre alınır; nadas ayrı bir "ürün" sayılır.
 */
export function soilScore(areas: { cropId: string; da: number }[], crops: Crop[]): SoilScore {
  const total = areas.reduce((s, a) => s + a.da, 0);
  if (total <= 0) return { score: 0, legumeShare: 0, effectiveCrops: 0, legumePoints: 0, diversityPoints: 0 };
  const by = new Map<string, number>();
  for (const a of areas) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
  let legume = 0;
  let sumSq = 0;
  for (const [id, da] of by) {
    const share = da / total;
    sumSq += share * share;
    if (id !== FALLOW && crops.find((c) => c.id === id)?.legume) legume += share;
  }
  const eff = 1 / sumSq;
  const legumePoints = 60 * Math.min(1, legume / 0.25);
  const diversityPoints = 40 * Math.min(1, (eff - 1) / 2);
  return {
    score: Math.round(legumePoints + diversityPoints),
    legumeShare: legume,
    effectiveCrops: eff,
    legumePoints,
    diversityPoints,
  };
}

export interface RotationCell {
  cropId: string;
  da: number;
}
export interface Rotation {
  /** parsel büyüklüğü (tarlanın üçte biri), da */
  parcelDa: number;
  /** [parsel][yıl] -> o parselde o yıl ekilenler */
  table: RotationCell[][][];
  /** her ürün tarlanın en çok üçte birindeyse true: hiçbir toprak parçasına üst üste aynı ürün gelmez */
  guaranteed: boolean;
}

/**
 * Planı üç eş parsele bölüp her yıl bir parsel kaydırır.
 * Ürünler bir şerit üzerinde yan yana dizilir; şerit üç eş dilime kesilir.
 * Y. yılda P. parsel, (P − Y) mod 3 numaralı dilimi eker. Her ürün ≤ 1/3 ise bir toprak parçası
 * aynı ürünü ancak üç yılda bir görür.
 */
export function buildRotation(areas: { cropId: string; da: number }[], fieldDa: number): Rotation {
  const by = new Map<string, number>();
  for (const a of areas) if (a.da > 1e-6) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
  const segs = [...by.entries()]
    .map(([cropId, da]) => ({ cropId, da }))
    .sort((a, b) => (a.cropId === FALLOW ? 1 : b.cropId === FALLOW ? -1 : b.da - a.da));
  const total = segs.reduce((s, x) => s + x.da, 0);
  const A = Math.max(fieldDa, total);
  if (A - total > 1e-6) segs.push({ cropId: FALLOW, da: A - total });
  const third = A / 3;
  const slices: RotationCell[][] = [[], [], []];
  let pos = 0;
  for (const s of segs) {
    const a = pos;
    const b = pos + s.da;
    for (let k = 0; k < 3; k++) {
      const lo = Math.max(a, k * third);
      const hi = Math.min(b, (k + 1) * third);
      if (hi - lo > 1e-6) slices[k].push({ cropId: s.cropId, da: hi - lo });
    }
    pos = b;
  }
  const table = [0, 1, 2].map((p) => [0, 1, 2].map((y) => slices[(((p - y) % 3) + 3) % 3]));
  const guaranteed = [...by.entries()].every(([id, da]) => id === FALLOW || da <= third + 1e-6);
  return { parcelDa: third, table, guaranteed };
}
