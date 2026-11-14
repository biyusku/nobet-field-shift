import { Pencil, Plus, RotateCcw, Trash2, Users } from 'lucide-react';
import { cropName, CropBar, HonestyBanner } from '../components/bits';
import { Card, Change, H2, Kpi, Note, NumInput, PageHeader, Stat, Swatch, Tag } from '../components/ui';
import { COOP_NAME, METHOD_LABEL } from '../data/defaults';
import { FALLOW, type IrrigationMethod } from '../engine/types';
import { dateOfIndex } from '../engine/weather';
import { da, fmtDayMonth, int, m3, pct, tlShort, ton } from '../lib/format';
import { useStore } from '../state';

export function PlanSettingsCard() {
  const s = useStore();
  const st = s.settings;
  return (
    <Card>
      <H2 right={<Tag kind="varsayim" />}>Plan ayarları</H2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="text-[12px] text-ink2">
          <div>Amaç</div>
          <div className="mt-1 flex flex-col gap-1 text-[13px] text-ink">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="mode" checked={st.mode === 'revenue'} onChange={() => s.updateSettings({ mode: 'revenue' })} />
              En yüksek brüt gelir
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="mode" checked={st.mode === 'minWater'} onChange={() => s.updateSettings({ mode: 'minWater' })} />
              Taahhüdü karşılayan en az su
            </label>
          </div>
        </div>
        <label className="block text-[12px] text-ink2">
          Bir ürünün üyedeki en yüksek payı
          <NumInput className="mt-0.5 w-full" label="Ürün payı sınırı (yüzde)" value={st.maxShare * 100} min={5} max={100} decimals={1} suffix="%" onChange={(v) => s.updateSettings({ maxShare: v / 100 })} />
          <span className="text-muted">%33,3 ve altı üç yıllık nöbeti mümkün kılar.</span>
        </label>
        <div className="text-[12px] text-ink2">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={st.smallMarketCap !== null} onChange={(e) => s.updateSettings({ smallMarketCap: e.target.checked ? 0.25 : null })} />
            Küçük pazarlı ürün eşiği (nohut, ayçiçeği)
          </label>
          {st.smallMarketCap !== null && (
            <NumInput className="mt-0.5 w-full" label="Küçük pazarlı ürün eşiği (yüzde)" value={st.smallMarketCap * 100} min={0} max={100} decimals={0} suffix="%" onChange={(v) => s.updateSettings({ smallMarketCap: v / 100 })} />
          )}
          <span className="text-muted">Her biri kooperatif toplam alanının bu payını geçemez.</span>
        </div>
        <div className="text-[12px] text-ink2">
          <label className="flex cursor-pointer items-start gap-2">
            <input className="mt-0.5" type="checkbox" checked={st.includeUnreliable} onChange={(e) => s.updateSettings({ includeUnreliable: e.target.checked })} />
            <span>Göreli verimi 0,35'in altında kalan seçenekleri de planlamaya kat</span>
          </label>
          <span className="text-muted">Varsayılan olarak dışarıda: model bu kadar az suda güvenilir değil.</span>
        </div>
      </div>
    </Card>
  );
}

