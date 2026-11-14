// Kümülatif sulama ile kota çizgisi: kesiştikleri gün "su bitiş tarihi"dir.
import { useMemo, useState } from 'react';
import type { FarmEvaluation } from '../engine/farm';
import type { Weather } from '../engine/types';
import { dateOfIndex, dayIndex } from '../engine/weather';
import { fmtDayMonth, int, m3 } from '../lib/format';
import { useWidth } from './ui';

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

export function WaterChart({
  w,
  ev,
  yearIndex,
  quotaM3,
  yMax,
  kind,
}: {
  w: Weather;
  ev: FarmEvaluation;
  yearIndex: number;
  quotaM3: number;
  yMax: number;
  kind: 'current' | 'planned';
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const fy = ev.years[yearIndex];
  const H = 280;
  const M = { l: 52, r: 14, t: 26, b: 28 };
  const W = Math.max(280, width);
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;

  const geo = useMemo(() => {
    if (!fy) return null;
    // 1 Mart'tan pencere sonuna (31 Ekim)
    const d0 = dayIndex(w, fy.year, 3, 1) - fy.start;
    const d1 = fy.nDays - 1;
    const x = (d: number) => M.l + ((d - d0) / (d1 - d0)) * iw;
    const y = (v: number) => M.t + ih - (Math.min(v, yMax) / yMax) * ih;
    const step = (arr: Float64Array) => {
      let s = `M${x(d0).toFixed(1)},${y(arr[d0]).toFixed(1)}`;
      let last = arr[d0];
      for (let d = d0 + 1; d <= d1; d++) {
        if (arr[d] !== last || d === d1) {
          s += `H${x(d).toFixed(1)}V${y(arr[d]).toFixed(1)}`;
          last = arr[d];
        }
      }
      return s;
    };
    const months = [3, 4, 5, 6, 7, 8, 9, 10].map((m) => ({ m, d: dayIndex(w, fy.year, m, 1) - fy.start }));
    return { d0, d1, x, y, step, months };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fy, w, iw, ih, yMax]);

  if (!fy || !geo || yMax <= 0) return <div ref={ref} className="h-[280px]" />;
  const { d0, d1, x, y, step, months } = geo;
  const ticks = niceTicks(yMax);
  const endMin = ev.endDays.length ? Math.min(...ev.endDays) : null;
  const endMax = ev.endDays.length ? Math.max(...ev.endDays) : null;
  const end = fy.endDay;
  const hd = hover === null ? null : Math.max(d0, Math.min(d1, hover));
  const usedLabel = kind === 'current' ? 'Kotayla yapılabilen sulama' : 'Plandaki sulama';

  return (
    <div ref={ref} className="relative">
      <svg
        width={W}
        height={H}
        role="img"
        aria-label={`${fy.year} hasat yılı kümülatif sulama grafiği. Kota ${int(quotaM3)} metreküp. ${
          end !== null ? `Su bitiş tarihi ${fmtDayMonth(dateOfIndex(w, fy.start + end))}.` : 'Kota aşılmıyor.'
        }`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(d0 + ((e.clientX - r.left - M.l) / iw) * (d1 - d0)));
        }}
        onMouseLeave={() => setHover(null)}
        style={{ display: 'block', touchAction: 'pan-y' }}
      >
        {/* ızgara ve y ekseni */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={M.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" className="tnum">
              {int(t)}
            </text>
          </g>
        ))}
        <text x={M.l - 44} y={12} fontSize={11} fill="var(--muted)">
          m³ (1 Ekim'den beri kümülatif)
        </text>
        {/* x ekseni: ay başları */}
        <line x1={M.l} x2={W - M.r} y1={M.t + ih} y2={M.t + ih} stroke="var(--axis)" />
        {months.map(({ m, d }) => (
          <g key={m}>
            <line x1={x(d)} x2={x(d)} y1={M.t + ih} y2={M.t + ih + 4} stroke="var(--axis)" />
            <text x={x(d) + 3} y={M.t + ih + 17} fontSize={11} fill="var(--muted)">
              {MONTHS[m - 1]}
            </text>
          </g>
        ))}

        {/* 20 yılın su bitiş aralığı */}
        {endMin !== null && endMax !== null && (
          <rect x={x(endMin)} y={M.t} width={Math.max(2, x(endMax) - x(endMin))} height={ih} fill="var(--crit)" opacity={0.1} />
        )}

        {/* diğer yılların ihtiyaç çizgileri */}
        {ev.years.map((o, i) =>
          i === yearIndex ? null : <path key={o.year} d={step(o.demandM3)} fill="none" stroke="var(--axis)" strokeWidth={1} opacity={0.55} />,
        )}

        {/* seçili yıl: ihtiyaç (kesikli) ve gerçekleşen (dolu) */}
        <path d={step(fy.demandM3)} fill="none" stroke="var(--ink2)" strokeWidth={1.5} strokeDasharray="5 4" />
        <path d={step(fy.cumM3)} fill="none" stroke="var(--water)" strokeWidth={2.5} strokeLinejoin="round" />

        {/* kota çizgisi */}
        <line x1={M.l} x2={W - M.r} y1={y(quotaM3)} y2={y(quotaM3)} stroke="var(--crit)" strokeWidth={1.5} />
        <text x={M.l + 4} y={y(quotaM3) - 5} fontSize={11.5} fontWeight={600} fill="var(--crit-ink)">
          Kota {int(quotaM3)} m³
        </text>

        {/* su bitiş işareti */}
        {end !== null && end >= d0 && (
          <g>
            <line x1={x(end)} x2={x(end)} y1={y(quotaM3)} y2={M.t + ih} stroke="var(--crit)" strokeWidth={1} strokeDasharray="2 3" />
            <circle cx={x(end)} cy={y(quotaM3)} r={5.5} fill="var(--crit)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}

        {/* fare izi */}
        {hd !== null && (
          <g pointerEvents="none">
            <line x1={x(hd)} x2={x(hd)} y1={M.t} y2={M.t + ih} stroke="var(--ink2)" strokeWidth={1} opacity={0.5} />
            <circle cx={x(hd)} cy={y(fy.cumM3[hd])} r={4} fill="var(--water)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>

      {hd !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] shadow-md tnum"
          style={{ top: 4, left: Math.min(Math.max(x(hd) + 10, 0), W - 200), width: 190 }}
        >
          <div className="font-semibold">{fmtDayMonth(dateOfIndex(w, fy.start + hd))} {dateOfIndex(w, fy.start + hd).getUTCFullYear()}</div>
          <div className="flex justify-between gap-2">
            <span className="text-ink2">Sulama</span>
            <span>{m3(fy.cumM3[hd])}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-ink2">Tam ihtiyaç</span>
            <span>{m3(fy.demandM3[hd])}</span>
          </div>
        </div>
      )}

      <ul className="m-0 mt-1 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[12px] text-ink2">
        <li className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden><line x1="0" x2="22" y1="4" y2="4" stroke="var(--water)" strokeWidth="2.5" /></svg>
          {usedLabel} ({fy.year})
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden><line x1="0" x2="22" y1="4" y2="4" stroke="var(--ink2)" strokeWidth="1.5" strokeDasharray="5 4" /></svg>
          Tam sulama ihtiyacı ({fy.year})
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden><line x1="0" x2="22" y1="4" y2="4" stroke="var(--axis)" strokeWidth="1" /></svg>
          Diğer 19 yılın ihtiyacı
        </li>
        {endMin !== null && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-4" style={{ background: 'var(--crit)', opacity: 0.2 }} />
            Su bitiş tarihlerinin 20 yıllık aralığı
          </li>
        )}
      </ul>
    </div>
  );
}
