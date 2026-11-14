import { lazy, Suspense, useEffect, useState } from 'react';
import { Empty, Tag } from './components/ui';
import { COOP_NAME, PRESET_POINTS } from './data/defaults';
import { CommitmentScreen } from './screens/CommitmentScreen';
import { CoopScreen } from './screens/CoopScreen';
import { MemberScreen } from './screens/MemberScreen';
import { MethodScreen } from './screens/MethodScreen';
import { useStore, type Tab } from './state';

const MapModal = lazy(() => import('./components/MapModal'));

const TABS: { id: Tab; label: string }[] = [
  { id: 'uye', label: 'Üye' },
  { id: 'kooperatif', label: 'Kooperatif' },
  { id: 'taahhut', label: 'Taahhüt' },
  { id: 'yontem', label: 'Yöntem ve kaynaklar' },
];

function ThemeToggle() {
  // Kullanıcı düğmeye basana kadar işletim sisteminin temasını izle; basınca seçimi sakla.
  const osDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = document.documentElement.dataset.theme;
    return t === 'dark' || t === 'light' ? t : osDark() ? 'dark' : 'light';
  });
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => {
      if (!document.documentElement.dataset.theme) setTheme(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('nobet-theme', next);
    } catch {
      /* saklanamadı */
    }
    setTheme(next);
  };
  return (
    <button type="button" className="btn" onClick={toggle} aria-label="Açık ve koyu tema arasında geç">
      {theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
    </button>
  );
}

function PointPicker() {
  const s = useStore();
  const [mapOpen, setMapOpen] = useState(false);
  const value = s.point.kind === 'preset' ? s.point.id : 'custom';
  const center = s.weather ? { lat: s.weather.lat, lon: s.weather.lon } : { lat: PRESET_POINTS[0].lat, lon: PRESET_POINTS[0].lon };
  return (
    <>
      <label className="flex items-center gap-2 text-[13px] text-ink2">
        <span className="hidden sm:inline">Nokta</span>
        <select
          className="field !w-auto max-w-[230px]"
          aria-label="İklim verisi noktası"
          value={value}
          onChange={(e) => {
            if (e.target.value === 'map') setMapOpen(true);
            else if (e.target.value !== 'custom') s.selectPoint({ kind: 'preset', id: e.target.value });
          }}
        >
          {PRESET_POINTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {s.point.kind === 'custom' && (
            <option value="custom">
              Seçilen nokta ({s.point.lat.toFixed(2)}°K, {s.point.lon.toFixed(2)}°D)
            </option>
          )}
          <option value="map">Haritadan seç…</option>
        </select>
      </label>
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

export default function App() {
  const s = useStore();
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="mr-auto min-w-0">
            <div className="text-[19px] font-bold leading-tight tracking-tight">Nöbet</div>
            <div className="truncate text-[12px] text-ink2">Su bütçesi ve ekim planı · prototip</div>
          </div>
          <PointPicker />
          <ThemeToggle />
        </div>
        <nav className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-4" aria-label="Ekranlar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                s.setTab(t.id);
                window.scrollTo({ top: 0 });
              }}
              aria-current={s.tab === t.id ? 'page' : undefined}
              className={`cursor-pointer whitespace-nowrap border-0 border-b-[3px] bg-transparent px-3 py-2 text-[14px] ${
                s.tab === t.id ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink2 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-sunken px-3 py-2 text-[12.5px] text-ink2">
          <span>
            <Tag kind="kurgusal" /> {COOP_NAME} ve üyeleri gerçek değildir.
          </span>
          <span>Gelir brüttür: tohum, gübre, elektrik düşülmedi.</span>
          <span>NASA POWER verisi yaklaşık 55 km çözünürlüklüdür: tarlayı değil yöre iklimini gösterir.</span>
          {s.weather && <span>İklim noktası: {s.weather.name}.</span>}
        </div>

        {s.notice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-crit bg-surface px-3 py-2 text-[13.5px]" role="alert">
            <span>
              <strong className="text-crit-ink">Seçilen nokta yüklenemedi.</strong> {s.notice}
            </span>
            <button type="button" className="btn" onClick={s.dismissNotice}>
              Kapat
            </button>
          </div>
        )}

        {s.weatherStatus === 'loading' && !s.weather && <Empty title="İklim verisi yükleniyor…">2004-2025 günlük NASA POWER verisi okunuyor.</Empty>}
        {s.weatherStatus === 'error' && (
          <Empty title="İklim verisi yüklenemedi">
            {s.weatherError}
            <div className="mt-3 flex justify-center gap-2">
              {PRESET_POINTS.map((p) => (
                <button key={p.id} type="button" className="btn" onClick={() => s.selectPoint({ kind: 'preset', id: p.id })}>
                  {p.name} ile dene
                </button>
              ))}
            </div>
          </Empty>
        )}
        {s.modelError && <Empty title="Hesap yapılamadı">{s.modelError} Yöntem sayfasındaki varsayımları kontrol edin ya da başlangıç değerlerine dönün.</Empty>}

        {s.weather && s.model && (
          <div className={s.weatherStatus === 'loading' ? 'pointer-events-none opacity-50' : ''} aria-busy={s.weatherStatus === 'loading'}>
            {s.weatherStatus === 'loading' && <div className="mb-3 text-[13.5px] font-semibold">Yeni nokta için NASA POWER verisi indiriliyor… (5-30 saniye sürebilir)</div>}
            {s.tab === 'uye' && <MemberScreen />}
            {s.tab === 'kooperatif' && <CoopScreen />}
            {s.tab === 'taahhut' && <CommitmentScreen />}
            {s.tab === 'yontem' && <MethodScreen />}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1240px] px-4 pb-8 pt-2 text-[12px] text-muted">
        Nöbet · NASA Space Apps Challenge 2026, "Field Shift: Adapting Farms with NASA Data" için prototip. İklim verisi: NASA Langley Research Center POWER Project. Harita: OpenStreetMap katkıcıları. Bu
        araç tarımsal danışmanlık yerine geçmez.
      </footer>
    </div>
  );
}
