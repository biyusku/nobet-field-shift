// Üye ekranı: tek bakışta "bugün ne oluyor, öneri ne, sonuç ne". Ayrıntı en altta, kapalı.
import { ArrowRight, Check, Pencil, Plus, Sprout } from 'lucide-react';
import { useState } from 'react';
import { cropName, HonestyBanner, UnreliableMark } from '../components/bits';
import { Select } from '../components/kit';
import { MemberEditor } from '../components/MemberEditor';
import { Bars, Brief, Card, Empty, H2, Note, PageHeader, Segmented, Swatch, Tag } from '../components/ui';
import { WaterChart } from '../components/WaterChart';
import { LEGUME_PLAN_SHARE, METHOD_LABEL } from '../data/defaults';
import type { ParcelInput } from '../engine/bucket';
import { levelLabel } from '../engine/curves';
import type { FarmEvaluation, WaterStats } from '../engine/farm';
import { SOIL_FORMULA } from '../engine/soil';
import { FALLOW, type Weather } from '../engine/types';
import { dateOfIndex } from '../engine/weather';
import { da, dec1, fmtDayMonth, inSuffix, int, m3, onSuffix, pct, tlShort, ton } from '../lib/format';
import type { MemberView, PlanOption } from '../model';
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

interface CropRow {
  cropId: string;
  name: string;
  da: number;
  tons: number;
  tl: number;
  irrigated: boolean;
}
/** Parselleri ürün bazında toplar: alan, üretim (t), brüt gelir (TL), sulanıyor mu. */
function cropRows(parcels: ParcelInput[], ws: WaterStats): CropRow[] {
  const by = new Map<string, CropRow>();
  parcels.forEach((p, k) => {
    const st = ws.parcels[k];
    if (!st || p.areaDa < 0.05) return;
    const tons = (st.relYield * p.crop.yieldKgDa * p.areaDa) / 1000;
    const r = by.get(p.crop.id) ?? { cropId: p.crop.id, name: p.crop.name, da: 0, tons: 0, tl: 0, irrigated: false };
    r.da += p.areaDa;
    r.tons += tons;
    r.tl += tons * p.crop.priceTlTon;
    if (st.usedMm >= 1) r.irrigated = true;
    by.set(p.crop.id, r);
  });
  return [...by.values()].sort((a, b) => b.tl - a.tl);
}
const lower = (s: string) => s.toLocaleLowerCase('tr');
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
/** "Mısır 27 dekarda sulanıyor, kalan tarla yağmurla yetişen ürünlere ayrılıyor." */
function irrigationLine(rows: CropRow[]): string {
  const irr = rows.filter((r) => r.irrigated);
  const rain = rows.filter((r) => !r.irrigated).reduce((s, r) => s + r.da, 0);
  if (rows.length === 0) return 'Tarla ekilmiyor.';
  if (irr.length === 0) return 'Tarlanın tamamı yağmurla yetişen ürünlere ayrılıyor.';
  const head = cap(irr.map((r) => `${lower(r.name)} ${da(r.da)} dekarda`).join(', '));
  return rain >= 0.05 ? `${head} sulanıyor, kalan tarla yağmurla yetişen ürünlere ayrılıyor.` : `${head} sulanıyor.`;
}

