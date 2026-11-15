// Kooperatif panosu (açılış): solda harita, sağda taahhüt paneli.
// "Aynı söz, aynı su: gelişigüzel dağıtınca ne oluyor, planlı dağıtınca ne oluyor?"
import { ArrowRight, LayoutDashboard, Plus, RotateCcw, Send } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BacktestStrip, cropName, HonestyBanner } from '../components/bits';
import { ClimateCard } from '../components/ClimateCard';
import { Confirm, Select } from '../components/kit';
import { MemberEditor } from '../components/MemberEditor';
import { Card, Change, H2, Note, NumInput, PageHeader, Segmented, Swatch, Tag, type TagKind } from '../components/ui';
import { COOP_NAME, DEFAULT_SAFE_YEARS } from '../data/defaults';
import { DISTRICTS } from '../data/members';
import { levelLabel } from '../engine/curves';
import { reachedInAtLeast } from '../engine/promise';
import { da, inSuffix, int, m3, pct, tlShort, ton } from '../lib/format';
import { CALC_LIMIT_MS, useCalc, type CalcState } from '../lib/useCalc';
import type { MemberView, Mode, ScenarioSummary } from '../model';
import { useStore } from '../state';

const CoopMap = lazy(() => import('../components/CoopMap'));

const MODE_LABEL: Record<Mode, string> = { today: 'Bugün', scatter: 'Gelişigüzel dağıtım', planned: 'Planlı dağıtım' };
/** Dağıtım tablosunda varsayılan olarak gösterilen üye sayısı. */
const TABLE_PREVIEW = 5;
/** Worker'dan gelen senaryo özeti (engine/promise PromiseScenario'nun gerekli alanları). */
interface ScenarioLite {
  revenue: number;
  yearly: Record<string, number[]>;
  status: string;
  message?: string;
}
/** Hesap sürerken ya da süre sınırı aşılınca gösterilecek kısa metin; sonuç varsa null. */
function calcNote(c: CalcState<unknown>): string | null {
  if (c.status === 'loading') return 'hesaplanıyor…';
  if (c.status === 'timeout') return `hesap tamamlanamadı (${CALC_LIMIT_MS / 1000} sn içinde bitmedi)`;
  if (c.status === 'error') return `hesap tamamlanamadı: ${c.message}`;
  return null;
}
const districtName = (id?: string) => DISTRICTS.find((d) => d.id === id)?.name ?? '–';

/** Üst satırdaki büyük sayı: bugün → planlı. */
function Big({ label, tag, from, to, tone, hint, extra }: { label: string; tag: TagKind; from: ReactNode; to: ReactNode; tone?: 'good' | 'crit'; hint?: ReactNode; extra?: ReactNode }) {
  return (
    <section className="card flex min-w-0 flex-col gap-1 !py-4">
      <h2 className="card-title flex flex-wrap items-center gap-1.5">
        {label} <Tag kind={tag} />
      </h2>
      <div className="tnum mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[14px] text-ink2">{from}</span>
        <ArrowRight size={14} className="shrink-0 translate-y-[1px] text-muted" aria-label="planlı dağıtımla" />
        <span className={`text-[30px] font-bold leading-[1.1] tracking-tight ${tone === 'good' ? 'text-good-ink' : tone === 'crit' ? 'text-crit-ink' : 'text-ink'}`}>{to}</span>
        {extra}
      </div>
      {hint && <span className="text-[11.5px] text-ink2">{hint}</span>}
    </section>
  );
}

function Row({ label, a, b, active, better }: { label: ReactNode; a: ReactNode; b: ReactNode; active: Mode; better?: 'a' | 'b' | null }) {
  const cell = (v: ReactNode, on: boolean, win: boolean) => (
    <td className={`num !py-2.5 text-[15px] font-bold ${win ? 'text-good-ink' : 'text-ink'} ${on ? 'bg-[color-mix(in_srgb,var(--water)_9%,transparent)]' : ''}`}>{v}</td>
  );
  return (
    <tr>
      <td className="text-ink2">{label}</td>
      {cell(a, active === 'scatter', better === 'a')}
      {cell(b, active === 'planned', better === 'b')}
    </tr>
  );
}