export function CoopScreen() {
  const s = useStore();
  const { model, weather } = s;
  if (!model || !weather) return null;
  const names = new Map(model.crops.map((c) => [c.id, c.name]));
  const ids = [...model.crops.map((c) => c.id), FALLOW].filter((id) => (model.current.areaByCrop[id] ?? 0) >= 0.05 || (model.planSummary.areaByCrop[id] ?? 0) >= 0.05);
  const ps = model.planSummary;

  // fiyat riski: önerilen planda gelirin ürünlere dağılımı
  const revBy = model.crops
    .map((c) => ({ c, rev: (ps.productionT[c.id] ?? 0) * c.priceTlTon }))
    .filter((x) => x.rev > 0)
    .sort((a, b) => b.rev - a.rev);
  const top = revBy[0];
  const topShare = top && ps.revenue > 0 ? top.rev / ps.revenue : 0;
  const smallArea = model.crops.filter((c) => c.smallMarket).reduce((x, c) => x + (ps.areaByCrop[c.id] ?? 0), 0);

  return (
    <>
      <PageHeader icon={Users} title="Kooperatif" meta={<>{COOP_NAME} <Tag kind="kurgusal" /></>}>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (confirm('Üyeler, taahhüt ve bütün varsayımlar kurgusal örneğe döndürülsün mü?')) s.reset();
          }}
        >
          <RotateCcw /> Kurgusal örneğe dön
        </button>
        <button type="button" className="btn btn-primary" onClick={() => s.addMember()}>
          <Plus /> Üye ekle
        </button>
      </PageHeader>
      <HonestyBanner />

      <div className="kpi-grid">
        <Kpi label="Üye" tag="kurgusal" value={int(model.members.length)} hint={`Toplam ${int(model.totalAreaDa)} da`} />
        <Kpi label="Toplam kota" tag="kurgusal" value={m3(model.totalQuotaM3)} hint={`Bugün kullanılan ${m3(model.current.meanUsedM3)}`} />
        <Kpi label="Brüt gelir" tag="hesap" value={tlShort(model.planSummary.revenue)} change={<Change from={model.current.meanRevenue} to={model.planSummary.revenue} />} hint={`Önerilen plan · bugünkü ${tlShort(model.current.meanRevenue)}`} />
        <Kpi label="İklim noktası" tag="nasa" value={<span className="text-[14px]">{weather.name}</span>} hint={`${weather.lat.toFixed(2)}°K ${weather.lon.toFixed(2)}°D · ${int(weather.elevation)} m`} />
      </div>

      <Card>
        <H2>Üyeler</H2>
        {model.members.length === 0 ? (
          <div className="text-[13px] text-ink2">Üye yok. "Üye ekle" ile başlayın.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data min-w-[760px]">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th className="num">Tarla (da)</th>
                  <th className="num">Kota (mm)</th>
                  <th>Yöntem</th>
                  <th>Bugünkü ekim</th>
                  <th>
                    Su bitiş (ortanca) <Tag kind="hesap" />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {model.members.map((mv) => {
                  const m = mv.member;
                  const med = mv.current.years[mv.current.medianIndex];
                  return (
                    <tr key={m.id}>
                      <td>
                        <input className="field min-w-[150px]" aria-label="Üye adı" value={m.name} onChange={(e) => s.updateMember(m.id, { name: e.target.value })} />
                      </td>
                      <td className="num">
                        <NumInput className="w-[92px]" label="Tarla büyüklüğü (dekar)" value={m.areaDa} min={1} max={100000} decimals={1} onChange={(v) => s.updateMember(m.id, { areaDa: v })} />
                      </td>
                      <td className="num">
                        <NumInput className="w-[84px]" label="Kota (mm)" value={m.quotaMm} max={5000} onChange={(v) => s.updateMember(m.id, { quotaMm: v })} />
                      </td>
                      <td>
                        <select className="field min-w-[120px]" aria-label="Sulama yöntemi" value={m.method} onChange={(e) => s.updateMember(m.id, { method: e.target.value as IrrigationMethod })}>
                          {(Object.keys(METHOD_LABEL) as IrrigationMethod[]).map((k) => (
                            <option key={k} value={k}>
                              {METHOD_LABEL[k]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-[13px]">
                        {mv.currentParcels.length === 0 ? <span className="text-muted">girilmedi</span> : mv.currentParcels.map((p) => `${p.crop.name} ${da(p.areaDa)}`).join(', ')}
                        {mv.currentAreaDa > m.areaDa + 0.05 && <div className="font-semibold text-crit-ink">ekim tarladan büyük</div>}
                      </td>
                      <td className="whitespace-nowrap">
                        {mv.current.yearsExceeded > 0 && med?.endDay != null ? (
                          <>
                            <strong className="text-crit-ink">{fmtDayMonth(dateOfIndex(weather, med.start + med.endDay))}</strong>
                            <span className="text-muted"> · {mv.current.yearsExceeded}/20 yıl</span>
                          </>
                        ) : (
                          <span className="text-good-ink font-semibold">kota yetiyor</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button
                          type="button"
                          className="btn mr-1.5"
                          onClick={() => {
                            s.setMemberId(m.id);
                            s.setTab('uye');
                          }}
                        >
                          <Pencil /> Düzenle
                        </button>
                        <button
                          type="button"
                          className="icon-button align-middle"
                          aria-label={`${m.name}: sil`}
                          title="Sil"
                          onClick={() => {
                            if (confirm(`${m.name} silinsin mi?`)) s.removeMember(m.id);
                          }}
                        >
                          <Trash2 size={15} />
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
              <H2>Bugünkü ekim (toplam)</H2>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <Stat label="Brüt gelir" tag="hesap" value={tlShort(model.current.meanRevenue)} sub="20 yıl ortalaması" />
                <Stat label="Kullanılan su" tag="hesap" value={m3(model.current.meanUsedM3)} sub={`toplam kotanın ${pct(model.totalQuotaM3 > 0 ? model.current.meanUsedM3 / model.totalQuotaM3 : 0)}'i`} />
              </div>
              <CropBar areas={model.current.areaByCrop} names={names} />
            </Card>
            <Card>
              <H2>Önerilen plan (toplam)</H2>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <Stat label="Brüt gelir" tag="hesap" value={tlShort(ps.revenue)} sub="20 yıl ortalaması" />
                <Stat label="Ayrılan su" tag="hesap" value={m3(ps.reservedM3)} sub={`ortalama kullanım ${m3(ps.meanUsedM3)}`} />
              </div>
              <CropBar areas={ps.areaByCrop} names={names} />
            </Card>
          </div>

          <Card>
            <H2>Ürün başına toplam</H2>
            <div className="overflow-x-auto">
              <table className="data min-w-[640px]">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th className="num">Bugünkü (da)</th>
                    <th className="num">
                      Bugünkü üretim (t) <Tag kind="hesap" />
                    </th>
                    <th className="num">Önerilen (da)</th>
                    <th className="num">
                      Önerilen üretim (t) <Tag kind="hesap" />
                    </th>
                    <th className="num">
                      Fiyat (TL/t) <Tag kind="varsayim" />
                    </th>
                    <th className="num">
                      Önerilen brüt gelir <Tag kind="hesap" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ids.map((id) => {
                    const c = model.cropById.get(id);
                    const t = ps.productionT[id] ?? 0;
                    return (
                      <tr key={id}>
                        <td>
                          <Swatch id={id} />
                          {cropName(id, names)}
                        </td>
                        <td className="num">{da(model.current.areaByCrop[id] ?? 0)}</td>
                        <td className="num">{c && (model.current.meanProductionT[id] ?? 0) > 0 ? ton(model.current.meanProductionT[id]) : '–'}</td>
                        <td className="num">{da(ps.areaByCrop[id] ?? 0)}</td>
                        <td className="num">{c && t > 0 ? ton(t) : '–'}</td>
                        <td className="num">{c ? int(c.priceTlTon) : '–'}</td>
                        <td className="num">{c && t > 0 ? tlShort(t * c.priceTlTon) : '–'}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td>Toplam</td>
                    <td className="num">{da(model.totalAreaDa)}</td>
                    <td className="num"></td>
                    <td className="num">{da(model.totalAreaDa)}</td>
                    <td className="num"></td>
                    <td className="num"></td>
                    <td className="num">{tlShort(ps.revenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mb-0 mt-2 text-[12px] text-muted">
              Gelir brüttür: tohum, gübre, elektrik, işçilik ve su ücreti düşülmemiştir. Üretim, 20 yılın ortalama göreli verimiyle hesaplanır.
            </p>
          </Card>

          <Card>
            <H2 right={<Tag kind="hesap" />}>Fiyat riski</H2>
            {revBy.length === 0 ? (
              <div className="text-[13px] text-ink2">Önerilen planda gelir getiren ürün yok.</div>
            ) : (
              <>
                <Note tone={topShare > 0.4 ? 'warn' : 'plain'}>
                  {topShare > 0.4 ? <strong className="text-ink">Uyarı: </strong> : null}
                  Önerilen planda brüt gelirin <strong className="text-ink">{pct(topShare)}</strong>'i tek üründen ({top.c.name}) geliyor.{' '}
                  {top.c.name} fiyatı %20 düşerse toplam gelir {pct(topShare * 0.2)} ({tlShort(top.rev * 0.2)}) azalır.{' '}
                  {smallArea > 0 && (
                    <>
                      Pazarı küçük ürünler (nohut, ayçiçeği) alanın {pct(smallArea / model.totalAreaDa)}'ini kaplıyor; kooperatif bu kadarını satabileceğinden emin olmalı.
                    </>
                  )}
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
                <p className="mb-0 mt-2 text-[12px] text-muted">
                  Fiyatlar tek bir sabit değerdir (varsayım); araç fiyat tahmini yapmaz. Bu tablo yalnızca planın tek bir fiyata ne kadar bağlı olduğunu gösterir. Şeker pancarı kotaya ve sözleşmeye bağlıdır; model bunu bilmez.
                </p>
              </>
            )}
          </Card>
          <PlanSettingsCard />
        </>
      )}
    </>
  );
}
