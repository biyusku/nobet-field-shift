// Kooperatif ekranı: "Toplam su nereye gidiyor, hangi üyeler riskte, plan neyi değiştiriyor?"
import { ArrowRight, Pencil, Plus, RotateCcw, Users } from 'lucide-react';
import { useState } from 'react';
import { cropName, CropBar, HonestyBanner } from '../components/bits';
import { Confirm } from '../components/kit';
import { MemberEditor } from '../components/MemberEditor';
import { Bars, Card, H2, Kpi, Meter, Note, NumInput, PageHeader, Segmented, Swatch, Tag } from '../components/ui';
import { COOP_NAME, METHOD_LABEL } from '../data/defaults';
import { FALLOW } from '../engine/types';
import { dateOfIndex } from '../engine/weather';
import { da, dec1, fmtDayMonth, inSuffix, int, m3, pct, tlShort, ton } from '../lib/format';
import { useStore } from '../state';

export function PlanSettingsCard() {
  const s = useStore();
  const st = s.settings;
  return (
    <Card>
      <H2 right={<Tag kind="varsayim" />}>Plan kuralları</H2>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
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

export function CoopScreen() {
  const s = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const { model, weather } = s;
  if (!model || !weather) return null;
  const names = new Map(model.crops.map((c) => [c.id, c.name]));
  const ids = [...model.crops.map((c) => c.id), FALLOW].filter((id) => (model.current.areaByCrop[id] ?? 0) >= 0.05 || (model.planSummary.areaByCrop[id] ?? 0) >= 0.05);
  const ps = model.planSummary;
  const cur = model.current;
  const quota = model.totalQuotaM3;

  const exceeded = model.members.filter((mv) => mv.current.yearsExceeded > 0);
  const earliest = exceeded
    .map((mv) => {
      const y = mv.current.years[mv.current.medianIndex];
      return { mv, d: dateOfIndex(weather, y.start + (y.endDay ?? 0)) };
    })
    .sort((a, b) => a.d.getUTCMonth() * 100 + a.d.getUTCDate() - (b.d.getUTCMonth() * 100 + b.d.getUTCDate()))[0];

  // fiyat riski: önerilen planda gelirin ürünlere dağılımı
  const revBy = model.crops
    .map((c) => ({ c, rev: (ps.productionT[c.id] ?? 0) * c.priceTlTon }))
    .filter((x) => x.rev > 0)
    .sort((a, b) => b.rev - a.rev);
  const top = revBy[0];
  const topShare = top && ps.revenue > 0 ? top.rev / ps.revenue : 0;
  const smallArea = model.crops.filter((c) => c.smallMarket).reduce((x, c) => x + (ps.areaByCrop[c.id] ?? 0), 0);
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        icon={Users}
        title="Kooperatif"
        meta={
          <>
            {COOP_NAME} <Tag kind="kurgusal" />
          </>
        }
      >
        <Confirm
          trigger={
            <button type="button" className="btn">
              <RotateCcw /> Kurgusal örneğe dön
            </button>
          }
          title="Kurgusal örneğe dönülsün mü?"
          description="Üyeler, taahhüt, plan kuralları ve bütün varsayımlar başlangıç değerlerine döner. Yaptığınız değişiklikler silinir."
          action="Başlangıca dön"
          danger
          onConfirm={s.reset}
        />
        <button type="button" className="btn btn-primary" onClick={() => setEditing(s.addMember())}>
          <Plus /> Üye ekle
        </button>
      </PageHeader>
      <HonestyBanner />

      <div className="kpi-grid">
        <Kpi label="Toplam kota" tag="kurgusal" value={m3(quota)} hint={`${int(model.members.length)} üye · ${int(model.totalAreaDa)} da`} />
        <Kpi
          label="Bugünkü ekimin su ihtiyacı"
          tag="hesap"
          tone={cur.demandM3 > quota * 1.0001 ? 'crit' : undefined}
          value={m3(cur.demandM3)}
          hint={quota > 0 ? (cur.demandM3 > quota ? `Kotanın ${dec1(cur.demandM3 / quota)} katı · tam sulama, 20 yıl ort.` : `Kotanın ${pct(cur.demandM3 / quota)}'i · tam sulama, 20 yıl ort.`) : undefined}
        />
        <Kpi
          label="Kotası biten üye"
          tag="hesap"
          tone={exceeded.length > 0 ? 'crit' : 'good'}
          value={
            <>
              {exceeded.length}
              <span className="text-[12px] font-normal text-ink2"> / {model.members.length}</span>
            </>
          }
          hint={earliest ? `En erken ${fmtDayMonth(earliest.d)} · ${earliest.mv.member.name}` : 'Bugünkü ekimde kimsenin kotası bitmiyor'}
        />
        <Kpi label="Önerilen planda ayrılan su" tag="hesap" value={m3(ps.reservedM3)} hint={`Kotanın ${pct(quota > 0 ? ps.reservedM3 / quota : 0)}'i · ortalama kullanım ${m3(ps.meanUsedM3)}`} />
      </div>

      <Card>
        <H2 right={<span className="text-[12px] text-ink2">Bugünkü ekime göre</span>}>Üyeler</H2>
        {model.members.length === 0 ? (
          <div className="rounded-lg bg-sunken px-3 py-6 text-center text-ink2">Üye yok. "Üye ekle" ile başlayın.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data min-w-[820px]">
              <thead>
                <tr>
                  <th>Üye</th>
                  <th className="num">Tarla</th>
                  <th className="num">Kota</th>
                  <th>Bugünkü ekim</th>
                  <th>
                    Su ihtiyacı / kota
                    <Tag kind="hesap" compact />
                  </th>
                  <th>
                    Su bitiş (ortanca)
                    <Tag kind="hesap" compact />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {model.members.map((mv) => {
                  const m = mv.member;
                  const med = mv.current.years[mv.current.medianIndex];
                  const ratio = mv.quotaM3 > 0 ? mv.currentWater.demandM3 / mv.quotaM3 : 0;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="font-semibold text-ink">{m.name}</div>
                        <div className="text-[11px] text-ink2">
                          {METHOD_LABEL[m.method]} · randıman {pct(s.eff[m.method])}
                        </div>
                      </td>
                      <td className="num">{da(m.areaDa)} da</td>
                      <td className="num">
                        {int(m.quotaMm)} mm
                        <div className="text-[11px] text-ink2">{m3(mv.quotaM3)}</div>
                      </td>
                      <td>
                        {mv.currentParcels.length === 0 ? (
                          <span className="text-ink2">girilmedi</span>
                        ) : (
                          <div className="flex max-w-[260px] flex-wrap gap-x-3 gap-y-0.5">
                            {mv.currentParcels.map((p, k) => (
                              <span key={k} className="whitespace-nowrap">
                                <Swatch id={p.crop.id} />
                                {p.crop.name} <span className="text-ink2">{da(p.areaDa)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {mv.currentAreaDa > m.areaDa + 0.05 && <div className="font-semibold text-crit-ink">ekim tarladan büyük</div>}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Meter value={mv.currentWater.demandM3} limit={mv.quotaM3} label={`İhtiyaç kotanın ${dec1(ratio)} katı`} />
                          <span className={`tnum whitespace-nowrap ${ratio > 1 ? 'font-semibold text-crit-ink' : 'text-ink2'}`}>{ratio > 1 ? `${dec1(ratio)} kat` : pct(ratio)}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {mv.current.yearsExceeded > 0 && med?.endDay != null ? (
                          <>
                            <span className="font-semibold text-crit-ink">{fmtDayMonth(dateOfIndex(weather, med.start + med.endDay))}</span>
                            <div className="text-[11px] text-ink2">20 yılın {mv.current.yearsExceeded}{inSuffix(mv.current.yearsExceeded)} bitiyor</div>
                          </>
                        ) : (
                          <span className="tag tag-success">kota yetiyor</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button type="button" className="icon-button !text-ink2 align-middle" aria-label={`${m.name}: düzenle`} title="Düzenle" onClick={() => setEditing(m.id)}>
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn ml-1 align-middle"
                          onClick={() => {
                            s.setMemberId(m.id);
                            s.setTab('uye');
                            window.scrollTo({ top: 0 });
                          }}
                        >
                          Su bütçesi <ArrowRight />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {model.members.length > 0 && (
        <>
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <Card>
              <H2 right={<Tag kind="hesap" />}>Kooperatifin su bütçesi</H2>
              <Bars
                unit={m3}
                rows={[
                  { label: 'Toplam kota', value: quota, color: 'var(--crit)' },
                  { label: 'Bugünkü ekim: tam sulama ihtiyacı', value: cur.demandM3, color: 'var(--axis)', note: quota > 0 && cur.demandM3 > quota ? `kotanın ${dec1(cur.demandM3 / quota)} katı` : undefined },
                  { label: 'Bugünkü ekim: kotayla yapılabilen sulama', value: cur.meanUsedM3, color: 'var(--water)', note: cur.demandM3 > 0 ? `ihtiyacın ${pct(Math.min(1, cur.meanUsedM3 / cur.demandM3))}'i` : undefined },
                  { label: 'Önerilen plan: tam sulama ihtiyacı', value: model.plannedDemandM3, color: 'var(--axis)' },
                  { label: 'Önerilen plan: kullanılan su', value: ps.meanUsedM3, color: 'var(--water)', note: model.plannedDemandM3 > 0 ? `ihtiyacın ${pct(Math.min(1, ps.meanUsedM3 / model.plannedDemandM3))}'i` : undefined },
                ]}
              />
              <p className="mb-0 mt-3 text-[11px] text-ink2">20 hasat yılının ortalaması. Plan suyu çoğaltmaz; aynı kotayı, daha az su isteyen bir ürün karışımına ve parsellere önceden paylaştırır.</p>
            </Card>
            <Card>
              <H2>Alan dağılımı</H2>
              <div className="mb-1.5 text-[12px] font-medium text-ink2">Bugünkü ekim</div>
              <CropBar areas={cur.areaByCrop} names={names} />
              <div className="mb-1.5 mt-4 flex items-center gap-1.5 text-[12px] font-medium text-ink2">
                Önerilen plan <Tag kind="hesap" />
              </div>
              <CropBar areas={ps.areaByCrop} names={names} />
            </Card>
          </div>

          <Card>
            <H2>Ürün başına toplam</H2>
            <div className="overflow-x-auto">
              <table className="data min-w-[860px]">
                <thead>
                  <tr>
                    <th rowSpan={2}>Ürün</th>
                    <th colSpan={3} className="!text-center">
                      Bugünkü ekim
                    </th>
                    <th colSpan={3} className="!text-center">
                      Önerilen plan
                    </th>
                    <th rowSpan={2} className="num">
                      Fiyat (TL/t)
                      <Tag kind="varsayim" compact />
                    </th>
                    <th rowSpan={2} className="num">
                      Önerilen brüt gelir
                      <Tag kind="hesap" compact />
                    </th>
                  </tr>
                  <tr>
                    <th className="num !rounded-none">Alan (da)</th>
                    <th className="num !rounded-none">
                      Su (m³)
                      <Tag kind="hesap" compact />
                    </th>
                    <th className="num !rounded-none">
                      Üretim (t)
                      <Tag kind="hesap" compact />
                    </th>
                    <th className="num !rounded-none">Alan (da)</th>
                    <th className="num !rounded-none">
                      Su (m³)
                      <Tag kind="hesap" compact />
                    </th>
                    <th className="num !rounded-none">
                      Üretim (t)
                      <Tag kind="hesap" compact />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ids.map((id) => {
                    const c = model.cropById.get(id);
                    const t = ps.productionT[id] ?? 0;
                    const tc = cur.meanProductionT[id] ?? 0;
                    const dash = <span className="text-ink2">–</span>;
                    return (
                      <tr key={id}>
                        <td>
                          <Swatch id={id} />
                          {cropName(id, names)}
                        </td>
                        <td className="num">{(cur.areaByCrop[id] ?? 0) >= 0.05 ? da(cur.areaByCrop[id]) : dash}</td>
                        <td className="num">{(cur.waterByCrop[id] ?? 0) > 0.5 ? int(cur.waterByCrop[id]) : dash}</td>
                        <td className="num">{c && tc > 0 ? ton(tc) : dash}</td>
                        <td className="num">{(ps.areaByCrop[id] ?? 0) >= 0.05 ? da(ps.areaByCrop[id]) : dash}</td>
                        <td className="num">{(model.plannedWaterByCrop[id] ?? 0) > 0.5 ? int(model.plannedWaterByCrop[id]) : dash}</td>
                        <td className="num">{c && t > 0 ? ton(t) : dash}</td>
                        <td className="num">{c ? int(c.priceTlTon) : dash}</td>
                        <td className="num">{c && t > 0 ? tlShort(t * c.priceTlTon) : dash}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold text-ink">
                    <td>Toplam</td>
                    <td className="num">{da(model.totalAreaDa)}</td>
                    <td className="num">{int(sum(cur.waterByCrop))}</td>
                    <td className="num"></td>
                    <td className="num">{da(model.totalAreaDa)}</td>
                    <td className="num">{int(sum(model.plannedWaterByCrop))}</td>
                    <td className="num"></td>
                    <td className="num"></td>
                    <td className="num">{tlShort(ps.revenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mb-0 mt-2 text-[11px] text-ink2">
              20 yılın ortalaması. Gelir brüttür: tohum, gübre, elektrik, işçilik ve su ücreti düşülmemiştir. Bugünkü ekimin brüt geliri {tlShort(cur.meanRevenue)}.
            </p>
          </Card>

          <Card>
            <H2 right={<Tag kind="hesap" />}>Fiyat riski</H2>
            {revBy.length === 0 ? (
              <div className="text-ink2">Önerilen planda gelir getiren ürün yok.</div>
            ) : (
              <>
                <Note tone={topShare > 0.4 ? 'warn' : 'plain'}>
                  Önerilen planda brüt gelirin <strong>{pct(topShare)}</strong>'i tek üründen ({top.c.name}) geliyor. {top.c.name} fiyatı %20 düşerse toplam gelir {pct(topShare * 0.2)} ({tlShort(top.rev * 0.2)})
                  azalır.{' '}
                  {smallArea > 0 && <>Pazarı küçük ürünler (nohut, ayçiçeği) alanın {pct(smallArea / model.totalAreaDa)}'ini kaplıyor; kooperatif bu kadarını satabileceğinden emin olmalı.</>}
                </Note>
                <div className="mt-3 overflow-x-auto">
                  <table className="data min-w-[520px]">
                    <thead>
                      <tr>
                        <th>Ürün</th>
                        <th className="num">Gelir payı</th>
                        <th className="num">Fiyat %20 düşerse toplam gelir</th>
                        <th className="num">Fiyat %20 artarsa toplam gelir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revBy.map(({ c, rev }) => (
                        <tr key={c.id}>
                          <td>
                            <Swatch id={c.id} />
                            {c.name}
                          </td>
                          <td className="num">{pct(rev / ps.revenue)}</td>
                          <td className="num">{tlShort(ps.revenue - rev * 0.2)}</td>
                          <td className="num">{tlShort(ps.revenue + rev * 0.2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mb-0 mt-2 text-[11px] text-ink2">
                  Fiyatlar tek bir sabit değerdir (varsayım); araç fiyat tahmini yapmaz. Bu tablo yalnızca planın tek bir fiyata ne kadar bağlı olduğunu gösterir. Şeker pancarı kotaya ve sözleşmeye
                  bağlıdır; model bunu bilmez.
                </p>
              </>
            )}
          </Card>
          <PlanSettingsCard />
        </>
      )}
      <MemberEditor id={editing} onClose={() => setEditing(null)} />
    </>
  );
}
