// Daraltılabilir koyu kenar menü. Telefonda ikon şeridi olarak başlar; açılınca sayfanın üstüne biner.
import { BookOpen, Droplets, Handshake, Languages, LayoutDashboard, type LucideIcon, MapPin, Moon, PanelLeftClose, PanelLeftOpen, Satellite, Sun, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DISTRICTS } from '../data/members';
import { L } from '../i18n';
import { useStore, type Tab } from '../state';
import { Select } from './kit';

const NAV: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'genel', get label() { return L('Pano', 'Dashboard'); }, icon: LayoutDashboard },
  { id: 'uye', get label() { return L('Üyeler', 'Members'); }, icon: Users },
  { id: 'taahhut', get label() { return L('Taahhüt', 'Commitment'); }, icon: Handshake },
];
const METHOD = { id: 'yontem' as Tab, get label() { return L('Yöntem ve kaynaklar', 'Method and sources'); }, icon: BookOpen };
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

  const status = s.weatherStatus === 'loading' ? L('Yükleniyor…', 'Loading…') : s.weatherStatus === 'error' ? L('Hata', 'Error') : L('Hazır', 'Ready');
  const dot = s.weatherStatus === 'loading' ? '#f5b93a' : s.weatherStatus === 'error' ? '#e5534b' : '#36b37e';
  return (
    <>
      {narrow && <div aria-hidden className="shrink-0" style={{ width: rail }} />}
      {overlay && <button type="button" aria-label={L('Menüyü kapat', 'Close menu')} onClick={() => setCollapsed(true)} className="fixed inset-0 z-40 cursor-default border-0 bg-black/40" />}
      <aside
        aria-label={L('Ana menü', 'Main menu')}
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
            aria-label={collapsed ? L('Menüyü aç', 'Open menu') : L('Menüyü kapat', 'Close menu')}
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
            <div className="mb-1 mt-5 whitespace-nowrap px-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/35">{L('Veri kaynağı · 5 ilçe', 'Data source · 5 districts')}</div>
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
            <button type="button" className="side-item is-collapsed" title={`${L('İlçe', 'District')}: ${s.weather?.name ?? ''}`} aria-label={L('Seçili ilçeyi değiştir', 'Change selected district')} onClick={() => setCollapsed(false)}>
              <MapPin size={16} aria-hidden />
            </button>
          ) : (
            <Select
              variant="dark"
              className="mt-1"
              label={L('Seçili ilçe', 'Selected district')}
              icon={<MapPin size={15} className="shrink-0 text-white/55" aria-hidden />}
              value={s.districtId}
              onChange={(v) => s.setDistrictId(v)}
              options={DISTRICTS.map((d) => ({ value: d.id, label: d.name }))}
            />
          )}
          {!collapsed && s.weather && (
            <div className="tnum mt-1.5 whitespace-nowrap px-2.5 text-[11px] text-white/35">
              {s.weather.lat.toFixed(2)}°{L('K', 'N')} {s.weather.lon.toFixed(2)}°{L('D', 'E')} · {Math.round(s.weather.elevation)} m · ~55 km
            </div>
          )}
        </nav>

        <div className="space-y-0.5 border-t border-white/[0.06] px-2 py-3">
          {item(METHOD)}
          <button type="button" onClick={toggleTheme} className={`side-item ${collapsed ? 'is-collapsed' : ''}`} aria-label={L('Açık ve koyu tema arasında geç', 'Switch between light and dark theme')} title={collapsed ? L('Tema', 'Theme') : undefined}>
            {theme === 'dark' ? <Sun size={16} className="shrink-0" aria-hidden /> : <Moon size={16} className="shrink-0" aria-hidden />}
            {!collapsed && <span className="flex-1 text-left">{theme === 'dark' ? L('Açık tema', 'Light theme') : L('Koyu tema', 'Dark theme')}</span>}
          </button>
          <button
            type="button"
            onClick={() => s.setLang(s.lang === 'en' ? 'tr' : 'en')}
            className={`side-item ${collapsed ? 'is-collapsed' : ''}`}
            aria-label={s.lang === 'en' ? 'Türkçeye geç' : 'Switch to English'}
            title={collapsed ? (s.lang === 'en' ? 'Türkçe' : 'English') : undefined}
            lang={s.lang === 'en' ? 'tr' : 'en'}
          >
            <Languages size={16} className="shrink-0" aria-hidden />
            {!collapsed && <span className="flex-1 text-left">{s.lang === 'en' ? 'Türkçe' : 'English'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
