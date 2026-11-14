// Daraltılabilir koyu kenar menü. Telefonda ikon şeridi olarak başlar; açılınca sayfanın üstüne biner.
import { BookOpen, Droplets, Handshake, type LucideIcon, MapPin, Moon, PanelLeftClose, PanelLeftOpen, Satellite, Sprout, Sun, Users } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { PRESET_POINTS } from '../data/defaults';
import { useStore, type Tab } from '../state';
import { Select } from './kit';

const MapModal = lazy(() => import('./MapModal'));

const NAV: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'uye', label: 'Üye', icon: Sprout },
  { id: 'kooperatif', label: 'Kooperatif', icon: Users },
  { id: 'taahhut', label: 'Taahhüt', icon: Handshake },
];
const METHOD = { id: 'yontem' as Tab, label: 'Yöntem ve kaynaklar', icon: BookOpen };
const NARROW = '(max-width: 860px)';
const KEY = 'nobet-menu-dar';

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const q = window.matchMedia(NARROW);
    const on = () => setNarrow(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return narrow;
}

function useTheme(): ['light' | 'dark', () => void] {
  const osDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = document.documentElement.dataset.theme;
    return t === 'dark' || t === 'light' ? t : osDark() ? 'dark' : 'light';
  });
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = () => {
      if (!document.documentElement.dataset.theme) setTheme(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return [
    theme,
    () => {
      const next = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('nobet-theme', next);
      } catch {
        /* saklanamadı */
      }
      setTheme(next);
    },
  ];
}

