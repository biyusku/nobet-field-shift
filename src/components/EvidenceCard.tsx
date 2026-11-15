// Yöntem sayfası: "Veri kaynakları ve kanıt". Döküm canlı girdilerden (src/data/inventory.ts),
// NASA kanıtı ve yeniden indirme karşılaştırması `npm run kanit` çıktısından (src/data/kanit.json) gelir.
import { useMemo, useState } from 'react';
import KANIT from '../data/kanit.json';
import { buildInventory, CLASS_LABEL, CLASS_ORDER, countByClass, DEPENDENCE, DEPENDENCE_EN, type InputClass } from '../data/inventory';
import { DISTRICTS } from '../data/members';
import { L } from '../i18n';
import { int } from '../lib/format';
import { useStore } from '../state';
import { Card, H2, Segmented, Tag } from './ui';

const stamp = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)} ${iso.slice(11, 16)} UTC`;
const dmy = (s: string) => `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)}`;

function ClassTag({ cls }: { cls: InputClass }) {
  if (cls === 'kaynakli') return <span className="tag tag-success">{L('kaynaklı', 'sourced')}</span>;
  return <Tag kind={cls} />;
}

export function EvidenceCard() {
  const s = useStore();
  const [filter, setFilter] = useState<InputClass | 'hepsi'>('hepsi');
  const rows = useMemo(() => {
    const ws = DISTRICTS.map((d) => s.weathers[d.id]).filter(Boolean);
    return buildInventory({
      cropDefs: s.cropDefs,
      soil: s.soil,
      eff: s.eff,
      settings: s.settings,
      members: s.members,
      buyer: s.buyer,
      days: ws[0]?.n,
      elevations: Object.fromEntries(ws.map((w) => [w.id, w.elevation])),
    });
  }, [s.cropDefs, s.soil, s.eff, s.settings, s.members, s.buyer, s.weathers, s.lang]);
  const counts = countByClass(rows);
  const shown = filter === 'hepsi' ? rows : rows.filter((r) => r.cls === filter);
  const redl = KANIT.redownload as { id: string; ok: boolean; at?: string; days?: number; same?: number; different?: number; error?: string }[];

  return (
    <div id="veri-kaniti" className="scroll-mt-4">
    <Card>
      <H2 right={<span className="text-[12px] text-ink2">{L('son çalıştırma', 'last run')}: {stamp(KANIT.generatedAt)}</span>}>{L('Veri kaynakları ve kanıt', 'Data sources and evidence')}</H2>
      {L(
        <p className="m-0 mb-3 text-ink2">
          Modele giren her girdi dört sınıftan birindedir. Sayılar aşağıdaki dökümün satırlarıdır: bir satır tek bir sayı da olabilir, bir dizi de (bir ürünün üç Kc değeri tek satır; bir NASA parametresinin bütün
          günlük serisi tek satır). Önem ya da ağırlık ölçüsü değildir. Bir değeri bu ekranda değiştirirseniz sınıfı "varsayım"a döner ve sayım buna göre değişir.
        </p>,
        <p className="m-0 mb-3 text-ink2">
          Every input to the model is in one of four classes. The counts are rows of the inventory below: a row can be a single number or a series (a crop's three Kc values are one row; the whole daily series of a
          NASA parameter is one row). They are not a measure of importance or weight. If you change a value on this screen, its class turns into "assumption" and the counts change accordingly.
        </p>,
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {CLASS_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(filter === c ? 'hepsi' : c)}
            aria-pressed={filter === c}
            className={`cursor-pointer rounded-[10px] border bg-surface p-3 text-left ${filter === c ? 'border-ink' : 'border-line'}`}
          >
            <div className="tnum text-[24px] font-[650] leading-none text-ink">{counts[c]}</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink2">
              <ClassTag cls={c} /> {L('girdi', 'inputs')}
            </div>
          </button>
        ))}
      </div>
      <p className="mb-0 mt-3 text-ink">
        <strong>{L('Üç ana sayı neye dayanır: ', 'What the three headline numbers depend on: ')}</strong>
        {L(DEPENDENCE, DEPENDENCE_EN)}
      </p>

      <div className="mb-2 mt-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-[13px] font-[650] text-ink">
          {L('Girdi dökümü', 'Input inventory')} <span className="font-normal text-ink2">· {shown.length} {L('satır', 'rows')}</span>
        </h3>
        <Segmented
          label={L('Sınıfa göre süz', 'Filter by class')}
          value={filter}
          onChange={setFilter}
          options={[{ id: 'hepsi' as const, label: `${L('Hepsi', 'All')} ${rows.length}` }, ...CLASS_ORDER.map((c) => ({ id: c, label: `${CLASS_LABEL[c]} ${counts[c]}` }))]}
        />
      </div>
      <div className="max-h-[460px] overflow-auto rounded-lg border border-line">
        <table className="data min-w-[860px]">
          <thead>
            <tr>
              <th>{L('Girdi', 'Input')}</th>
              <th>{L('Değer', 'Value')}</th>
              <th>{L('Birim', 'Unit')}</th>
              <th>{L('Sınıf', 'Class')}</th>
              <th>{L('Kaynak', 'Source')}</th>
              <th>{L('Tablo / sayfa', 'Table / page')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={`${r.cls}-${i}`}>
                <td>{r.name}</td>
                <td className="tnum">{r.value}</td>
                <td className="text-ink2">{r.unit}</td>
                <td>
                  <ClassTag cls={r.cls} />
                </td>
                <td>
                  {r.source && r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">
                      {r.source}
                    </a>
                  ) : (
                    <span className="text-ink2">–</span>
                  )}
                </td>
                <td className="text-ink2">{r.table ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="m-0 mb-1 mt-5 text-[13px] font-[650] text-ink">{L('NASA verisinin kanıtı', 'Evidence for the NASA data')}</h3>
      <p className="m-0 mb-2 text-ink2">
        {L('Parametreler her dosyada aynı: ', 'Parameters are the same in every file: ')}
        {KANIT.files[0].params.join(', ')}. {L('Aşağıdaki değerler ', 'The values below are read from the files in the repository when ')}
        <code>npm run kanit</code>
        {L(' çalıştırıldığında depodaki dosyalardan okunur.', ' is run.')}
      </p>
      <div className="overflow-x-auto">
        <table className="data min-w-[980px]">
          <thead>
            <tr>
              <th>{L('Dosya', 'File')}</th>
              <th>{L('Koordinat', 'Coordinates')}</th>
              <th>{L('Tarih aralığı', 'Date range')}</th>
              <th className="num">{L('Gün', 'Days')}</th>
              <th className="num">{L('Eksik', 'Missing')}</th>
              <th>{L('İndirme', 'Downloaded')}</th>
              <th>SHA-256</th>
              <th>API</th>
            </tr>
          </thead>
          <tbody>
            {KANIT.files.map((f) => (
              <tr key={f.id}>
                <td>
                  {f.file.replace('public/data/', '')}
                  {!f.used && <div className="text-[11.5px] text-ink2">{L('kooperatif hesabında kullanılmıyor', 'not used in the cooperative calculation')}</div>}
                </td>
                <td className="tnum">
                  {L(String(f.lat).replace('.', ','), String(f.lat))}° {L('K', 'N')}, {L(String(f.lon).replace('.', ','), String(f.lon))}° {L('D', 'E')}
                </td>
                <td className="tnum">
                  {dmy(f.start)} – {dmy(f.end)}
                </td>
                <td className="num tnum">{int(f.days)}</td>
                <td className="num tnum">{f.missingTotal}</td>
                <td className="tnum">{stamp(f.fetchedAt)}</td>
                <td>
                  <code className="break-all text-[11px]" title={f.sha256}>
                    {f.sha256.slice(0, 16)}…
                  </code>
                </td>
                <td>
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">
                    {L('tam adres', 'full URL')}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-0 mt-2 text-[12px] text-ink2">
        {L('Tam SHA-256 değerleri ve API adresleri ', 'Full SHA-256 values and API URLs are in ')}
        <code>docs/veri-kaniti.md</code>
        {L(' dosyasında.', '.')}{' '}
        {(KANIT.pairs as { a: string; b: string; sameParams: string[] }[])
          .map((p) =>
            L(
              `${p.a} ile ${p.b} dosyalarında ${p.sameParams.length === KANIT.files[0].params.length ? 'altı parametrenin altısı da' : `altı parametreden ${p.sameParams.length} tanesi`} gün gün aynı`,
              `in the ${p.a} and ${p.b} files ${p.sameParams.length === KANIT.files[0].params.length ? 'all six parameters are' : `${p.sameParams.length} of the six parameters are`} identical day by day`,
            ),
          )
          .join('; ')}
        {L(': beş ilçe için beş ayrı hava yok.', ': there are not five separate weather series for the five districts.')}
      </p>

      <h3 className="m-0 mb-1 mt-5 text-[13px] font-[650] text-ink">{L('Yeniden indirme ve yeniden hesap', 'Re-download and recalculation')}</h3>
      <p className="m-0 mb-2 text-ink2">
        <code>npm run kanit</code>{' '}
        {L(
          'veriyi NASA POWER\'dan yeniden indirir, kayıtlı dosyayla gün gün karşılaştırır, ET0\'ı ve üç ana sayıyı baştan hesaplar. Bir gün, altı parametrenin altısı da birebir eşitse "aynı" sayılır. Kayıtlı sonuçlar aynı hesap motoruyla üretildi: bu, hesabın tekrarlanabilir olduğunu gösterir, doğru olduğunu değil.',
          're-downloads the data from NASA POWER, compares it day by day with the stored file, and recalculates ET0 and the three headline numbers from scratch. A day counts as "identical" if all six parameters match exactly. The recorded results were produced with the same calculation engine: this shows the calculation is reproducible, not that it is correct.',
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="data min-w-[560px]">
          <thead>
            <tr>
              <th>{L('İlçe', 'District')}</th>
              <th>{L('Yeniden indirme', 'Re-download')}</th>
              <th className="num">{L('Gün', 'Days')}</th>
              <th className="num">{L('Birebir aynı', 'Identical')}</th>
              <th className="num">{L('Farklı', 'Different')}</th>
            </tr>
          </thead>
          <tbody>
            {redl.map((r) => (
              <tr key={r.id}>
                <td>{DISTRICTS.find((d) => d.id === r.id)?.name ?? r.id}</td>
                {r.ok ? (
                  <>
                    <td className="tnum">{stamp(r.at!)}</td>
                    <td className="num tnum">{int(r.days!)}</td>
                    <td className="num tnum">{int(r.same!)}</td>
                    <td className="num tnum">{int(r.different!)}</td>
                  </>
                ) : (
                  <td colSpan={4}>
                    <span className="tag tag-critical">{L('yapılamadı', 'failed')}</span>{' '}
                    <span className="text-ink2">{L(`indirilemedi (${r.error}); karşılaştırma yapılmadı`, `could not be downloaded (${r.error}); no comparison made`)}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-[12.5px] font-medium text-ink">{L('Betiğin son çıktısı', 'Last script output (in Turkish)')}</summary>
        <pre className="m-0 mt-2 max-h-[420px] overflow-auto rounded-md bg-sunken p-3 text-[11.5px] leading-relaxed">{KANIT.output}</pre>
      </details>
    </Card>
    </div>
  );
}
