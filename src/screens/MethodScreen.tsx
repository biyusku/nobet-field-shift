import { BookOpen, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { UnreliableMark } from '../components/bits';
import { EvidenceCard } from '../components/EvidenceCard';
import { Confirm, Select, SourcePop } from '../components/kit';
import { DEFAULT_CROPS, type Assumed } from '../data/crops';
import SOURCES from '../data/sources.json';
import { notFoundText, refInLang, sourceText, srcName, srcNote, srcTable } from '../data/sourcesEn';
import { Card, H2, Note, NumInput, PageHeader, Swatch, Tag } from '../components/ui';
import type { CropDef } from '../data/crops';
import { METHOD_LABEL } from '../data/defaults';
import { levelLabel, LEVELS, RELIABILITY_FLOOR } from '../engine/curves';
import { YELLOW_FLOOR } from '../engine/plan';
import { SOIL_FORMULA, SOIL_FORMULA_EN } from '../engine/soil';
import { FIRST_YEAR, LAST_YEAR, type IrrigationMethod } from '../engine/types';
import { sumCalendar } from '../engine/weather';
import { cropLabel, L } from '../i18n';
import { dec2, fmtFull, int, pct } from '../lib/format';
import { useStore } from '../state';

function Formula({ children }: { children: string }) {
  return <pre className="m-0 overflow-x-auto rounded-md bg-sunken p-3 text-[12px] leading-relaxed">{children}</pre>;
}

/** Su seviyesi etiketi (motor Türkçe verir: "tam", "susuz", "N mm"). */
const lvl = (level: number | null) => (level === null ? L(levelLabel(level), 'full') : level === 0 ? L(levelLabel(level), 'rainfed') : levelLabel(level));

export function MethodScreen() {
  const s = useStore();
  const { model, weather } = s;
  const [method, setMethod] = useState<IrrigationMethod>('yagmurlama');
  if (!model || !weather) return null;

  // Bir alan elle değiştirilirse artık kaynaktaki değer değildir: etiketi "varsayım"a döner.
  const setCrop = (id: string, fn: (d: CropDef) => CropDef) =>
    s.update({
      cropDefs: s.cropDefs.map((d) => {
        if (d.id !== id) return d;
        const next = fn(d);
        for (const k of ['plant', 'stages', 'kc', 'ky', 'yieldKgDa', 'priceTlTon'] as const) {
          if (next[k].verified && JSON.stringify(next[k].value) !== JSON.stringify(d[k].value)) (next as CropDef)[k] = { ...next[k], verified: false, ref: undefined } as never;
        }
        return next;
      }),
    });
  const badge = (a: Assumed<unknown>) => <div className="mt-1">{a.verified && a.ref ? <SourcePop {...refInLang(a.ref)} /> : <Tag kind="varsayim" />}</div>;
  const years: number[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) years.push(y);
  const clim = years.map((y) => ({ y, p: sumCalendar(weather, weather.prec, y), e: sumCalendar(weather, weather.et0, y), pj: sumCalendar(weather, weather.prec, y, 7), ej: sumCalendar(weather, weather.et0, y, 7) }));
  const avg = (f: (c: (typeof clim)[number]) => number) => clim.reduce((a, c) => a + f(c), 0) / clim.length;
  const missingTotal = Object.values(weather.missing).reduce((a, b) => a + b, 0);
  const curves = model.curvesByMethod[method];

  return (
    <>
      <PageHeader icon={BookOpen} title={L('Yöntem ve kaynaklar', 'Method and sources')} meta={L('Formüller, varsayımlar, veri kaynağı ve modelin sınırları', 'Formulas, assumptions, data source and limitations of the model')} />
      <Card>
        <H2>{L('Bu araç ne yapar, ne yapmaz', 'What this tool does and does not do')}</H2>
        <div className="grid gap-4 text-[14px] md:grid-cols-2">
          <div>
            {L(
              <p className="mt-0">
                Nöbet ürün önermez; <strong>su bütçesi</strong> yönetir. Bir sulama kooperatifinin ziraat mühendisi için, üyelerin yıllık su kotasını aşmadan hangi ürünün tarlanın ne kadarına ve ne kadar
                suyla ekilebileceğini hesaplar, kooperatifin satış taahhüdünü üyelere dağıtır ve planı son 20 yılın gerçek havasında dener.
              </p>,
              <p className="mt-0">
                Nöbet does not recommend crops; it manages a <strong>water budget</strong>. For the agronomist of an irrigation cooperative, it calculates which crop can be sown on how much of each field and with how
                much water without exceeding members' yearly water allowance, distributes the cooperative's sales commitment among members, and tests the plan against the real weather of the last 20 years.
              </p>,
            )}
            <p className="mb-0">{L('Araç karar vermez: seçenekleri ve bedellerini gösterir. Karar mühendisin ve üyelerindir.', 'The tool does not decide: it shows the options and their costs. The decision belongs to the agronomist and the members.')}</p>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            <li>
              <Tag kind="nasa" /> {L('NASA POWER günlük verisinden doğrudan gelen değerler (sıcaklık, yağış, güneş, rüzgâr, nem, rakım).', 'Values taken directly from NASA POWER daily data (temperature, precipitation, solar radiation, wind, humidity, elevation).')}
            </li>
            <li>
              <Tag kind="hesap" /> {L('Bu veriden ve varsayımlardan modelle hesaplanan değerler (ET0, sulama, verim, gelir, plan).', 'Values calculated by the model from this data and assumptions (ET0, irrigation, yield, revenue, plan).')}
            </li>
            <li>
              <Tag kind="varsayim" /> {L('Doğrulanmamış girdiler (ürün katsayıları, verim, fiyat, toprak, randıman). Hepsi aşağıda değiştirilebilir.', 'Unverified inputs (crop coefficients, yield, price, soil, efficiency). All can be changed below.')}
            </li>
            <li>
              <Tag kind="kurgusal" /> {L('Açılıştaki kooperatif, üyeleri ve taahhüdü: uydurmadır, gerçek kişi ya da kurum değildir.', 'The cooperative shown at start, its members and its commitment: made up, not a real person or organisation.')}
            </li>
          </ul>
        </div>
      </Card>

      <Card>
        <H2 right={<Tag kind="nasa" />}>{L('Veri kaynağı: NASA POWER', 'Data source: NASA POWER')}</H2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="text-[13px]">
            <table className="data">
              <tbody>
                <tr><td className="text-ink2">{L('Nokta', 'Point')}</td><td>{weather.name}</td></tr>
                <tr><td className="text-ink2">{L('Koordinat', 'Coordinates')}</td><td className="tnum">{weather.lat.toFixed(2)}° {L('K', 'N')}, {weather.lon.toFixed(2)}° {L('D', 'E')}</td></tr>
                <tr><td className="text-ink2">{L('Rakım (POWER ızgara hücresi)', 'Elevation (POWER grid cell)')}</td><td className="tnum">{int(weather.elevation)} m</td></tr>
                <tr><td className="text-ink2">{L('Dönem', 'Period')}</td><td className="tnum">{L('1 Ekim 2004 – 31 Aralık 2025', '1 October 2004 – 31 December 2025')} ({int(weather.n)} {L('gün', 'days')})</td></tr>
                <tr><td className="text-ink2">{L('İndirme zamanı', 'Downloaded')}</td><td>{weather.fetchedAt ? fmtFull(new Date(weather.fetchedAt)) : L('bilinmiyor', 'unknown')}</td></tr>
                <tr><td className="text-ink2">{L('Eksik (-999) değer', 'Missing (-999) values')}</td><td className="tnum">{int(missingTotal)}</td></tr>
                <tr><td className="text-ink2">{L('Hargreaves ile hesaplanan gün', 'Days calculated with Hargreaves')}</td><td className="tnum">{int(weather.hargreavesDays)}</td></tr>
              </tbody>
            </table>
            {L(
              <p className="mb-0 mt-3 text-ink2">
                Uç nokta: <code className="break-all text-[12px]">power.larc.nasa.gov/api/temporal/daily/point</code> (community=AG; anahtar gerekmez). Parametreler: T2M_MAX, T2M_MIN (°C), PRECTOTCORR
                (mm/gün), ALLSKY_SFC_SW_DWN (MJ/m²/gün), WS2M (m/s), RH2M (%). Hazır iki nokta (Karapınar, Çivril) depoyla birlikte gelen yerel dosyadan okunur; haritadan seçilen nokta tarayıcıdan
                indirilir ve IndexedDB'de saklanır.
              </p>,
              <p className="mb-0 mt-3 text-ink2">
                Endpoint: <code className="break-all text-[12px]">power.larc.nasa.gov/api/temporal/daily/point</code> (community=AG; no key needed). Parameters: T2M_MAX, T2M_MIN (°C), PRECTOTCORR
                (mm/day), ALLSKY_SFC_SW_DWN (MJ/m²/day), WS2M (m/s), RH2M (%). The two preset points (Karapınar, Çivril) are read from local files shipped with the repository; a point picked on the map is
                downloaded by the browser and stored in IndexedDB.
              </p>,
            )}
          </div>
          <div>
            <Note tone="warn">
              {L(
                <>
                  <strong className="text-ink">Çözünürlük:</strong> NASA POWER meteoroloji verisi yaklaşık 55 km'lik (0,5° × 0,625°) ızgara hücrelerinin ortalamasıdır. Bu sayılar bir tarlanın değil,{' '}
                  <strong className="text-ink">yörenin iklimini</strong> anlatır. Yerel yağış, özellikle yaz sağanakları, bundan belirgin biçimde sapabilir. Yağış verisi uydu-model birleşimidir; yer
                  istasyonu ölçümü değildir.
                </>,
                <>
                  <strong className="text-ink">Resolution:</strong> NASA POWER meteorological data is the average of grid cells of about 55 km (0.5° × 0.625°). These numbers describe{' '}
                  <strong className="text-ink">the climate of the area</strong>, not of a single field. Local rainfall, especially summer showers, can differ markedly. Precipitation is a satellite-model
                  blend, not a ground station measurement.
                </>,
              )}
            </Note>
            <div className="mt-3 max-h-[260px] overflow-auto">
              <table className="data text-[12px]">
                <thead>
                  <tr>
                    <th>{L('Yıl', 'Year')}</th>
                    <th className="num">{L('Yağış (mm)', 'Precipitation (mm)')}<Tag kind="nasa" compact /></th>
                    <th className="num">ET0 (mm)<Tag kind="hesap" compact /></th>
                    <th className="num">{L('Temmuz yağış', 'July precipitation')}</th>
                    <th className="num">{L('Temmuz ET0', 'July ET0')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clim.map((c) => (
                    <tr key={c.y}>
                      <td>{c.y}</td>
                      <td className="num">{int(c.p)}</td>
                      <td className="num">{int(c.e)}</td>
                      <td className="num">{int(c.pj)}</td>
                      <td className="num">{int(c.ej)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td>{L('Ortalama', 'Average')}</td>
                    <td className="num">{int(avg((c) => c.p))}</td>
                    <td className="num">{int(avg((c) => c.e))}</td>
                    <td className="num">{int(avg((c) => c.pj))}</td>
                    <td className="num">{int(avg((c) => c.ej))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <H2 right={<Tag kind="hesap" />}>{L('Formüller', 'Formulas')}</H2>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="m-0 mb-1 text-[13px] font-[650]">{L('1. Günlük referans buharlaşma (ET0): FAO-56 Penman-Monteith', '1. Daily reference evapotranspiration (ET0): FAO-56 Penman-Monteith')}</h3>
            <Formula>
              {L(
                `T = (Tmax+Tmin)/2            e0(T) = 0,6108·exp(17,27·T/(T+237,3))
Δ = 4098·e0(T)/(T+237,3)²     P = 101,3·((293−0,0065·z)/293)^5,26     γ = 0,000665·P
es = (e0(Tmax)+e0(Tmin))/2    ea = RH/100·es
dr = 1+0,033·cos(2πJ/365)     δ = 0,409·sin(2πJ/365−1,39)     ωs = arccos(−tan φ·tan δ)
Ra = (24·60/π)·0,0820·dr·(ωs·sin φ·sin δ + cos φ·cos δ·sin ωs)
Rso = (0,75+2·10⁻⁵·z)·Ra      Rns = 0,77·Rs
Rnl = 4,903·10⁻⁹·((TmaxK⁴+TminK⁴)/2)·(0,34−0,14·√ea)·(1,35·min(Rs/Rso,1)−0,35)
ET0 = (0,408·Δ·(Rns−Rnl) + γ·900/(T+273)·u2·(es−ea)) / (Δ+γ·(1+0,34·u2))

Güneş, rüzgâr ya da nem eksikse (Hargreaves):  ET0 = 0,0023·(T+17,8)·√(Tmax−Tmin)·Ra·0,408`,
                `T = (Tmax+Tmin)/2            e0(T) = 0.6108·exp(17.27·T/(T+237.3))
Δ = 4098·e0(T)/(T+237.3)²     P = 101.3·((293−0.0065·z)/293)^5.26     γ = 0.000665·P
es = (e0(Tmax)+e0(Tmin))/2    ea = RH/100·es
dr = 1+0.033·cos(2πJ/365)     δ = 0.409·sin(2πJ/365−1.39)     ωs = arccos(−tan φ·tan δ)
Ra = (24·60/π)·0.0820·dr·(ωs·sin φ·sin δ + cos φ·cos δ·sin ωs)
Rso = (0.75+2·10⁻⁵·z)·Ra      Rns = 0.77·Rs
Rnl = 4.903·10⁻⁹·((TmaxK⁴+TminK⁴)/2)·(0.34−0.14·√ea)·(1.35·min(Rs/Rso,1)−0.35)
ET0 = (0.408·Δ·(Rns−Rnl) + γ·900/(T+273)·u2·(es−ea)) / (Δ+γ·(1+0.34·u2))

If solar radiation, wind or humidity is missing (Hargreaves):  ET0 = 0.0023·(T+17.8)·√(Tmax−Tmin)·Ra·0.408`,
              )}
            </Formula>
            <p className="mb-0 mt-1 text-ink2">
              {L(
                'Rs = ALLSKY_SFC_SW_DWN, u2 = WS2M, RH = RH2M, J = yılın günü, φ = enlem, z = rakım. Toprak ısı akısı günlük adımda 0 alınır. Birim testi: FAO-56 Örnek 18 (Uccle, 6 Temmuz, 3,9 mm/gün).',
                'Rs = ALLSKY_SFC_SW_DWN, u2 = WS2M, RH = RH2M, J = day of year, φ = latitude, z = elevation. Soil heat flux is taken as 0 at a daily step. Unit test: FAO-56 Example 18 (Uccle, 6 July, 3.9 mm/day).',
              )}
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[13px] font-[650]">{L('2. Bitki su tüketimi ve toprak-su dengesi (günlük kova modeli)', '2. Crop water use and soil water balance (daily bucket model)')}</h3>
            <Formula>
              {L(
                `ETc = Kc·ET0      Kc: baş evrede sabit, gelişmede doğrusal artış, ortada sabit, sonda doğrusal iniş
Su yılı 1 Ekim'de S = 0,3·TAW ile başlar. Ekimden önce ve hasattan sonra tarla boş: S −= 0,2·ET0
Her gün:  S = min(TAW, S + yağış)
          S < TAW·(1−p) ise, kota kaldıysa ve hasada 10 günden fazla varsa sulama:
              net = TAW − S     brüt = net / randıman     (kota brüt kadar azalır)
          Ks = min(1, S / (TAW·(1−p)))      ETa = Ks·Kc·ET0      S −= ETa
Göreli verim = max(0, 1 − Ky·(1 − ΣETa/ΣETc))
Birim: 1 mm su, 1 dekarda 1 m³`,
                `ETc = Kc·ET0      Kc: constant in the initial stage, linear rise in development, constant mid-season, linear decline late
The water year starts on 1 October with S = 0.3·TAW. Before sowing and after harvest the field is bare: S −= 0.2·ET0
Each day:  S = min(TAW, S + precipitation)
          if S < TAW·(1−p), allowance is left and harvest is more than 10 days away, irrigate:
              net = TAW − S     gross = net / efficiency     (allowance decreases by gross)
          Ks = min(1, S / (TAW·(1−p)))      ETa = Ks·Kc·ET0      S −= ETa
Relative yield = max(0, 1 − Ky·(1 − ΣETa/ΣETc))
Units: 1 mm of water on 1 decare (0.1 ha) = 1 m³`,
              )}
            </Formula>
            <p className="mb-0 mt-1 text-ink2">
              {L(
                <>
                  <strong className="text-ink">Su bitiş tarihi</strong>: kümülatif sulama ihtiyacının kotayı aştığı ilk gün, yani bir parselin suya ihtiyaç duyup kotanın bunu karşılayamadığı ilk gün. Kota
                  kalanı bir sulamaya yetmiyorsa kalan su verilir ve o gün bitiş günü sayılır. Bugünkü ekimde bütün parseller ortak kotadan, ihtiyaç duydukça çeker.
                </>,
                <>
                  <strong className="text-ink">Water run-out date</strong>: the first day the cumulative irrigation need exceeds the allowance, i.e. the first day a plot needs water and the allowance cannot cover
                  it. If what is left of the allowance is not enough for one irrigation, the remainder is applied and that day counts as the run-out day. In today's planting all plots draw from a shared allowance as
                  they need it.
                </>,
              )}
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[13px] font-[650]">{L('3. Su-verim eğrileri', '3. Water-yield curves')}</h3>
            <p className="m-0 text-ink2">
              {L(
                <>
                  Her ürün ve {FIRST_YEAR}-{LAST_YEAR} arası her hasat yılı için brüt su tavanı {LEVELS.map((l) => levelLabel(l)).join(', ')} seviyelerinde model çalıştırılır. 20 yılın ortalama göreli
                  verimi {dec2(RELIABILITY_FLOOR)}'in altında kalan seçenek "model bu kadar az suda güvenilir değil" diye işaretlenir ve varsayılan olarak planlamaya girmez. Tavanı hiçbir yıl bağlamayan
                  seviyeler "tam" ile aynı olduğundan listeden düşer.
                </>,
                <>
                  For each crop and each harvest year from {FIRST_YEAR} to {LAST_YEAR}, the model is run with gross water caps of {LEVELS.map((l) => lvl(l)).join(', ')}. An option whose 20-year mean relative
                  yield is below {dec2(RELIABILITY_FLOOR)} is flagged "the model is not reliable with this little water" and is left out of planning by default. Levels whose cap never binds in any year are the
                  same as "full" and are dropped from the list.
                </>,
              )}
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[13px] font-[650]">{L('4. Planlama (doğrusal programlama)', '4. Planning (linear programming)')}</h3>
            <Formula>
              {L(
                `Karar değişkeni:  x[üye, ürün, su seviyesi] ≥ 0  (dekar);  ayrıca x[üye, nadas]
Kısıtlar:   Σ x[üye,·,·] = tarla büyüklüğü
            Σ x·ayrılan su(mm) ≤ üyenin kotası (m³)      ayrılan su = o seçeneğin 20 yıldaki en yüksek kullanımı
            Σ x[üye, ürün, ·] ≤ pay sınırı · tarla       (varsayılan 1/3: üç yıllık nöbet kurulabilsin)
            Σ x·beklenen verim(ürün) ≥ taahhüt(ürün)     (kooperatif düzeyi, 20 yıl ortalama verimi)
            Σ x[·, küçük pazarlı ürün, ·] ≤ eşik · toplam alan   (isteğe bağlı)
            Σ x[üye, ürün, ·] = 0  ya da  ≥ en küçük parsel   (yinelemeli: aşağıya bakın)
Amaç:       en yüksek toplam brüt gelir   ya da   taahhüdü karşılayan en az su (sonra o suyla en yüksek gelir)`,
                `Decision variable:  x[member, crop, water level] ≥ 0  (decares);  also x[member, fallow]
Constraints: Σ x[member,·,·] = field size
            Σ x·reserved water(mm) ≤ member's allowance (m³)   reserved water = that option's highest use over 20 years
            Σ x[member, crop, ·] ≤ share cap · field     (default 1/3, so a three-year rotation can be built)
            Σ x·expected yield(crop) ≥ commitment(crop)  (cooperative level, 20-year mean yield)
            Σ x[·, small-market crop, ·] ≤ cap · total area   (optional)
            Σ x[member, crop, ·] = 0  or  ≥ minimum plot   (iterative: see below)
Objective:  highest total gross revenue   or   least water meeting the commitment (then highest revenue with that water)`,
              )}
            </Formula>
            <p className="mb-0 mt-1 text-ink2">
              {L(
                <>
                  <strong className="text-ink">En küçük parsel:</strong> bir üyede bir ürün ya en az 10 dekar (tarlası 60 dekardan küçükse 5 dekar) ekilir ya hiç ekilmez; plan çözülür, eşiğin altında kalan
                  ürünler o üye için yasaklanıp yeniden çözülür (en çok 5 tur), kalan olursa üyenin en büyük parseline katılır. Taahhüt karşılanamıyorsa önce "taahhüdün en çok yüzde kaçı üretilebilir" sorusu çözülür, plan o düzeye göre kurulur ve ekranda açıkça söylenir. Çözücü: javascript-lp-solver (simpleks),
                  tarayıcıda çalışır.
                </>,
                <>
                  <strong className="text-ink">Minimum plot:</strong> on a member's field a crop is sown on at least 10 decares (5 decares if the field is smaller than 60 decares) or not at all; the plan is solved,
                  crops below the threshold are banned for that member and it is solved again (at most 5 rounds); anything left is merged into the member's largest plot. If the commitment cannot be met, the question
                  "what is the largest share of the commitment that can be produced" is solved first, the plan is built at that level and this is stated clearly on screen. Solver: javascript-lp-solver (simplex),
                  runs in the browser.
                </>,
              )}
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[13px] font-[650]">{L('5. Toprak puanı ve nöbet', '5. Soil score and rotation')}</h3>
            <Formula>{L(SOIL_FORMULA, SOIL_FORMULA_EN)}</Formula>
            <p className="mb-0 mt-1 text-ink2">
              {L(
                'Paylar tarla alanına göredir; nadas ayrı bir ürün gibi sayılır. Bu puan bir toprak analizi değil, baklagil payını ve çeşitliliği özetleyen kaba bir göstergedir; ağırlıkları (60/40, %25) takım varsayımıdır. Nöbet tablosu: tarla üç eş parsele bölünür, ürün deseni her yıl bir parsel kayar.',
                'Shares are relative to field area; fallow counts as a separate crop. This score is not a soil analysis but a rough indicator summarising legume share and diversity; its weights (60/40, 25%) are a team assumption. Rotation table: the field is split into three equal plots and the crop pattern shifts by one plot each year.',
              )}
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[13px] font-[650]">{L('6. Geçmişte deneme', '6. Backtest')}</h3>
            <p className="m-0 text-ink2">
              {L(
                <>
                  Plan (alanlar ve su tavanları sabit) {FIRST_YEAR}-{LAST_YEAR}'in her hasat yılında o yılın gerçek NASA havasıyla çalıştırılır. Yeşil: bütün taahhütler karşılandı. Sarı: en zayıf ürün
                  taahhüdün en az {pct(YELLOW_FLOOR)}'ini verdi. Kırmızı: daha azı. Bu bir tahmin değil, "bu plan geçmişte uygulansaydı" denemesidir; gelecek 20 yıl geçmişe benzemeyebilir.
                </>,
                <>
                  The plan (areas and water caps fixed) is run in every harvest year from {FIRST_YEAR} to {LAST_YEAR} with that year's real NASA weather. Green: all commitments met. Yellow: the weakest crop
                  delivered at least {pct(YELLOW_FLOOR)} of its commitment. Red: less. This is not a forecast but a test of "had this plan been used in the past"; the next 20 years may not look like the past.
                </>,
              )}
            </p>
          </div>
          <div id="yontem-soz" className="scroll-mt-4">
            <h3 className="m-0 mb-1 text-[13px] font-[650]">{L('7. Panodaki söz hesabı ve üç dağıtım', '7. The commitment calculation on the dashboard and the three distributions')}</h3>
            {L(
              <ul className="m-0 flex flex-col gap-1.5 pl-5 text-ink2">
                <li>
                  <strong className="text-ink">Söz kaç yılda tutuyor:</strong> her dağıtımda kooperatifin o üründeki <em>toplam</em> üretimine bakılır; yılın üretimi söze ulaşıyorsa o yıl "tuttu" sayılır. Pano, Taahhüt
                  sayfası ve miktar kutusunun altındaki mesaj aynı fonksiyonu kullanır.
                </li>
                <li>
                  <strong className="text-ink">Bugün:</strong> üyelerin bugünkü ekimi; herkes ihtiyaç duydukça sular, su hakkı bitince susuz kalır.
                </li>
                <li>
                  <strong className="text-ink">Gelişigüzel dağıtım:</strong> üyeler sabit tohumla karıştırılır; tam verim varsayılarak hesaplanan üretim sözü geçene dek sıradaki üyenin bütün tarlası sözleşme ürününe
                  ayrılır. Öbür üyeler bugünkü ekimini sürdürür. Sonra hepsi gerçek su hakkıyla çalıştırılır.
                </li>
                <li>
                  <strong className="text-ink">Planlı dağıtım:</strong> 4. maddedeki doğrusal programlama. Söz, 20 yılın ortalama verimiyle karşılanacak biçimde kısıt olarak girer; plan geliri en yükseğe çıkarır.
                </li>
                <li>
                  <strong className="text-ink">Güvenle verilebilecek söz:</strong> plan (alanlar ve su tavanları sabit) 2006–2025'in her yılında o yılın havasıyla çalıştırılır; yılların en az 14, 16 ya da 18'inde
                  ulaşılan üretim alınır. Panonun üstündeki sayı ve miktar kutusundaki uyarı, "Dağıt"ın kuracağı plana göredir. Varsayılan söz bu hesabın 16 yıl için sonucudur.
                </li>
                <li>
                  <strong className="text-ink">"Yalnız [ürün]" ve "Karma":</strong> ilki kooperatif tek bir ürüne öncelik verseydi (o üründen en çok üretimi veren plan) verilebilecek sözdür ve planlı dağıtımdaki
                  sayıdan büyük olabilir. Karma sütundaki miktarlar, geliri en yükseğe çıkaran tek bir plandan gelir ve aynı anda verilebilir.
                </li>
                <li>
                  <strong className="text-ink">Sınırlar:</strong> plan ortalama verime göre kurulur; söz güvenli miktarın üstündeyse tutan yıl sayısı hızla düşer. Gelir brüttür; fiyat ve verimler varsayımdır. "Türkiye'nin
                  ithal ettiği ürün" notu takım notudur, bir kaynakla doğrulanmadı.
                </li>
              </ul>,
              <ul className="m-0 flex flex-col gap-1.5 pl-5 text-ink2">
                <li>
                  <strong className="text-ink">In how many years the commitment holds:</strong> for each distribution we look at the cooperative's <em>total</em> production of that crop; if a year's production reaches the
                  commitment, that year counts as "held". The dashboard, the Commitment page and the message under the quantity box all use the same function.
                </li>
                <li>
                  <strong className="text-ink">Today:</strong> members' current planting; everyone irrigates as needed and runs dry when the water allowance is used up.
                </li>
                <li>
                  <strong className="text-ink">Random distribution:</strong> members are shuffled with a fixed seed; the whole field of the next member is given to the contract crop until production, calculated at full
                  yield, passes the commitment. The other members keep their current planting. Then all are run with their real water allowance.
                </li>
                <li>
                  <strong className="text-ink">Planned distribution:</strong> the linear programme in item 4. The commitment enters as a constraint to be met at the 20-year mean yield; the plan maximises revenue.
                </li>
                <li>
                  <strong className="text-ink">Commitment that can safely be given:</strong> the plan (areas and water caps fixed) is run in every year of 2006–2025 with that year's weather; the production reached in at
                  least 14, 16 or 18 of the years is taken. The number at the top of the dashboard and the warning in the quantity box refer to the plan that "Distribute" would build. The default commitment is the
                  result of this calculation for 16 years.
                </li>
                <li>
                  <strong className="text-ink">"[Crop] only" and "Mixed":</strong> the first is the commitment that could be given if the cooperative prioritised a single crop (the plan giving the most of that crop)
                  and can be larger than the planned-distribution number. The amounts in the mixed column come from a single plan that maximises revenue and can be given at the same time.
                </li>
                <li>
                  <strong className="text-ink">Limits:</strong> the plan is built on mean yield; if the commitment is above the safe amount, the number of years it holds drops quickly. Revenue is gross; prices and yields
                  are assumptions. The note "a crop Türkiye imports" is a team note and has not been verified with a source.
                </li>
              </ul>,
            )}
          </div>
        </div>
      </Card>

      <Card>
        <H2
          right={
            <span className="flex items-center gap-2">
              <Tag kind="varsayim" />
              <Confirm
                trigger={
                  <button type="button" className="btn">
                    <RotateCcw /> {L('Başlangıç değerlerine dön', 'Reset to starting values')}
                  </button>
                }
                title={L('Başlangıç değerlerine dönülsün mü?', 'Reset to starting values?')}
                description={L('Üyeler, taahhüt, plan kuralları ve bütün varsayımlar başlangıç değerlerine döner.', 'Members, commitment, plan rules and all assumptions return to their starting values.')}
                action={L('Başlangıca dön', 'Reset')}
                danger
                onConfirm={s.reset}
              />
            </span>
          }
        >
          {L('Varsayımlar: ürün tablosu', 'Assumptions: crop table')}
        </H2>
        <p className="m-0 mb-3 text-[13px] text-ink2">
          {L(
            <>
              Her hücrenin altındaki etiket değerin nereden geldiğini söyler: <strong className="text-ink">kaynak</strong> (tıklayınca kaynağın adı ve bağlantısı açılır) ya da{' '}
              <strong className="text-ink">varsayım</strong> (doğrulanmadı). Bir değeri değiştirirseniz etiketi varsayıma döner; bütün ekranlar anında yeniden hesaplanır.
            </>,
            <>
              The tag under each cell says where the value comes from: <strong className="text-ink">source</strong> (click to see the source's name and link) or{' '}
              <strong className="text-ink">assumption</strong> (not verified). If you change a value its tag turns into assumption; all screens are recalculated at once.
            </>,
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="data min-w-[1080px]">
            <thead>
              <tr>
                <th>{L('Ürün', 'Crop')}</th>
                <th>{L('Ekim (gün.ay)', 'Sowing (day.month)')}</th>
                <th>{L('Evre süreleri (gün): baş, gelişme, orta, son', 'Stage lengths (days): initial, development, mid, late')}</th>
                <th>{L('Kc: baş, orta, son', 'Kc: initial, mid, end')}</th>
                <th>Ky</th>
                <th>{L('Tam sulu verim (kg/da)', 'Fully irrigated yield (kg/da)')}</th>
                <th>{L('Fiyat (TL/ton)', 'Price (TL/ton)')}</th>
              </tr>
            </thead>
            <tbody>
              {s.cropDefs.map((d) => {
                const name = cropLabel(d.id, d.name);
                return (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap">
                      <Swatch id={d.id} />
                      {name}
                      {d.legume && <div className="text-[11.5px] text-muted">{L('baklagil', 'legume')}</div>}
                      {d.smallMarket && <div className="text-[11.5px] text-muted">{L('küçük pazar', 'small market')}</div>}
                    </td>
                    <td>
                      <span className="flex gap-1" title={sourceText(d.plant.source)}>
                        <NumInput className="w-[52px]" label={L(`${name} ekim günü`, `${name} sowing day`)} value={d.plant.value.day} min={1} max={31} onChange={(v) => setCrop(d.id, (x) => ({ ...x, plant: { ...x.plant, value: { ...x.plant.value, day: Math.round(v) } } }))} />
                        <NumInput className="w-[52px]" label={L(`${name} ekim ayı`, `${name} sowing month`)} value={d.plant.value.month} min={1} max={12} onChange={(v) => setCrop(d.id, (x) => ({ ...x, plant: { ...x.plant, value: { ...x.plant.value, month: Math.round(v) } } }))} />
                      </span>
                      {badge(d.plant)}
                    </td>
                    <td>
                      <span className="flex gap-1" title={sourceText(d.stages.source)}>
                        {d.stages.value.map((st, i) => (
                          <NumInput key={i} className="w-[58px]" label={L(`${name} evre ${i + 1} süresi`, `${name} stage ${i + 1} length`)} value={st} min={1} max={300} onChange={(v) => setCrop(d.id, (x) => ({ ...x, stages: { ...x.stages, value: x.stages.value.map((o, k) => (k === i ? Math.round(v) : o)) as CropDef['stages']['value'] } }))} />
                        ))}
                      </span>
                      {badge(d.stages)}
                    </td>
                    <td>
                      <span className="flex gap-1" title={sourceText(d.kc.source)}>
                        {d.kc.value.map((kc, i) => (
                          <NumInput key={i} className="w-[62px]" label={`${name} Kc ${i + 1}`} value={kc} min={0.05} max={2} decimals={2} onChange={(v) => setCrop(d.id, (x) => ({ ...x, kc: { ...x.kc, value: x.kc.value.map((o, k) => (k === i ? v : o)) as CropDef['kc']['value'] } }))} />
                        ))}
                      </span>
                      {badge(d.kc)}
                    </td>
                    <td title={sourceText(d.ky.source)}>
                      <NumInput className="w-[62px]" label={`${name} Ky`} value={d.ky.value} min={0.1} max={3} decimals={2} onChange={(v) => setCrop(d.id, (x) => ({ ...x, ky: { ...x.ky, value: v } }))} />
                      {badge(d.ky)}
                    </td>
                    <td title={sourceText(d.yieldKgDa.source)}>
                      <NumInput className="w-[84px]" label={L(`${name} verim`, `${name} yield`)} value={d.yieldKgDa.value} min={1} max={50000} onChange={(v) => setCrop(d.id, (x) => ({ ...x, yieldKgDa: { ...x.yieldKgDa, value: v } }))} />
                      {badge(d.yieldKgDa)}
                    </td>
                    <td title={sourceText(d.priceTlTon.source)}>
                      <NumInput className="w-[92px]" label={L(`${name} fiyat`, `${name} price`)} value={d.priceTlTon.value} min={0} max={1e7} onChange={(v) => setCrop(d.id, (x) => ({ ...x, priceTlTon: { ...x.priceTlTon, value: v } }))} />
                      {badge(d.priceTlTon)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <details className="mt-3 text-[13px] text-ink2">
          <summary className="cursor-pointer font-semibold text-ink">{L('Bu değerler nereden geliyor?', 'Where do these values come from?')}</summary>
          <ul className="mb-0 mt-2 flex flex-col gap-1 pl-5">
            <li><strong className="text-ink">{L('Ekim tarihi ve evre süreleri:', 'Sowing date and stage lengths:')}</strong> {sourceText(s.cropDefs[0].stages.source)}</li>
            <li><strong className="text-ink">Kc:</strong> {sourceText(s.cropDefs[0].kc.source)}</li>
            <li><strong className="text-ink">Ky:</strong> {sourceText(s.cropDefs[0].ky.source)}</li>
            <li><strong className="text-ink">{L('Verim:', 'Yield:')}</strong> {sourceText(s.cropDefs[0].yieldKgDa.source)}</li>
            <li><strong className="text-ink">{L('Fiyat:', 'Price:')}</strong> {sourceText(s.cropDefs[0].priceTlTon.source)}</li>
          </ul>
        </details>
      </Card>

      <Card>
        <H2 right={<Tag kind="varsayim" />}>{L('Varsayımlar: toprak ve sulama randımanı', 'Assumptions: soil and irrigation efficiency')}</H2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <label className="block text-[12px] text-ink2">
            {L('Kullanılabilir su kapasitesi (TAW)', 'Total available water (TAW)')}
            <NumInput className="mt-0.5 w-full" label="TAW (mm)" value={s.soil.taw} min={20} max={400} suffix="mm" onChange={(v) => s.update({ soil: { ...s.soil, taw: v } })} />
          </label>
          <label className="block text-[12px] text-ink2">
            {L('İzin verilen boşalma (p)', 'Allowed depletion (p)')}
            <NumInput className="mt-0.5 w-full" label="p" value={s.soil.p} min={0.1} max={0.9} decimals={2} onChange={(v) => s.update({ soil: { ...s.soil, p: v } })} />
          </label>
          {(Object.keys(METHOD_LABEL) as IrrigationMethod[]).map((k) => (
            <label key={k} className="block text-[12px] text-ink2">
              {L(`${METHOD_LABEL[k]} randımanı`, `${METHOD_LABEL[k]} efficiency`)}
              <NumInput className="mt-0.5 w-full" label={L(`${METHOD_LABEL[k]} randımanı`, `${METHOD_LABEL[k]} efficiency`)} value={s.eff[k]} min={0.1} max={1} decimals={2} onChange={(v) => s.update({ eff: { ...s.eff, [k]: v } })} />
            </label>
          ))}
        </div>
        <p className="mb-0 mt-2 text-[12px] text-muted">
          {L(
            'Tek bir toprak (TAW ve p) bütün ürünlere ve üyelere uygulanır; gerçekte kök derinliği ürüne, su tutma kapasitesi toprağa göre değişir. Diğer sabit varsayımlar: su yılı başında toprak nemi 0,3·TAW; boş tarlada günlük kayıp 0,2·ET0; hasada 10 gün kala sulama kesilir.',
            'A single soil (TAW and p) is applied to all crops and members; in reality root depth varies by crop and water holding capacity by soil. Other fixed assumptions: soil moisture at the start of the water year 0.3·TAW; daily loss on a bare field 0.2·ET0; irrigation stops 10 days before harvest.',
          )}
        </p>
      </Card>

      <Card>
        <H2
          right={
            <Select
              variant="pill"
              prefix={L('Sulama yöntemi', 'Irrigation method')}
              label={L('Sulama yöntemi', 'Irrigation method')}
              value={method}
              onChange={setMethod}
              options={(Object.keys(METHOD_LABEL) as IrrigationMethod[]).map((k) => ({ value: k, label: METHOD_LABEL[k] }))}
            />
          }
        >
          {L('Su-verim eğrileri', 'Water-yield curves')} <Tag kind="hesap" />
        </H2>
        <div className="overflow-x-auto">
          <table className="data min-w-[720px]">
            <thead>
              <tr>
                <th>{L('Ürün', 'Crop')}</th>
                <th>{L('Su seviyesi (brüt)', 'Water level (gross)')}</th>
                <th className="num">{L('Ort. göreli verim', 'Mean relative yield')}</th>
                <th className="num">{L('En kötü yıl', 'Worst year')}</th>
                <th className="num">{L('Ort. kullanılan su (mm)', 'Mean water used (mm)')}</th>
                <th className="num">{L('Ayrılan su (mm)', 'Reserved water (mm)')}</th>
                <th>{L('Planlamada', 'In planning')}</th>
              </tr>
            </thead>
            <tbody>
              {model.crops.flatMap((c) =>
                (curves[c.id] ?? []).map((o, i) => (
                  <tr key={`${c.id}-${i}`}>
                    <td>
                      {i === 0 && (
                        <>
                          <Swatch id={c.id} />
                          {cropLabel(c.id, c.name)}
                        </>
                      )}
                    </td>
                    <td>{lvl(o.level)}</td>
                    <td className="num">{dec2(o.meanRel)}</td>
                    <td className="num">{dec2(o.minRel)}</td>
                    <td className="num">{int(o.meanGross)}</td>
                    <td className="num">{int(o.maxGross)}</td>
                    <td>{o.reliable ? <span className="text-ink2">{L('var', 'yes')}</span> : <UnreliableMark rel={o.meanRel} />}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <p className="mb-0 mt-2 text-[12px] text-muted">
          {L(
            `20 hasat yılının (${FIRST_YEAR}-${LAST_YEAR}) sonuçları. "Tam" satırındaki ayrılan su, en kurak yılın tam sulama ihtiyacıdır.`,
            `Results of the 20 harvest years (${FIRST_YEAR}-${LAST_YEAR}). The reserved water in the "full" row is the full irrigation need of the driest year.`,
          )}
        </p>
      </Card>

      <Card>
        <H2 right={<span className="text-[12px] text-ink2">{L('erişim', 'accessed')}: {SOURCES.accessed.split('-').reverse().join('.')}</span>}>{L('Doğrulama', 'Verification')}</H2>
        <p className="m-0 mb-3 text-ink2">
          {L(
            <>
              Bir değer ancak kaynağının sayfası açılıp içinde görüldüyse "kaynak" sayılır. Aşağıda kaynakla karşılaştırılabilen değerler var; istenen iki karşılaştırma tablosu (rehberdeki bitki su tüketimi ve TÜİK
              ilçe verimleri) <strong className="text-ink">kurulamadı</strong>, çünkü o veriler alınamadı.
            </>,
            <>
              A value counts as "sourced" only if its source page was opened and the value was seen in it. Below are the values that could be compared with a source; the two requested comparison tables (crop water
              use from the guide and TÜİK district yields) <strong className="text-ink">could not be built</strong>, because that data could not be obtained.
            </>,
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="data min-w-[760px]">
            <thead>
              <tr>
                <th>{L('Ürün', 'Crop')}</th>
                <th>{L('Alan', 'Field')}</th>
                <th>{L('Önceki değer', 'Previous value')}</th>
                <th>{L('Kaynaktaki değer', 'Value in source')}</th>
                <th>{L('Sonuç', 'Result')}</th>
                <th>{L('Kaynak', 'Source')}</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.values.map((v, i) => {
                const src = (SOURCES.sources as Record<string, { name: string; url: string }>)[v.source];
                const prev = (v as { previous?: unknown }).previous;
                const show = (x: unknown) => {
                  const t = Array.isArray(x) ? x.join(' / ') : String(x);
                  return L(t.replace(/\./g, ','), t);
                };
                const fields: Record<string, string> = {
                  stages: L('Evre süreleri (gün)', 'Stage lengths (days)'),
                  kc: L('Kc baş / orta / son', 'Kc initial / mid / end'),
                  ky: 'Ky',
                  priceTlTon: L('Fiyat (TL/ton)', 'Price (TL/ton)'),
                };
                return (
                  <tr key={i}>
                    <td>
                      <Swatch id={v.crop} />
                      {cropLabel(v.crop, DEFAULT_CROPS.find((c) => c.id === v.crop)?.name ?? v.crop)}
                    </td>
                    <td>{fields[v.field] ?? v.field}</td>
                    <td className="tnum">{show(prev ?? v.value)}</td>
                    <td className="tnum">{show(v.value)}</td>
                    <td>{v.changed ? <span className="tag tag-warning">{L('değişti', 'changed')}</span> : <span className="tag tag-success">{L('aynı', 'same')}</span>}</td>
                    <td>
                      <SourcePop name={srcName(src.name)} url={src.url} table={srcTable(v.table)} quote={v.quote} accessed={SOURCES.accessed} note={srcNote((v as { note?: string }).note)} />
                      <span className="ml-1.5 text-[11.5px] text-ink2">{srcTable(v.table)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="m-0 mb-1 mt-4 text-[13px] font-[650] text-ink">{L('Doğrulanamayanlar (varsayım olarak kaldı)', 'Not verified (left as assumptions)')}</h3>
        <ul className="m-0 flex flex-col gap-1 pl-5 text-ink2">
          {SOURCES.notFound.map((t, i) => (
            <li key={i}>{notFoundText(t, i)}</li>
          ))}
        </ul>
        <p className="mb-0 mt-3 text-[12px] text-ink2">
          {L(
            'Toprak için tek gözlem: ISRIC SoilGrids, Cihanbeyli noktasında 0-100 cm için tarla kapasitesi ile solma noktası arasında yaklaşık 50 mm su veriyor; modeldeki 130 mm varsayımının belirgin altında. Tek nokta olduğu için uygulanmadı, ama varsayımın iyimser olabileceğini gösteriyor.',
            'The only soil observation: ISRIC SoilGrids gives about 50 mm of water between field capacity and wilting point for 0-100 cm at the Cihanbeyli point, clearly below the 130 mm assumed in the model. It was not applied because it is a single point, but it suggests the assumption may be optimistic.',
          )}
        </p>
      </Card>

      <EvidenceCard />

      <Card>
        <H2>{L('Modelin sınırları', 'Limitations of the model')}</H2>
        {L(
          <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[13px] text-ink2">
            <li><strong className="text-ink">Gelir brüttür.</strong> Tohum, gübre, ilaç, mazot, elektrik (pompaj), işçilik, su ücreti ve kira düşülmemiştir. Damla ve yağmurlama yatırım maliyeti yoktur. Net kârlılık sıralaması farklı çıkabilir.</li>
            <li><strong className="text-ink">İklim verisi yöre ölçeğindedir</strong> (yaklaşık 55 km). Tarlaya özgü yağış, don, dolu ve rüzgâr zararını göstermez.</li>
            <li><strong className="text-ink">Ürün parametreleri doğrulanmadı.</strong> Kc, evre süreleri, Ky, verim ve fiyatların hepsi varsayımdır; sonuçlar bu girdilere doğrudan bağlıdır.</li>
            <li><strong className="text-ink">Verim tepkisi tek katsayılıdır</strong> (sezonluk Ky). Stresin hangi evrede geldiği (ör. mısırda tepe püskülü dönemi) ayrıca cezalandırılmaz. Çok az suda model güvenilmezdir; bu yüzden 0,35 altı işaretlenir.</li>
            <li><strong className="text-ink">Kova modeli basittir:</strong> tek katman, sabit kök derinliği, yüzey akışı ve derine sızma yalnızca "taşan su kaybolur" kuralıyla; kılcal yükselme, tuzluluk ve taban suyu yok. Sulama hep tarla kapasitesine tamamlar; gerçek sulama takvimi ve nöbet sırası (su sırası) modellenmez.</li>
            <li><strong className="text-ink">Sıcaklık, don ve hastalık verimi etkilemez;</strong> verimi yalnızca su belirler. Ekim tarihi her yıl aynıdır.</li>
            <li><strong className="text-ink">Fiyatlar sabittir.</strong> Fiyat tahmini, pazar derinliği, şeker pancarı kotası ya da sözleşmeli üretim koşulları yoktur; yalnız basit bir "küçük pazar" eşiği vardır.</li>
            <li><strong className="text-ink">Plan ortalamaya göre kurulur.</strong> Taahhüt kısıtı 20 yılın ortalama verimini kullanır; tek tek yıllarda tutmayabilir. Geçmişte deneme şeridi bunu gösterir.</li>
            <li><strong className="text-ink">Geçmiş, geleceğin garantisi değildir.</strong> 2006-2025 havası iklim değişikliğiyle birlikte gelecek yılları temsil etmeyebilir.</li>
            <li><strong className="text-ink">Nöbet tablosu şematiktir:</strong> parsel sınırları, ön bitki etkisi (ör. nohut sonrası buğday verimi) ve ekim-hasat çakışmaları hesaba katılmaz.</li>
            <li><strong className="text-ink">Yeraltı suyu ve obruk riski modellenmez.</strong> Kota, verildiği gibi alınır; kotanın kendisinin sürdürülebilir olup olmadığı bu aracın konusu değildir.</li>
          </ul>,
          <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[13px] text-ink2">
            <li><strong className="text-ink">Revenue is gross.</strong> Seed, fertiliser, pesticide, diesel, electricity (pumping), labour, water fees and rent are not deducted. There is no investment cost for drip or sprinkler. The ranking by net profitability could differ.</li>
            <li><strong className="text-ink">Climate data is at area scale</strong> (about 55 km). It does not show field-specific rainfall, frost, hail or wind damage.</li>
            <li><strong className="text-ink">Crop parameters are not fully verified.</strong> Kc, stage lengths, Ky, yields and prices are assumptions unless tagged as sourced; results depend directly on these inputs.</li>
            <li><strong className="text-ink">Yield response uses a single coefficient</strong> (seasonal Ky). The stage in which stress occurs (e.g. tasselling in maize) is not penalised separately. The model is unreliable with very little water; that is why values below 0.35 are flagged.</li>
            <li><strong className="text-ink">The bucket model is simple:</strong> one layer, fixed root depth, runoff and deep percolation only through the rule "overflowing water is lost"; no capillary rise, salinity or groundwater table. Irrigation always refills to field capacity; the real irrigation calendar and the turn order (water rotation) are not modelled.</li>
            <li><strong className="text-ink">Temperature, frost and disease do not affect yield;</strong> only water determines yield. The sowing date is the same every year.</li>
            <li><strong className="text-ink">Prices are fixed.</strong> There is no price forecast, market depth, sugar beet quota or contract-farming terms; only a simple "small market" cap.</li>
            <li><strong className="text-ink">The plan is built on averages.</strong> The commitment constraint uses the 20-year mean yield; it may not hold in individual years. The backtest strip shows this.</li>
            <li><strong className="text-ink">The past does not guarantee the future.</strong> With climate change, the weather of 2006-2025 may not represent the coming years.</li>
            <li><strong className="text-ink">The rotation table is schematic:</strong> plot boundaries, the preceding-crop effect (e.g. wheat yield after chickpea) and sowing-harvest overlaps are not taken into account.</li>
            <li><strong className="text-ink">Groundwater and sinkhole risk are not modelled.</strong> The allowance is taken as given; whether the allowance itself is sustainable is outside the scope of this tool.</li>
          </ul>,
        )}
      </Card>
    </>
  );
}
