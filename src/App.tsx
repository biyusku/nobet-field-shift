import { Sidebar } from './components/Sidebar';
import { Empty } from './components/ui';
import { COOP_NAME } from './data/defaults';
import { CommitmentScreen } from './screens/CommitmentScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { MemberScreen } from './screens/MemberScreen';
import { MethodScreen } from './screens/MethodScreen';
import { useStore } from './state';

export default function App() {
  const s = useStore();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-3 pb-12 pt-3 md:px-5">
        {s.weatherStatus === 'loading' && !s.weather && <Empty title="İklim verisi yükleniyor…">Beş ilçenin 2004-2025 günlük NASA POWER verisi okunuyor.</Empty>}
        {s.weatherStatus === 'error' && (
          <Empty title="İklim verisi yüklenemedi">
            {s.weatherError}
            <div className="mt-2">İlçe verileri public/data altında olmalı; eksikse "npm run fetch-data" çalıştırın.</div>
          </Empty>
        )}
        {s.modelError && <Empty title="Hesap yapılamadı">{s.modelError} Yöntem sayfasındaki varsayımları kontrol edin ya da başlangıç değerlerine dönün.</Empty>}

        {s.weather && s.model && (
          <div key={s.tab} className="fade-up flex flex-col gap-4">
                        {s.tab === 'uye' && <MemberScreen />}
            {s.tab === 'genel' && <OverviewScreen />}
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