export function Sidebar() {
  const s = useStore();
  const narrow = useIsNarrow();
  const [collapsed, setCollapsed] = useState(() => {
    if (window.matchMedia(NARROW).matches) return true;
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mapOpen, setMapOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const rail = narrow ? 52 : 64;
  const overlay = narrow && !collapsed;

  useEffect(() => {
    if (narrow) setCollapsed(true);
  }, [narrow]);
  useEffect(() => {
    if (narrow) return;
    try {
      localStorage.setItem(KEY, collapsed ? '1' : '0');
    } catch {
      /* saklanamadı */
    }
  }, [collapsed, narrow]);
  useEffect(() => {
    if (!overlay) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && setCollapsed(true);
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [overlay]);

  const go = (tab: Tab) => {
    if (narrow) setCollapsed(true);
    s.setTab(tab);
    window.scrollTo({ top: 0 });
  };
  const item = (n: (typeof NAV)[number]) => {
    const Icon = n.icon;
    const active = s.tab === n.id;
    return (
      <button
        key={n.id}
        type="button"
        onClick={() => go(n.id)}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? n.label : undefined}
        title={collapsed ? n.label : undefined}
        className={`side-item ${active ? 'is-active' : ''} ${collapsed ? 'is-collapsed' : ''}`}
      >
        <Icon size={16} className="shrink-0" aria-hidden />
        {!collapsed && <span className="flex-1 text-left">{n.label}</span>}
      </button>
    );
  };

  const status = s.weatherStatus === 'loading' ? 'Yükleniyor…' : s.weatherStatus === 'error' ? 'Hata' : 'Hazır';
  const dot = s.weatherStatus === 'loading' ? '#f5b93a' : s.weatherStatus === 'error' ? '#e5534b' : '#36b37e';
  const pointValue = s.point.kind === 'preset' ? s.point.id : 'custom';
  const center = s.weather ? { lat: s.weather.lat, lon: s.weather.lon } : { lat: PRESET_POINTS[0].lat, lon: PRESET_POINTS[0].lon };

  return (
    <>
      {narrow && <div aria-hidden className="shrink-0" style={{ width: rail }} />}
      {overlay && <button type="button" aria-label="Menüyü kapat" onClick={() => setCollapsed(true)} className="fixed inset-0 z-40 cursor-default border-0 bg-black/40" />}
      <aside
        aria-label="Ana menü"
        style={{ width: collapsed ? rail : 228, transition: 'width .25s cubic-bezier(.16,1,.3,1)' }}
        className={`no-print top-0 flex shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-sidebar text-[#ededed] ${
          narrow ? 'fixed left-0 z-50 h-dvh' : 'sticky h-screen'
        } ${overlay ? 'shadow-2xl shadow-black/40' : ''}`}
      >
        <div className={`flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] ${collapsed ? 'px-0' : 'px-4'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <Droplets size={17} className="text-[#35b0ec]" aria-hidden />
              <span className="text-[15px] font-semibold tracking-tight text-white">Nöbet</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Menüyü aç' : 'Menüyü kapat'}
            aria-expanded={!collapsed}
            className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/45 transition-colors hover:border-white/15 hover:text-white/80 ${collapsed ? 'mx-auto' : ''}`}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-3">
          {NAV.map(item)}
          {collapsed ? (
            <div aria-hidden className="mx-auto my-3 h-px w-6 bg-white/[0.08]" />
          ) : (
            <div className="mb-1 mt-5 whitespace-nowrap px-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/35">Veri kaynağı</div>
          )}
          <div
            className={`flex h-9 items-center text-[13px] font-medium text-white/75 ${collapsed ? 'justify-center' : 'gap-2.5 px-2.5'}`}
            title={collapsed ? `NASA POWER: ${status}` : (s.weatherError ?? undefined)}
          >
            <span className="relative shrink-0">
              <Satellite size={16} aria-hidden className={s.weatherStatus === 'loading' ? 'animate-pulse' : ''} />
              <span aria-hidden className="absolute -right-1 -top-1 size-2 rounded-full ring-2 ring-sidebar" style={{ background: dot }} />
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 whitespace-nowrap">NASA POWER</span>
                <span className="whitespace-nowrap text-[11px] text-white/35">{status}</span>
              </>
            )}
          </div>
          {collapsed ? (
            <button type="button" className="side-item is-collapsed" title={`Nokta: ${s.weather?.name ?? ''}`} aria-label="İklim noktasını değiştir" onClick={() => setCollapsed(false)}>
              <MapPin size={16} aria-hidden />
            </button>
          ) : (
            <Select
              variant="dark"
              className="mt-1"
              label="İklim verisi noktası"
              icon={<MapPin size={15} className="shrink-0 text-white/55" aria-hidden />}
              value={pointValue}
              onChange={(v) => {
                if (v === 'map') setMapOpen(true);
                else if (v !== 'custom') s.selectPoint({ kind: 'preset', id: v });
              }}
              options={[
                ...PRESET_POINTS.map((p) => ({ value: p.id, label: p.name })),
                ...(s.point.kind === 'custom' ? [{ value: 'custom', label: `Seçilen nokta (${s.point.lat.toFixed(2)}°K, ${s.point.lon.toFixed(2)}°D)` }] : []),
                { value: 'map', label: 'Haritadan seç…' },
              ]}
            />
          )}
          {!collapsed && s.weather && (
            <div className="tnum mt-1.5 whitespace-nowrap px-2.5 text-[11px] text-white/35">
              {s.weather.lat.toFixed(2)}°K {s.weather.lon.toFixed(2)}°D · {Math.round(s.weather.elevation)} m · ~55 km
            </div>
          )}
        </nav>

        <div className="space-y-0.5 border-t border-white/[0.06] px-2 py-3">
          {item(METHOD)}
          <button type="button" onClick={toggleTheme} className={`side-item ${collapsed ? 'is-collapsed' : ''}`} aria-label="Açık ve koyu tema arasında geç" title={collapsed ? 'Tema' : undefined}>
            {theme === 'dark' ? <Sun size={16} className="shrink-0" aria-hidden /> : <Moon size={16} className="shrink-0" aria-hidden />}
            {!collapsed && <span className="flex-1 text-left">{theme === 'dark' ? 'Açık tema' : 'Koyu tema'}</span>}
          </button>
        </div>
      </aside>
      {mapOpen && (
        <Suspense fallback={null}>
          <MapModal
            initial={center}
            onClose={() => setMapOpen(false)}
            onPick={(lat, lon) => {
              setMapOpen(false);
              s.selectPoint({ kind: 'custom', lat, lon });
            }}
          />
        </Suspense>
      )}
    </>
  );
}
