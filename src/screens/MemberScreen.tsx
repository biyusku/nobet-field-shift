import { Plus, Sprout, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cropName, CropBar, HonestyBanner, UnreliableMark } from '../components/bits';
import { Card, Change, Empty, H2, Kpi, Note, NumInput, PageHeader, Segmented, Sparkline, Stat, Swatch, Tag } from '../components/ui';
import { WaterChart } from '../components/WaterChart';
import { METHOD_LABEL } from '../data/defaults';
import { levelLabel } from '../engine/curves';
import type { FarmEvaluation } from '../engine/farm';
import { SOIL_FORMULA, type SoilScore } from '../engine/soil';
import { FALLOW, type IrrigationMethod, type Member, type Weather } from '../engine/types';
import { dateOfIndex } from '../engine/weather';
import { da, dec2, fmtDayMonth, inSuffix, int, m3, mm, pct, tlShort, ton } from '../lib/format';
import type { MemberView, Model } from '../model';
import { useStore } from '../state';

function endDates(w: Weather, ev: FarmEvaluation): Date[] {
  return ev.years.filter((y) => y.endDay !== null).map((y) => dateOfIndex(w, y.start + y.endDay!));
}
const md = (d: Date) => (d.getUTCMonth() + 1) * 100 + d.getUTCDate();

function Hero({ w, ev, kind }: { w: Weather; ev: FarmEvaluation; kind: 'current' | 'planned' }) {
  const dates = endDates(w, ev).sort((a, b) => md(a) - md(b));
  const n = ev.years.length;
  if (dates.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink2">
          Su bitiş tarihi <Tag kind="hesap" />
        </div>
        <div className="text-[28px] font-bold leading-[1.1] tracking-tight text-good-ink sm:text-[34px]">Kota yetiyor</div>
        <div className="mt-1 text-[13px] text-ink2">
          {kind === 'planned'
            ? `Su parsellere önceden paylaştırıldı; ${n} yılın hiçbirinde kota aşılmıyor.`
            : `${n} yılın hiçbirinde sulama ihtiyacı kotayı aşmıyor.`}
        </div>
      </div>
    );
  }
  const medYear = ev.years[ev.medianIndex];
  const medDate = medYear.endDay !== null ? dateOfIndex(w, medYear.start + medYear.endDay) : dates[Math.floor((dates.length - 1) / 2)];
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink2">
        Su bitiş tarihi <Tag kind="hesap" />
      </div>
      <div className="text-[28px] font-bold leading-[1.1] tracking-tight text-crit-ink sm:text-[34px]">{fmtDayMonth(medDate)}</div>
      <div className="mt-1 text-[13px] text-ink2">
        20 yılın ortancası: sulama ihtiyacı kotayı bu gün aşıyor. En erken <strong className="text-ink">{fmtDayMonth(dates[0])}</strong>, en geç{' '}
        <strong className="text-ink">{fmtDayMonth(dates[dates.length - 1])}</strong>. Kota {n} yılın {dates.length}
        {inSuffix(dates.length)} bitiyor.
      </div>
    </div>
  );
}

function SoilStat({ s }: { s: SoilScore }) {
  return (
    <Stat
      label="Toprak puanı"
      tag="hesap"
      value={
        <>
          {s.score}
          <span className="text-[13px] font-normal text-muted"> / 100</span>
        </>
      }
      sub={`baklagil ${pct(s.legumeShare)} · etkin ürün ${dec2(s.effectiveCrops)}`}
    />
  );
}