/** En üstteki karşılaştırma şeridi: ekrandaki en büyük şey. */
function CompareStrip({ mv, medCur, medPl }: { mv: MemberView; medCur: Date | null; medPl: Date | null }) {
  const a = mv.current.meanRevenue;
  const b = mv.planned.meanRevenue;
  const diff = a > 0 ? (b - a) / a : null;
  const side = (title: string, value: number, end: Date | null) => (
    <div className="min-w-0">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-ink2">{title}</div>
      <div className="tnum text-[34px] font-bold leading-[1.1] tracking-tight text-ink sm:text-[46px]">{tlShort(value)}</div>
      <div className={`mt-1 text-[15px] font-semibold ${end ? 'text-crit-ink' : 'text-good-ink'}`}>{end ? `Su ${fmtDayMonth(end)}${onSuffix(end)} bitiyor` : 'Su hakkı aşılmıyor'}</div>
    </div>
  );
  return (
    <section className="card !px-5 !py-5 sm:!px-7">
      <div className="grid items-center gap-x-6 gap-y-4 md:grid-cols-[1fr_auto_1fr]">
        {side('Bugün', a, medCur)}
        <div className="flex items-center gap-3 md:flex-col md:gap-1.5">
          <ArrowRight size={26} className="text-muted max-md:rotate-90" aria-hidden />
          {diff !== null && Math.abs(diff) >= 0.005 && (
            <span className={`tnum rounded-lg px-2.5 py-1 text-[20px] font-bold ${diff >= 0 ? 'bg-[var(--good-bg)] text-good-ink' : 'bg-[var(--crit-bg)] text-crit-ink'}`}>
              {diff >= 0 ? '+' : '−'}%{Math.round(Math.abs(diff) * 100)}
            </span>
          )}
        </div>
        {side('Öneri', b, medPl)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-[12px] text-ink2">
        Yıllık brüt gelir, son 20 yılın havasıyla ortalama. Tohum, gübre, elektrik düşülmedi. <Tag kind="hesap" />
      </div>
    </section>
  );
}

function OptionCard({ title, sub, o, active, names, onPick }: { title: string; sub: string; o: PlanOption; active: boolean; names: Map<string, string>; onPick: () => void }) {
  const by = new Map<string, number>();
  for (const a of o.areas) if (a.da >= 0.05) by.set(a.cropId, (by.get(a.cropId) ?? 0) + a.da);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={`flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border-0 bg-surface p-4 text-left ${active ? 'shadow-[0_0_0_2px_var(--ink)]' : 'shadow-[0_0_0_1px_var(--line)] hover:bg-sunken'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-[650] text-ink">{title}</span>
        {active ? (
          <span className="tag tag-success">
            <Check size={11} /> seçili
          </span>
        ) : (
          <span className="text-[12px] font-medium text-link">Bunu seç</span>
        )}
      </div>
      <div className="text-[12px] text-ink2">{sub}</div>
      <div className="tnum flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <div className="text-[11px] text-ink2">Brüt gelir</div>
          <div className="text-[20px] font-bold text-ink">{tlShort(o.revenue)}</div>
        </div>
        <div>
          <div className="text-[11px] text-ink2">Toprak puanı</div>
          <div className="text-[20px] font-bold text-ink">
            {o.soil.score}
            <span className="text-[12px] font-normal text-ink2"> / 100</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]">
        {[...by].map(([id, d]) => (
          <span key={id} className="tnum whitespace-nowrap">
            <Swatch id={id} />
            {cropName(id, names)} <span className="text-ink2">{da(d)} da</span>
          </span>
        ))}
      </div>
    </button>
  );
}

function Panel({
  kind,
  w,
  mv,
  rows,
  yearSel,
  detail,
  onDetail,
  names,
}: {
  kind: 'current' | 'planned';
  w: Weather;
  mv: MemberView;
  rows: CropRow[];
  yearSel: number | 'median';
  detail: boolean;
  onDetail: () => void;
  names: Map<string, string>;
}) {
  const ev = kind === 'current' ? mv.current : mv.planned;
  const soil = kind === 'current' ? mv.currentSoil : mv.plannedSoil;
  const yi = yearSel === 'median' ? ev.medianIndex : yearSel;
  const med = medianDate(w, ev);
  const dates = endDates(w, ev);
  const n = ev.years.length;
  const cropped = rows.reduce((s, r) => s + r.da, 0);
  const fallowDa = Math.max(0, mv.member.areaDa - cropped);
  const maxDemand = Math.max(...mv.current.years.map((y) => y.demandTotalM3), ...mv.planned.years.map((y) => y.demandTotalM3), 0);
  const yMax = detail ? Math.max(mv.quotaM3 * 1.25, maxDemand * 1.03, 1) : Math.max(mv.quotaM3 * 1.5, 1);

  return (
    <Card className="flex min-w-0 flex-col gap-3">
      <H2 right={<span className="text-[12px] text-ink2">{kind === 'current' ? 'Üyenin şu an ektiği' : 'Su hakkı ve nöbet kurallarıyla hesaplandı'}</span>}>{kind === 'current' ? 'Bugün' : 'Öneri'}</H2>
      <div>
        {med ? (
          <>
            <div className="text-[22px] font-bold leading-tight tracking-tight text-crit-ink">Su {fmtDayMonth(med)}{onSuffix(med)} bitiyor</div>
            <div className="mt-0.5 text-ink2">
              Tipik bir yıl. En erken {fmtDayMonth(dates[0])}, en geç {fmtDayMonth(dates[dates.length - 1])}; {n} yılın {dates.length}
              {inSuffix(dates.length)} böyle. Sonrasında tarla susuz kalıyor.
            </div>
          </>
        ) : (
          <>
            <div className="text-[22px] font-bold leading-tight tracking-tight text-good-ink">Su hakkı aşılmıyor</div>
            <div className="mt-0.5 text-ink2">{irrigationLine(rows)}</div>
          </>
        )}
      </div>

      <div>
        <div className="mb-1 flex justify-end">
          <button type="button" className="link-button text-[12px]" aria-pressed={detail} onClick={onDetail}>
            {detail ? 'Ayrıntıyı gizle' : 'Ayrıntıyı göster'}
          </button>
        </div>
        <WaterChart w={w} ev={ev} yearIndex={yi} quotaM3={mv.quotaM3} yMax={yMax} kind={kind} detail={detail} />
      </div>

      <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Ürün</th>
              <th className="num">Alan</th>
              <th>Su</th>
              <th className="num">
                Üretim
                <Tag kind="hesap" compact />
              </th>
              <th className="num">
                Brüt gelir
                <Tag kind="hesap" compact />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cropId}>
                <td>
                  <Swatch id={r.cropId} />
                  {r.name}
                </td>
                <td className="num">{da(r.da)} da</td>
                <td className="text-ink2">{r.irrigated ? 'sulanıyor' : 'yağmurla'}</td>
                <td className="num">{ton(r.tons)}</td>
                <td className="num">{tlShort(r.tl)}</td>
              </tr>
            ))}
            {fallowDa >= 0.05 && (
              <tr>
                <td>
                  <Swatch id={FALLOW} />
                  Nadas
                </td>
                <td className="num">{da(fallowDa)} da</td>
                <td className="text-ink2">–</td>
                <td className="num text-ink2">–</td>
                <td className="num text-ink2">–</td>
              </tr>
            )}
            {rows.length === 0 && fallowDa < 0.05 && (
              <tr>
                <td colSpan={5} className="text-ink2">
                  Ekim girilmedi.
                </td>
              </tr>
            )}
            <tr className="font-semibold text-ink">
              <td>Toplam</td>
              <td className="num">{da(mv.member.areaDa)} da</td>
              <td></td>
              <td></td>
              <td className="num">{tlShort(rows.reduce((s, r) => s + r.tl, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink2">
        Toprak puanı <strong className="text-ink">{soil.score} / 100</strong> <Tag kind="hesap" /> · üretim ve gelir 20 yılın ortalamasıdır
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
        Hangi parsele hangi yıl ne ekilecek <Tag kind="hesap" />
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
      {!r.guaranteed && <p className="mb-0 mt-2 text-[12px] font-semibold text-warn-ink">Bir ürün tarlanın üçte birini aşıyor; aynı toprağa üst üste aynı ürün gelebilir.</p>}
    </div>
  );
}

// ---------- Ayrıntılar (kapalı bölüm) ----------

function WaterCell({ used, need }: { used: number; need: number }) {
  const r = need > 0 ? Math.min(1, used / need) : 1;
  return (
    <div className="ml-auto w-[120px]">
      <div className="tnum whitespace-nowrap text-right">
        {int(used)} <span className="text-ink2">/ {int(need)} mm</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-[3px] bg-sunken" role="img" aria-label={`İstenen suyun ${pct(r)} kadarı veriliyor`}>
        <div className="h-full rounded-[3px]" style={{ width: `${r * 100}%`, background: 'var(--water)' }} />
      </div>
    </div>
  );
}

function DetailColumn({ kind, mv }: { kind: 'current' | 'planned'; mv: MemberView }) {
  const ws = kind === 'current' ? mv.currentWater : mv.plannedWater;
  const soil = kind === 'current' ? mv.currentSoil : mv.plannedSoil;
  const parcels = kind === 'current' ? mv.currentParcels : mv.plannedParcels;
  const withOption = mv.plannedAllocs.filter((a) => a.option);
  const times = mv.quotaM3 > 0 ? ws.demandM3 / mv.quotaM3 : 0;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h3 className="m-0 text-[13px] font-[650] text-ink">{kind === 'current' ? 'Bugün' : 'Öneri'}</h3>
      <Bars
        unit={m3}
        rows={[
          { label: 'Su hakkı (kota)', value: mv.quotaM3, color: 'var(--crit)' },
          { label: 'Ürünlerin istediği su', value: ws.demandM3, color: 'var(--axis)', note: times >= 1.05 ? `su hakkının ${dec1(times)} katı` : undefined },
          { label: kind === 'current' ? 'Verilebilen su' : 'Planda verilen su', value: ws.usedM3, color: 'var(--water)', note: `istenenin ${pct(ws.coverage)} kadarı` },
        ]}
      />
      <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Parsel</th>
              <th className="num">Alan</th>
              <th className="num">
                Su: verilen / istenen
                <Tag kind="hesap" compact />
              </th>
              <th className="num">
                Alınan ürün
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="tnum text-[12px] text-ink2">
        Alınan ürün (tarla ortalaması) <strong className="text-ink">{pct(ws.yieldLevel)}</strong> · toprak puanı <strong className="text-ink">{soil.score} / 100</strong> (baklagil {pct(soil.legumeShare)}, etkin ürün{' '}
        {dec1(soil.effectiveCrops)})
      </div>
    </div>
  );
}

function YearCoverage({ mv }: { mv: MemberView }) {
  const cov = (ev: FarmEvaluation) => ev.years.map((y) => (y.demandTotalM3 > 0 ? Math.min(1, y.usedM3 / y.demandTotalM3) : 1));
  const a = cov(mv.current);
  const b = cov(mv.planned);
  const years = mv.current.years.map((y) => y.year);
  const [hi, setHi] = useState<number | null>(null);
  return (
    <div>
      <div className="flex h-[100px] items-end gap-[3px]" onMouseLeave={() => setHi(null)}>
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
          Bugün
        </span>
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: 'var(--water)' }} />
          Öneri
        </span>
        <span className="text-ink2">
          {hi !== null ? `${years[hi]}: bugün ${pct(a[hi])} · öneri ${pct(b[hi] ?? 0)}` : `20 yıl ortalaması: bugün ${pct(mv.currentWater.coverage)} · öneri ${pct(mv.plannedWater.coverage)}`}
        </span>
      </div>
    </div>
  );
}

export function MemberScreen() {
  const s = useStore();
  const [yearSel, setYearSel] = useState<number | 'median'>('median');
  const [editing, setEditing] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);
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
  const years = mv.current.years.map((y) => y.year);
  const medCur = medianDate(weather, mv.current);
  const medPl = medianDate(weather, mv.planned);
  const names = new Map(model.crops.map((c) => [c.id, c.name]));
  const curRows = cropRows(mv.currentParcels, mv.currentWater);
  const plRows = cropRows(mv.plannedParcels, mv.plannedWater);
  const list = (rows: CropRow[]) => rows.map((r) => `${da(r.da)} dekar ${lower(r.name)}`).join(', ');
  const a = mv.current.meanRevenue;
  const b = mv.planned.meanRevenue;
  const diff = a > 0 ? (b - a) / a : null;
  const showChooser = mv.options.legume !== null && mv.options.free.legumeDa < 0.05;
  const legumeOn = (s.settings.minLegumeShare ?? 0) > 0;

  return (
    <>
      <PageHeader icon={Sprout} title="Üyeler" meta={`${da(m.areaDa)} da · su hakkı ${m3(mv.quotaM3)} · ${METHOD_LABEL[m.method]} sulama · ${weather.name}`}>
        <Select
          variant="pill"
          prefix="Grafik yılı"
          label="Grafik yılı"
          value={String(yearSel)}
          onChange={(v) => setYearSel(v === 'median' ? 'median' : Number(v))}
          options={[{ value: 'median', label: 'Tipik yıl' }, ...years.map((y, i) => ({ value: String(i), label: String(y) }))]}
        />
        <button type="button" className="btn" onClick={() => setEditing(m.id)}>
          <Pencil /> Üyeyi düzenle
        </button>
      </PageHeader>

      {model.members.length <= 6 ? (
        <Segmented label="Üyeler" value={m.id} options={model.members.map((x) => ({ id: x.member.id, label: x.member.name }))} onChange={(id) => s.setMemberId(id)} />
      ) : (
        <Select className="max-w-[320px]" label="Üye" value={m.id} onChange={(id) => s.setMemberId(id)} options={model.members.map((x) => ({ value: x.member.id, label: x.member.name }))} />
      )}

      <CompareStrip mv={mv} medCur={medCur} medPl={medPl} />

      <Brief>
        <p className="m-0">
          <b>Bugün:</b> {m.name} {curRows.length ? `${list(curRows)} ekiyor` : 'tarlasını ekmiyor'};{' '}
          {medCur ? (
            <>
              su hakkı tipik bir yılda <b className="text-crit-ink">{fmtDayMonth(medCur)}</b>
              {onSuffix(medCur)} bitiyor ve tarla susuz kalıyor.
            </>
          ) : (
            <>su hakkı aşılmıyor.</>
          )}
        </p>
        <p className="m-0">
          <b>Öneri:</b> {plRows.length ? `${list(plRows)} ekmek` : 'tarlayı nadasa bırakmak'}. {irrigationLine(plRows)}
        </p>
        <p className="m-0">
          <b>Sonuç:</b> {medPl ? <>su {fmtDayMonth(medPl)}{onSuffix(medPl)} bitiyor</> : <b className="text-good-ink">su hakkı aşılmıyor</b>}, yıllık brüt gelir {tlShort(a)} yerine <b>{tlShort(b)}</b> oluyor
          {diff !== null && Math.abs(diff) >= 0.005 ? ` (${diff >= 0 ? '+' : '−'}%${Math.round(Math.abs(diff) * 100)})` : ''}.
        </p>
      </Brief>

      {showChooser && mv.options.legume && (
        <Card>
          <H2 right={<Tag kind="hesap" />}>İki seçenek: hangisi olsun?</H2>
          <p className="m-0 mb-3 text-ink2">
            En yüksek geliri veren planda bu üyenin tarlasında baklagil yok. Nohut toprağı dinlendirir; gelire ve toprak puanına etkisi aşağıda. Araç seçmez, ikisini yan yana gösterir.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <OptionCard title="Gelir planı" sub="En yüksek brüt gelir; baklagil şartı yok." o={mv.options.free} active={!legumeOn} names={names} onPick={() => s.updateSettings({ minLegumeShare: 0 })} />
            <OptionCard
              title="Nohutlu plan"
              sub={`Her üyenin tarlasının en az ${pct(LEGUME_PLAN_SHARE)} kadarı baklagil.`}
              o={mv.options.legume}
              active={legumeOn}
              names={names}
              onPick={() => s.updateSettings({ minLegumeShare: LEGUME_PLAN_SHARE })}
            />
          </div>
          <p className="mb-0 mt-2 text-[11px] text-ink2">Seçim bütün kooperatifin planına uygulanır; öbür üyelerin önerisi de değişir.</p>
        </Card>
      )}

      {model.plan.status === 'partial' && (
        <Note tone="warn">
          Kooperatifin alıcıya verdiği satış sözü bu suyla tutmuyor; buradaki öneri, söze en çok yaklaşan plandır. Ayrıntı için{' '}
          <button type="button" className="link-button !text-inherit" onClick={() => s.setTab('taahhut')}>
            Taahhüt
          </button>{' '}
          ekranına bakın.
        </Note>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Panel kind="current" w={weather} mv={mv} rows={curRows} yearSel={yearSel} detail={detail} onDetail={() => setDetail((v) => !v)} names={names} />
        <Panel kind="planned" w={weather} mv={mv} rows={plRows} yearSel={yearSel} detail={detail} onDetail={() => setDetail((v) => !v)} names={names} />
      </div>

      <details className="card group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-[650] text-ink">
          <span>Ayrıntılar</span>
          <span className="text-[12px] font-normal text-ink2 group-open:hidden">su bütçesi, parsel parsel su, yıl yıl sonuç, toprak puanı formülü</span>
        </summary>
        <div className="mt-4 flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <DetailColumn kind="current" mv={mv} />
            <DetailColumn kind="planned" mv={mv} />
          </div>
          <div>
            <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[13px] font-[650] text-ink">
              Yıl yıl: istenen suyun ne kadarı verilebildi <Tag kind="hesap" />
            </h3>
            <YearCoverage mv={mv} />
          </div>
          <p className="m-0 text-[12px] text-ink2">
            Bugünkü ekimin sonuçları, aynı ekim 2006-2025'in her yılında yapılsaydı ne olacağını gösterir; üyenin o yıllarda gerçekte ne ektiği bilinmiyor. "Alınan ürün", doya doya sulanan tarlaya göre
            yüzdedir. Toprak puanı: {SOIL_FORMULA}. Bir göstergedir; toprak analizi değildir.
          </p>
        </div>
      </details>

      <HonestyBanner />
      <MemberEditor id={editing} onClose={() => setEditing(null)} />
    </>
  );
}
