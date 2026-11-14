import { Sidebar } from './components/Sidebar';
import { Empty, Note } from './components/ui';
import { COOP_NAME, PRESET_POINTS } from './data/defaults';
import { CommitmentScreen } from './screens/CommitmentScreen';
import { CoopScreen } from './screens/CoopScreen';
import { MemberScreen } from './screens/MemberScreen';
import { MethodScreen } from './screens/MethodScreen';
import { useStore } from './state';

export default function App() {
  const s = useStore();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-3 pb-12 pt-3 md:px-5">
        {s.notice && (
          <div className="banner banner-critical" role="alert">
            <div className="min-w-0 flex-1">
              <strong>Seçilen nokta yüklenemedi.</strong> {s.notice}
            </div>
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
          <div key={s.tab} className={`fade-up flex flex-col gap-4 ${s.weatherStatus === 'loading' ? 'pointer-events-none opacity-50' : ''}`} aria-busy={s.weatherStatus === 'loading'}>
            {s.weatherStatus === 'loading' && <Note tone="info">Yeni nokta için NASA POWER verisi indiriliyor… (5-30 saniye sürebilir)</Note>}
            {s.tab === 'uye' && <MemberScreen />}
            {s.tab === 'kooperatif' && <CoopScreen />}
            {s.tab === 'taahhut' && <CommitmentScreen />}
            {s.tab === 'yontem' && <MethodScreen />}
          </div>
        )}

        <footer className="mt-auto pt-4 text-[11px] text-muted">
          {COOP_NAME} ve üyeleri kurgusaldır · Gelir brüttür: tohum, gübre, elektrik düşülmedi · NASA POWER verisi yaklaşık 55 km çözünürlüklüdür: tarlayı değil yöre iklimini gösterir · İklim verisi:
          NASA Langley Research Center POWER Project · Bu araç tarımsal danışmanlık yerine geçmez.
        </footer>
      </main>
    </div>
  );
}
