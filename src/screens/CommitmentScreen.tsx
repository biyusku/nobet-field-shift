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
      title: `Taahhüdü ${Object.entries(lowered).filter(([, t]) => t > 0).map(([id, t]) => `${cropName(id, names)} ${ton(t)}`).join(', ')} düzeyine indirmek`,
      cost: `Taahhüdün ${pct(1 - f)} kadarı karşılanmaz; alıcıyla yeniden görüşmek gerekir.`,
      revenue: model.planSummary.revenue,
      waterM3: model.planSummary.reservedM3,
      apply: () => s.updateSettings({ commitments: lowered }),
      applyLabel: 'Taahhüdü indir',
    });
    const withShare = (v: number): PlanInput => ({ ...base, settings: { ...base.settings, maxShare: v } });
    if (s.settings.maxShare < 1 && maxCommitmentFraction(withShare(1)) >= 1) {
      const v = Math.ceil(bisect(s.settings.maxShare, 1, (x) => maxCommitmentFraction(withShare(x)) >= 1) * 100) / 100;
      const sum = summarize(solvePlan(withShare(v)).allocations, model.crops);
      out.push({
        title: `Ürün payı sınırını ${pct(v)}'e çıkarmak`,
        cost: v > 1 / 3 + 1e-9 ? 'Üç yıllık nöbet kurulamaz: aynı toprağa üst üste aynı ürün gelir; toprak ve hastalık riski artar.' : 'Nöbet hâlâ kurulabilir.',
        revenue: sum.revenue,
        waterM3: sum.reservedM3,
        apply: () => s.updateSettings({ maxShare: v }),
        applyLabel: 'Sınırı değiştir',
      });
    } else if (s.settings.maxShare < 1) {
      out.push({ title: 'Ürün payı sınırını kaldırmak', cost: 'Yetmiyor: sınır tümüyle kalksa bile bu kotayla taahhüt karşılanamıyor.', revenue: null, waterM3: null });
    }
    const withQuota = (k: number): PlanInput => ({ ...base, members: s.members.map((m) => ({ ...m, quotaMm: m.quotaMm * k })) });
    if (maxCommitmentFraction(withQuota(10)) >= 1) {
      const k = bisect(1, 10, (x) => maxCommitmentFraction(withQuota(x)) >= 1);
      const sum = summarize(solvePlan(withQuota(k)).allocations, model.crops);
      out.push({
        title: `Bütün kotaları ${pct(k - 1)} artırmak (toplam ${m3(model.totalQuotaM3 * k)})`,
        cost: `Yılda ${m3(model.totalQuotaM3 * (k - 1))} ek su gerekir. Kota genellikle kooperatifin elinde değildir; yeraltı suyu çekimi artar.`,
        revenue: sum.revenue,
        waterM3: sum.reservedM3,
      });
    } else {
      out.push({ title: 'Kotaları artırmak', cost: 'Yetmiyor: kotalar on katına çıksa bile ürün payı sınırı taahhüdü engelliyor.', revenue: null, waterM3: null });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  if (!model) return null;
  if (model.members.length === 0) return <Empty title="Kooperatifte üye yok">Taahhüt dağıtmak için önce Genel bakış ekranından üye ekleyin.</Empty>;

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
      <PageHeader icon={Handshake} title="Taahhüt" meta="Kooperatifin alıcıya verdiği satış sözü tutar mı?" />
      <HonestyBanner />
      <Brief>
        {committed.length === 0 ? (
          <p className="m-0">Kooperatif alıcıya bir satış sözü (taahhüt) vermişse aşağıya ton olarak yazın. Araç, bu sözün bu suyla tutup tutmayacağını ve hangi üyenin ne kadar ekmesi gerektiğini hesaplar.</p>
        ) : (
          <>
            <p className="m-0">
              Kooperatif alıcıya{' '}
              {committed.map(([id, t], i) => (
                <span key={id}>
                  {i > 0 && ', '}
                  <b>
                    {int(t)} ton {cropName(id, names).toLocaleLowerCase('tr')}
                  </b>
                </span>
              ))}{' '}
              satmaya söz vermiş.{' '}
              {model.plan.status === 'partial' ? (
                <>
                  Üyelerin su hakkı ve "bir ürün tarlanın üçte birini geçmesin" kuralıyla bu kadarı üretilemiyor: en çok{' '}
                  {committed.map(([id], i) => (
                    <span key={id}>
                      {i > 0 && ', '}
                      <b className="text-crit-ink">{ton(model.plan.maxAlone[id] ?? 0)}</b>
                    </span>
                  ))}{' '}
                  çıkıyor.
                </>
              ) : (
                <>Ortalama bir yılda bu kadarı üretilebiliyor.</>
              )}
            </p>
            <p className="m-0">
              Plan son 20 yılın gerçek havasında tek tek denendi: söz <b className={held >= 16 ? 'text-good-ink' : held >= 10 ? '' : 'text-crit-ink'}>20 yılın {held}{inSuffix(held)}</b> tutuyor.{' '}
              {model.plan.status === 'partial' ? 'Aşağıda ne yapılabileceği ve her seçeneğin bedeli yazıyor.' : 'Aşağıdaki şeritte hangi yıllarda tuttuğunu, tabloda da kimin ne kadar ekeceğini görürsünüz.'}
            </p>
          </>
        )}
      </Brief>
      <Card>
        <H2 right={<Tag kind="kurgusal" />}>Satış taahhüdü</H2>
        <p className="m-0 mb-3 text-[13px] text-ink2">Kooperatifin alıcıya söz verdiği miktarları ton olarak girin. Boş bırakılan (0) ürün için taahhüt yoktur.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {model.crops.map((c) => (
            <label key={c.id} className="block text-[12px] text-ink2">
              <Swatch id={c.id} />
              {c.name}
              <NumInput className="mt-0.5 w-full" label={`${c.name} taahhüdü (ton)`} value={st.commitments[c.id] ?? 0} max={1e7} decimals={1} suffix="t" onChange={(v) => s.updateSettings({ commitments: { ...st.commitments, [c.id]: v } })} />
            </label>
          ))}
        </div>
      </Card>

      {committed.length > 0 && (
        <Card>
          <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink2">
                Söz kaç yıl tutardı? <Tag kind="hesap" />
              </div>
              <div className={`text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[34px] ${held >= 16 ? 'text-good-ink' : held >= 10 ? 'text-warn-ink' : 'text-crit-ink'}`}>
                {held} <span className="text-[15px] font-semibold text-ink2">/ 20 yıl</span>
              </div>
              <div className="mt-1 text-[13px] text-ink2">
                Plan 2006-2025'in gerçek havasında denendi: söz 20 yılın {held}
                {inSuffix(held)} tuttu.
                {worst && (
                  <>
                    {' '}
                    En kötü yıl <strong className="text-ink">{worst.year}</strong>{worst.ratio < 1 ? <>: taahhüdün {pct(worst.ratio)} kadarı.</> : <>; o yıl da söz tutuyor.</>}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <BacktestStrip outcomes={bt} commitments={st.commitments} names={names} title="Planlı dağıtım" />
              <BacktestStrip outcomes={sc.scatter.backtest} commitments={st.commitments} names={names} title="Gelişigüzel dağıtım" />
              <BacktestStrip outcomes={sc.today.backtest} commitments={st.commitments} names={names} title="Bugünkü ekim" />
            </div>
          </div>
        </Card>
      )}

      {model.plan.status === 'partial' && (
        <Card className="!shadow-[0_0_0_1.5px_var(--crit)]">
          <H2 right={<Tag kind="hesap" />}>Taahhüt bu kısıtlarla karşılanamıyor</H2>
          <p className="m-0 text-[14px]">
            20 yılın ortalama verimiyle taahhüdün en çok <strong>{pct(model.plan.commitmentFraction)}</strong> kadarı üretilebiliyor.{' '}
            {committed.map(([id, t]) => (
              <span key={id}>
                {cropName(id, names)}: taahhüt {int(t)} t, tek başına en çok <strong>{ton(model.plan.maxAlone[id] ?? 0)}</strong>.{' '}
              </span>
            ))}
            Aşağıdaki plan, taahhüde en çok yaklaşan plandır. Araç karar vermez; seçenekler ve bedelleri şunlar:
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="data min-w-[640px]">
              <thead>
                <tr>
                  <th>Seçenek</th>
                  <th>Bedeli</th>
                  <th className="num">Brüt gelir</th>
                  <th className="num">Ayrılan su</th>
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
          Plan, taahhüdü 20 yılın <em>ortalama</em> verimiyle karşılıyor. Ortalama, yılların kabaca yarısında tutmamak demektir: şeride bakın. Daha güvenli bir plan için taahhüdü
          olduğundan yüksek girip sonucu deneyebilirsiniz.
        </Note>
      )}
      {model.plan.status === 'error' && <Note tone="crit">{model.plan.message}</Note>}

      <Card>
        <H2 right={<Tag kind="hesap" />}>Dağıtım: ilçe ilçe, kim ne kadar eker</H2>
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Dağıtılan toplam su" tag="hesap" value={m3(ps.reservedM3)} sub={`toplam kotanın ${pct(model.totalQuotaM3 > 0 ? ps.reservedM3 / model.totalQuotaM3 : 0)} kadarı`} />
          <Stat label="Ortalama kullanılan su" tag="hesap" value={m3(sc.planned.usedM3)} sub="20 yıl ortalaması" />
          <Stat label="Kooperatif brüt geliri" tag="hesap" value={tlShort(sc.planned.revenue)} sub="20 yıl ortalaması; girdiler düşülmedi" />
          <Stat label="Toplam su hakkı" tag="kurgusal" value={m3(model.totalQuotaM3)} />
        </div>
        <DistributionTable model={model} planCrops={planCrops} names={names} onMember={(id) => {
          s.setMemberId(id);
          s.setTab('uye');
          window.scrollTo({ top: 0 });
        }} />
        <p className="mb-0 mt-2 text-[12px] text-muted">
          İlçeye tıklayınca üyeleri açılır. Küçük yazı, 20 yılın ortalama verimiyle beklenen üretimi (üye satırlarında ayrıca hangi su seviyesinin ayrıldığını) gösterir. "Ayrılan su" her parsel için 20 yılın en kurak yılına göre
          tutulur; bu yüzden hiçbir yıl kota aşılmaz.
        </p>
      </Card>

      {bt.length > 0 && (
        <Card>
          <details>
            <summary className="cursor-pointer text-[15px] font-semibold">Yıl yıl sonuçlar (tablo)</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="data min-w-[560px]">
                <thead>
                  <tr>
                    <th>Hasat yılı</th>
                    {committed.map(([id]) => (
                      <th key={id} className="num">
                        {cropName(id, names)} (t)
                      </th>
                    ))}
                    <th className="num">Taahhüdün</th>
                    <th className="num">Brüt gelir</th>
                    <th className="num">Kullanılan su (m³)</th>
                    <th>Durum</th>
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
                      <td>{committed.length === 0 ? '–' : y.status === 'green' ? '✓ tuttu' : y.status === 'yellow' ? '≈ az farkla tutmadı' : '✕ tutmadı'}</td>
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
  const groups = [...DISTRICTS.map((d) => ({ id: d.id, name: d.name })), { id: '', name: 'İlçesi belirtilmemiş' }]
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
            <th>İlçe / üye</th>
            {planCrops.map((id) => (
              <th key={id} className="num">
                <Swatch id={id} />
                {cropName(id, names)} (da)
              </th>
            ))}
            <th className="num">Ayrılan su (m³)</th>
            <th className="num">Su hakkı (m³)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="font-semibold text-ink">
            <td>
              Kooperatif toplamı
              <div className="text-[11.5px] font-normal text-ink2">{int(model.members.length)} üye</div>
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
                      {int(g.members.length)} üye · {da(g.members.reduce((x, mv) => x + mv.member.areaDa, 0))} da
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
                          {mv.member.name}
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
