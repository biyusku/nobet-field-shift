// Genel bakış: kooperatifin tek sayfalık analiz panosu. Üstte büyük sayılar, ortada harita ve NASA verisi, altta üyeler.
import { ArrowRight, LayoutDashboard, Pencil, Plus, RotateCcw } from 'lucide-react';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { BacktestStrip, cropName, CropBar, HonestyBanner } from '../components/bits';
import { ClimateCard } from '../components/ClimateCard';
import { Confirm } from '../components/kit';
import { MemberEditor } from '../components/MemberEditor';
import { Card, Change, H2, Note, PageHeader, Swatch, Tag, type TagKind } from '../components/ui';
import { COOP_NAME, METHOD_LABEL } from '../data/defaults';
import { FALLOW } from '../engine/types';
import { dateOfIndex } from '../engine/weather';
import { da, fmtDayMonth, inSuffix, int, m3, pct, tlShort, ton } from '../lib/format';
import { useStore } from '../state';

const OverviewMap = lazy(() => import('../components/OverviewMap'));

const md = (d: Date) => (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
/** "4 üyeden 4'ü" için belirtme eki. */
const ofSuffix = (n: number) => ['', "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u"][n % 10] || "'u";

/** Üst satırdaki büyük sayı: bugün → öneri. */
function Big({ label, tag, from, to, tone, hint, extra }: { label: string; tag: TagKind; from: ReactNode; to: ReactNode; tone?: 'good' | 'crit'; hint?: ReactNode; extra?: ReactNode }) {
  return (
    <section className="card flex min-w-0 flex-col gap-1 !py-4">
      <h2 className="card-title flex flex-wrap items-center gap-1.5">
        {label} <Tag kind={tag} />
      </h2>
      <div className="tnum mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[13px] text-ink2">{from}</span>
        <ArrowRight size={13} className="shrink-0 translate-y-[1px] text-muted" aria-label="önerilen planla" />
        <span className={`text-[26px] font-bold leading-[1.15] tracking-tight ${tone === 'good' ? 'text-good-ink' : tone === 'crit' ? 'text-crit-ink' : 'text-ink'}`}>{to}</span>
        {extra}
      </div>
      {hint && <span className="text-[11px] text-ink2">{hint}</span>}
    </section>
  );
}

export function OverviewScreen() {
  const s = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const { model, weather } = s;
  if (!model || !weather) return null;
  const names = new Map(model.crops.map((c) => [c.id, c.name]));
  const ps = model.planSummary;
  const cur = model.current;
  const n = model.members.length;

  const endOf = (kind: 'current' | 'planned') =>
    model.members
      .map((mv) => {
        const ev = mv[kind];
        const y = ev.years[ev.medianIndex];
        return ev.yearsExceeded > 0 && y?.endDay != null ? { mv, d: dateOfIndex(weather, y.start + y.endDay) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => md(a.d) - md(b.d));
  const exCur = endOf('current');
  const exPl = endOf('planned');

  const committed = Object.entries(s.settings.commitments).filter(([id, t]) => t > 0 && model.cropById.has(id));
  const heldCur = model.currentBacktest.filter((y) => y.status === 'green').length;
  const heldPl = model.planBacktest.filter((y) => y.status === 'green').length;
  const total = model.planBacktest.length || 20;

  const ids = [...model.crops.map((c) => c.id), FALLOW].filter((id) => (cur.areaByCrop[id] ?? 0) >= 0.05 || (ps.areaByCrop[id] ?? 0) >= 0.05);
  const revBy = model.crops
    .map((c) => ({ c, rev: (ps.productionT[c.id] ?? 0) * c.priceTlTon }))
    .filter((x) => x.rev > 0)
    .sort((a, b) => b.rev - a.rev);
  const top = revBy[0];
  const topShare = top && ps.revenue > 0 ? top.rev / ps.revenue : 0;
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const dash = <span className="text-ink2">–</span>;

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Genel bakış"
        meta={
          <>
            {COOP_NAME} <Tag kind="kurgusal" /> · {weather.name}
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

      {/* üst satır: dört büyük sayı, bugün → öneri */}
      <div className="kpi-grid">
        <Big
          label="Toplam brüt gelir"
          tag="hesap"
          from={tlShort(cur.meanRevenue)}
          to={tlShort(ps.revenue)}
          extra={<Change from={cur.meanRevenue} to={ps.revenue} />}
          hint="Yıllık, 20 yılın ortalaması · girdiler düşülmedi"
        />
        <Big
          label="Su hakkı aşımı"
          tag="hesap"
          from={n ? `${n} üyeden ${exCur.length === 0 ? 'hiçbiri' : `${exCur.length}${ofSuffix(exCur.length)}`}` : 'üye yok'}
          to={exPl.length}
          tone={exPl.length === 0 ? 'good' : 'crit'}
          hint="Suyu sezon ortasında biten üye sayısı"
        />
        <Big
          label="En erken su bitiş tarihi"
          tag="hesap"
          from={exCur[0] ? fmtDayMonth(exCur[0].d) : 'aşım yok'}
          to={exPl[0] ? fmtDayMonth(exPl[0].d) : 'Aşım yok'}
          tone={exPl[0] ? 'crit' : 'good'}
          hint={exCur[0] ? `Bugün ilk biten: ${exCur[0].mv.member.name} · tipik yıl` : 'Bugünkü ekimde kimsenin su hakkı aşılmıyor'}
        />
        <Big
          label="Taahhüt"
          tag="hesap"
          from={committed.length ? `${total} yılın ${heldCur}${inSuffix(heldCur)}` : 'taahhüt yok'}
          to={
            committed.length ? (
              <>
                {heldPl}
                <span className="text-[13px] font-normal text-ink2"> / {total} yıl</span>
              </>
            ) : (
              '–'
            )
          }
          tone={committed.length ? (heldPl >= 16 ? 'good' : heldPl >= 10 ? undefined : 'crit') : undefined}
          hint={committed.length ? `${committed.map(([id, t]) => `${int(t)} t ${cropName(id, names).toLocaleLowerCase('tr')}`).join(', ')} · tuttuğu yıl sayısı` : 'Taahhüt ekranından girilebilir'}
        />
      </div>

      {model.plan.status === 'partial' && (
        <Note tone="warn">
          Kooperatifin satış sözü bu suyla tutmuyor; öneri, söze en çok yaklaşan plandır. Ayrıntı için{' '}
          <button type="button" className="link-button !text-inherit" onClick={() => s.setTab('taahhut')}>
            Taahhüt
          </button>{' '}
          ekranına bakın.
        </Note>
      )}

      {/* orta satır: harita ve NASA verisi */}
      <div className="grid items-stretch gap-3 lg:grid-cols-2">
        <Card className="flex min-h-[420px] min-w-0 flex-col">
          <H2 right={<Tag kind="nasa" />}>Veri nereden geliyor</H2>
          <Suspense fallback={<div className="grid flex-1 place-items-center rounded-lg bg-sunken text-ink2">Harita yükleniyor…</div>}>
            <OverviewMap lat={weather.lat} lon={weather.lon} name={weather.name} />
          </Suspense>
        </Card>
        <ClimateCard w={weather} />
      </div>

      {/* alt satır: üyeler, ürün dağılımı, taahhüt şeridi */}
      <Card>
        <H2 right={<span className="text-[12px] text-ink2">Satıra tıklayınca üye ekranı açılır</span>}>Üyeler</H2>
        {n === 0 ? (
          <div className="rounded-lg bg-sunken px-3 py-6 text-center text-ink2">Üye yok. "Üye ekle" ile başlayın.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data min-w-[720px]">
              <thead>
                <tr>
                  <th>Üye</th>
                  <th className="num">Tarla</th>
                  <th className="num">Su hakkı</th>
                  <th>
                    Bugün su ne zaman bitiyor
                    <Tag kind="hesap" compact />
                  </th>
                  <th className="num">
                    Brüt gelir: bugün → öneri
                    <Tag kind="hesap" compact />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {model.members.map((mv) => {
                  const m = mv.member;
                  const med = mv.current.years[mv.current.medianIndex];
                  const open = () => {
                    s.setMemberId(m.id);
                    s.setTab('uye');
                    window.scrollTo({ top: 0 });
                  };
                  return (
                    <tr key={m.id} className="cursor-pointer" onClick={open}>
                      <td>
                        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-ink" onClick={open}>
                          {m.name}
                        </button>
                        <div className="text-[11px] text-ink2">
                          {METHOD_LABEL[m.method]} sulama{m.beetContract ? ' · pancar sözleşmesi var' : ''}
                        </div>
                      </td>
                      <td className="num">{da(m.areaDa)} da</td>
                      <td className="num">
                        {m3(mv.quotaM3)}
                        <div className="text-[11px] text-ink2">{int(m.quotaMm)} mm</div>
                      </td>
                      <td className="whitespace-nowrap">
                        {mv.current.yearsExceeded > 0 && med?.endDay != null ? (
                          <>
                            <span className="font-semibold text-crit-ink">{fmtDayMonth(dateOfIndex(weather, med.start + med.endDay))}</span>
                            <div className="text-[11px] text-ink2">
                              20 yılın {mv.current.yearsExceeded}
                              {inSuffix(mv.current.yearsExceeded)}
                            </div>
                          </>
                        ) : (
                          <span className="tag tag-success">su hakkı aşılmıyor</span>
                        )}
                      </td>
                      <td className="num whitespace-nowrap">
                        <span className="text-ink2">{tlShort(mv.current.meanRevenue)}</span> <ArrowRight size={12} className="inline text-muted" aria-label="öneriyle" />{' '}
                        <span className="font-semibold text-ink">{tlShort(mv.planned.meanRevenue)}</span> <Change from={mv.current.meanRevenue} to={mv.planned.meanRevenue} />
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button
                          type="button"
                          className="icon-button !text-ink2"
                          aria-label={`${m.name}: düzenle`}
                          title="Düzenle"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(m.id);
                          }}
                        >
                          <Pencil size={15} />
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

      {n > 0 && (
        <>
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <Card>
              <H2>Kooperatif ürün dağılımı</H2>
              <div className="mb-1.5 text-[12px] font-medium text-ink2">Bugün</div>
              <CropBar areas={cur.areaByCrop} names={names} />
              <div className="mb-1.5 mt-4 flex items-center gap-1.5 text-[12px] font-medium text-ink2">
                Öneri <Tag kind="hesap" />
              </div>
              <CropBar areas={ps.areaByCrop} names={names} />
            </Card>
            <Card>
              <H2 right={<Tag kind="hesap" />}>Taahhüt 20 yılda tutar mıydı?</H2>
              {committed.length === 0 ? (
                <div className="text-ink2">Taahhüt girilmedi. Taahhüt ekranından ton olarak girebilirsiniz.</div>
              ) : (
                <BacktestStrip outcomes={model.planBacktest} commitments={s.settings.commitments} names={names} title="Önerilen plan" />
              )}
            </Card>
          </div>

          <details className="card group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-[650] text-ink">
              <span>Ayrıntılar</span>
              <span className="text-[12px] font-normal text-ink2 group-open:hidden">ürün başına alan, su, üretim ve gelir; fiyat riski</span>
            </summary>
            <div className="mt-4 flex flex-col gap-5">
              <div className="overflow-x-auto">
                <table className="data min-w-[860px]">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Ürün</th>
                      <th colSpan={3} className="!text-center">
                        Bugün
                      </th>
                      <th colSpan={3} className="!text-center">
                        Öneri
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
              {top && (
                <Note tone={topShare > 0.4 ? 'warn' : 'plain'}>
                  <strong>Fiyat riski:</strong> önerilen planda brüt gelirin {pct(topShare)} kadarı tek üründen ({top.c.name}) geliyor. {top.c.name} fiyatı %20 düşerse toplam gelir {tlShort(top.rev * 0.2)} azalır.
                  Fiyatlar sabit varsayımdır; araç fiyat tahmini yapmaz.
                </Note>
              )}
              <p className="m-0 text-[12px] text-ink2">Toplam su hakkı {m3(model.totalQuotaM3)}; önerilen planda dağıtılan su {m3(ps.reservedM3)}. Hepsi 20 yılın ortalamasıdır.</p>
            </div>
          </details>
        </>
      )}

      <HonestyBanner />
      <MemberEditor id={editing} onClose={() => setEditing(null)} />
    </>
  );
}
