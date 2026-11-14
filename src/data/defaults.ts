import type { PlanSettings } from '../engine/plan';
import type { Efficiencies, Member, Soil } from '../engine/types';

export const COOP_NAME = 'Karapınar Örnek Kooperatifi';

/** KURGUSAL üyeler: gerçek kişi ya da işletme değildir; yalnız arayüzü dolu göstermek içindir. */
export const DEFAULT_MEMBERS: Member[] = [
  { id: 'u1', name: 'Üye 1 (kurgusal)', areaDa: 80, quotaMm: 200, method: 'salma', current: [{ cropId: 'misir', da: 80 }] },
  {
    id: 'u2',
    name: 'Üye 2 (kurgusal)',
    areaDa: 120,
    quotaMm: 200,
    method: 'yagmurlama',
    current: [
      { cropId: 'misir', da: 90 },
      { cropId: 'bugday', da: 30 },
    ],
  },
  {
    id: 'u3',
    name: 'Üye 3 (kurgusal)',
    areaDa: 200,
    quotaMm: 200,
    method: 'yagmurlama',
    current: [
      { cropId: 'misir', da: 140 },
      { cropId: 'pancar', da: 60 },
    ],
  },
  {
    id: 'u4',
    name: 'Üye 4 (kurgusal)',
    areaDa: 350,
    quotaMm: 200,
    method: 'damla',
    current: [
      { cropId: 'misir', da: 230 },
      { cropId: 'aycicegi', da: 70 },
      { cropId: 'arpa', da: 50 },
    ],
  },
];

export const DEFAULT_SOIL: Soil = { taw: 130, p: 0.5 };
export const DEFAULT_EFF: Efficiencies = { salma: 0.5, yagmurlama: 0.75, damla: 0.9 };
export const METHOD_LABEL = { salma: 'Salma', yagmurlama: 'Yağmurlama', damla: 'Damla' } as const;

export const DEFAULT_SETTINGS: PlanSettings = {
  maxShare: 1 / 3,
  smallMarketCap: 0.25,
  commitments: { misir: 300 },
  mode: 'revenue',
  includeUnreliable: false,
};

export interface PointDef {
  id: string;
  name: string;
  lat: number;
  lon: number;
}
export const PRESET_POINTS: PointDef[] = [
  { id: 'karapinar', name: 'Karapınar, Konya', lat: 37.72, lon: 33.55 },
  { id: 'civril', name: 'Çivril, Denizli', lat: 38.3, lon: 29.74 },
];
