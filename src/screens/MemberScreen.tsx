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
import { SOIL_FORMULA, SOIL_FORMULA_EN } from '../engine/soil';
import { FALLOW, type Weather } from '../engine/types';
import { dateOfIndex } from '../engine/weather';
import { cropLabel, getLang, L, lower as lowerL, memberLabel } from '../i18n';
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
const lower = (s: string) => lowerL(s);
const cap = (s: string) => s.charAt(0).toLocaleUpperCase(getLang() === 'en' ? 'en-US' : 'tr') + s.slice(1);
/** Ekranda gösterilen ürün adı (dile göre) */
const rowName = (r: { cropId: string; name: string }) => cropLabel(r.cropId, r.name);
/** Su seviyesi etiketi (motor Türkçe döndürür) */
const lvl = (level: number | null) => L(levelLabel(level), level === null ? 'full' : level === 0 ? 'rain-fed' : `${level} mm`);
/** "Mısır 27 dekarda sulanıyor, kalan tarla yağmurla yetişen ürünlere ayrılıyor." */
function irrigationLine(rows: CropRow[]): string {
  const irr = rows.filter((r) => r.irrigated);
  const rain = rows.filter((r) => !r.irrigated).reduce((s, r) => s + r.da, 0);
  if (rows.length === 0) return L('Tarla ekilmiyor.', 'The field is not planted.');
  if (irr.length === 0) return L('Tarlanın tamamı yağmurla yetişen ürünlere ayrılıyor.', 'The whole field goes to rain-fed crops.');
  if (getLang() === 'en') {
    const headEn = cap(irr.map((r) => `${lower(rowName(r))} is irrigated on ${da(r.da)} decares`).join(', '));
    return rain >= 0.05 ? `${headEn}; the rest of the field goes to rain-fed crops.` : `${headEn}.`;
  }
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
      <div className={`mt-1 text-[15px] font-semibold ${end ? 'text-crit-ink' : 'text-good-ink'}`}>{end ? L(`Su ${fmtDayMonth(end)}${onSuffix(end)} bitiyor`, `Water runs out on ${fmtDayMonth(end)}`) : L('Su hakkı aşılmıyor', 'Water allowance is not exceeded')}</div>
    </div>
  );
  return (
    <section className="card !px-5 !py-5 sm:!px-7">
      <div className="grid items-center gap-x-6 gap-y-4 md:grid-cols-[1fr_auto_1fr]">
        {side(L('Bugün', 'Today'), a, medCur)}
        <div className="flex items-center gap-3 md:flex-col md:gap-1.5">
          <ArrowRight size={26} className="text-muted max-md:rotate-90" aria-hidden />
          {diff !== null && Math.abs(diff) >= 0.005 && (
            <span className={`tnum rounded-lg px-2.5 py-1 text-[20px] font-bold ${diff >= 0 ? 'bg-[var(--good-bg)] text-good-ink' : 'bg-[var(--crit-bg)] text-crit-ink'}`}>
              {diff >= 0 ? '+' : '−'}{L(`%${Math.round(Math.abs(diff) * 100)}`, `${Math.round(Math.abs(diff) * 100)}%`)}
            </span>
          )}
        </div>
        {side(L('Öneri', 'Recommendation'), b, medPl)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-[12px] text-ink2">
        {L('Yıllık brüt gelir, son 20 yılın havasıyla ortalama. Tohum, gübre, elektrik düşülmedi.', 'Annual gross revenue, averaged over the weather of the last 20 years. Seed, fertiliser and electricity are not deducted.')} <Tag kind="hesap" />
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
            <Check size={11} /> {L('seçili', 'selected')}
          </span>
        ) : (
          <span className="text-[12px] font-medium text-link">{L('Bunu seç', 'Choose this')}</span>
        )}
      </div>
      <div className="text-[12px] text-ink2">{sub}</div>
      <div className="tnum flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <div className="text-[11px] text-ink2">{L('Brüt gelir', 'Gross revenue')}</div>
          <div className="text-[20px] font-bold text-ink">{tlShort(o.revenue)}</div>
        </div>
        <div>
          <div className="text-[11px] text-ink2">{L('Toprak puanı', 'Soil score')}</div>
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
      <H2 right={<span className="text-[12px] text-ink2">{kind === 'current' ? L('Üyenin şu an ektiği', 'What the member plants now') : L('Su hakkı ve nöbet kurallarıyla hesaplandı', 'Calculated with the water allowance and rotation rules')}</span>}>{kind === 'current' ? L('Bugün', 'Today') : L('Öneri', 'Recommendation')}</H2>
      <div>
        {med ? (
          <>
            <div className="text-[22px] font-bold leading-tight tracking-tight text-crit-ink">{L(`Su ${fmtDayMonth(med)}${onSuffix(med)} bitiyor`, `Water runs out on ${fmtDayMonth(med)}`)}</div>
            <div className="mt-0.5 text-ink2">
              {L(
                `Tipik bir yıl. En erken ${fmtDayMonth(dates[0])}, en geç ${fmtDayMonth(dates[dates.length - 1])}; ${n} yılın ${dates.length}${inSuffix(dates.length)} böyle. Sonrasında tarla susuz kalıyor.`,
                `A typical year. Earliest ${fmtDayMonth(dates[0])}, latest ${fmtDayMonth(dates[dates.length - 1])}; this happens in ${dates.length} of ${n} years. After that the field goes without water.`,
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-[22px] font-bold leading-tight tracking-tight text-good-ink">{L('Su hakkı aşılmıyor', 'Water allowance is not exceeded')}</div>
            <div className="mt-0.5 text-ink2">{irrigationLine(rows)}</div>
          </>
        )}
      </div>

      <div>
        <div className="mb-1 flex justify-end">
          <button type="button" className="link-button text-[12px]" aria-pressed={detail} onClick={onDetail}>
            {detail ? L('Ayrıntıyı gizle', 'Hide details') : L('Ayrıntıyı göster', 'Show details')}
          </button>
        </div>
        <WaterChart w={w} ev={ev} yearIndex={yi} quotaM3={mv.quotaM3} yMax={yMax} kind={kind} detail={detail} />
      </div>

      <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>{L('Ürün', 'Crop')}</th>
              <th className="num">{L('Alan', 'Area')}</th>
              <th>{L('Su', 'Water')}</th>
              <th className="num">
                {L('Üretim', 'Production')}
                <Tag kind="hesap" compact />
              </th>
              <th className="num">
                {L('Brüt gelir', 'Gross revenue')}
                <Tag kind="hesap" compact />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cropId}>
                <td>
                  <Swatch id={r.cropId} />
                  {rowName(r)}
                </td>
                <td className="num">{da(r.da)} da</td>
                <td className="text-ink2">{r.irrigated ? L('sulanıyor', 'irrigated') : L('yağmurla', 'rain-fed')}</td>
                <td className="num">{ton(r.tons)}</td>
                <td className="num">{tlShort(r.tl)}</td>
              </tr>
            ))}
            {fallowDa >= 0.05 && (
              <tr>
                <td>
                  <Swatch id={FALLOW} />
                  {L('Nadas', 'Fallow')}
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
                  {L('Ekim girilmedi.', 'No planting entered.')}
                </td>
              </tr>
            )}
            <tr className="font-semibold text-ink">
              <td>{L('Toplam', 'Total')}</td>
              <td className="num">{da(mv.member.areaDa)} da</td>
              <td></td>
              <td></td>
              <td className="num">{tlShort(rows.reduce((s, r) => s + r.tl, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink2">
        {L('Toprak puanı', 'Soil score')} <strong className="text-ink">{soil.score} / 100</strong> <Tag kind="hesap" /> · {L('üretim ve gelir 20 yılın ortalamasıdır', 'production and revenue are 20-year averages')}
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
        {L('Hangi parsele hangi yıl ne ekilecek', 'What to plant on which plot each year')} <Tag kind="hesap" />
      </h3>
      <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>{L('Parsel', 'Plot')}</th>
              <th>{L('1. yıl', 'Year 1')}</th>
              <th>{L('2. yıl', 'Year 2')}</th>
              <th>{L('3. yıl', 'Year 3')}</th>
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
      {!r.guaranteed && <p className="mb-0 mt-2 text-[12px] font-semibold text-warn-ink">{L('Bir ürün tarlanın üçte birini aşıyor; aynı toprağa üst üste aynı ürün gelebilir.', 'One crop takes more than a third of the field; the same crop may follow itself on the same soil.')}</p>}
      {r.adjusted && <p className="mb-0 mt-2 text-[12px] text-ink2">{L('Ekilemeyecek kadar küçük bir parça komşu parsele katıldı; bu tablodaki alanlar yukarıdaki plandan birkaç dekar sapar.', 'A piece too small to plant was merged into the neighbouring plot; the areas in this table differ from the plan above by a few decares.')}</p>}
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
      <div className="mt-1 h-1.5 overflow-hidden rounded-[3px] bg-sunken" role="img" aria-label={L(`İstenen suyun ${pct(r)} kadarı veriliyor`, `${pct(r)} of the demanded water is applied`)}>
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
      <h3 className="m-0 text-[13px] font-[650] text-ink">{kind === 'current' ? L('Bugün', 'Today') : L('Öneri', 'Recommendation')}</h3>
      <Bars
        unit={m3}
        rows={[
          { label: L('Su hakkı (kota)', 'Water allowance (quota)'), value: mv.quotaM3, color: 'var(--crit)' },
          { label: L('Ürünlerin istediği su', 'Water the crops demand'), value: ws.demandM3, color: 'var(--axis)', note: times >= 1.05 ? L(`su hakkının ${dec1(times)} katı`, `${dec1(times)} times the allowance`) : undefined },
          { label: kind === 'current' ? L('Verilebilen su', 'Water that can be applied') : L('Planda verilen su', 'Water applied in the plan'), value: ws.usedM3, color: 'var(--water)', note: L(`istenenin ${pct(ws.coverage)} kadarı`, `${pct(ws.coverage)} of the demand`) },
        ]}
      />
      <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>{L('Parsel', 'Plot')}</th>
              <th className="num">{L('Alan', 'Area')}</th>
              <th className="num">
                {L('Su: verilen / istenen', 'Water: applied / demanded')}
                <Tag kind="hesap" compact />
              </th>
              <th className="num">
                {L('Alınan ürün', 'Yield obtained')}
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
                    {cropLabel(p.crop.id, p.crop.name)}
                    {opt && <span className="text-ink2"> · {lvl(opt.level)}</span>}
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
        {L('Alınan ürün (tarla ortalaması)', 'Yield obtained (field average)')} <strong className="text-ink">{pct(ws.yieldLevel)}</strong> · {L('toprak puanı', 'soil score')}{' '}
        <strong className="text-ink">{soil.score} / 100</strong> ({L('baklagil', 'legumes')} {pct(soil.legumeShare)}, {L('etkin ürün', 'effective crops')} {dec1(soil.effectiveCrops)})
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
          {L('Bugün', 'Today')}
        </span>
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: 'var(--water)' }} />
          {L('Öneri', 'Recommendation')}
        </span>
        <span className="text-ink2">
          {hi !== null
            ? L(`${years[hi]}: bugün ${pct(a[hi])} · öneri ${pct(b[hi] ?? 0)}`, `${years[hi]}: today ${pct(a[hi])} · recommendation ${pct(b[hi] ?? 0)}`)
            : L(
                `20 yıl ortalaması: bugün ${pct(mv.currentWater.coverage)} · öneri ${pct(mv.plannedWater.coverage)}`,
                `20-year average: today ${pct(mv.currentWater.coverage)} · recommendation ${pct(mv.plannedWater.coverage)}`,
              )}
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
  const { model } = s;
  if (!model) return null;
  if (model.members.length === 0)
    return (
      <>
        <PageHeader icon={Sprout} title={L('Üye', 'Member')} />
        <Empty title={L('Kooperatifte üye yok', 'The cooperative has no members')}>
          {L('Su bütçesini görmek için bir üye ekleyin.', 'Add a member to see the water budget.')}
          <div>
            <button type="button" className="btn btn-primary mt-3" onClick={() => setEditing(s.addMember())}>
              <Plus /> {L('Üye ekle', 'Add member')}
            </button>
          </div>
        </Empty>
        <MemberEditor id={editing} onClose={() => setEditing(null)} />
      </>
    );
  const mv = model.members.find((x) => x.member.id === s.memberId) ?? model.members[0];
  const m = mv.member;
  const years = mv.current.years.map((y) => y.year);
  // her üye kendi ilçesinin havasıyla hesaplanır
  const weather = mv.weather;
  const medCur = medianDate(weather, mv.current);
  const medPl = medianDate(weather, mv.planned);
  const names = new Map(model.crops.map((c) => [c.id, c.name]));
  const curRows = cropRows(mv.currentParcels, mv.currentWater);
  const plRows = cropRows(mv.plannedParcels, mv.plannedWater);
  const list = (rows: CropRow[]) =>
    rows.map((r) => L(`${da(r.da)} dekar ${lower(r.name)}`, `${da(r.da)} decares of ${lower(rowName(r))}`)).join(', ');
  const a = mv.current.meanRevenue;
  const b = mv.planned.meanRevenue;
  const diff = a > 0 ? (b - a) / a : null;
  const showChooser = mv.options.legume !== null && mv.options.free.legumeDa < 0.05;
  const legumeOn = (s.settings.minLegumeShare ?? 0) > 0;

  return (
    <>
      <PageHeader
        icon={Sprout}
        title={L('Üyeler', 'Members')}
        meta={L(
          `${da(m.areaDa)} da · su hakkı ${m3(mv.quotaM3)} · ${METHOD_LABEL[m.method]} sulama · ${weather.name}`,
          `${da(m.areaDa)} da · water allowance ${m3(mv.quotaM3)} · ${METHOD_LABEL[m.method]} irrigation · ${weather.name}`,
        )}
      >
        <Select
          variant="pill"
          prefix={L('Grafik yılı', 'Chart year')}
          label={L('Grafik yılı', 'Chart year')}
          value={String(yearSel)}
          onChange={(v) => setYearSel(v === 'median' ? 'median' : Number(v))}
          options={[{ value: 'median', label: L('Tipik yıl', 'Typical year') }, ...years.map((y, i) => ({ value: String(i), label: String(y) }))]}
        />
        <button type="button" className="btn" onClick={() => setEditing(m.id)}>
          <Pencil /> {L('Üyeyi düzenle', 'Edit member')}
        </button>
      </PageHeader>

      {model.members.length <= 6 ? (
        <Segmented label={L('Üyeler', 'Members')} value={m.id} options={model.members.map((x) => ({ id: x.member.id, label: memberLabel(x.member.name) }))} onChange={(id) => s.setMemberId(id)} />
      ) : (
        <Select className="max-w-[320px]" label={L('Üye', 'Member')} value={m.id} onChange={(id) => s.setMemberId(id)} options={model.members.map((x) => ({ value: x.member.id, label: memberLabel(x.member.name) }))} />
      )}

      <CompareStrip mv={mv} medCur={medCur} medPl={medPl} />

      {getLang() === 'en' ? (
        <Brief>
          <p className="m-0">
            <b>Today:</b> {memberLabel(m.name)} {curRows.length ? `plants ${list(curRows)}` : 'leaves the field unplanted'};{' '}
            {medCur ? (
              <>
                in a typical year the water allowance runs out on <b className="text-crit-ink">{fmtDayMonth(medCur)}</b> and the field goes without water.
              </>
            ) : (
              <>the water allowance is not exceeded.</>
            )}
          </p>
          <p className="m-0">
            <b>Recommendation:</b> {plRows.length ? `plant ${list(plRows)}` : 'leave the field fallow'}. {irrigationLine(plRows)}
          </p>
          <p className="m-0">
            <b>Result:</b> {medPl ? <>water runs out on {fmtDayMonth(medPl)}</> : <b className="text-good-ink">the water allowance is not exceeded</b>}; annual gross revenue becomes <b>{tlShort(b)}</b> instead of {tlShort(a)}
            {diff !== null && Math.abs(diff) >= 0.005 ? ` (${diff >= 0 ? '+' : '−'}${Math.round(Math.abs(diff) * 100)}%)` : ''}.
          </p>
        </Brief>
      ) : (
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
      )}

      {showChooser && mv.options.legume && (
        <Card>
          <H2 right={<Tag kind="hesap" />}>{L('İki seçenek: hangisi olsun?', 'Two options: which one?')}</H2>
          <p className="m-0 mb-3 text-ink2">
            {L(
              'En yüksek geliri veren planda bu üyenin tarlasında baklagil yok. Nohut toprağı dinlendirir; gelire ve toprak puanına etkisi aşağıda. Araç seçmez, ikisini yan yana gösterir.',
              "The highest-revenue plan has no legumes on this member's field. Chickpea rests the soil; its effect on revenue and soil score is shown below. The tool does not choose; it shows both side by side.",
            )}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <OptionCard title={L('Gelir planı', 'Revenue plan')} sub={L('En yüksek brüt gelir; baklagil şartı yok.', 'Highest gross revenue; no legume requirement.')} o={mv.options.free} active={!legumeOn} names={names} onPick={() => s.updateSettings({ minLegumeShare: 0 })} />
            <OptionCard
              title={L('Nohutlu plan', 'Chickpea plan')}
              sub={L(`Her üyenin tarlasının en az ${pct(LEGUME_PLAN_SHARE)} kadarı baklagil.`, `At least ${pct(LEGUME_PLAN_SHARE)} of every member's field is legumes.`)}
              o={mv.options.legume}
              active={legumeOn}
              names={names}
              onPick={() => s.updateSettings({ minLegumeShare: LEGUME_PLAN_SHARE })}
            />
          </div>
          <p className="mb-0 mt-2 text-[11px] text-ink2">{L('Seçim bütün kooperatifin planına uygulanır; öbür üyelerin önerisi de değişir.', "The choice applies to the whole cooperative's plan; other members' recommendations change too.")}</p>
        </Card>
      )}

      {model.plan.status === 'partial' && (
        <Note tone="warn">
          {L(
            'Kooperatifin alıcıya verdiği satış sözü bu suyla tutmuyor; buradaki öneri, söze en çok yaklaşan plandır. Ayrıntı için',
            "The cooperative's sales commitment to the buyer cannot be met with this water; the recommendation here is the plan that comes closest. For details see the",
          )}{' '}
          <button type="button" className="link-button !text-inherit" onClick={() => s.setTab('taahhut')}>
            {L('Taahhüt', 'Commitment')}
          </button>{' '}
          {L('ekranına bakın.', 'screen.')}
        </Note>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Panel kind="current" w={weather} mv={mv} rows={curRows} yearSel={yearSel} detail={detail} onDetail={() => setDetail((v) => !v)} names={names} />
        <Panel kind="planned" w={weather} mv={mv} rows={plRows} yearSel={yearSel} detail={detail} onDetail={() => setDetail((v) => !v)} names={names} />
      </div>

      <details className="card group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-[650] text-ink">
          <span>{L('Ayrıntılar', 'Details')}</span>
          <span className="text-[12px] font-normal text-ink2 group-open:hidden">
            {L('su bütçesi, parsel parsel su, yıl yıl sonuç, toprak puanı formülü', 'water budget, water by plot, year-by-year results, soil score formula')}
          </span>
        </summary>
        <div className="mt-4 flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <DetailColumn kind="current" mv={mv} />
            <DetailColumn kind="planned" mv={mv} />
          </div>
          <div>
            <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[13px] font-[650] text-ink">
              {L('Yıl yıl: istenen suyun ne kadarı verilebildi', 'Year by year: how much of the demanded water could be applied')} <Tag kind="hesap" />
            </h3>
            <YearCoverage mv={mv} />
          </div>
          <p className="m-0 text-[12px] text-ink2">
            {L(
              `Bugünkü ekimin sonuçları, aynı ekim 2006-2025'in her yılında yapılsaydı ne olacağını gösterir; üyenin o yıllarda gerçekte ne ektiği bilinmiyor. "Alınan ürün", doya doya sulanan tarlaya göre yüzdedir. Toprak puanı: ${SOIL_FORMULA}. Bir göstergedir; toprak analizi değildir.`,
              `The results for the current planting show what would happen if the same planting were repeated in every year from 2006 to 2025; what the member actually planted in those years is unknown. "Yield obtained" is a percentage of a fully irrigated field. Soil score: ${SOIL_FORMULA_EN}. It is an indicator, not a soil analysis.`,
            )}
          </p>
        </div>
      </details>

      <HonestyBanner />
      <MemberEditor id={editing} onClose={() => setEditing(null)} />
    </>
  );
}
