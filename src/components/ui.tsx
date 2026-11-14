import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FALLOW } from '../engine/types';

// ---------- Dürüstlük etiketleri ----------
export type TagKind = 'nasa' | 'hesap' | 'varsayim' | 'kurgusal';
const TAGS: Record<TagKind, { text: string; fg: string; bg: string; title: string }> = {
  nasa: { text: 'NASA verisi', fg: 'var(--tag-nasa)', bg: 'var(--tag-nasa-bg)', title: 'NASA POWER günlük verisinden doğrudan gelen değer' },
  hesap: { text: 'hesap', fg: 'var(--tag-calc)', bg: 'var(--tag-calc-bg)', title: 'NASA verisi ve varsayımlardan modelle hesaplanan değer' },
  varsayim: { text: 'varsayım', fg: 'var(--tag-assume)', bg: 'var(--tag-assume-bg)', title: 'Doğrulanmamış varsayım; Yöntem sayfasından değiştirilebilir' },
  kurgusal: { text: 'KURGUSAL', fg: 'var(--tag-fiction)', bg: 'var(--tag-fiction-bg)', title: 'Gerçek kişi ya da kurum değildir; örnek olsun diye uydurulmuştur' },
};
export function Tag({ kind, className = '' }: { kind: TagKind; className?: string }) {
  const t = TAGS[kind];
  return (
    <span
      title={t.title}
      className={`inline-block align-middle rounded px-1.5 py-px text-[10.5px] font-semibold leading-4 tracking-wide whitespace-nowrap ${className}`}
      style={{ color: t.fg, background: t.bg }}
    >
      {t.text}
    </span>
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
  return <section className={`rounded-lg border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</section>;
}
export function H2({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="m-0 text-[17px] font-semibold">{children}</h2>
      {right}
    </div>
  );
}
export function Note({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warn' | 'crit' | 'good' }) {
  const c = tone === 'warn' ? 'border-warn' : tone === 'crit' ? 'border-crit' : tone === 'good' ? 'border-good' : 'border-axis';
  return <div className={`rounded-md border-l-4 ${c} bg-sunken px-3 py-2 text-[13.5px] text-ink2`}>{children}</div>;
}

/** Küçük gösterge: etiket + değer + kaynak etiketi */
export function Stat({ label, value, tag, sub }: { label: string; value: ReactNode; tag: TagKind; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-ink2">
        {label} <Tag kind={tag} />
      </div>
      <div className="text-[22px] font-semibold leading-tight">{value}</div>
      {sub && <div className="text-[12px] text-muted">{sub}</div>}
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
    <div className="rounded-lg border border-dashed border-axis p-8 text-center">
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-1 text-[13.5px] text-ink2">{children}</div>}
    </div>
  );
}
