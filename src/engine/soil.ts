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
  /** küçük bir parça komşusuna katıldıysa true: tablodaki alanlar plandan o kadar sapar */
  adjusted: boolean;
}

/** Şeridi üç eş dilime keser. */
function sliceThirds(segs: RotationCell[], third: number): RotationCell[][] {
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
  return slices;
}

function smallestPiece(slices: RotationCell[][]): number {
  let min = Infinity;
  for (const sl of slices) for (const c of sl) if (c.cropId !== FALLOW) min = Math.min(min, c.da);
  return min;
}

/** Sıralamaları dener (Heap algoritması); f true dönerse durur. */
function eachPermutation<T>(items: T[], f: (perm: T[]) => boolean): void {
  const a = [...items];
  const c = new Array<number>(a.length).fill(0);
  if (f(a)) return;
  let i = 0;
  while (i < a.length) {
    if (c[i] < i) {
      const k = i % 2 === 0 ? 0 : c[i];
      [a[k], a[i]] = [a[i], a[k]];
      if (f(a)) return;
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

/**
 * Planı üç eş parsele bölüp her yıl bir parsel kaydırır.
 * Ürünler bir şerit üzerinde yan yana dizilir; şerit üç eş dilime kesilir.
 * Y. yılda P. parsel, (P − Y) mod 3 numaralı dilimi eker. Her ürün ≤ 1/3 ise bir toprak parçası
 * aynı ürünü ancak üç yılda bir görür.
 *
 * minPieceDa > 0 ise: dilim sınırında bölünen bir ürünün parçaları da en az bu kadar olsun diye
 * ürünlerin şeritteki sırası aranır (en küçük parçası en büyük olan sıra seçilir). Hiçbir sıra yetmiyorsa
 * kalan küçük parça, aynı dilimdeki en büyük komşusuna katılır ve adjusted = true olur
 * (o durumda tablodaki alanlar plandan bu kadar sapar).
 */
export function buildRotation(areas: { cropId: string; da: number }[], fieldDa: number, minPieceDa = 0): Rotation {
  const by = new Map<string, number>();
  for (const a of areas) if (a.da > 1e-6) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
  const segs = [...by.entries()]
    .map(([cropId, da]) => ({ cropId, da }))
    .sort((a, b) => (a.cropId === FALLOW ? 1 : b.cropId === FALLOW ? -1 : b.da - a.da));
  const total = segs.reduce((s, x) => s + x.da, 0);
  const A = Math.max(fieldDa, total);
  if (A - total > 1e-6) segs.push({ cropId: FALLOW, da: A - total });
  const third = A / 3;

  let slices = sliceThirds(segs, third);
  if (minPieceDa > 0 && smallestPiece(slices) < minPieceDa - 1e-6 && segs.length <= 8) {
    let best = slices;
    let bestMin = smallestPiece(slices);
    eachPermutation(segs, (perm) => {
      const sl = sliceThirds(perm, third);
      const m = smallestPiece(sl);
      if (m > bestMin + 1e-9) {
        best = sl;
        bestMin = m;
      }
      return bestMin >= minPieceDa - 1e-6;
    });
    slices = best;
  }
  let adjusted = false;
  if (minPieceDa > 0) {
    slices = slices.map((sl) => {
      const out = sl.map((c) => ({ ...c }));
      for (;;) {
        const i = out.findIndex((c) => c.cropId !== FALLOW && c.da < minPieceDa - 1e-6);
        if (i < 0 || out.length < 2) break;
        // aynı dilimdeki en büyük komşuya kat
        let j = -1;
        for (let k = 0; k < out.length; k++) if (k !== i && (j < 0 || out[k].da > out[j].da)) j = k;
        out[j].da += out[i].da;
        out.splice(i, 1);
        adjusted = true;
      }
      return out;
    });
  }
  const table = [0, 1, 2].map((p) => [0, 1, 2].map((y) => slices[(((p - y) % 3) + 3) % 3]));
  const guaranteed = [...by.entries()].every(([id, da]) => id === FALLOW || da <= third + 1e-6);
  return { parcelDa: third, table, guaranteed, adjusted };
}
