import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tip } from './kit';
import { FALLOW } from '../engine/types';

// ---------- Dürüstlük etiketleri ----------
export type TagKind = 'nasa' | 'hesap' | 'varsayim' | 'kurgusal';
const TAGS: Record<TagKind, { text: string; cls: string; title: string }> = {
  nasa: { text: 'NASA verisi', cls: 'tag-info', title: 'NASA POWER günlük verisinden doğrudan gelen değer' },
  hesap: { text: 'hesap', cls: '', title: 'NASA verisi ve varsayımlardan modelle hesaplanan değer' },
  varsayim: { text: 'varsayım', cls: 'tag-warning', title: 'Doğrulanmamış varsayım; Yöntem sayfasından değiştirilebilir' },
  kurgusal: { text: 'kurgusal', cls: 'tag-critical', title: 'Gerçek kişi ya da kurum değildir; örnek olsun diye uydurulmuştur' },
};
const TAG_INK: Record<TagKind, string> = { nasa: 'var(--info-ink)', hesap: 'var(--ink2)', varsayim: 'var(--warn-ink)', kurgusal: 'var(--crit-ink)' };
/** compact: tablo başlıklarında kullanılan, zeminsiz küçük yazı. */
export function Tag({ kind, className = '', compact = false }: { kind: TagKind; className?: string; compact?: boolean }) {
  const t = TAGS[kind];
  return (
    <Tip text={t.title}>
      {compact ? (
        <span className={`block cursor-help text-[10px] font-medium leading-tight ${className}`} style={{ color: TAG_INK[kind] }}>
          {t.text}
        </span>
      ) : (
        <span className={`tag cursor-help ${t.cls} ${className}`}>
          {t.text}
        </span>
      )}
    </Tip>
  );
}

// ---------- Ürün renkleri (sabit sıra; renk ürünü izler) ----------
const ORDER = ['misir', 'pancar', 'aycicegi', 'bugday', 'arpa', 'nohut'];
export function cropColor(id: string): string {
  if (id === FALLOW) return 'var(--fallow)';
  const i = ORDER.indexOf(id);
  return `var(--c${i >= 0 ? i + 1 : 1})`;
}
export function Swatch({ id }: { id: string }) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm align-baseline mr-1.5 shrink-0" style={{ background: cropColor(id) }} />;
}

// ---------- Yerleşim ----------
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function H2({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h2 className="card-title flex items-center gap-2">{children}</h2>
      {right}
    </div>
  );
}

