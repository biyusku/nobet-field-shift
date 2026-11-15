// "NASA verisi ne diyor": aylık yağış ve ET0, yıllık yağış eğilimi, üç küçük sayı.
import { useMemo, useState } from 'react';
import { climateSummary, type ClimateSummary } from '../engine/climate';
import type { Weather } from '../engine/types';
import { L } from '../i18n';
import { dec1, int } from '../lib/format';
import { Card, H2, Stat, Tag, useWidth } from './ui';

const MONTHS = () =>
  L(['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const MONTHS_LONG = () =>
  L(
    ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  );
const RAIN = 'var(--water)';
const ET0 = 'var(--c2)';

function MonthlyBars({ c }: { c: ClimateSummary }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = Math.max(260, width);
  const H = 170;
  const M = { l: 30, r: 4, t: 8, b: 20 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const max = Math.max(...c.months.map((m) => Math.max(m.prec, m.et0)), 1);
  const top = Math.ceil(max / 50) * 50;
  const y = (v: number) => M.t + ih - (v / top) * ih;
  const slot = iw / 12;
  const bw = Math.max(3, Math.min(14, slot / 2 - 3));
  const shown = hi ?? 6;
  return (
    <div ref={ref}>
      <svg width={W} height={H} role="img" aria-label={L('Aylık ortalama yağış ve ET0, 12 ay', 'Monthly average precipitation and ET0, 12 months')} onMouseLeave={() => setHi(null)} style={{ display: 'block' }}>
        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={M.l - 5} y={y(t) + 4} textAnchor="end" fontSize={10.5} fill="var(--muted)" className="tnum">
              {int(t)}
            </text>
          </g>
        ))}
        {c.months.map((m, i) => {
          const cx = M.l + slot * i + slot / 2;
          return (
            <g key={m.month} onMouseEnter={() => setHi(i)}>
              <rect x={M.l + slot * i} y={M.t} width={slot} height={ih + M.b} fill={hi === i ? 'var(--sunken)' : 'transparent'} />
              <rect x={cx - bw - 1} y={y(m.prec)} width={bw} height={Math.max(1, y(0) - y(m.prec))} rx={2} fill={RAIN} />
              <rect x={cx + 1} y={y(m.et0)} width={bw} height={Math.max(1, y(0) - y(m.et0))} rx={2} fill={ET0} />
              <text x={cx} y={H - 5} textAnchor="middle" fontSize={10.5} fill={i === shown ? 'var(--ink)' : 'var(--muted)'} fontWeight={i === shown ? 600 : 400}>
                {MONTHS()[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="tnum mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: RAIN }} />
          {L('Yağış', 'Precipitation')} <Tag kind="nasa" />
        </span>
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: ET0 }} />
          {L('Havanın istediği su (ET0)', 'Water demanded by the air (ET0)')} <Tag kind="hesap" />
        </span>
        <span className="text-ink2">
          {MONTHS_LONG()[shown]}: {L('yağış', 'precipitation')} {int(c.months[shown].prec)} mm · ET0 {int(c.months[shown].et0)} mm
        </span>
      </div>
    </div>
  );
}

function AnnualLine({ c }: { c: ClimateSummary }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = Math.max(260, width);
  const H = 150;
  const M = { l: 30, r: 10, t: 14, b: 20 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const ys = c.years;
  const top = Math.ceil(Math.max(...ys.map((p) => p.prec), 1) / 100) * 100;
  const x = (i: number) => M.l + (ys.length > 1 ? (i / (ys.length - 1)) * iw : 0);
  const y = (v: number) => M.t + ih - (v / top) * ih;
  const path = ys.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.prec).toFixed(1)}`).join('');
  const t0 = c.trend.atFirstYear;
  const t1 = t0 + c.trend.slopePerYear * (ys.length - 1);
  const di = ys.findIndex((p) => p.year === c.driest.year);
  const shown = hi ?? di;
  return (
    <div ref={ref}>
      <svg
        width={W}
        height={H}
        role="img"
        aria-label={L(
          `Yıllık yağış ${ys[0]?.year}-${ys[ys.length - 1]?.year}; en kurak yıl ${c.driest.year}`,
          `Annual precipitation ${ys[0]?.year}-${ys[ys.length - 1]?.year}; driest year ${c.driest.year}`,
        )}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHi(Math.max(0, Math.min(ys.length - 1, Math.round(((e.clientX - r.left - M.l) / iw) * (ys.length - 1)))));
        }}
        onMouseLeave={() => setHi(null)}
        style={{ display: 'block' }}
      >
        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={M.l - 5} y={y(t) + 4} textAnchor="end" fontSize={10.5} fill="var(--muted)" className="tnum">
              {int(t)}
            </text>
          </g>
        ))}
        {ys.map((p, i) =>
          i % 5 === 0 || i === ys.length - 1 ? (
            <text key={p.year} x={x(i)} y={H - 5} textAnchor={i === ys.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize={10.5} fill="var(--muted)" className="tnum">
              {p.year}
            </text>
          ) : null,
        )}
        <line x1={x(0)} x2={x(ys.length - 1)} y1={y(t0)} y2={y(t1)} stroke="var(--ink2)" strokeWidth={1.5} strokeDasharray="5 4" />
        <path d={path} fill="none" stroke={RAIN} strokeWidth={2} strokeLinejoin="round" />
        {di >= 0 && (
          <g>
            <circle cx={x(di)} cy={y(c.driest.prec)} r={5} fill="var(--crit)" stroke="var(--surface)" strokeWidth={2} />
            <text x={x(di) - 8} y={y(c.driest.prec) + 4} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--crit-ink)">
              {L('en kurak', 'driest')}: {c.driest.year}
            </text>
          </g>
        )}
        {hi !== null && <circle cx={x(hi)} cy={y(ys[hi].prec)} r={4} fill={RAIN} stroke="var(--surface)" strokeWidth={2} />}
      </svg>
      <div className="tnum mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <span>
          <svg width="20" height="8" aria-hidden className="mr-1.5 inline-block align-middle">
            <line x1="0" x2="20" y1="4" y2="4" stroke={RAIN} strokeWidth="2" />
          </svg>
          {L('Yıllık yağış', 'Annual precipitation')} <Tag kind="nasa" />
        </span>
        <span>
          <svg width="20" height="8" aria-hidden className="mr-1.5 inline-block align-middle">
            <line x1="0" x2="20" y1="4" y2="4" stroke="var(--ink2)" strokeWidth="1.5" strokeDasharray="5 4" />
          </svg>
          {L('Doğrusal eğilim', 'Linear trend')} <Tag kind="hesap" />
        </span>
        {shown >= 0 && ys[shown] && (
          <span className="text-ink2">
            {ys[shown].year}: {int(ys[shown].prec)} mm
          </span>
        )}
      </div>
    </div>
  );
}

export function ClimateCard({ w }: { w: Weather }) {
  const c = useMemo(() => climateSummary(w), [w]);
  const jul = c.months[6];
  const slope = c.trend.slopePerYear;
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <H2 right={<span className="text-[12px] text-ink2">{w.name} · 2006–2025</span>}>{L('NASA verisi ne diyor', 'What the NASA data says')}</H2>

      <div>
        <h3 className="m-0 mb-2 text-[14px] font-[650] leading-snug text-ink">
          {L(`Temmuzda ${int(jul.prec)} mm yağıyor, hava ${int(jul.et0)} mm istiyor.`, `In July ${int(jul.prec)} mm of rain falls while the air demands ${int(jul.et0)} mm.`)}
        </h3>
        <MonthlyBars c={c} />
      </div>

      <div>
        <h3 className="m-0 mb-2 text-[14px] font-[650] leading-snug text-ink">
          {L(
            `Yılda ortalama ${int(c.meanPrec)} mm yağıyor; en kurak yıl ${c.driest.year} (${int(c.driest.prec)} mm).`,
            `On average ${int(c.meanPrec)} mm falls per year; the driest year was ${c.driest.year} (${int(c.driest.prec)} mm).`,
          )}
        </h3>
        <AnnualLine c={c} />
        <p className="mb-0 mt-1.5 text-[11px] text-ink2">
          {c.years[0]?.year}–{c.years[c.years.length - 1]?.year} {L('doğrusal eğilimi: yılda', 'linear trend:')} {slope >= 0 ? '+' : '−'}
          {dec1(Math.abs(slope))} {L('mm.', 'mm per year.')}{' '}
          {L('Yıldan yıla oynaklık büyük; eğilimin istatistiksel anlamlılığı sınanmadı.', 'Year-to-year variability is large; the statistical significance of the trend was not tested.')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-line pt-3">
        <Stat label={L('Yıllık yağış', 'Annual precipitation')} tag="nasa" value={`${int(c.meanPrec)} mm`} sub={L('20 yıl ortalaması', '20-year average')} />
        <Stat
          label={L('Yıllık ET0', 'Annual ET0')}
          tag="hesap"
          value={`${int(c.meanEt0)} mm`}
          sub={L(`yağışın ${dec1(c.meanEt0 / Math.max(1, c.meanPrec))} katı`, `${dec1(c.meanEt0 / Math.max(1, c.meanPrec))} × precipitation`)}
        />
        <Stat
          label={L('35 °C üstü gün', 'Days above 35 °C')}
          tag="nasa"
          value={L(`${int(c.hotDays.last)} gün`, `${int(c.hotDays.last)} days`)}
          sub={L(`temmuz-ağustos ${c.hotDays.lastYear} · 20 yıl ort. ${dec1(c.hotDays.mean)}`, `July-August ${c.hotDays.lastYear} · 20-yr avg ${dec1(c.hotDays.mean)}`)}
        />
      </div>
    </Card>
  );
}
