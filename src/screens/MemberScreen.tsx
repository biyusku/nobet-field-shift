// Üye ekranı: "Bu üyenin suyu yetiyor mu, ne zaman bitiyor, yetmesi için ne ekilmeli?"
import { Pencil, Plus, Sprout } from 'lucide-react';
import { useState } from 'react';
import { cropName, CropBar, HonestyBanner, UnreliableMark } from '../components/bits';
import { Select } from '../components/kit';
import { MemberEditor } from '../components/MemberEditor';
import { Bars, Card, Empty, H2, MiniList, Note, PageHeader, Segmented, Shift, Swatch, Tag } from '../components/ui';
import { WaterChart } from '../components/WaterChart';
import { METHOD_LABEL } from '../data/defaults';
import { levelLabel } from '../engine/curves';
import type { FarmEvaluation } from '../engine/farm';
import { SOIL_FORMULA } from '../engine/soil';
import { FALLOW, type Weather } from '../engine/types';
import { dateOfIndex } from '../engine/weather';
import { da, dec1, fmtDayMonth, inSuffix, int, m3, mm, pct, tlShort, ton } from '../lib/format';
import type { MemberView, Model } from '../model';
import { useStore } from '../state';

const md = (d: Date) => (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
function endDates(w: Weather, ev: FarmEvaluation): Date[] {
  return ev.years
    .filter((y) => y.endDay !== null)
    .map((y) => dateOfIndex(w, y.start + y.endDay!))
    .sort((a, b) => md(a) - md(b));
}
function medianDate(w: Weather, ev: FarmEvaluation): Date | null {
  const y = ev.years[ev.medianIndex];
  return ev.yearsExceeded > 0 && y?.endDay != null ? dateOfIndex(w, y.start + y.endDay) : null;
}

function Verdict({ w, ev, kind }: { w: Weather; ev: FarmEvaluation; kind: 'current' | 'planned' }) {
  const dates = endDates(w, ev);
  const med = medianDate(w, ev);
  const n = ev.years.length;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink2">
        Su bitiş tarihi <Tag kind="hesap" />
      </div>
      {med ? (
        <>
          <div className="text-[30px] font-bold leading-[1.1] tracking-tight text-crit-ink sm:text-[38px]">{fmtDayMonth(med)}</div>
          <div className="mt-1 text-ink2">
            20 yılın ortancası: sulama ihtiyacı kotayı bu gün aşıyor. En erken <strong className="text-ink">{fmtDayMonth(dates[0])}</strong>, en geç{' '}
            <strong className="text-ink">{fmtDayMonth(dates[dates.length - 1])}</strong>. Kota {n} yılın {dates.length}
            {inSuffix(dates.length)} bitiyor.
          </div>
        </>
      ) : (
        <>
          <div className="text-[30px] font-bold leading-[1.1] tracking-tight text-good-ink sm:text-[38px]">Kota yetiyor</div>
          <div className="mt-1 text-ink2">
            {kind === 'planned'
              ? `Su parsellere önceden paylaştırıldı; ${n} yılın hiçbirinde kota aşılmıyor.`
              : `${n} yılın hiçbirinde sulama ihtiyacı kotayı aşmıyor.`}
          </div>
        </>
      )}
    </div>
  );
}

/** Kullanılan suyun ihtiyaca oranı: parsel satırlarında. */
function WaterCell({ used, need }: { used: number; need: number }) {
  const r = need > 0 ? Math.min(1, used / need) : 1;
  return (
    <div className="ml-auto w-[120px]">
      <div className="tnum whitespace-nowrap text-right">
        {int(used)} <span className="text-ink2">/ {int(need)} mm</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-[3px] bg-sunken" role="img" aria-label={`İhtiyacın ${pct(r)}'i karşılanıyor`}>
        <div className="h-full rounded-[3px]" style={{ width: `${r * 100}%`, background: 'var(--water)' }} />
      </div>
    </div>
  );
}