const NOTE = {
  plain: { cls: '', Icon: Info },
  warn: { cls: 'banner-warning', Icon: AlertTriangle },
  crit: { cls: 'banner-critical', Icon: AlertTriangle },
  good: { cls: 'banner-success', Icon: CheckCircle2 },
  info: { cls: 'banner-info', Icon: Info },
} as const;
export function Note({ children, tone = 'plain' }: { children: ReactNode; tone?: keyof typeof NOTE }) {
  const { cls, Icon } = NOTE[tone];
  return (
    <div className={`banner ${cls}`} role="status">
      <Icon size={16} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Kart içi küçük gösterge: etiket + değer + kaynak etiketi */
export function Stat({ label, value, tag, sub }: { label: string; value: ReactNode; tag: TagKind; sub?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink2">
        {label} <Tag kind={tag} />
      </div>
      <div className="tnum text-[17px] font-bold leading-tight text-ink">{value}</div>
      {sub && <div className="text-[11px] text-ink2">{sub}</div>}
    </div>
  );
}

/** Küçük çizgi grafik: KPI kartının sağında, eksen ve etiket olmadan. */
export function Sparkline({ values, compare }: { values: number[]; compare?: number[] }) {
  const all = [...values, ...(compare ?? [])];
  if (values.length < 2) return null;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const W = 84;
  const H = 36;
  const path = (v: number[]) =>
    v.map((y, i) => `${i ? 'L' : 'M'}${((i / (v.length - 1)) * (W - 4) + 2).toFixed(1)},${(H - 4 - ((y - min) / (max - min || 1)) * (H - 8)).toFixed(1)}`).join('');
  return (
    <svg width={W} height={H} aria-hidden className="shrink-0">
      {compare && compare.length > 1 && <path d={path(compare)} fill="none" stroke="var(--axis)" strokeWidth={1.25} strokeDasharray="3 3" />}
      <path d={path(values)} fill="none" stroke="var(--water)" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/** Önceki değere göre yüzde değişim; lowerIsBetter maliyet türü ölçüler için. */
export function Change({ from, to, lowerIsBetter = false }: { from: number; to: number; lowerIsBetter?: boolean }) {
  if (!(from > 0) || !Number.isFinite(to)) return null;
  const ch = (to - from) / from;
  if (Math.abs(ch) < 0.0005) return null;
  const up = ch > 0;
  const good = lowerIsBetter ? !up : up;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`change ${good ? 'is-good' : 'is-bad'}`} title="Bugünkü ekime göre">
      <Arrow size={12} aria-hidden />%{Math.round(Math.abs(ch) * 100)}
    </span>
  );
}

/** Üst sıradaki özet kartı. */
export function Kpi({
  label,
  value,
  tag,
  hint,
  change,
  spark,
  tone,
}: {
  label: string;
  value: ReactNode;
  tag: TagKind;
  hint?: ReactNode;
  change?: ReactNode;
  spark?: ReactNode;
  tone?: 'crit' | 'good';
}) {
  return (
    <section className="card kpi-card">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="card-title flex flex-wrap items-center gap-1.5">
          {label} <Tag kind={tag} />
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`kpi-value ${tone === 'crit' ? '!text-crit-ink' : tone === 'good' ? '!text-good-ink' : ''}`}>{value}</span>
          {change}
        </div>
        {hint && <span className="text-[11px] text-ink2">{hint}</span>}
      </div>
      {spark}
    </section>
  );
}

/** Sayfa başlığı: ikon + başlık + soluk bilgi, sağda eylemler. */
export function PageHeader({ icon: Icon, title, meta, children }: { icon: LucideIcon; title: string; meta?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-ink">
        <Icon size={16} aria-hidden />
        <h1 className="m-0 text-[14px] font-[650]">{title}</h1>
        {meta && <span className="text-[12px] text-ink2">{meta}</span>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={o.id === value} className={o.id === value ? 'is-active' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Sayı girişi (tr-TR: ondalık virgül) ----------
export function NumInput({
  value,
  onChange,
  min = 0,
  max = 1e9,
  decimals = 0,
  label,
  className = '',
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  decimals?: number;
  label: string;
  className?: string;
  suffix?: string;
}) {
  const show = (v: number) => (Number.isFinite(v) ? String(+v.toFixed(decimals)).replace('.', ',') : '');
  const [text, setText] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  // girişte binlik ayırıcı gösterilmez; virgül de nokta da ondalık sayılır
  const parse = (s: string) => Number(s.trim().replace(',', '.'));
  const bad = text.trim() === '' || !Number.isFinite(parse(text)) || parse(text) < min || parse(text) > max;
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <input
        aria-label={label}
        aria-invalid={bad}
        inputMode="decimal"
        className={`field tnum text-right ${suffix ? 'pr-9' : ''} ${bad ? '!border-crit' : ''}`}
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(show(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const v = parse(e.target.value);
          if (e.target.value.trim() !== '' && Number.isFinite(v) && v >= min && v <= max) onChange(v);
        }}
      />
      {suffix && <span className="pointer-events-none absolute right-2 text-[12px] text-muted">{suffix}</span>}
    </span>
  );
}

/** Kapsayıcının piksel genişliğini izler (SVG metni ölçeklenmesin diye). */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card !py-10 text-center">
      <div className="text-[14px] font-[650] text-ink">{title}</div>
      {children && <div className="mt-1 text-[13.5px] text-ink2">{children}</div>}
    </div>
  );
}

/** Önce → sonra kartı: bugünkü ekimden önerilen plana ne değişiyor. */
export function Shift({ label, tag, from, to, tone, hint }: { label: string; tag: TagKind; from: ReactNode; to: ReactNode; tone?: 'good' | 'crit'; hint?: ReactNode }) {
  return (
    <section className="card flex min-w-0 flex-col gap-1.5 !py-3.5">
      <h2 className="card-title flex flex-wrap items-center gap-1.5">
        {label} <Tag kind={tag} />
      </h2>
      <div className="tnum flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[13px] text-ink2">{from}</span>
        <ArrowRight size={13} className="shrink-0 translate-y-[1px] text-muted" aria-label="önerilen planla" />
        <span className={`text-[18px] font-bold leading-tight ${tone === 'good' ? 'text-good-ink' : tone === 'crit' ? 'text-crit-ink' : 'text-ink'}`}>{to}</span>
      </div>
      {hint && <span className="text-[11px] text-ink2">{hint}</span>}
    </section>
  );
}

/** Ortak ölçekte yatay çubuklar: kota, ihtiyaç, kullanılan gibi büyüklükleri yan yana okutur. */
export function Bars({ rows, unit }: { rows: { label: string; value: number; color: string; note?: string }[]; unit: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <dl className="m-0 flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-[12px]">
            <dt className="text-ink2">{r.label}</dt>
            <dd className="tnum m-0 font-semibold text-ink">
              {unit(r.value)}
              {r.note && <span className="font-normal text-ink2"> · {r.note}</span>}
            </dd>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-[4px] bg-sunken">
            <div className="h-full rounded-[4px]" style={{ width: `${Math.max(0.5, (r.value / max) * 100)}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Ekranın başındaki düz Türkçe özet: sayıları bilmeyen biri de ne olduğunu anlasın. */
export function Brief({ children }: { children: ReactNode }) {
  return (
    <section className="card !px-5 !py-4">
      <h2 className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink2">Kısaca</h2>
      <div className="flex max-w-[980px] flex-col gap-1.5 text-[14.5px] leading-relaxed text-ink [&_b]:font-semibold">{children}</div>
    </section>
  );
}

/** Etiket solda, değer sağda satırlar. */
export function MiniList({ rows }: { rows: { label: ReactNode; value: ReactNode; sub?: ReactNode }[] }) {
  return (
    <dl className="m-0 flex flex-col">
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
          <dt className="flex flex-wrap items-center gap-1.5 text-ink2">{r.label}</dt>
          <dd className="tnum m-0 text-right font-semibold text-ink">
            {r.value}
            {r.sub && <div className="text-[11px] font-normal text-ink2">{r.sub}</div>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** İnce ilerleme çubuğu: bir değerin bir sınıra oranı (sınırı aşarsa kırmızı). */
export function Meter({ value, limit, label }: { value: number; limit: number; label: string }) {
  const ratio = limit > 0 ? value / limit : 0;
  const over = ratio > 1.0001;
  return (
    <div className="min-w-[110px]" role="img" aria-label={label}>
      <div className="relative h-2 overflow-hidden rounded-[4px] bg-sunken">
        <div className="h-full rounded-[4px]" style={{ width: `${Math.min(100, (over ? 1 / ratio : ratio) * 100)}%`, background: 'var(--water)' }} />
        {over && <div className="absolute inset-y-0 right-0 rounded-r-[4px]" style={{ left: `${(1 / ratio) * 100}%`, background: 'var(--crit)', opacity: 0.75 }} />}
      </div>
    </div>
  );
}
