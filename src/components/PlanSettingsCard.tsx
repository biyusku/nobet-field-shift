// Plan kuralları: amaç, pay sınırı, küçük pazar eşiği, en az sulama, güvenilmez seçenekler.
import { DEFAULT_MIN_IRRIGATION } from '../engine/plan';
import { useStore } from '../state';
import { Card, H2, NumInput, Segmented, Tag } from './ui';

export function PlanSettingsCard() {
  const s = useStore();
  const st = s.settings;
  return (
    <Card>
      <H2 right={<Tag kind="varsayim" />}>Plan kuralları</H2>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="text-[12px] font-medium text-ink2">
          <div className="mb-1">Planın amacı</div>
          <Segmented
            label="Planın amacı"
            value={st.mode}
            options={[
              { id: 'revenue', label: 'En yüksek brüt gelir' },
              { id: 'minWater', label: 'En az su' },
            ]}
            onChange={(mode) => s.updateSettings({ mode })}
          />
          <div className="mt-1 font-normal">{st.mode === 'revenue' ? 'Kota içinde kalarak geliri en yükseğe çıkarır.' : 'Taahhüdü karşılayan en az suyu bulur, sonra o suyla geliri artırır.'}</div>
        </div>
        <label className="block text-[12px] font-medium text-ink2">
          Bir ürünün üyedeki en yüksek payı
          <NumInput className="mt-1 w-full" label="Ürün payı sınırı (yüzde)" value={st.maxShare * 100} min={5} max={100} decimals={1} suffix="%" onChange={(v) => s.updateSettings({ maxShare: v / 100 })} />
          <span className="mt-1 block font-normal">%33,3 ve altı üç yıllık nöbeti mümkün kılar.</span>
        </label>
        <div className="text-[12px] font-medium text-ink2">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={st.smallMarketCap !== null} onChange={(e) => s.updateSettings({ smallMarketCap: e.target.checked ? 0.25 : null })} />
            Küçük pazarlı ürün eşiği
          </label>
          {st.smallMarketCap !== null && (
            <NumInput className="mt-1 w-full" label="Küçük pazarlı ürün eşiği (yüzde)" value={st.smallMarketCap * 100} min={0} max={100} decimals={0} suffix="%" onChange={(v) => s.updateSettings({ smallMarketCap: v / 100 })} />
          )}
          <span className="mt-1 block font-normal">Nohut ve ayçiçeğinin her biri kooperatif alanının bu payını geçemez.</span>
        </div>
        <label className="block text-[12px] font-medium text-ink2">
          Sulanan ürüne verilecek en az su
          <NumInput className="mt-1 w-full" label="Sulanan ürüne en az su (tam ihtiyacın yüzdesi)" value={(st.minIrrigationFraction ?? DEFAULT_MIN_IRRIGATION) * 100} min={0} max={100} decimals={0} suffix="%" onChange={(v) => s.updateSettings({ minIrrigationFraction: v / 100 })} />
          <span className="mt-1 block font-normal">Tam su ihtiyacının yüzdesi. Altında kalan kısıntılı sulama plana girmez: ürün ya yeterince sulanır, ya yağmura bırakılır, ya ekilmez.</span>
        </label>
        <div className="text-[12px] font-medium text-ink2">
          <label className="flex cursor-pointer items-start gap-2">
            <input className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" type="checkbox" checked={st.includeUnreliable} onChange={(e) => s.updateSettings({ includeUnreliable: e.target.checked })} />
            <span>Verim düzeyi %35'in altında kalan seçenekleri de kat</span>
          </label>
          <span className="mt-1 block font-normal">Varsayılan olarak dışarıda: model bu kadar az suda güvenilir değil.</span>
        </div>
      </div>
    </Card>
  );
}