export function OverviewScreen() {
  const s = useStore();
  const { model } = s;
  const [mode, setMode] = useState<Mode>('today');
  const [panel, setPanel] = useState<'dagitim' | 'iklim'>('dagitim');
  const [editing, setEditing] = useState<string | null>(null);
  /** dağıtım tablosu: false = ilk 5 üye, true = hepsi (kendi içinde kaydırılır) */
  const [showAll, setShowAll] = useState(false);

  // taahhüt taslağı: "Dağıt" ile uygulanır
  const first = Object.entries(s.settings.commitments).find(([, t]) => t > 0);
  const [crop, setCrop] = useState(first?.[0] ?? 'misir');
  const [tons, setTons] = useState(first?.[1] ?? 300);
  const [buyer, setBuyer] = useState(s.buyer);
  useEffect(() => {
    // "Kurgusal örneğe dön" sonrası taslağı da eşitle
    const f = Object.entries(s.settings.commitments).find(([, t]) => t > 0);
    setCrop(f?.[0] ?? 'misir');
    setTons(f?.[1] ?? 0);
    setBuyer(s.buyer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.settings.commitments, s.buyer]);

  // "Söz vermeden önce": seçili ürüne öncelik veren plan ve geliri en yükseğe çıkaran karma plan, 20 yılda denenir
  const [need, setNeed] = useState<'14' | '16' | '18'>(String(DEFAULT_SAFE_YEARS) as '16');
  // Söz senaryoları çözücüyü çağırır; Web Worker'da 5 sn sınırla çalışır (useCalc), sekme donmaz.
  const ctx = useMemo(
    () => (model ? { model, weathers: s.weathers, fallbackId: s.districtId, inputs: { members: s.members, cropDefs: s.cropDefs, soil: s.soil, eff: s.eff, settings: s.settings } } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model],
  );
  // Taslak mesajı önce kuyruğa girsin (kancalar bu sırayla çalışır).
  const draftCalc = useCalc<{ held: number; status: string; message?: string }>(ctx, tons > 0 ? { kind: 'draft', crop, tons } : null, `${crop}|${tons}`);
  const draft = draftCalc.status === 'done' ? draftCalc.value : null;
  const mixedCalc = useCalc<ScenarioLite>(ctx, { kind: 'mixed' }, 'mixed');
  const mixed = mixedCalc.status === 'done' ? mixedCalc.value : null;
  const singleCalc = useCalc<ScenarioLite>(ctx, { kind: 'single', crop }, crop);
  const single = singleCalc.status === 'done' ? singleCalc.value : null;

  // Üstteki üçüncü sayı: uygulanmış sözün ürünü için (yoksa mısır) güvenle verilebilecek söz, bugün ve planlı
  const headCrop = Object.entries(s.settings.commitments).find(([id, t]) => t > 0 && model?.cropById.has(id))?.[0] ?? 'misir';
  const safePlannedCalc = useCalc<number>(ctx, { kind: 'safe', crop: headCrop, k: Number(need) }, `${headCrop}|${need}`);
  const safePlanned = safePlannedCalc.status === 'done' ? safePlannedCalc.value : null;

  // Taslak söz: "Dağıt"a basılınca kurulacak planın 20 yıllık sonucu (karşılaştırma tablosuyla aynı fonksiyon)
  const safeDraftCalc = useCalc<number>(ctx, crop === headCrop ? null : { kind: 'safe', crop, k: Number(need) }, `${crop}|${need}`);
  const safeDraftState = crop === headCrop ? safePlannedCalc : safeDraftCalc;
  const safeDraft = safeDraftState.status === 'done' ? safeDraftState.value : null;

  if (!model) return null;
  const K = Number(need);
  const singleYears = single?.yearly[crop] ?? [];
  const singleFailed = single?.status === 'error';
  const safeSingle = Math.floor(reachedInAtLeast(singleYears, K));
  const draftHeld = draft?.held ?? 0;
  const draftError = draft?.status === 'error' ? (draft.message ?? 'Plan kurulamadı.') : null;
  const draftOk = tons <= 0 || (draft !== null && !draftError && draftHeld >= K);
  const safeTons = Math.floor(safeDraft ?? 0);
  const goMethod = () => {
    s.setTab('yontem');
    setTimeout(() => document.getElementById('yontem-soz')?.scrollIntoView({ block: 'start' }), 80);
  };
  const mixedRows = model.crops
    .map((c) => ({ c, safe: Math.floor(reachedInAtLeast(mixed?.yearly[c.id] ?? [], K)) }))
    .filter((r) => r.safe >= 1);
  const draftCropName = (model.cropById.get(crop)?.name ?? crop).toLocaleLowerCase('tr');
  const names = new Map(model.crops.map((c) => [c.id, c.name]));
  const sc = model.scenarios;
  const committed = Object.entries(s.settings.commitments).filter(([id, t]) => t > 0 && model.cropById.has(id));
  const [cId, cTons] = committed[0] ?? [null, 0];
  const cName = cId ? cropName(cId, names).toLocaleLowerCase('tr') : '';
  const dirty = crop !== (first?.[0] ?? 'misir') || tons !== (first?.[1] ?? 0) || buyer !== s.buyer;
  const apply = () => {
    s.update({ buyer });
    s.updateSettings({ commitments: tons > 0 ? { [crop]: tons } : {} });
    setMode('planned');
  };
  const held = (x: ScenarioSummary) => (
    <>
      {x.held}
      <span className="text-[12px] font-normal text-ink2"> / {x.total}</span>
    </>
  );
  const delivered = (x: ScenarioSummary) => (cId ? (x.deliveredT[cId] ?? 0) : 0);
  const openMember = (id: string) => {
    s.setMemberId(id);
    s.setTab('uye');
    window.scrollTo({ top: 0 });
  };

  // dağıtım tablosu: seçili moda göre sözleşme ürününü kim, kaç dekar, ne kadar suyla ekiyor
  const tableMode: Mode = mode === 'today' ? 'planned' : mode;
  const rows = cId
    ? model.members
        .map((mv: MemberView) => {
          if (tableMode === 'scatter') {
            if (mv.scatterCrop !== cId) return null;
            const st = mv.scatterWater.parcels[0];
            return { mv, da: mv.member.areaDa, water: mv.scatter.meanUsedM3, level: 'su hakkı bitene kadar', rel: st?.relYield ?? 0 };
          }
          const mine = mv.plannedAllocs.filter((a) => a.cropId === cId && a.option && a.da >= 0.05);
          if (mine.length === 0) return null;
          const area = mine.reduce((x, a) => x + a.da, 0);
          return {
            mv,
            da: area,
            water: mine.reduce((x, a) => x + a.da * a.waterMm, 0),
            level: [...new Set(mine.map((a) => levelLabel(a.option!.level)))].join(' + '),
            rel: mine.reduce((x, a) => x + a.da * a.option!.meanRel, 0) / area,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.da - a.da)
    : [];
  const yieldKg = cId ? (model.cropById.get(cId)?.yieldKgDa ?? 0) : 0;

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Kooperatif panosu"
        meta={
          <>
            {COOP_NAME} <Tag kind="kurgusal" /> · {int(model.members.length)} üye · {int(model.totalAreaDa)} da · su hakkı {m3(model.totalQuotaM3)}
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

      {/* üç büyük sayı: bugün → planlı */}
      <div className="grid gap-3 md:grid-cols-3">
        <Big
          label="Kooperatif brüt geliri"
          tag="hesap"
          from={tlShort(sc.today.revenue)}
          to={tlShort(sc.planned.revenue)}
          extra={<Change from={sc.today.revenue} to={sc.planned.revenue} />}
          hint="Yıllık, 20 yılın ortalaması · girdiler düşülmedi"
        />
        <Big
          label="Suyu sezon ortasında biten üye"
          tag="hesap"
          from={`${int(model.members.length)} üyeden ${int(sc.today.exceeded)}`}
          to={int(sc.planned.exceeded)}
          tone={sc.planned.exceeded === 0 ? 'good' : 'crit'}
          hint="Bugünkü ekim → planlı dağıtım"
        />
        <Big
          label={`Güvenle verilebilecek ${(model.cropById.get(headCrop)?.name ?? headCrop).toLocaleLowerCase('tr')} sözü`}
          tag="hesap"
          from={`${int(Math.floor(reachedInAtLeast(sc.today.backtest.map((y) => y.productionT[headCrop] ?? 0), K)))} t`}
          to={safePlanned === null ? <span className="text-[14px] font-medium text-ink2">{calcNote(safePlannedCalc)}</span> : `${int(Math.floor(safePlanned))} t`}
          hint={`20 yılın en az ${K}${inSuffix(K)} ulaşılan toplam üretim`}
        />
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* sol: harita, altında dağıtım tablosu ve yıl şeridi */}
        <div className="flex min-w-0 flex-col gap-3">
        <Card className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented label="Dağıtım" value={mode} options={(['today', 'scatter', 'planned'] as Mode[]).map((id) => ({ id, label: MODE_LABEL[id] }))} onChange={setMode} />
            <span className="text-[12px] text-ink2">
              {mode === 'today' && 'Üyelerin bugün ektiği'}
              {mode === 'scatter' && (cId ? `Söz ${sc.scatter.growers} üyeye verildi; hepsi bütün tarlasına ${cName} ekiyor` : 'Taahhüt girilmedi')}
              {mode === 'planned' && 'Su hakkı ve nöbet kurallarıyla hesaplanan dağıtım'}
            </span>
          </div>
          <div className="h-[470px]">
            <Suspense fallback={<div className="grid h-full place-items-center rounded-lg bg-sunken text-ink2">Harita yükleniyor…</div>}>
              <CoopMap
                members={model.members}
                mode={mode}
                weathers={s.weathers}
                districtId={s.districtId}
                onDistrict={(id) => {
                  s.setDistrictId(id);
                  setPanel('iklim');
                }}
                onMember={openMember}
              />
            </Suspense>
          </div>
          <p className="m-0 text-[11.5px] text-ink2">
            Üyelerin konumu, tarlası ve ekimi <Tag kind="kurgusal" />. Mavi dikdörtgenler NASA POWER hücreleridir (yaklaşık 0,5° × 0,625°): aynı hücredeki üyeler aynı sıcaklığı, yağışı, rüzgârı ve nemi görür (güneş radyasyonu ayrı bir ızgaradan gelir). Beş ilçe yalnızca üç hücreye
            düşüyor. NASA verisi havayı söyler; tarlada ne ekildiğini söylemez.
          </p>
        </Card>

          <Card className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented
                label="Alt panel"
                value={panel}
                options={[
                  { id: 'dagitim', label: 'Dağıtım tablosu' },
                  { id: 'iklim', label: `NASA verisi: ${districtName(s.districtId)}` },
                ]}
                onChange={setPanel}
              />
              {panel === 'dagitim' && cId && (
                <span className="text-[12px] text-ink2">
                  {MODE_LABEL[tableMode]} · {rows.length} üye
                </span>
              )}
            </div>

            {panel === 'dagitim' ? (
              !cId ? (
                <div className="text-ink2">Taahhüt girilince hangi üyenin ne kadar ekeceği burada görünür.</div>
              ) : (
                <>
                  <div className={showAll ? 'max-h-[400px] overflow-auto' : ''}>
                    <table className="data">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th>Üye</th>
                          <th className="num">{cropName(cId, names)} (da)</th>
                          <th className="num">
                            Su (m³)
                            <Tag kind="hesap" compact />
                          </th>
                          <th className="num">
                            Verim
                            <Tag kind="hesap" compact />
                          </th>
                          <th className="num">
                            Teslim (t)
                            <Tag kind="hesap" compact />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAll ? rows : rows.slice(0, TABLE_PREVIEW)).map((r) => (
                          <tr key={r.mv.member.id} className="cursor-pointer" onClick={() => openMember(r.mv.member.id)}>
                            <td>
                              <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-ink" onClick={() => openMember(r.mv.member.id)}>
                                {r.mv.member.name}
                              </button>
                              <div className="text-[11px] text-ink2">
                                {districtName(r.mv.member.pointId)} · {da(r.mv.member.areaDa)} da
                              </div>
                            </td>
                            <td className="num">
                              <Swatch id={cId} />
                              {da(r.da)}
                            </td>
                            <td className="num">
                              {int(r.water)}
                              <div className="text-[11px] text-ink2">{r.level}</div>
                            </td>
                            <td className="num">{pct(r.rel)}</td>
                            <td className="num">{ton((r.rel * yieldKg * r.da) / 1000)}</td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-ink2">
                              Bu dağıtımda {cName} eken üye yok.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > TABLE_PREVIEW && (
                    <div>
                      <button type="button" className="btn" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                        {showAll ? `Yalnız ilk ${TABLE_PREVIEW} üyeyi göster` : `${rows.length} üyenin tümünü göster`}
                      </button>
                    </div>
                  )}
                  <BacktestStrip outcomes={sc[tableMode].backtest} commitments={s.settings.commitments} names={names} title={MODE_LABEL[tableMode]} />
                </>
              )
            ) : s.weather ? (
              <div className="-m-4">
                <ClimateCard w={s.weather} />
              </div>
            ) : null}
          </Card>
        </div>

        {/* sağ: taahhüt paneli */}
        <div className="flex min-w-0 flex-col gap-3">
          <Card>
            <H2 right={<Tag kind="kurgusal" />}>Taahhüt</H2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_120px]">
              <div className="text-[12px] font-medium text-ink2">
                Ürün
                <Select className="mt-1" label="Sözleşme ürünü" value={crop} onChange={setCrop} options={model.crops.map((c) => ({ value: c.id, label: c.name }))} />
              </div>
              <label className="block text-[12px] font-medium text-ink2">
                Miktar
                <NumInput className="mt-1 w-full" label="Taahhüt (ton)" value={tons} max={1e6} decimals={0} suffix="t" onChange={setTons} />
              </label>
              <label className="col-span-2 block text-[12px] font-medium text-ink2 sm:col-span-1">
                Alıcı
                <input className="field mt-1" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Alıcının adı" />
              </label>
              <div className="col-span-2 flex items-end sm:col-span-1">
                <button type="button" className="btn btn-primary w-full" onClick={apply}>
                  <Send /> Dağıt
                </button>
              </div>
            </div>
            {tons > 0 && (draft === null || draftError) && (
              <div className={`mt-2 rounded-lg px-3 py-2 text-[13px] ${draftError || draftCalc.status === 'timeout' || draftCalc.status === 'error' ? 'bg-[var(--crit-bg)] text-crit-ink' : 'bg-sunken text-ink2'}`} role="status">
                {draftError ?? `${int(tons)} ton ${draftCropName}: ${calcNote(draftCalc)}`}
              </div>
            )}
            {tons > 0 && draft !== null && !draftError && (
              <div className={`mt-2 rounded-lg px-3 py-2 text-[13px] ${draftOk ? 'bg-[var(--good-bg)] text-good-ink' : 'bg-[var(--crit-bg)] text-crit-ink'}`} role="status">
                <b className="font-semibold">
                  {int(tons)} ton {draftCropName}: 20 yılın {draftHeld}
                  {inSuffix(draftHeld)} tutar.
                </b>{' '}
                {draftOk ? (
                  <>Planlı dağıtımla; eşiğinizi (20'de {K}) karşılıyor.</>
                ) : (
                  <>
                    Planlı dağıtımla; eşiğin (20'de {K}) altında:{' '}
                    {safeDraft === null ? (
                      calcNote(safeDraftState)
                    ) : (
                      <>
                        en çok <b className="font-semibold">{int(safeTons)} ton</b> söz verilebilir.{' '}
                        <button type="button" className="link-button !text-inherit" onClick={() => setTons(safeTons)}>
                          {int(safeTons)} ton yap
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            {dirty && <div className="mt-2 text-[12px] font-medium text-warn-ink">Değişiklik henüz uygulanmadı: "Dağıt"a basın.</div>}

            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 flex items-center gap-1.5 text-[13px] font-[650] text-ink">
                  Söz vermeden önce <Tag kind="hesap" />
                </h3>
                <label className="flex items-center gap-2 text-[12px] text-ink2">
                  20 yılın en az
                  <Segmented
                    label="Sözün tutması gereken yıl sayısı"
                    value={need}
                    options={[
                      { id: '14', label: "14'ünde" },
                      { id: '16', label: "16'sında" },
                      { id: '18', label: "18'inde" },
                    ]}
                    onChange={setNeed}
                  />
                </label>
              </div>
              {!mixed && <div className="rounded-lg bg-sunken p-3 text-[12.5px] text-ink2">{calcNote(mixedCalc)}</div>}
              {mixed && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-sunken p-3">
                  <div className="text-[12px] font-medium text-ink2">Yalnız {draftCropName}</div>
                  <div className="tnum mt-0.5 text-[22px] font-bold leading-tight text-ink">
                    {!single ? (
                      <span className="text-[13px] font-medium text-ink2">{calcNote(singleCalc)}</span>
                    ) : singleFailed ? (
                      <span className="text-[13px] font-medium text-ink2">hesaplanamadı</span>
                    ) : (
                      <>
                        {int(safeSingle)} <span className="text-[13px] font-semibold text-ink2">ton</span>
                      </>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-ink2">{singleFailed ? (single?.message ?? 'Çözücü bu ürün için plan kuramadı.') : 'Kooperatif bu ürüne öncelik verirse.'}</div>
                  {single && !singleFailed && (
                    <div className="tnum mt-2 border-t border-line pt-2 text-[12px] text-ink2">
                      Kooperatif brüt geliri <b className="font-semibold text-ink">{tlShort(single.revenue)}</b>
                    </div>
                  )}
                </div>
                <div className="rounded-lg bg-sunken p-3">
                  <div className="text-[12px] font-medium text-ink2">Karma (gelir en yüksek)</div>
                  <ul className="tnum m-0 mt-1 flex list-none flex-col gap-1 p-0">
                    {mixedRows.map(({ c, safe }) => (
                      <li key={c.id} className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0">
                          <Swatch id={c.id} />
                          {c.name}
                          {(c.id === 'nohut' || c.id === 'aycicegi') && <span className="block pl-4 text-[11px] text-ink2">Türkiye'nin ithal ettiği ürün</span>}
                        </span>
                        <b className="shrink-0 font-semibold text-ink">{int(safe)} t</b>
                      </li>
                    ))}
                    {mixedRows.length === 0 && <li className="text-ink2">Güvenle söz verilebilecek ürün yok.</li>}
                  </ul>
                  <div className="tnum mt-2 border-t border-line pt-2 text-[12px] text-ink2">
                    Kooperatif brüt geliri <b className="font-semibold text-ink">{tlShort(mixed.revenue)}</b>
                  </div>
                </div>
              </div>
              )}
              <p className="mb-0 mt-2 text-[11.5px] text-ink2">
                Yılların en az {K}
                {inSuffix(K)} ulaşılan üretim; fiyat ve verimler varsayımdır.{' '}
                <button type="button" className="link-button" onClick={goMethod}>
                  Nasıl hesaplandı?
                </button>
              </p>
            </div>
          </Card>

          {cId ? (
            <Card>
              <H2 right={<Tag kind="hesap" />}>
                {s.buyer ? `${s.buyer}: ` : ''}
                {int(cTons)} ton {cName}
              </H2>
              <p className="m-0 mb-3 text-[14px] leading-relaxed text-ink">
                Aynı söz, aynı su. Gelişigüzel dağıtınca ortalama <b className={delivered(sc.scatter) < cTons ? 'font-semibold text-crit-ink' : 'font-semibold'}>{ton(delivered(sc.scatter))}</b> çıkıyor ve söz 20 yılın{' '}
                {sc.scatter.held}
                {inSuffix(sc.scatter.held)} tutuyor; planlı dağıtınca <b className={delivered(sc.planned) >= cTons ? 'font-semibold text-good-ink' : 'font-semibold text-crit-ink'}>{ton(delivered(sc.planned))}</b>, 20 yılın{' '}
                {sc.planned.held}
                {inSuffix(sc.planned.held)}.
              </p>
              <div className="overflow-x-auto">
                <table className="data">
                  <thead>
                    <tr>
                      <th></th>
                      <th className="num">
                        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-inherit underline decoration-dotted underline-offset-2" onClick={() => setMode('scatter')}>
                          Gelişigüzel
                        </button>
                      </th>
                      <th className="num">
                        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-inherit underline decoration-dotted underline-offset-2" onClick={() => setMode('planned')}>
                          Planlı
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row
                      label="Ortalama verim (tam sulanana göre)"
                      a={pct(sc.scatter.yieldLevel)}
                      b={pct(sc.planned.yieldLevel)}
                      active={mode}
                      better={sc.planned.yieldLevel > sc.scatter.yieldLevel + 0.005 ? 'b' : sc.scatter.yieldLevel > sc.planned.yieldLevel + 0.005 ? 'a' : null}
                    />
                    <Row label="Söz 20 yılın kaçında tutuyor" a={held(sc.scatter)} b={held(sc.planned)} active={mode} better={sc.planned.held > sc.scatter.held ? 'b' : sc.scatter.held > sc.planned.held ? 'a' : null} />
                    <Row label="Kullanılan toplam su" a={m3(sc.scatter.usedM3)} b={m3(sc.planned.usedM3)} active={mode} />
                    <Row
                      label="Kooperatif brüt geliri"
                      a={tlShort(sc.scatter.revenue)}
                      b={tlShort(sc.planned.revenue)}
                      active={mode}
                      better={sc.planned.revenue > sc.scatter.revenue * 1.005 ? 'b' : sc.scatter.revenue > sc.planned.revenue * 1.005 ? 'a' : null}
                    />
                    <Row
                      label="Suyu sezon ortasında biten üye"
                      a={sc.scatter.exceeded}
                      b={sc.planned.exceeded}
                      active={mode}
                      better={sc.planned.exceeded < sc.scatter.exceeded ? 'b' : sc.scatter.exceeded < sc.planned.exceeded ? 'a' : null}
                    />
                  </tbody>
                </table>
              </div>
              <p className="mb-0 mt-2 text-[11.5px] text-ink2">
                20 yılın ortalaması; söz kooperatifin toplam üretimiyle ölçülür, gelir brüttür.{' '}
                <button type="button" className="link-button" onClick={goMethod}>
                  Nasıl hesaplandı?
                </button>
              </p>
              {model.plan.status === 'error' && (
                <div className="mt-3">
                  <Note tone="crit">{model.plan.message ?? 'Plan kurulamadı.'}</Note>
                </div>
              )}
              {model.plan.status === 'partial' && (
                <div className="mt-3">
                  <Note tone="warn">
                    Bu söz planlı dağıtımla da tam karşılanamıyor: en çok {pct(model.plan.commitmentFraction)} kadarı üretilebiliyor. Seçenekler için{' '}
                    <button type="button" className="link-button !text-inherit" onClick={() => s.setTab('taahhut')}>
                      Taahhüt
                    </button>{' '}
                    ekranına bakın.
                  </Note>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div className="text-ink2">Taahhüt girilmedi. Ürün ve miktarı yazıp "Dağıt"a basın.</div>
            </Card>
          )}
        </div>
      </div>

      <HonestyBanner />
      <MemberEditor id={editing} onClose={() => setEditing(null)} />
    </>
  );
}