function Panel({
  kind,
  w,
  mv,
  model,
  yearSel,
  yMax,
}: {
  kind: 'current' | 'planned';
  w: Weather;
  mv: MemberView;
  model: Model;
  yearSel: number | 'median';
  yMax: number;
}) {
  const ev = kind === 'current' ? mv.current : mv.planned;
  const names = new Map(model.crops.map((c) => [c.id, c.name]));
  const yi = yearSel === 'median' ? ev.medianIndex : yearSel;
  const n = ev.years.length || 1;
  const areas: Record<string, number> = {};
  if (kind === 'current') {
    for (const p of mv.currentParcels) areas[p.crop.id] = (areas[p.crop.id] ?? 0) + p.areaDa;
    if (mv.member.areaDa - mv.currentAreaDa > 0.05) areas[FALLOW] = mv.member.areaDa - mv.currentAreaDa;
  } else for (const a of mv.plannedAllocs) areas[a.cropId] = (areas[a.cropId] ?? 0) + a.da;

  const revenue = kind === 'current' ? ev.meanRevenue : mv.plannedSummary.revenue;
  const deficit = mv.plannedAllocs.filter((a) => a.option && a.da >= 0.05 && a.option.meanRel < 0.97);

  return (
    <Card className="min-w-0">
      <H2>{kind === 'current' ? 'Bugünkü ekim' : 'Önerilen plan'}</H2>
      <Hero w={w} ev={ev} kind={kind} />
      {kind === 'planned' && deficit.length > 0 && (
        <div className="mt-2 text-[13px] text-ink2">
          Bilerek kısıntılı sulanan parseller:{' '}
          {deficit.map((a, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {cropName(a.cropId, names)} ({a.option!.level === 0 ? 'susuz' : mm(a.waterMm)}, beklenen verim {pct(a.option!.meanRel)})
            </span>
          ))}
          . Bu parsellerde su, ayrılan miktar bitince kesilir; kota aşılmaz.
        </div>
      )}
      <div className="mt-3">
        <WaterChart w={w} ev={ev} yearIndex={yi} quotaM3={mv.quotaM3} yMax={yMax} kind={kind} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Stat label="Brüt gelir" tag="hesap" value={tlShort(revenue)} sub="20 yıl ortalaması; girdiler düşülmedi" />
        <Stat
          label="Kullanılan su"
          tag="hesap"
          value={m3(ev.meanUsedM3)}
          sub={`kotanın ${pct(mv.quotaM3 > 0 ? ev.meanUsedM3 / mv.quotaM3 : 0)}'i · 20 yıl ort.`}
        />
        <SoilStat s={kind === 'current' ? mv.currentSoil : mv.plannedSoil} />
      </div>

      <div className="mt-4">
        <CropBar areas={areas} names={names} />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Ürün</th>
              <th className="num">Alan (da)</th>
              <th className="num">
                Su (mm/da) <Tag kind="hesap" />
              </th>
              <th className="num">
                Göreli verim <Tag kind="hesap" />
              </th>
              <th className="num">
                Üretim (t) <Tag kind="hesap" />
              </th>
            </tr>
          </thead>
          <tbody>
            {kind === 'current'
              ? mv.currentParcels.map((p, k) => {
                  const rel = ev.years.reduce((s, y) => s + y.relYield[k], 0) / n;
                  const gross = ev.years.reduce((s, y) => s + y.grossMm[k], 0) / n;
                  return (
                    <tr key={k}>
                      <td>
                        <Swatch id={p.crop.id} />
                        {p.crop.name}
                        <UnreliableMark rel={rel} />
                      </td>
                      <td className="num">{da(p.areaDa)}</td>
                      <td className="num">{int(gross)}</td>
                      <td className="num">{dec2(rel)}</td>
                      <td className="num">{ton((rel * p.crop.yieldKgDa * p.areaDa) / 1000)}</td>
                    </tr>
                  );
                })
              : mv.plannedAllocs
                  .filter((a) => a.da >= 0.05)
                  .map((a, k) => {
                    const c = model.cropById.get(a.cropId);
                    return (
                      <tr key={k}>
                        <td>
                          <Swatch id={a.cropId} />
                          {cropName(a.cropId, names)}
                          {a.option && <span className="text-ink2"> · {levelLabel(a.option.level)}</span>}
                          {a.option && <UnreliableMark rel={a.option.meanRel} />}
                        </td>
                        <td className="num">{da(a.da)}</td>
                        <td className="num">{a.option ? int(a.waterMm) : '–'}</td>
                        <td className="num">{a.option ? dec2(a.option.meanRel) : '–'}</td>
                        <td className="num">{a.option && c ? ton((a.option.meanRel * c.yieldKgDa * a.da) / 1000) : '–'}</td>
                      </tr>
                    );
                  })}
            {kind === 'current' && mv.currentParcels.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  Bugünkü ekim girilmedi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {kind === 'current' ? (
        <p className="mb-0 mt-2 text-[12px] text-muted">
          Bugünkü ekimde su parseller arasında paylaştırılmaz: ihtiyaç duyan parsel sulanır, kota bitince hepsi susuz kalır. Su sütunu 20 yılın ortalamasıdır.
        </p>
      ) : (
        <p className="mb-0 mt-2 text-[12px] text-muted">
          Su sütunu parsele ayrılan tavandır (20 yılın en kurak yılına göre); çoğu yıl daha azı kullanılır. Plan, kooperatifin taahhüdünü de gözeterek bütün üyeler için birlikte çözülür.
        </p>
      )}

      {kind === 'planned' && <RotationTable mv={mv} names={names} />}
    </Card>
  );
}

function RotationTable({ mv, names }: { mv: MemberView; names: Map<string, string> }) {
  const r = mv.rotation;
  return (
    <div className="mt-5">
      <h3 className="m-0 mb-1 text-[13px] font-[650]">
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
                <td className="whitespace-nowrap">
                  {'ABC'[p]} <span className="text-muted">({da(r.parcelDa)} da)</span>
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
      <p className="mb-0 mt-2 text-[12px] text-muted">
        Tarla üç eş parsele bölünür, desen her yıl bir parsel kayar; her yıl aynı ürün karışımı ekildiği için su ve üretim hesabı değişmez.{' '}
        {r.guaranteed
          ? 'Hiçbir ürün tarlanın üçte birini aşmadığı için aynı toprağa aynı ürün ancak üç yılda bir gelir.'
          : 'Uyarı: bir ürün tarlanın üçte birini aşıyor; aynı toprağa üst üste aynı ürün gelebilir.'}
      </p>
    </div>
  );
}

function Editor({ m, model }: { m: Member; model: Model }) {
  const s = useStore();
  const [unit, setUnit] = useState<'mm' | 'm3'>('mm');
  const sum = m.current.reduce((x, c) => x + c.da, 0);
  const over = sum > m.areaDa + 0.05;
  const setCurrent = (i: number, patch: Partial<{ cropId: string; da: number }>) =>
    s.updateMember(m.id, { current: m.current.map((c, k) => (k === i ? { ...c, ...patch } : c)) });
  return (
    <Card>
      <H2 right={<Tag kind="kurgusal" />}>Üye bilgileri</H2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="col-span-2 block text-[12px] text-ink2 md:col-span-1">
          Ad
          <input className="field mt-0.5" value={m.name} onChange={(e) => s.updateMember(m.id, { name: e.target.value })} />
        </label>
        <label className="block text-[12px] text-ink2">
          Tarla büyüklüğü
          <NumInput className="mt-0.5 w-full" label="Tarla büyüklüğü (dekar)" value={m.areaDa} min={1} max={100000} decimals={1} suffix="da" onChange={(v) => s.updateMember(m.id, { areaDa: v })} />
        </label>
        <div className="text-[12px] text-ink2">
          <div className="flex items-center justify-between">
            <span>Yıllık kota</span>
            <span className="flex gap-1">
              {(['mm', 'm3'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  aria-pressed={unit === u}
                  className={`cursor-pointer rounded-md border px-1.5 text-[11px] font-medium ${unit === u ? 'border-transparent bg-[var(--primary)] text-[var(--primary-ink)]' : 'border-line bg-surface text-ink2'}`}
                >
                  {u === 'mm' ? 'mm' : 'm³'}
                </button>
              ))}
            </span>
          </div>
          {unit === 'mm' ? (
            <NumInput className="mt-0.5 w-full" label="Yıllık kota (mm)" value={m.quotaMm} max={5000} decimals={0} suffix="mm" onChange={(v) => s.updateMember(m.id, { quotaMm: v })} />
          ) : (
            <NumInput className="mt-0.5 w-full" label="Yıllık kota (metreküp)" value={m.quotaMm * m.areaDa} max={5e8} decimals={0} suffix="m³" onChange={(v) => s.updateMember(m.id, { quotaMm: v / m.areaDa })} />
          )}
        </div>
        <label className="block text-[12px] text-ink2">
          Sulama yöntemi
          <select className="field mt-0.5" value={m.method} onChange={(e) => s.updateMember(m.id, { method: e.target.value as IrrigationMethod })}>
            {(Object.keys(METHOD_LABEL) as IrrigationMethod[]).map((k) => (
              <option key={k} value={k}>
                {METHOD_LABEL[k]} (randıman {pct(s.eff[k])})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-1 text-[12px] text-muted tnum">
        Kota: {mm(m.quotaMm)} × {da(m.areaDa)} da = {m3(m.quotaMm * m.areaDa)} (1 mm su, 1 dekarda 1 m³)
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[12px] font-semibold text-ink2">Bugünkü ekim</div>
        <div className="flex flex-col gap-2">
          {m.current.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select className="field max-w-[220px]" aria-label="Ürün" value={c.cropId} onChange={(e) => setCurrent(i, { cropId: e.target.value })}>
                {model.crops.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.name}
                  </option>
                ))}
              </select>
              <NumInput className="w-[120px]" label="Dekar" value={c.da} max={100000} decimals={1} suffix="da" onChange={(v) => setCurrent(i, { da: v })} />
              <button type="button" className="icon-button" aria-label="Bu ürünü sil" title="Sil" onClick={() => s.updateMember(m.id, { current: m.current.filter((_, k) => k !== i) })}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn"
            onClick={() => {
              const free = model.crops.find((cr) => !m.current.some((c) => c.cropId === cr.id)) ?? model.crops[0];
              s.updateMember(m.id, { current: [...m.current, { cropId: free.id, da: Math.max(0, +(m.areaDa - sum).toFixed(1)) }] });
            }}
          >
            <Plus /> Ürün ekle
          </button>
          <span className={`text-[13px] tnum ${over ? 'font-semibold text-crit-ink' : 'text-ink2'}`}>
            Toplam {da(sum)} / {da(m.areaDa)} da
            {over ? ': ekim tarladan büyük, dekarları düzeltin' : sum < m.areaDa - 0.05 ? `: kalan ${da(m.areaDa - sum)} da nadas sayılır` : ''}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function MemberScreen() {
  const s = useStore();
  const [yearSel, setYearSel] = useState<number | 'median'>('median');
  const { model, weather } = s;
  if (!model || !weather) return null;
  if (model.members.length === 0)
    return (
      <Empty title="Kooperatifte üye yok">
        <button type="button" className="btn btn-primary mt-3" onClick={() => s.addMember()}>
          <Plus /> Üye ekle
        </button>
      </Empty>
    );
  const mv = model.members.find((x) => x.member.id === s.memberId) ?? model.members[0];
  const maxDemand = Math.max(...mv.current.years.map((y) => y.demandTotalM3), ...mv.planned.years.map((y) => y.demandTotalM3), 0);
  const yMax = Math.max(mv.quotaM3 * 1.25, maxDemand * 1.03, 1);
  const years = mv.current.years.map((y) => y.year);

  const cur = mv.current;
  const pl = mv.planned;
  const medCur = cur.years[cur.medianIndex];
  const curDates = cur.years.filter((y) => y.endDay !== null).map((y) => dateOfIndex(weather, y.start + y.endDay!)).sort((a, b) => md(a) - md(b));

  return (
    <>
      <PageHeader icon={Sprout} title="Üye" meta={`${mv.member.name} · ${weather.name} · 2006–2025`}>
        <label className="pill">
          <span className="font-normal text-ink2">Grafik yılı</span>
          <select aria-label="Grafik yılı" value={String(yearSel)} onChange={(e) => setYearSel(e.target.value === 'median' ? 'median' : Number(e.target.value))}>
            <option value="median">Ortanca yıl</option>
            {years.map((y, i) => (
              <option key={y} value={i}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <HonestyBanner />
      <Segmented label="Üyeler" value={mv.member.id} options={model.members.map((x) => ({ id: x.member.id, label: x.member.name }))} onChange={(id) => s.setMemberId(id)} />

      <div className="kpi-grid">
        <Kpi
          label="Su bitiş tarihi"
          tag="hesap"
          tone={cur.yearsExceeded > 0 ? 'crit' : 'good'}
          value={cur.yearsExceeded > 0 && medCur?.endDay != null ? fmtDayMonth(dateOfIndex(weather, medCur.start + medCur.endDay)) : 'Kota yetiyor'}
          hint={curDates.length ? `Bugünkü ekim · en erken ${fmtDayMonth(curDates[0])}, en geç ${fmtDayMonth(curDates[curDates.length - 1])}` : 'Bugünkü ekim · 20 yılın hiçbirinde aşılmıyor'}
        />
        <Kpi
          label="Brüt gelir"
          tag="hesap"
          value={tlShort(pl.meanRevenue)}
          change={<Change from={cur.meanRevenue} to={pl.meanRevenue} />}
          hint={`Önerilen plan · bugünkü ${tlShort(cur.meanRevenue)}`}
          spark={<Sparkline values={pl.years.map((y) => y.revenue)} compare={cur.years.map((y) => y.revenue)} />}
        />
        <Kpi label="Kullanılan su" tag="hesap" value={m3(pl.meanUsedM3)} hint={`Önerilen plan · kota ${m3(mv.quotaM3)}`} spark={<Sparkline values={pl.years.map((y) => y.usedM3)} />} />
        <Kpi
          label="Toprak puanı"
          tag="hesap"
          value={
            <>
              {mv.plannedSoil.score}
              <span className="text-[12px] font-normal text-ink2"> / 100</span>
            </>
          }
          change={<Change from={mv.currentSoil.score} to={mv.plannedSoil.score} />}
          hint={`Önerilen plan · bugünkü ${mv.currentSoil.score}`}
        />
      </div>

      <Editor m={mv.member} model={model} />

      {model.plan.status === 'partial' && (
        <Note tone="warn">
          Kooperatifin taahhüdü bu kısıtlarla karşılanamıyor; önerilen plan taahhüde en çok yaklaşan plandır. Ayrıntı için{' '}
          <button type="button" className="cursor-pointer border-0 bg-transparent p-0 underline" onClick={() => s.setTab('taahhut')}>
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
        <H2>Bu üyenin geliri, yıl yıl</H2>
        <YearCompare mv={mv} />
        <p className="mb-0 mt-2 text-[12px] text-muted">
          Toprak puanı formülü: {SOIL_FORMULA}. Bir gösterge olarak okunmalı; toprak analizi değildir. Bugünkü ekimin sonuçları, aynı ekim 2006-2025'in her
          yılında yapılsaydı ne olacağını gösterir; üyenin gerçekte o yıllarda ne ektiği bilinmiyor.
        </p>
      </Card>
    </>
  );
}

/** Bugünkü ekim ile önerilen planın 20 yıllık brüt geliri: küçük çubuk çiftleri. */
function YearCompare({ mv }: { mv: MemberView }) {
  const a = mv.current.years;
  const b = mv.planned.years;
  const max = Math.max(...a.map((y) => y.revenue), ...b.map((y) => y.revenue), 1);
  const [hi, setHi] = useState<number | null>(null);
  const H = 120;
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height: H }} onMouseLeave={() => setHi(null)}>
        {a.map((y, i) => (
          <div key={y.year} className="flex h-full flex-1 items-end gap-[2px]" onMouseEnter={() => setHi(i)} title={`${y.year}: bugünkü ${tlShort(y.revenue)}, önerilen ${tlShort(b[i]?.revenue ?? 0)}`}>
            <div className="flex-1 rounded-t-[3px]" style={{ height: `${(y.revenue / max) * 100}%`, background: 'var(--axis)' }} />
            <div className="flex-1 rounded-t-[3px]" style={{ height: `${((b[i]?.revenue ?? 0) / max) * 100}%`, background: 'var(--water)' }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted tnum">
        <span>{a[0]?.year}</span>
        <span>{a[a.length - 1]?.year}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] tnum">
        <span>
          <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--axis)' }} />
          Bugünkü ekim
        </span>
        <span>
          <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--water)' }} />
          Önerilen plan
        </span>
        <Tag kind="hesap" />
        <span className="text-ink2">
          {hi !== null
            ? `${a[hi].year}: bugünkü ${tlShort(a[hi].revenue)} · önerilen ${tlShort(b[hi]?.revenue ?? 0)}`
            : `20 yıl ortalaması: bugünkü ${tlShort(mv.current.meanRevenue)} · önerilen ${tlShort(mv.planned.meanRevenue)}`}
        </span>
      </div>
    </div>
  );
}
