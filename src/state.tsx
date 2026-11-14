import { type Context, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_CROPS, type CropDef } from './data/crops';
import { DEFAULT_EFF, DEFAULT_MEMBERS, DEFAULT_SETTINGS, DEFAULT_SOIL, PRESET_POINTS } from './data/defaults';
import type { PlanSettings } from './engine/plan';
import type { Efficiencies, Member, Soil, Weather } from './engine/types';
import { buildWeather } from './engine/weather';
import { loadCustom, loadPreset } from './lib/weatherSource';
import { computeModel, type Model } from './model';
import { StoreCtx } from './storeContext';

export type PointSel = { kind: 'preset'; id: string } | { kind: 'custom'; lat: number; lon: number };
export type Tab = 'genel' | 'uye' | 'taahhut' | 'yontem';

interface Persisted {
  members: Member[];
  cropDefs: CropDef[];
  soil: Soil;
  eff: Efficiencies;
  settings: PlanSettings;
  point: PointSel;
}

const KEY = 'nobet-durum-v3';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function defaults(): Persisted {
  return {
    members: clone(DEFAULT_MEMBERS),
    cropDefs: clone(DEFAULT_CROPS),
    soil: { ...DEFAULT_SOIL },
    eff: { ...DEFAULT_EFF },
    settings: clone(DEFAULT_SETTINGS),
    point: { kind: 'preset', id: PRESET_POINTS[0].id },
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw) as Partial<Persisted>;
    const d = defaults();
    if (!Array.isArray(p.members) || !Array.isArray(p.cropDefs) || p.cropDefs.length !== d.cropDefs.length) return d;
    return { ...d, ...p, point: d.point, settings: { ...d.settings, ...p.settings }, soil: { ...d.soil, ...p.soil }, eff: { ...d.eff, ...p.eff } } as Persisted;
  } catch {
    return defaults();
  }
}

interface Store extends Persisted {
  update: (patch: Partial<Persisted>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  addMember: () => string;
  removeMember: (id: string) => void;
  updateSettings: (patch: Partial<PlanSettings>) => void;
  reset: () => void;
  weather: Weather | null;
  weatherStatus: 'loading' | 'ready' | 'error';
  weatherError: string | null;
  /** haritadan seçilen nokta indirilemediğinde gösterilen uyarı */
  notice: string | null;
  dismissNotice: () => void;
  selectPoint: (p: PointSel) => void;
  model: Model | null;
  modelError: string | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  memberId: string;
  setMemberId: (id: string) => void;
}

const Ctx = StoreCtx as Context<Store | null>;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(load);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherStatus, setStatus] = useState<Store['weatherStatus']>('loading');
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('genel');
  const [memberId, setMemberId] = useState<string>(() => p.members[0]?.id ?? '');
  const lastGood = useRef<PointSel>({ kind: 'preset', id: PRESET_POINTS[0].id });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* saklanamadı: oturum içinde çalışmaya devam */
    }
  }, [p]);

  const update = useCallback((patch: Partial<Persisted>) => setP((s) => ({ ...s, ...patch })), []);

  // nokta değişince veriyi yükle
  const pointKey = p.point.kind === 'preset' ? p.point.id : `${p.point.lat},${p.point.lon}`;
  useEffect(() => {
    let cancelled = false;
    const point = p.point;
    setStatus('loading');
    setWeatherError(null);
    (async () => {
      try {
        const raw = point.kind === 'preset' ? await loadPreset(point.id) : (await loadCustom(point.lat, point.lon)).raw;
        if (cancelled) return;
        const w = buildWeather(raw);
        if (w.n < 7700) throw new Error('İndirilen veri eksik (2004-2025 arası bekleniyordu).');
        lastGood.current = point;
        setWeather(w);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (point.kind === 'custom') {
          // haritadan seçilen nokta alınamadı: açıkça söyle, son çalışan noktaya dön
          setNotice(`${msg} Hazır noktalarla (Karapınar, Çivril) devam ediliyor.`);
          setP((s) => ({ ...s, point: lastGood.current }));
        } else {
          setWeather(null);
          setWeatherError(msg);
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointKey]);

  const { model, modelError } = useMemo(() => {
    if (!weather) return { model: null, modelError: null };
    try {
      return { model: computeModel(weather, p), modelError: null };
    } catch (err) {
      return { model: null, modelError: err instanceof Error ? err.message : String(err) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, p.members, p.cropDefs, p.soil, p.eff, p.settings]);

  const store: Store = {
    ...p,
    update,
    updateMember: (id, patch) => setP((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
    addMember: () => {
      const id = `u${Date.now().toString(36)}`;
      setP((s) => ({
        ...s,
        members: [
          ...s.members,
          { id, name: `Üye ${s.members.length + 1} (kurgusal)`, areaDa: 100, quotaMm: 200, method: 'yagmurlama', current: [{ cropId: 'misir', da: 100 }] },
        ],
      }));
      setMemberId(id);
      return id;
    },
    removeMember: (id) => {
      setP((s) => ({ ...s, members: s.members.filter((m) => m.id !== id) }));
      if (memberId === id) setMemberId(p.members.find((m) => m.id !== id)?.id ?? '');
    },
    updateSettings: (patch) => setP((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    reset: () => {
      const d = defaults();
      setP((s) => ({ ...d, point: s.point }));
      setMemberId(d.members[0].id);
    },
    weather,
    weatherStatus,
    weatherError,
    notice,
    dismissNotice: () => setNotice(null),
    selectPoint: (point) => {
      setNotice(null);
      update({ point });
    },
    model,
    modelError,
    tab,
    setTab,
    memberId,
    setMemberId,
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider eksik');
  return s;
}
