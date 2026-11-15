// Plan kuralları: amaç, pay sınırı, küçük pazar eşiği, en az sulama, güvenilmez seçenekler.
import { DEFAULT_MIN_IRRIGATION, DEFAULT_MIN_PARCEL_DA, SMALL_FARM_DA } from '../engine/plan';
import { L } from '../i18n';
import { useStore } from '../state';
import { Card, H2, NumInput, Segmented, Tag } from './ui';

export function PlanSettingsCard() {
  const s = useStore();
  const st = s.settings;
  return (
    <Card>
      <H2 right={<Tag kind="varsayim" />}>{L('Plan kuralları', 'Plan rules')}</H2>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="text-[12px] font-medium text-ink2">
          <div className="mb-1">{L('Planın amacı', 'Plan objective')}</div>
          <Segmented
            label={L('Planın amacı', 'Plan objective')}
            value={st.mode}
            options={[
              { id: 'revenue', label: L('En yüksek brüt gelir', 'Highest gross revenue') },
              { id: 'minWater', label: L('En az su', 'Least water') },
            ]}
            onChange={(mode) => s.updateSettings({ mode })}
          />
          <div className="mt-1 font-normal">{st.mode === 'revenue'
              ? L('Kota içinde kalarak geliri en yükseğe çıkarır.', 'Maximises revenue while staying within the water allowance.')
              : L('Taahhüdü karşılayan en az suyu bulur, sonra o suyla geliri artırır.', 'Finds the least water that meets the commitment, then raises revenue with that water.')}</div>
        </div>
        <label className="block text-[12px] font-medium text-ink2">
          {L('Bir ürünün üyedeki en yüksek payı', "Highest share of one crop on a member's field")}
          <NumInput className="mt-1 w-full" label={L('Ürün payı sınırı (yüzde)', 'Crop share limit (percent)')} value={st.maxShare * 100} min={5} max={100} decimals={1} suffix="%" onChange={(v) => s.updateSettings({ maxShare: v / 100 })} />
          <span className="mt-1 block font-normal">{L('%33,3 ve altı üç yıllık nöbeti mümkün kılar.', '33.3% or less makes a three-year rotation possible.')}</span>
        </label>
        <div className="text-[12px] font-medium text-ink2">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={st.smallMarketCap !== null} onChange={(e) => s.updateSettings({ smallMarketCap: e.target.checked ? 0.25 : null })} />
            {L('Küçük pazarlı ürün eşiği', 'Small-market crop limit')}
          </label>
          {st.smallMarketCap !== null && (
            <NumInput className="mt-1 w-full" label={L('Küçük pazarlı ürün eşiği (yüzde)', 'Small-market crop limit (percent)')} value={st.smallMarketCap * 100} min={0} max={100} decimals={0} suffix="%" onChange={(v) => s.updateSettings({ smallMarketCap: v / 100 })} />
          )}
          <span className="mt-1 block font-normal">
            {L('Nohut, ayçiçeği ve kırmızı mercimeğin her biri kooperatif alanının bu payını geçemez.', "Chickpea, sunflower and red lentil may each take at most this share of the cooperative's area.")}
          </span>
        </div>
        <label className="block text-[12px] font-medium text-ink2">
          {L('En küçük parsel', 'Minimum plot size')}
          <NumInput className="mt-1 w-full" label={L('En küçük parsel (dekar)', 'Minimum plot size (decares)')} value={st.minParcelDa ?? DEFAULT_MIN_PARCEL_DA} min={0} max={200} decimals={0} suffix="da" onChange={(v) => s.updateSettings({ minParcelDa: v })} />
          <span className="mt-1 block font-normal">
            {L(
              `Bir üyede bir ürün ya en az bu kadar ekilir ya hiç ekilmez. Tarlası ${SMALL_FARM_DA} dekardan küçük üyelerde yarısı uygulanır. 0 = kural yok.`,
              `On a member's field a crop is planted on at least this much or not at all. Half applies to members with fields under ${SMALL_FARM_DA} decares. 0 = no rule.`,
            )}
          </span>
        </label>
        <label className="block text-[12px] font-medium text-ink2">
          {L('Sulanan ürüne verilecek en az su', 'Minimum water for an irrigated crop')}
          <NumInput className="mt-1 w-full" label={L('Sulanan ürüne en az su (tam ihtiyacın yüzdesi)', 'Minimum water for an irrigated crop (percent of full need)')} value={(st.minIrrigationFraction ?? DEFAULT_MIN_IRRIGATION) * 100} min={0} max={100} decimals={0} suffix="%" onChange={(v) => s.updateSettings({ minIrrigationFraction: v / 100 })} />
          <span className="mt-1 block font-normal">
            {L(
              'Tam su ihtiyacının yüzdesi. Altında kalan kısıntılı sulama plana girmez: ürün ya yeterince sulanır, ya yağmura bırakılır, ya ekilmez.',
              'Percent of the full water need. Deficit irrigation below this is not planned: a crop is either irrigated enough, left to rainfall, or not planted.',
            )}
          </span>
        </label>
        <div className="text-[12px] font-medium text-ink2">
          <label className="flex cursor-pointer items-start gap-2">
            <input className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" type="checkbox" checked={st.includeUnreliable} onChange={(e) => s.updateSettings({ includeUnreliable: e.target.checked })} />
            <span>{L("Verim düzeyi %35'in altında kalan seçenekleri de kat", 'Also include options with a yield level below 35%')}</span>
          </label>
          <span className="mt-1 block font-normal">{L('Varsayılan olarak dışarıda: model bu kadar az suda güvenilir değil.', 'Excluded by default: the model is not reliable with this little water.')}</span>
          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" type="checkbox" checked={!!st.includeOptIn} onChange={(e) => s.updateSettings({ includeOptIn: e.target.checked })} />
            <span>{L('Kırmızı mercimeği dahil et', 'Include red lentil')}</span>
          </label>
          <span className="mt-1 block font-normal">
            {L("Varsayılan olarak dışarıda: verimi, fiyatı ve Konya'da yetişip yetişmediği doğrulanmadı.", 'Excluded by default: its yield, price and whether it grows in Konya have not been verified.')}
          </span>
        </div>
      </div>
    </Card>
  );
}
