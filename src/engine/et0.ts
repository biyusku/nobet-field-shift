// FAO-56 Penman-Monteith günlük referans buharlaşma (ET0). Saf fonksiyonlar.

/** Doygun buhar basıncı, kPa (T: °C) */
export function e0(t: number): number {
  return 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
}

/** Atmosfer dışı radyasyon Ra, MJ/m2/gün. J: yılın günü, latRad: enlem (radyan) */
export function extraterrestrialRadiation(J: number, latRad: number): number {
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * J) / 365);
  const decl = 0.409 * Math.sin((2 * Math.PI * J) / 365 - 1.39);
  const x = Math.max(-1, Math.min(1, -Math.tan(latRad) * Math.tan(decl)));
  const ws = Math.acos(x);
  return (
    ((24 * 60) / Math.PI) *
    0.082 *
    dr *
    (ws * Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.sin(ws))
  );
}

export interface Et0Input {
  tmax: number;
  tmin: number;
  /** güneş radyasyonu, MJ/m2/gün */
  rs: number;
  /** 2 m rüzgâr hızı, m/s */
  u2: number;
  /** ortalama bağıl nem, % */
  rh: number;
  /** yılın günü */
  J: number;
  latRad: number;
  /** rakım, m */
  z: number;
}

export function et0PenmanMonteith(i: Et0Input): number {
  const T = (i.tmax + i.tmin) / 2;
  const delta = (4098 * e0(T)) / Math.pow(T + 237.3, 2);
  const P = 101.3 * Math.pow((293 - 0.0065 * i.z) / 293, 5.26);
  const gamma = 0.000665 * P;
  const es = (e0(i.tmax) + e0(i.tmin)) / 2;
  const ea = (i.rh / 100) * es;
  const Ra = extraterrestrialRadiation(i.J, i.latRad);
  const Rso = (0.75 + 2e-5 * i.z) * Ra;
  const Rns = 0.77 * i.rs;
  const tmaxK = i.tmax + 273.16;
  const tminK = i.tmin + 273.16;
  const rel = Rso > 0 ? Math.min(i.rs / Rso, 1) : 1;
  const Rnl =
    4.903e-9 * ((Math.pow(tmaxK, 4) + Math.pow(tminK, 4)) / 2) * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * rel - 0.35);
  const num = 0.408 * delta * (Rns - Rnl) + ((gamma * 900) / (T + 273)) * i.u2 * (es - ea);
  const den = delta + gamma * (1 + 0.34 * i.u2);
  return Math.max(0, num / den);
}

/** Hargreaves yedeği: güneş, rüzgâr ya da nem eksik olduğunda. */
export function et0Hargreaves(tmax: number, tmin: number, J: number, latRad: number): number {
  const T = (tmax + tmin) / 2;
  const Ra = extraterrestrialRadiation(J, latRad);
  return Math.max(0, 0.0023 * (T + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)) * Ra * 0.408);
}
