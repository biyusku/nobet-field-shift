import { Sidebar } from './components/Sidebar';
import { Empty } from './components/ui';
import { coopLabel, L } from './i18n';
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
        {s.weatherStatus === 'loading' && !s.weather && <Empty title={L('İklim verisi yükleniyor…', 'Loading climate data…')}>{L('Beş ilçenin 2004-2025 günlük NASA POWER verisi okunuyor.', 'Reading 2004-2025 daily NASA POWER data for five districts.')}</Empty>}
        {s.weatherStatus === 'error' && (
          <Empty title={L('İklim verisi yüklenemedi', 'Climate data could not be loaded')}>
            {s.weatherError}
            <div className="mt-2">{L('İlçe verileri public/data altında olmalı; eksikse "npm run fetch-data" çalıştırın.', 'District data must be under public/data; if missing, run "npm run fetch-data".')}</div>
          </Empty>
        )}
        {s.modelError && <Empty title={L('Hesap yapılamadı', 'Calculation failed')}>{s.modelError} {L('Yöntem sayfasındaki varsayımları kontrol edin ya da başlangıç değerlerine dönün.', 'Check the assumptions on the Method page or return to the default values.')}</Empty>}

        {s.weather && s.model && (
          <div key={s.tab} className="fade-up flex flex-col gap-4">
                        {s.tab === 'uye' && <MemberScreen />}
            {s.tab === 'genel' && <OverviewScreen />}
            {s.tab === 'taahhut' && <CommitmentScreen />}
            {s.tab === 'yontem' && <MethodScreen />}
          </div>
        )}

        <footer className="mt-auto pt-4 text-[11px] text-muted">
          {L(
            `${coopLabel()} ve üyeleri kurgusaldır · Gelir brüttür: tohum, gübre, elektrik düşülmedi · NASA POWER verisi yaklaşık 55 km çözünürlüklüdür: tarlayı değil yöre iklimini gösterir · İklim verisi: NASA Langley Research Center POWER Project · Bu araç tarımsal danışmanlık yerine geçmez.`,
            `${coopLabel()} and its members are fictional · Revenue is gross: seed, fertiliser and electricity are not deducted · NASA POWER data has ~55 km resolution: it shows the local climate, not the field · Climate data: NASA Langley Research Center POWER Project · This tool does not replace agricultural advice.`,
          )}
        </footer>
      </main>
    </div>
  );
}
