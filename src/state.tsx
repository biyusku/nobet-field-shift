import { type Context, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CROPS, type CropDef } from './data/crops';
import { DEFAULT_EFF, DEFAULT_SETTINGS, DEFAULT_SOIL } from './data/defaults';
import { DISTRICTS, generateMembers } from './data/members';
import type { PlanSettings } from './engine/plan';
import type { Efficiencies, Member, Soil, Weather } from './engine/types';
import { buildWeather } from './engine/weather';
import { initialLang, L, LANG_KEY, setLang as setGlobalLang, type Lang } from './i18n';
import { loadPreset } from './lib/weatherSource';
import { computeModel, type Model } from './model';
import { StoreCtx } from './storeContext';

export type Tab = 'genel' | 'uye' | 'taahhut' | 'yontem';

interface Persisted {
  members: Member[];
  cropDefs: CropDef[];
  soil: Soil;
  eff: Efficiencies;
  settings: PlanSettings;
  /** sözün verildiği alıcı (serbest metin, kurgusal) */
  buyer: string;
}

const KEY = 'nobet-durum-v12';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function defaults(): Persisted {
  return {
    members: generateMembers(),
    cropDefs: clone(DEFAULT_CROPS),
    soil: { ...DEFAULT_SOIL },
    eff: { ...DEFAULT_EFF },
    settings: clone(DEFAULT_SETTINGS),
    buyer: 'Örnek Alıcı A.Ş. (kurgusal)',
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw) as Partial<Persisted>;
    const d = defaults();
    if (!Array.isArray(p.members) || !Array.isArray(p.cropDefs) || p.cropDefs.length !== d.cropDefs.length) return d;
    return { ...d, ...p, settings: { ...d.settings, ...p.settings }, soil: { ...d.soil, ...p.soil }, eff: { ...d.eff, ...p.eff } } as Persisted;
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
  /** ilçe kimliği -> o ilçenin NASA POWER verisi */
  weathers: Record<string, Weather>;
  /** seçili ilçe (iklim kartı, Yöntem ekranı ve yeni üyenin ilçesi) */
  districtId: string;
  setDistrictId: (id: string) => void;
  /** seçili ilçenin havası */
  weather: Weather | null;
  weatherStatus: 'loading' | 'ready' | 'error';
  weatherError: string | null;
  model: Model | null;
  modelError: string | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  /** arayüz dili (src/i18n.ts) */
  lang: Lang;
  setLang: (l: Lang) => void;
  memberId: string;
  setMemberId: (id: string) => void;
}

const Ctx = StoreCtx as Context<Store | null>;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(load);
  const [weathers, setWeathers] = useState<Record<string, Weather>>({});
  const [weatherStatus, setStatus] = useState<Store['weatherStatus']>('loading');
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string>(DISTRICTS[0].id);
  // adres '#yontem' ile bitiyorsa Yöntem sayfası açılır (slayttaki bağlantı için)
  const [lang, setLangState] = useState<Lang>(() => {
    const l = initialLang();
    setGlobalLang(l);
    return l;
  });
  const changeLang = useCallback((l: Lang) => {
    setGlobalLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* saklanamadı */
    }
    setLangState(l);
  }, []);
  useEffect(() => {
    document.title = L('Nöbet: su bütçesi ve ekim planı', 'Nöbet: water budget and crop plan');
  }, [lang]);
  const [tab, setTab] = useState<Tab>(() => (typeof location !== 'undefined' && location.hash === '#yontem' ? 'yontem' : 'genel'));
  const [memberId, setMemberId] = useState<string>(() => p.members[0]?.id ?? '');
  useEffect(() => {
    const onHash = () => location.hash === '#yontem' && setTab('yontem');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* saklanamadı: oturum içinde çalışmaya devam */
    }
  }, [p]);

  const update = useCallback((patch: Partial<Persisted>) => setP((s) => ({ ...s, ...patch })), []);

  // beş ilçenin verisi açılışta yerel dosyalardan okunur
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await Promise.all(
          DISTRICTS.map(async (d) => {
            const w = buildWeather(await loadPreset(d.id));
            if (w.n < 7700) throw new Error(L(`${d.name} verisi eksik (2004-2025 arası bekleniyordu).`, `${d.name} data is incomplete (2004-2025 expected).`));
            return [d.id, { ...w, name: d.name }] as const;
          }),
        );
        if (cancelled) return;
        setWeathers(Object.fromEntries(loaded));
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setWeatherError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { model, modelError } = useMemo(() => {
    if (weatherStatus !== 'ready') return { model: null, modelError: null };
    try {
      return { model: computeModel(weathers, districtId, p), modelError: null };
    } catch (err) {
      return { model: null, modelError: err instanceof Error ? err.message : String(err) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weathers, weatherStatus, districtId, p.members, p.cropDefs, p.soil, p.eff, p.settings]);

  const store: Store = {
    ...p,
    update,
    updateMember: (id, patch) => setP((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
    addMember: () => {
      const id = `u${Date.now().toString(36)}`;
      const d = DISTRICTS.find((x) => x.id === districtId) ?? DISTRICTS[0];
      setP((s) => ({
        ...s,
        members: [
          ...s.members,
          {
            id,
            name: `Üye ${String(s.members.length + 1).padStart(2, '0')}`,
            areaDa: 100,
            quotaMm: 250,
            method: 'yagmurlama',
            current: [{ cropId: 'misir', da: 100 }],
            pointId: d.id,
            lat: +(d.lat + (Math.random() - 0.5) * 0.2).toFixed(4),
            lon: +(d.lon + (Math.random() - 0.5) * 0.26).toFixed(4),
          },
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
      setP(d);
      setMemberId(d.members[0].id);
    },
    weathers,
    districtId,
    setDistrictId,
    weather: weathers[districtId] ?? null,
    weatherStatus,
    weatherError,
    model,
    modelError,
    tab,
    setTab,
    lang,
    setLang: changeLang,
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
