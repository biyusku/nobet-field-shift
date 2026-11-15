import { ChevronDown, ChevronRight, Handshake } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { BacktestStrip, cropName, HonestyBanner } from '../components/bits';
import { Brief, Card, Empty, H2, Note, NumInput, PageHeader, Stat, Swatch, Tag } from '../components/ui';
import { levelLabel } from '../engine/curves';
import { maxCommitmentFraction, solvePlan, summarize, type PlanInput } from '../engine/plan';
import { FALLOW } from '../engine/types';
import { da, dec1, inSuffix, int, m3, pct, tlShort, ton } from '../lib/format';
import type { MemberView, Model } from '../model';
import { DISTRICTS } from '../data/members';
import { useStore } from '../state';
import { getLang, L, lower, memberLabel } from '../i18n';
import { PlanSettingsCard } from '../components/PlanSettingsCard';

/** Uygun olan en küçük değeri ikiye bölerek bulur (lo uygun değil, hi uygun). */
function bisect(lo: number, hi: number, ok: (v: number) => boolean, steps = 12): number {
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

interface Option {
  title: string;
  cost: string;
  revenue: number | null;
  waterM3: number | null;
  apply?: () => void;
  applyLabel?: string;
}

export function CommitmentScreen() {
  const s = useStore();
  const { model } = s;
  const names = useMemo(() => new Map((model?.crops ?? []).map((c) => [c.id, c.name])), [model]);

  // Taahhüt tutmuyorsa: seçenekler ve bedelleri (her biri planı yeniden çözerek bulunur)
  const options = useMemo<Option[]>(() => {
    if (!model || model.plan.status !== 'partial') return [];
    const base: PlanInput = model.planInput;
    const out: Option[] = [];
    const f = model.plan.commitmentFraction;
    const lowered = Object.fromEntries(Object.entries(s.settings.commitments).map(([id, t]) => [id, Math.floor(t * f * 10) / 10]));
    out.push({
      title: L(
        `Taahhüdü ${Object.entries(lowered).filter(([, t]) => t > 0).map(([id, t]) => `${cropName(id, names)} ${ton(t)}`).join(', ')} düzeyine indirmek`,
        `Lower the commitment to ${Object.entries(lowered).filter(([, t]) => t > 0).map(([id, t]) => `${cropName(id, names)} ${ton(t)}`).join(', ')}`,
      ),
      cost: L(`Taahhüdün ${pct(1 - f)} kadarı karşılanmaz; alıcıyla yeniden görüşmek gerekir.`, `${pct(1 - f)} of the commitment is not met; it has to be renegotiated with the buyer.`),
      revenue: model.planSummary.revenue,
      waterM3: model.planSummary.reservedM3,
      apply: () => s.updateSettings({ commitments: lowered }),
      applyLabel: L('Taahhüdü indir', 'Lower commitment'),
    });
    const withShare = (v: number): PlanInput => ({ ...base, settings: { ...base.settings, maxShare: v } });
    if (s.settings.maxShare < 1 && maxCommitmentFraction(withShare(1)) >= 1) {
      const v = Math.ceil(bisect(s.settings.maxShare, 1, (x) => maxCommitmentFraction(withShare(x)) >= 1) * 100) / 100;
      const sum = summarize(solvePlan(withShare(v)).allocations, model.crops);
      out.push({
        title: L(`Ürün payı sınırını ${pct(v)}'e çıkarmak`, `Raise the crop share limit to ${pct(v)}`),
        cost:
          v > 1 / 3 + 1e-9
            ? L('Üç yıllık nöbet kurulamaz: aynı toprağa üst üste aynı ürün gelir; toprak ve hastalık riski artar.', 'A three-year rotation is no longer possible: the same crop follows itself on the same soil; soil and disease risk rise.')
            : L('Nöbet hâlâ kurulabilir.', 'The rotation still works.'),
        revenue: sum.revenue,
        waterM3: sum.reservedM3,
        apply: () => s.updateSettings({ maxShare: v }),
        applyLabel: L('Sınırı değiştir', 'Change limit'),
      });
    } else if (s.settings.maxShare < 1) {
      out.push({
        title: L('Ürün payı sınırını kaldırmak', 'Remove the crop share limit'),
        cost: L('Yetmiyor: sınır tümüyle kalksa bile bu kotayla taahhüt karşılanamıyor.', 'Not enough: even without any limit, the commitment cannot be met with these water allowances.'),
        revenue: null,
        waterM3: null,
      });
    }
    const withQuota = (k: number): PlanInput => ({ ...base, members: s.members.map((m) => ({ ...m, quotaMm: m.quotaMm * k })) });
    if (maxCommitmentFraction(withQuota(10)) >= 1) {
      const k = bisect(1, 10, (x) => maxCommitmentFraction(withQuota(x)) >= 1);
      const sum = summarize(solvePlan(withQuota(k)).allocations, model.crops);
      out.push({
        title: L(`Bütün kotaları ${pct(k - 1)} artırmak (toplam ${m3(model.totalQuotaM3 * k)})`, `Raise all water allowances by ${pct(k - 1)} (total ${m3(model.totalQuotaM3 * k)})`),
        cost: L(
          `Yılda ${m3(model.totalQuotaM3 * (k - 1))} ek su gerekir. Kota genellikle kooperatifin elinde değildir; yeraltı suyu çekimi artar.`,
          `Needs ${m3(model.totalQuotaM3 * (k - 1))} of extra water per year. Allowances are usually not up to the cooperative; groundwater pumping increases.`,
        ),
        revenue: sum.revenue,
        waterM3: sum.reservedM3,
      });
    } else {
      out.push({
        title: L('Kotaları artırmak', 'Raise water allowances'),
        cost: L('Yetmiyor: kotalar on katına çıksa bile ürün payı sınırı taahhüdü engelliyor.', 'Not enough: even with ten times the allowances, the crop share limit blocks the commitment.'),
        revenue: null,
        waterM3: null,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, getLang()]);

  if (!model) return null;
  if (model.members.length === 0) return (
      <Empty title={L('Kooperatifte üye yok', 'The cooperative has no members')}>
        {L('Taahhüt dağıtmak için önce Genel bakış ekranından üye ekleyin.', 'To distribute a commitment, first add members on the Dashboard.')}
      </Empty>
    );

  const st = s.settings;
  const committed = Object.entries(st.commitments).filter(([id, t]) => t > 0 && model.cropById.has(id));
  const ps = model.planSummary;
  const planCrops = [...model.crops.map((c) => c.id), FALLOW].filter((id) => (ps.areaByCrop[id] ?? 0) >= 0.05);
  // Pano ile aynı kaynak: model.scenarios (üç senaryo da kooperatifin toplam üretimiyle ölçülür)
  const sc = model.scenarios;
  const bt = sc.planned.backtest;
  const held = sc.planned.held;
  const worst = bt.length ? bt.reduce((a, b) => (b.ratio < a.ratio ? b : a)) : null;

  return (
    <>
      <PageHeader icon={Handshake} title={L('Taahhüt', 'Commitment')} meta={L('Kooperatifin alıcıya verdiği satış sözü tutar mı?', "Will the cooperative's sales commitment to the buyer be met?")} />
      <HonestyBanner />
      <Brief>
        {committed.length === 0 ? (
          <p className="m-0">
            {L(
              'Kooperatif alıcıya bir satış sözü (taahhüt) vermişse aşağıya ton olarak yazın. Araç, bu sözün bu suyla tutup tutmayacağını ve hangi üyenin ne kadar ekmesi gerektiğini hesaplar.',
              'If the cooperative has made a sales commitment to a buyer, enter it below in tonnes. The tool calculates whether the commitment can be met with this water and how much each member should plant.',
            )}
          </p>
        ) : (
          <>
            <p className="m-0">
              {L('Kooperatif alıcıya', 'The cooperative has committed to sell')}{' '}
              {committed.map(([id, t], i) => (
                <span key={id}>
                  {i > 0 && ', '}
                  <b>
                    {int(t)} {L('ton', 't of')} {lower(cropName(id, names))}
                  </b>
                </span>
              ))}{' '}
              {L('satmaya söz vermiş.', 'to the buyer.')}{' '}
              {model.plan.status === 'partial' ? (
                <>
                  {L(
                    'Üyelerin su hakkı ve "bir ürün tarlanın üçte birini geçmesin" kuralıyla bu kadarı üretilemiyor: en çok',
                    'With the members\' water allowances and the rule "no crop on more than a third of a field", this cannot be produced: at most',
                  )}{' '}
                  {committed.map(([id], i) => (
                    <span key={id}>
                      {i > 0 && ', '}
                      <b className="text-crit-ink">{ton(model.plan.maxAlone[id] ?? 0)}</b>
                    </span>
                  ))}{' '}
                  {L('çıkıyor.', 'can be produced.')}
                </>
              ) : (
                <>{L('Ortalama bir yılda bu kadarı üretilebiliyor.', 'This much can be produced in an average year.')}</>
              )}
            </p>
            <p className="m-0">
              {L('Plan son 20 yılın gerçek havasında tek tek denendi: söz', "The plan was tested year by year against the last 20 years' actual weather: the commitment is")}{' '}
              <b className={held >= 16 ? 'text-good-ink' : held >= 10 ? '' : 'text-crit-ink'}>
                {L(`20 yılın ${held}${inSuffix(held)}`, `met in ${held} of 20 years`)}
              </b>
              {L(' tutuyor.', '.')}{' '}
              {model.plan.status === 'partial'
                ? L('Aşağıda ne yapılabileceği ve her seçeneğin bedeli yazıyor.', 'Below: what can be done and what each option costs.')
                : L('Aşağıdaki şeritte hangi yıllarda tuttuğunu, tabloda da kimin ne kadar ekeceğini görürsünüz.', 'The strip below shows which years it was met; the table shows who plants how much.')}
            </p>
          </>
        )}
      </Brief>
      <Card>
        <H2 right={<Tag kind="kurgusal" />}>{L('Satış taahhüdü', 'Sales commitment')}</H2>
        <p className="m-0 mb-3 text-[13px] text-ink2">
          {L(
            'Kooperatifin alıcıya söz verdiği miktarları ton olarak girin. Boş bırakılan (0) ürün için taahhüt yoktur.',
            'Enter the quantities the cooperative has committed to the buyer, in tonnes. A crop left at 0 has no commitment.',
          )}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {model.crops.map((c) => (
            <label key={c.id} className="block text-[12px] text-ink2">
              <Swatch id={c.id} />
              {cropName(c.id, names)}
              <NumInput className="mt-0.5 w-full" label={L(`${c.name} taahhüdü (ton)`, `${cropName(c.id, names)} commitment (tonnes)`)} value={st.commitments[c.id] ?? 0} max={1e7} decimals={1} suffix="t" onChange={(v) => s.updateSettings({ commitments: { ...st.commitments, [c.id]: v } })} />
            </label>
          ))}
        </div>
      </Card>

      {committed.length > 0 && (
        <Card>
          <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink2">
                {L('Söz kaç yıl tutardı?', 'In how many years would the commitment have been met?')} <Tag kind="hesap" />
              </div>
              <div className={`text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[34px] ${held >= 16 ? 'text-good-ink' : held >= 10 ? 'text-warn-ink' : 'text-crit-ink'}`}>
                {held} <span className="text-[15px] font-semibold text-ink2">{L('/ 20 yıl', '/ 20 years')}</span>
              </div>
              <div className="mt-1 text-[13px] text-ink2">
                {L(
                  `Plan 2006-2025'in gerçek havasında denendi: söz 20 yılın ${held}${inSuffix(held)} tuttu.`,
                  `The plan was tested against the actual weather of 2006-2025: the commitment was met in ${held} of 20 years.`,
                )}
                {worst && (
                  <>
                    {' '}
                    {L('En kötü yıl', 'Worst year')} <strong className="text-ink">{worst.year}</strong>
                    {worst.ratio < 1 ? <>{L(`: taahhüdün ${pct(worst.ratio)} kadarı.`, `: ${pct(worst.ratio)} of the commitment.`)}</> : <>{L('; o yıl da söz tutuyor.', '; the commitment is met that year too.')}</>}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <BacktestStrip outcomes={bt} commitments={st.commitments} names={names} title={L('Planlı dağıtım', 'Planned distribution')} />
              <BacktestStrip outcomes={sc.scatter.backtest} commitments={st.commitments} names={names} title={L('Gelişigüzel dağıtım', 'Ad-hoc distribution')} />
              <BacktestStrip outcomes={sc.today.backtest} commitments={st.commitments} names={names} title={L('Bugünkü ekim', 'Current planting')} />
            </div>
          </div>
        </Card>
      )}

      {model.plan.status === 'partial' && (
        <Card className="!shadow-[0_0_0_1.5px_var(--crit)]">
          <H2 right={<Tag kind="hesap" />}>{L('Taahhüt bu kısıtlarla karşılanamıyor', 'The commitment cannot be fully met with these constraints')}</H2>
          <p className="m-0 text-[14px]">
            {L('20 yılın ortalama verimiyle taahhüdün en çok', 'With the 20-year average yield, at most')} <strong>{pct(model.plan.commitmentFraction)}</strong>{' '}
            {L('kadarı üretilebiliyor.', 'of the commitment can be produced.')}{' '}
            {committed.map(([id, t]) => (
              <span key={id}>
                {cropName(id, names)}: {L('taahhüt', 'commitment')} {int(t)} t, {L('tek başına en çok', 'at most on its own')} <strong>{ton(model.plan.maxAlone[id] ?? 0)}</strong>.{' '}
              </span>
            ))}
            {L(
              'Aşağıdaki plan, taahhüde en çok yaklaşan plandır. Araç karar vermez; seçenekler ve bedelleri şunlar:',
              'The plan below comes closest to the commitment. The tool does not decide; the options and their costs are:',
            )}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="data min-w-[640px]">
              <thead>
                <tr>
                  <th>{L('Seçenek', 'Option')}</th>
                  <th>{L('Bedeli', 'Cost')}</th>
                  <th className="num">{L('Brüt gelir', 'Gross revenue')}</th>
                  <th className="num">{L('Ayrılan su', 'Reserved water')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {options.map((o, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{o.title}</td>
                    <td className="text-ink2">{o.cost}</td>
                    <td className="num whitespace-nowrap">{o.revenue === null ? '–' : tlShort(o.revenue)}</td>
                    <td className="num whitespace-nowrap">{o.waterM3 === null ? '–' : m3(o.waterM3)}</td>
                    <td className="text-right">
                      {o.apply && (
                        <button type="button" className="btn" onClick={o.apply}>
                          {o.applyLabel}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {model.plan.status === 'ok' && committed.length > 0 && (
        <Note tone={held >= 16 ? 'good' : 'warn'}>
          {L('Plan, taahhüdü 20 yılın', 'The plan meets the commitment with the 20-year')} <em>{L('ortalama', 'average')}</em>{' '}
          {L(
            'verimiyle karşılıyor. Ortalama, yılların kabaca yarısında tutmamak demektir: şeride bakın. Daha güvenli bir plan için taahhüdü olduğundan yüksek girip sonucu deneyebilirsiniz.',
            'yield. Average means missing it in roughly half of the years: see the strip. For a safer plan, enter a higher commitment than the real one and check the result.',
          )}
        </Note>
      )}
      {model.plan.status === 'error' && <Note tone="crit">{model.plan.message}</Note>}

      <Card>
        <H2 right={<Tag kind="hesap" />}>{L('Dağıtım: ilçe ilçe, kim ne kadar eker', 'Distribution: who plants how much, district by district')}</H2>
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label={L('Dağıtılan toplam su', 'Total water distributed')}
            tag="hesap"
            value={m3(ps.reservedM3)}
            sub={L(
              `toplam kotanın ${pct(model.totalQuotaM3 > 0 ? ps.reservedM3 / model.totalQuotaM3 : 0)} kadarı`,
              `${pct(model.totalQuotaM3 > 0 ? ps.reservedM3 / model.totalQuotaM3 : 0)} of total allowances`,
            )}
          />
          <Stat label={L('Ortalama kullanılan su', 'Average water used')} tag="hesap" value={m3(sc.planned.usedM3)} sub={L('20 yıl ortalaması', '20-year average')} />
          <Stat label={L('Kooperatif brüt geliri', 'Cooperative gross revenue')} tag="hesap" value={tlShort(sc.planned.revenue)} sub={L('20 yıl ortalaması; girdiler düşülmedi', '20-year average; input costs not deducted')} />
          <Stat label={L('Toplam su hakkı', 'Total water allowance')} tag="kurgusal" value={m3(model.totalQuotaM3)} />
        </div>
        <DistributionTable model={model} planCrops={planCrops} names={names} onMember={(id) => {
          s.setMemberId(id);
          s.setTab('uye');
          window.scrollTo({ top: 0 });
        }} />
        <p className="mb-0 mt-2 text-[12px] text-muted">
          {L(
            'İlçeye tıklayınca üyeleri açılır. Küçük yazı, 20 yılın ortalama verimiyle beklenen üretimi (üye satırlarında ayrıca hangi su seviyesinin ayrıldığını) gösterir. "Ayrılan su" her parsel için 20 yılın en kurak yılına göre tutulur; bu yüzden hiçbir yıl kota aşılmaz.',
            'Click a district to open its members. The small text shows the production expected with the 20-year average yield (and, on member rows, which water level is reserved). "Reserved water" is set for each plot by the driest of the 20 years, so the allowance is never exceeded.',
          )}
        </p>
      </Card>

      {bt.length > 0 && (
        <Card>
          <details>
            <summary className="cursor-pointer text-[15px] font-semibold">{L('Yıl yıl sonuçlar (tablo)', 'Year-by-year results (table)')}</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="data min-w-[560px]">
                <thead>
                  <tr>
                    <th>{L('Hasat yılı', 'Harvest year')}</th>
                    {committed.map(([id]) => (
                      <th key={id} className="num">
                        {cropName(id, names)} (t)
                      </th>
                    ))}
                    <th className="num">{L('Taahhüdün', 'Of commitment')}</th>
                    <th className="num">{L('Brüt gelir', 'Gross revenue')}</th>
                    <th className="num">{L('Kullanılan su (m³)', 'Water used (m³)')}</th>
                    <th>{L('Durum', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bt.map((y) => (
                    <tr key={y.year}>
                      <td>{y.year}</td>
                      {committed.map(([id]) => (
                        <td key={id} className="num">
                          {ton(y.productionT[id] ?? 0)}
                        </td>
                      ))}
                      <td className="num">{committed.length ? pct(y.ratio) : '–'}</td>
                      <td className="num">{tlShort(y.revenue)}</td>
                      <td className="num">{int(y.waterM3)}</td>
                      <td>{committed.length === 0 ? '–' : y.status === 'green' ? L('✓ tuttu', '✓ met') : y.status === 'yellow' ? L('≈ az farkla tutmadı', '≈ narrowly missed') : L('✕ tutmadı', '✕ missed')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      )}
      <PlanSettingsCard />
    </>
  );
}

interface Cell {
  da: number;
  t: number;
  parts: string[];
}
function cellsOf(mv: MemberView, model: Model): Map<string, Cell> {
  const by = new Map<string, Cell>();
  for (const a of mv.plannedAllocs) {
    if (a.da < 0.05) continue;
    const e = by.get(a.cropId) ?? { da: 0, t: 0, parts: [] };
    e.da += a.da;
    if (a.option) {
      e.parts.push(`${dec1(a.da)} da ${levelLabel(a.option.level)}`);
      e.t += (a.option.meanRel * (model.cropById.get(a.cropId)?.yieldKgDa ?? 0) * a.da) / 1000;
    }
    by.set(a.cropId, e);
  }
  return by;
}

/** Dağıtım tablosu: en üstte ürün başına toplam, altında ilçe toplamları; ilçeye tıklayınca üyeleri açılır. */
function DistributionTable({ model, planCrops, names, onMember }: { model: Model; planCrops: string[]; names: Map<string, string>; onMember: (id: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const ps = model.planSummary;
  const groups = [...DISTRICTS.map((d) => ({ id: d.id, name: d.name })), { id: '', name: L('İlçesi belirtilmemiş', 'No district') }]
    .map((g) => ({ ...g, members: model.members.filter((mv) => (mv.member.pointId ?? '') === g.id || (g.id === '' && !DISTRICTS.some((d) => d.id === mv.member.pointId))) }))
    .filter((g) => g.members.length > 0);
  const dash = <span className="text-muted">–</span>;
  const cell = (e: Cell | undefined, withParts: boolean) =>
    e && e.da >= 0.05 ? (
      <>
        {da(e.da)}
        {withParts && e.parts.length > 0 && <div className="text-[11.5px] text-muted">{e.parts.join(' + ')}</div>}
        {e.t > 0 && <div className="text-[11.5px] font-normal text-ink2">≈ {ton(e.t)}</div>}
      </>
    ) : (
      dash
    );
  return (
    <div className="overflow-x-auto">
      <table className="data min-w-[680px]">
        <thead>
          <tr>
            <th>{L('İlçe / üye', 'District / member')}</th>
            {planCrops.map((id) => (
              <th key={id} className="num">
                <Swatch id={id} />
                {cropName(id, names)} (da)
              </th>
            ))}
            <th className="num">{L('Ayrılan su (m³)', 'Reserved water (m³)')}</th>
            <th className="num">{L('Su hakkı (m³)', 'Water allowance (m³)')}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="font-semibold text-ink">
            <td>
              {L('Kooperatif toplamı', 'Cooperative total')}
              <div className="text-[11.5px] font-normal text-ink2">
                {int(model.members.length)} {L('üye', 'members')}
              </div>
            </td>
            {planCrops.map((id) => (
              <td key={id} className="num">
                {cell({ da: ps.areaByCrop[id] ?? 0, t: ps.productionT[id] ?? 0, parts: [] }, false)}
              </td>
            ))}
            <td className="num">{int(ps.reservedM3)}</td>
            <td className="num">{int(model.totalQuotaM3)}</td>
          </tr>
          {groups.map((g) => {
            const isOpen = open.has(g.id);
            const per = g.members.map((mv) => ({ mv, cells: cellsOf(mv, model) }));
            const total = new Map<string, Cell>();
            for (const { cells } of per)
              for (const [id, e] of cells) {
                const t = total.get(id) ?? { da: 0, t: 0, parts: [] };
                t.da += e.da;
                t.t += e.t;
                total.set(id, t);
              }
            const toggle = () =>
              setOpen((prev) => {
                const next = new Set(prev);
                if (next.has(g.id)) next.delete(g.id);
                else next.add(g.id);
                return next;
              });
            return (
              <Fragment key={g.id || 'diger'}>
                <tr className="cursor-pointer" onClick={toggle}>
                  <td>
                    <button type="button" className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left font-semibold text-ink" aria-expanded={isOpen} onClick={(e) => { e.stopPropagation(); toggle(); }}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {g.name}
                    </button>
                    <div className="pl-[18px] text-[11.5px] text-ink2">
                      {int(g.members.length)} {L('üye', 'members')} · {da(g.members.reduce((x, mv) => x + mv.member.areaDa, 0))} da
                    </div>
                  </td>
                  {planCrops.map((id) => (
                    <td key={id} className="num">
                      {cell(total.get(id), false)}
                    </td>
                  ))}
                  <td className="num">{int(g.members.reduce((x, mv) => x + mv.plannedSummary.reservedM3, 0))}</td>
                  <td className="num">{int(g.members.reduce((x, mv) => x + mv.quotaM3, 0))}</td>
                </tr>
                {isOpen &&
                  per.map(({ mv, cells }) => (
                    <tr key={mv.member.id} className="bg-[color-mix(in_srgb,var(--sunken)_55%,transparent)]">
                      <td className="!pl-[30px]">
                        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left underline decoration-axis underline-offset-2" onClick={() => onMember(mv.member.id)}>
                          {memberLabel(mv.member.name)}
                        </button>
                        <div className="text-[11.5px] text-muted">{da(mv.member.areaDa)} da</div>
                      </td>
                      {planCrops.map((id) => (
                        <td key={id} className="num">
                          {cell(cells.get(id), true)}
                        </td>
                      ))}
                      <td className="num">{int(mv.plannedSummary.reservedM3)}</td>
                      <td className="num">{int(mv.quotaM3)}</td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