function Panel({ kind, w, mv, model, yearSel, yMax }: { kind: 'current' | 'planned'; w: Weather; mv: MemberView; model: Model; yearSel: number | 'median'; yMax: number }) {
  const ev = kind === 'current' ? mv.current : mv.planned;
  const ws = kind === 'current' ? mv.currentWater : mv.plannedWater;
  const soil = kind === 'current' ? mv.currentSoil : mv.plannedSoil;
  const names = new Map(model.crops.map((c) => [c.id, c.name]));
  const yi = yearSel === 'median' ? ev.medianIndex : yearSel;
  const areas: Record<string, number> = {};
  if (kind === 'current') {
    for (const p of mv.currentParcels) areas[p.crop.id] = (areas[p.crop.id] ?? 0) + p.areaDa;
    if (mv.member.areaDa - mv.currentAreaDa > 0.05) areas[FALLOW] = mv.member.areaDa - mv.currentAreaDa;
  } else for (const a of mv.plannedAllocs) areas[a.cropId] = (areas[a.cropId] ?? 0) + a.da;

  const parcels = kind === 'current' ? mv.currentParcels : mv.plannedParcels;
  const withOption = mv.plannedAllocs.filter((a) => a.option);
  const fallowDa = areas[FALLOW] ?? 0;
  const times = mv.quotaM3 > 0 ? ws.demandM3 / mv.quotaM3 : 0;

  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <H2 right={<span className="text-[12px] text-ink2">{kind === 'current' ? 'Üyenin şu an ektiği' : 'Kota ve nöbet kurallarıyla hesaplandı'}</span>}>{kind === 'current' ? 'Bugünkü ekim' : 'Önerilen plan'}</H2>
      <Verdict w={w} ev={ev} kind={kind} />
      <WaterChart w={w} ev={ev} yearIndex={yi} quotaM3={mv.quotaM3} yMax={yMax} kind={kind} />

      <div>
        <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
          Su bütçesi <Tag kind="hesap" />
        </h3>
        <Bars
          unit={m3}
          rows={[
            { label: 'Kota', value: mv.quotaM3, color: 'var(--crit)' },
            { label: 'Tam sulama ihtiyacı (20 yıl ort.)', value: ws.demandM3, color: 'var(--axis)', note: times >= 1.05 ? `kotanın ${dec1(times)} katı` : undefined },
            { label: kind === 'current' ? 'Kotayla yapılabilen sulama' : 'Planda kullanılan su', value: ws.usedM3, color: 'var(--water)', note: `ihtiyacın ${pct(ws.coverage)}'i` },
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Ürün</th>
              <th className="num">Alan</th>
              <th className="num">
                Su: kullanılan / ihtiyaç
                <Tag kind="hesap" compact />
              </th>
              <th className="num">
                Verim düzeyi
                <Tag kind="hesap" compact />
              </th>
              <th className="num">
                Üretim
                <Tag kind="hesap" compact />
              </th>
            </tr>
          </thead>
          <tbody>
            {parcels.map((p, k) => {
              const st = ws.parcels[k];
              const opt = kind === 'planned' ? withOption[k]?.option : null;
              if (p.areaDa < 0.05 || !st) return null;
              return (
                <tr key={k}>
                  <td>
                    <Swatch id={p.crop.id} />
                    {p.crop.name}
                    {opt && <span className="text-ink2"> · {levelLabel(opt.level)}</span>}
                    <div>
                      <UnreliableMark rel={st.relYield} />
                    </div>
                  </td>
                  <td className="num">{da(p.areaDa)} da</td>
                  <td className="num">
                    <WaterCell used={st.usedMm} need={st.needMm} />
                  </td>
                  <td className="num">{pct(st.relYield)}</td>
                  <td className="num">{ton((st.relYield * p.crop.yieldKgDa * p.areaDa) / 1000)}</td>
                </tr>
              );
            })}
            {fallowDa >= 0.05 && (
              <tr>
                <td>
                  <Swatch id={FALLOW} />
                  Nadas
                </td>
                <td className="num">{da(fallowDa)} da</td>
                <td className="num text-ink2">–</td>
                <td className="num text-ink2">–</td>
                <td className="num text-ink2">–</td>
              </tr>
            )}
            {parcels.length === 0 && fallowDa < 0.05 && (
              <tr>
                <td colSpan={5} className="text-ink2">
                  Ekim girilmedi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="m-0 -mt-2 text-[11px] text-ink2">
        {kind === 'current'
          ? 'Su parseller arasında paylaştırılmaz: ihtiyaç duyan sulanır, kota bitince hepsi susuz kalır. Verim düzeyi, tam sulu verimin yüzdesidir (20 yıl ort.).'
          : 'Her parsele bir su tavanı ayrılır; tavan bitince o parselin suyu kesilir, kota aşılmaz. Plan bütün üyeler için birlikte, kooperatifin taahhüdü gözetilerek çözülür.'}
      </p>

      <MiniList
        rows={[
          { label: 'Ortalama verim düzeyi', value: pct(ws.yieldLevel), sub: 'tam sulu verime göre, alan ağırlıklı' },
          { label: 'Toprak puanı', value: `${soil.score} / 100`, sub: `baklagil ${pct(soil.legumeShare)} · etkin ürün ${dec1(soil.effectiveCrops)}` },
          {
            label: (
              <>
                Brüt gelir <Tag kind="hesap" />
              </>
            ),
            value: tlShort(kind === 'current' ? ev.meanRevenue : mv.plannedSummary.revenue),
            sub: 'girdiler düşülmedi · fiyatlar varsayım',
          },
        ]}
      />

      <div>
        <h3 className="m-0 mb-2 text-[12px] font-semibold text-ink">Alan dağılımı</h3>
        <CropBar areas={areas} names={names} />
      </div>

      {kind === 'planned' && <RotationTable mv={mv} names={names} />}
    </Card>
  );
}

function RotationTable({ mv, names }: { mv: MemberView; names: Map<string, string> }) {
  const r = mv.rotation;
  return (
    <div>
      <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
        Üç yıllık nöbet tablosu <Tag kind="hesap" />
      </h3>
      <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Parsel</th>
              <th>1. yıl</th>
              <th>2. yıl</th>
              <th>3. yıl</th>
            </tr>
          </thead>
          <tbody>
            {r.table.map((row, p) => (
              <tr key={p}>
                <td className="whitespace-nowrap font-semibold text-ink">
                  {'ABC'[p]} <span className="font-normal text-ink2">· {da(r.parcelDa)} da</span>
                </td>
                {row.map((cells, y) => (
                  <td key={y}>
                    {cells
                      .filter((c) => c.da >= 0.05)
                      .map((c, i) => (
                        <div key={i} className="whitespace-nowrap">
                          <Swatch id={c.cropId} />
                          {cropName(c.cropId, names)} <span className="text-ink2">{da(c.da)} da</span>
                        </div>
                      ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-0 mt-2 text-[11px] text-ink2">
        Tarla üç eş parsele bölünür, desen her yıl bir parsel kayar; her yıl aynı ürün karışımı ekildiği için su hesabı değişmez.{' '}
        {r.guaranteed ? 'Hiçbir ürün tarlanın üçte birini aşmadığı için aynı toprağa aynı ürün ancak üç yılda bir gelir.' : 'Uyarı: bir ürün tarlanın üçte birini aşıyor; aynı toprağa üst üste aynı ürün gelebilir.'}
      </p>
    </div>
  );
}

/** Yıl yıl: ihtiyacın karşılanan kesri, bugünkü ekim ve önerilen plan yan yana. */
function YearCoverage({ mv }: { mv: MemberView }) {
  const cov = (ev: FarmEvaluation) => ev.years.map((y) => (y.demandTotalM3 > 0 ? Math.min(1, y.usedM3 / y.demandTotalM3) : 1));
  const a = cov(mv.current);
  const b = cov(mv.planned);
  const years = mv.current.years.map((y) => y.year);
  const [hi, setHi] = useState<number | null>(null);
  return (
    <div>
      <div className="flex h-[110px] items-end gap-[3px]" onMouseLeave={() => setHi(null)}>
        {years.map((year, i) => (
          <div key={year} className="flex h-full flex-1 items-end gap-[2px]" onMouseEnter={() => setHi(i)}>
            <div className="flex-1 rounded-t-[3px]" style={{ height: `${Math.max(1, a[i] * 100)}%`, background: 'var(--axis)' }} />
            <div className="flex-1 rounded-t-[3px]" style={{ height: `${Math.max(1, (b[i] ?? 0) * 100)}%`, background: 'var(--water)' }} />
          </div>
        ))}
      </div>
      <div className="tnum mt-1 flex justify-between text-[11px] text-muted">
        <span>{years[0]}</span>
        <span>{years[years.length - 1]}</span>
      </div>
      <div className="tnum mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: 'var(--axis)' }} />
          Bugünkü ekim
        </span>
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: 'var(--water)' }} />
          Önerilen plan
        </span>
        <span className="text-ink2">
          {hi !== null ? `${years[hi]}: bugünkü ${pct(a[hi])} · önerilen ${pct(b[hi] ?? 0)}` : `20 yıl ortalaması: bugünkü ${pct(mv.currentWater.coverage)} · önerilen ${pct(mv.plannedWater.coverage)}`}
        </span>
      </div>
    </div>
  );
}

export function MemberScreen() {
  const s = useStore();
  const [yearSel, setYearSel] = useState<number | 'median'>('median');
  const [editing, setEditing] = useState<string | null>(null);
  const { model, weather } = s;
  if (!model || !weather) return null;
  if (model.members.length === 0)
    return (
      <>
        <PageHeader icon={Sprout} title="Üye" />
        <Empty title="Kooperatifte üye yok">
          Su bütçesini görmek için bir üye ekleyin.
          <div>
            <button type="button" className="btn btn-primary mt-3" onClick={() => setEditing(s.addMember())}>
              <Plus /> Üye ekle
            </button>
          </div>
        </Empty>
        <MemberEditor id={editing} onClose={() => setEditing(null)} />
      </>
    );
  const mv = model.members.find((x) => x.member.id === s.memberId) ?? model.members[0];
  const m = mv.member;
  const cur = mv.current;
  const maxDemand = Math.max(...cur.years.map((y) => y.demandTotalM3), ...mv.planned.years.map((y) => y.demandTotalM3), 0);
  const yMax = Math.max(mv.quotaM3 * 1.25, maxDemand * 1.03, 1);
  const years = cur.years.map((y) => y.year);
  const medCur = medianDate(weather, cur);
  const medPl = medianDate(weather, mv.planned);

  return (
    <>
      <PageHeader icon={Sprout} title="Üye" meta={`${weather.name} · 2006–2025 hasat yılları`}>
        <Select
          variant="pill"
          prefix="Grafik yılı"
          label="Grafik yılı"
          value={String(yearSel)}
          onChange={(v) => setYearSel(v === 'median' ? 'median' : Number(v))}
          options={[{ value: 'median', label: 'Ortanca yıl' }, ...years.map((y, i) => ({ value: String(i), label: String(y) }))]}
        />
        <button type="button" className="btn" onClick={() => setEditing(m.id)}>
          <Pencil /> Üyeyi düzenle
        </button>
      </PageHeader>
      <HonestyBanner />

      {model.members.length <= 6 ? (
        <Segmented label="Üyeler" value={m.id} options={model.members.map((x) => ({ id: x.member.id, label: x.member.name }))} onChange={(id) => s.setMemberId(id)} />
      ) : (
        <Select className="max-w-[320px]" label="Üye" value={m.id} onChange={(id) => s.setMemberId(id)} options={model.members.map((x) => ({ value: x.member.id, label: x.member.name }))} />
      )}

      {/* üye künyesi */}
      <section className="card flex flex-wrap items-center gap-x-6 gap-y-3 !py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[14px] font-[650] text-ink">
            {m.name} <Tag kind="kurgusal" />
          </div>
          <div className="tnum text-[12px] text-ink2">
            {da(m.areaDa)} da · kota {mm(m.quotaMm)} ({m3(mv.quotaM3)}) · {METHOD_LABEL[m.method]} sulama, randıman {pct(s.eff[m.method])}
          </div>
        </div>
        <div className="min-w-[220px] flex-1 text-[12px]">
          <div className="mb-1 text-ink2">Bugünkü ekim</div>
          {mv.currentParcels.length ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {mv.currentParcels.map((p, k) => (
                <span key={k} className="tnum whitespace-nowrap">
                  <Swatch id={p.crop.id} />
                  {p.crop.name} <span className="text-ink2">{da(p.areaDa)} da</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-ink2">girilmedi</span>
          )}
          {mv.currentAreaDa > m.areaDa + 0.05 && <div className="font-semibold text-crit-ink">Ekim tarladan büyük: dekarları düzeltin.</div>}
        </div>
      </section>

      {/* bugünkü ekimden önerilen plana ne değişiyor */}
      <div className="kpi-grid">
        <Shift
          label="Su bitiş tarihi"
          tag="hesap"
          from={medCur ? fmtDayMonth(medCur) : 'kota yetiyor'}
          to={medPl ? fmtDayMonth(medPl) : 'Kota yetiyor'}
          tone={medPl ? 'crit' : 'good'}
          hint={medCur ? `Bugünkü ekimde kota 20 yılın ${cur.yearsExceeded}${inSuffix(cur.yearsExceeded)} bitiyor` : 'Bugünkü ekimde de kota aşılmıyor'}
        />
        <Shift
          label="Karşılanan su ihtiyacı"
          tag="hesap"
          from={pct(mv.currentWater.coverage)}
          to={pct(mv.plannedWater.coverage)}
          hint={`İhtiyaç ${m3(mv.currentWater.demandM3)} → ${m3(mv.plannedWater.demandM3)}`}
        />
        <Shift label="Ortalama verim düzeyi" tag="hesap" from={pct(mv.currentWater.yieldLevel)} to={pct(mv.plannedWater.yieldLevel)} hint="Tam sulu verimin yüzdesi, alan ağırlıklı" />
        <Shift label="Toprak puanı" tag="hesap" from={mv.currentSoil.score} to={`${mv.plannedSoil.score} / 100`} hint={`Baklagil payı ${pct(mv.currentSoil.legumeShare)} → ${pct(mv.plannedSoil.legumeShare)}`} />
      </div>

      {model.plan.status === 'partial' && (
        <Note tone="warn">
          Kooperatifin taahhüdü bu kısıtlarla karşılanamıyor; önerilen plan taahhüde en çok yaklaşan plandır. Ayrıntı için{' '}
          <button type="button" className="link-button !text-inherit" onClick={() => s.setTab('taahhut')}>
            Taahhüt
          </button>{' '}
          ekranına bakın.
        </Note>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Panel kind="current" w={weather} mv={mv} model={model} yearSel={yearSel} yMax={yMax} />
        <Panel kind="planned" w={weather} mv={mv} model={model} yearSel={yearSel} yMax={yMax} />
      </div>

      <Card>
        <H2 right={<Tag kind="hesap" />}>Yıl yıl: su ihtiyacının karşılanan kısmı</H2>
        <YearCoverage mv={mv} />
        <p className="mb-0 mt-3 text-[11px] text-ink2">
          Bugünkü ekimin sonuçları, aynı ekim 2006-2025'in her yılında yapılsaydı ne olacağını gösterir; üyenin o yıllarda gerçekte ne ektiği bilinmiyor. Toprak puanı: {SOIL_FORMULA}. Bir gösterge
          olarak okunmalı; toprak analizi değildir.
        </p>
      </Card>

      <MemberEditor id={editing} onClose={() => setEditing(null)} />
    </>
  );
}
