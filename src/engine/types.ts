/** scripts/fetch-power.mjs çıktısı ve tarayıcıdan indirilen verinin ortak biçimi. */
export interface RawWeather {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  /** YYYYMMDD */
  start: string;
  end: string;
  source?: { api: string; url: string; fetchedAt: string };
  params: Record<string, (number | null)[]>;
}

/** Temizlenmiş günlük hava + hesaplanmış ET0. Dizi indisi = başlangıçtan bu yana gün. */
export interface Weather {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  startMs: number;
  n: number;
  tmax: Float64Array;
  tmin: Float64Array;
  prec: Float64Array;
  /** MJ/m2/gün; eksikse NaN */
  rs: Float64Array;
  ws: Float64Array;
  rh: Float64Array;
  /** mm/gün */
  et0: Float64Array;
  /** ET0'ın Hargreaves ile hesaplandığı gün sayısı */
  hargreavesDays: number;
  missing: Record<string, number>;
  fetchedAt?: string;
}

export interface Crop {
  id: string;
  name: string;
  legume: boolean;
  smallMarket: boolean;
  /** yalnız sözleşmesi olan üyeye ve yalnız tam sulamayla önerilir (şeker pancarı) */
  contractOnly?: boolean;
  plantMonth: number;
  plantDay: number;
  /** baş, gelişme, orta, son (gün) */
  stages: [number, number, number, number];
  /** baş, orta, son */
  kc: [number, number, number];
  ky: number;
  yieldKgDa: number;
  priceTlTon: number;
}

export interface Soil {
  /** kullanılabilir su kapasitesi, mm */
  taw: number;
  /** izin verilen boşalma oranı */
  p: number;
}

export type IrrigationMethod = 'salma' | 'yagmurlama' | 'damla';
export type Efficiencies = Record<IrrigationMethod, number>;

export interface Member {
  id: string;
  name: string;
  areaDa: number;
  /** yıllık kota, tarla geneline mm (1 mm x 1 da = 1 m3) */
  quotaMm: number;
  method: IrrigationMethod;
  current: { cropId: string; da: number }[];
  /** şeker pancarı sözleşmesi var mı; yoksa pancar bu üyeye önerilmez */
  beetContract?: boolean;
  /** üyenin havasının okunacağı nokta (ilçe) kimliği; yoksa seçili nokta kullanılır */
  pointId?: string;
  /** haritadaki konum (kurgusal) */
  lat?: number;
  lon?: number;
}

export const FALLOW = 'nadas';
export const FIRST_YEAR = 2006;
export const LAST_YEAR = 2025;
