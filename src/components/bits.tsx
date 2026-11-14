import { Info } from 'lucide-react';
import { useState } from 'react';
import { COOP_NAME } from '../data/defaults';
import { RELIABILITY_FLOOR } from '../engine/curves';
import type { YearOutcome } from '../engine/plan';
import { FALLOW } from '../engine/types';
import { da, inSuffix, int, m3, pct, tlShort, ton } from '../lib/format';
import { cropColor, Swatch, Tag } from './ui';

/** Her ekranın başında duran dürüstlük bandı. */
export function HonestyBanner() {
  return (
    <div className="banner banner-info" role="note">
      <Info size={16} aria-hidden />
      <div>
        <strong>{COOP_NAME} ve üyeleri kurgusaldır</strong> (örnek olsun diye uyduruldu). Hava verisi NASA'dan gelir ve yaklaşık 55 km'lik bir bölgenin ortalamasıdır: tek bir tarlayı değil, yöreyi anlatır; tarlada ne ekildiğini söylemez. Gelir brüttür: tohum, gübre, elektrik düşülmedi.
      </div>
    </div>
  );
}

export function cropName(id: string, names: Map<string, string>): string {
  return id === FALLOW ? 'Nadas' : (names.get(id) ?? id);
}

/** Alan paylarını gösteren yatay yığılmış çubuk + açıklama listesi. */
export function CropBar({ areas, names }: { areas: Record<string, number>; names: Map<string, string> }) {
  const entries = Object.entries(areas).filter(([, v]) => v >= 0.05);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return <div className="text-[13px] text-muted">Ekili alan yok.</div>;
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label="Ürünlerin alan payları">
        {entries.map(([id, v]) => (
          <div key={id} title={`${cropName(id, names)}: ${da(v)} da (${pct(v / total)})`} style={{ width: `${(v / total) * 100}%`, background: cropColor(id) }} />
        ))}
      </div>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[12px]">
        {entries.map(([id, v]) => (
          <li key={id} className="tnum whitespace-nowrap">
            <Swatch id={id} />
            {cropName(id, names)} <span className="text-ink2">{da(v)} da · {pct(v / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS = {
  green: { sym: '✓', label: 'tuttu', bg: 'var(--good)', fg: '#fff' },
  yellow: { sym: '≈', label: 'az farkla tutmadı (%90 ve üzeri)', bg: 'var(--warn)', fg: '#0b0b0b' },
  red: { sym: '✕', label: 'tutmadı', bg: 'var(--crit)', fg: '#fff' },
} as const;

/** Yıl yıl yeşil/sarı/kırmızı şerit. Renk tek başına taşımaz: her hücrede simge de var. */
export function BacktestStrip({
  outcomes,
  commitments,
  names,
  title,
}: {
  outcomes: YearOutcome[];
  commitments: Record<string, number>;
  names: Map<string, string>;
  title: string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  if (outcomes.length === 0) return <div className="text-[13px] text-muted">Denenecek plan yok.</div>;
  const held = outcomes.filter((o) => o.status === 'green').length;
  const worstIdx = outcomes.reduce((b, o, i) => (o.ratio < outcomes[b].ratio ? i : b), 0);
  const shown = outcomes[sel ?? worstIdx];
  const committed = Object.entries(commitments).filter(([, t]) => t > 0);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[13px] text-ink2">
          {committed.length === 0 ? 'Taahhüt girilmedi.' : (
            <>
              Taahhüt 20 yılın <strong className="text-ink">{held}{inSuffix(held)}</strong> tuttu <Tag kind="hesap" />
            </>
          )}
        </div>
      </div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${outcomes.length}, minmax(0, 1fr))` }}>
        {outcomes.map((o, i) => {
          const s = STATUS[o.status];
          const active = (sel ?? worstIdx) === i;
          return (
            <button
              key={o.year}
              type="button"
              onClick={() => setSel(i)}
              onMouseEnter={() => setSel(i)}
              aria-label={`${o.year}: ${s.label}, taahhüdün ${pct(Math.min(o.ratio, 9.99))} kadarı`}
              aria-pressed={active}
              className="flex h-11 cursor-pointer flex-col items-center justify-center rounded-[3px] border-0 p-0 text-[11px] leading-tight"
              style={{ background: s.bg, color: s.fg, outline: active ? '2px solid var(--ink)' : undefined, outlineOffset: 1 }}
            >
              <span className="text-[13px] font-bold">{s.sym}</span>
              <span className="tnum hidden sm:block">{String(o.year).slice(2)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted tnum">
        <span>{outcomes[0].year}</span>
        <span>✓ tuttu · ≈ %90-100 · ✕ %90'ın altı</span>
        <span>{outcomes[outcomes.length - 1].year}</span>
      </div>
      <div className="mt-2 rounded-md bg-sunken px-3 py-2 text-[13px] tnum">
        <strong>{shown.year}</strong>
        {(sel ?? worstIdx) === worstIdx && committed.length > 0 && <span className="text-crit-ink font-semibold"> · en kötü yıl</span>}
        <span className="text-ink2">
          {' '}
          · gelir {tlShort(shown.revenue)} · su {m3(shown.waterM3)}
          {committed.map(([id, t]) => (
            <span key={id}>
              {' '}
              · {cropName(id, names)} {ton(shown.productionT[id] ?? 0)} / {int(t)} t ({pct((shown.productionT[id] ?? 0) / t)})
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

export function UnreliableMark({ rel }: { rel: number }) {
  if (rel >= RELIABILITY_FLOOR) return null;
  return (
    <span className="ml-1 text-[11.5px] font-semibold text-warn-ink" title="Göreli verim 0,35'in altında">
      ⚠ bu kadar az suda hesap güvenilir değil
    </span>
  );
}
