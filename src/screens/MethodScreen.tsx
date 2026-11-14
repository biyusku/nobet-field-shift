import { useState } from 'react';
import { UnreliableMark } from '../components/bits';
import { Card, H2, Note, NumInput, Swatch, Tag } from '../components/ui';
import type { CropDef } from '../data/crops';
import { METHOD_LABEL } from '../data/defaults';
import { levelLabel, LEVELS, RELIABILITY_FLOOR } from '../engine/curves';
import { YELLOW_FLOOR } from '../engine/plan';
import { SOIL_FORMULA } from '../engine/soil';
import { FIRST_YEAR, LAST_YEAR, type IrrigationMethod } from '../engine/types';
import { sumCalendar } from '../engine/weather';
import { dec2, fmtFull, int, pct } from '../lib/format';
import { useStore } from '../state';

function Formula({ children }: { children: string }) {
  return <pre className="m-0 overflow-x-auto rounded-md bg-sunken p-3 text-[12.5px] leading-relaxed">{children}</pre>;
}

export function MethodScreen() {
  const s = useStore();
  const { model, weather } = s;
  const [method, setMethod] = useState<IrrigationMethod>('yagmurlama');
  if (!model || !weather) return null;

  const setCrop = (id: string, fn: (d: CropDef) => CropDef) => s.update({ cropDefs: s.cropDefs.map((d) => (d.id === id ? fn(d) : d)) });
  const years: number[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) years.push(y);
  const clim = years.map((y) => ({ y, p: sumCalendar(weather, weather.prec, y), e: sumCalendar(weather, weather.et0, y), pj: sumCalendar(weather, weather.prec, y, 7), ej: sumCalendar(weather, weather.et0, y, 7) }));
  const avg = (f: (c: (typeof clim)[number]) => number) => clim.reduce((a, c) => a + f(c), 0) / clim.length;
  const missingTotal = Object.values(weather.missing).reduce((a, b) => a + b, 0);
  const curves = model.curvesByMethod[method];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <H2>Bu araç ne yapar, ne yapmaz</H2>
        <div className="grid gap-4 text-[14px] md:grid-cols-2">
          <div>
            <p className="mt-0">
              Nöbet ürün önermez; <strong>su bütçesi</strong> yönetir. Bir sulama kooperatifinin ziraat mühendisi için, üyelerin yıllık su kotasını aşmadan hangi ürünün tarlanın ne kadarına ve ne kadar
              suyla ekilebileceğini hesaplar, kooperatifin satış taahhüdünü üyelere dağıtır ve planı son 20 yılın gerçek havasında dener.
            </p>
            <p className="mb-0">Araç karar vermez: seçenekleri ve bedellerini gösterir. Karar mühendisin ve üyelerindir.</p>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13.5px]">
            <li>
              <Tag kind="nasa" /> NASA POWER günlük verisinden doğrudan gelen değerler (sıcaklık, yağış, güneş, rüzgâr, nem, rakım).
            </li>
            <li>
              <Tag kind="hesap" /> Bu veriden ve varsayımlardan modelle hesaplanan değerler (ET0, sulama, verim, gelir, plan).
            </li>
            <li>
              <Tag kind="varsayim" /> Doğrulanmamış girdiler (ürün katsayıları, verim, fiyat, toprak, randıman). Hepsi aşağıda değiştirilebilir.
            </li>
            <li>
              <Tag kind="kurgusal" /> Açılıştaki kooperatif, üyeleri ve taahhüdü: uydurmadır, gerçek kişi ya da kurum değildir.
            </li>
          </ul>
        </div>
      </Card>

      <Card>
        <H2 right={<Tag kind="nasa" />}>Veri kaynağı: NASA POWER</H2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="text-[13.5px]">
            <table className="data">
              <tbody>
                <tr><td className="text-ink2">Nokta</td><td>{weather.name}</td></tr>
                <tr><td className="text-ink2">Koordinat</td><td className="tnum">{weather.lat.toFixed(2)}° K, {weather.lon.toFixed(2)}° D</td></tr>
                <tr><td className="text-ink2">Rakım (POWER ızgara hücresi)</td><td className="tnum">{int(weather.elevation)} m</td></tr>
                <tr><td className="text-ink2">Dönem</td><td className="tnum">1 Ekim 2004 – 31 Aralık 2025 ({int(weather.n)} gün)</td></tr>
                <tr><td className="text-ink2">İndirme zamanı</td><td>{weather.fetchedAt ? fmtFull(new Date(weather.fetchedAt)) : 'bilinmiyor'}</td></tr>
                <tr><td className="text-ink2">Eksik (-999) değer</td><td className="tnum">{int(missingTotal)}</td></tr>
                <tr><td className="text-ink2">Hargreaves ile hesaplanan gün</td><td className="tnum">{int(weather.hargreavesDays)}</td></tr>
              </tbody>
            </table>
            <p className="mb-0 mt-3 text-ink2">
              Uç nokta: <code className="break-all text-[12px]">power.larc.nasa.gov/api/temporal/daily/point</code> (community=AG; anahtar gerekmez). Parametreler: T2M_MAX, T2M_MIN (°C), PRECTOTCORR
              (mm/gün), ALLSKY_SFC_SW_DWN (MJ/m²/gün), WS2M (m/s), RH2M (%). Hazır iki nokta (Karapınar, Çivril) depoyla birlikte gelen yerel dosyadan okunur; haritadan seçilen nokta tarayıcıdan
              indirilir ve IndexedDB'de saklanır.
            </p>
          </div>
          <div>
            <Note tone="warn">
              <strong className="text-ink">Çözünürlük:</strong> NASA POWER meteoroloji verisi yaklaşık 55 km'lik (0,5° × 0,625°) ızgara hücrelerinin ortalamasıdır. Bu sayılar bir tarlanın değil,{' '}
              <strong className="text-ink">yörenin iklimini</strong> anlatır. Yerel yağış, özellikle yaz sağanakları, bundan belirgin biçimde sapabilir. Yağış verisi uydu-model birleşimidir; yer
              istasyonu ölçümü değildir.
            </Note>
            <div className="mt-3 max-h-[260px] overflow-auto">
              <table className="data text-[12.5px]">
                <thead>
                  <tr>
                    <th>Yıl</th>
                    <th className="num">Yağış (mm) <Tag kind="nasa" /></th>
                    <th className="num">ET0 (mm) <Tag kind="hesap" /></th>
                    <th className="num">Temmuz yağış</th>
                    <th className="num">Temmuz ET0</th>
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
                    <td>Ortalama</td>
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
        <H2 right={<Tag kind="hesap" />}>Formüller</H2>
        <div className="flex flex-col gap-4 text-[13.5px]">
          <div>
            <h3 className="m-0 mb-1 text-[14px] font-semibold">1. Günlük referans buharlaşma (ET0): FAO-56 Penman-Monteith</h3>
            <Formula>{`T = (Tmax+Tmin)/2            e0(T) = 0,6108·exp(17,27·T/(T+237,3))
Δ = 4098·e0(T)/(T+237,3)²     P = 101,3·((293−0,0065·z)/293)^5,26     γ = 0,000665·P
es = (e0(Tmax)+e0(Tmin))/2    ea = RH/100·es
dr = 1+0,033·cos(2πJ/365)     δ = 0,409·sin(2πJ/365−1,39)     ωs = arccos(−tan φ·tan δ)
Ra = (24·60/π)·0,0820·dr·(ωs·sin φ·sin δ + cos φ·cos δ·sin ωs)
Rso = (0,75+2·10⁻⁵·z)·Ra      Rns = 0,77·Rs
Rnl = 4,903·10⁻⁹·((TmaxK⁴+TminK⁴)/2)·(0,34−0,14·√ea)·(1,35·min(Rs/Rso,1)−0,35)
ET0 = (0,408·Δ·(Rns−Rnl) + γ·900/(T+273)·u2·(es−ea)) / (Δ+γ·(1+0,34·u2))

Güneş, rüzgâr ya da nem eksikse (Hargreaves):  ET0 = 0,0023·(T+17,8)·√(Tmax−Tmin)·Ra·0,408`}</Formula>
            <p className="mb-0 mt-1 text-ink2">Rs = ALLSKY_SFC_SW_DWN, u2 = WS2M, RH = RH2M, J = yılın günü, φ = enlem, z = rakım. Toprak ısı akısı günlük adımda 0 alınır. Birim testi: FAO-56 Örnek 18 (Uccle, 6 Temmuz, 3,9 mm/gün).</p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[14px] font-semibold">2. Bitki su tüketimi ve toprak-su dengesi (günlük kova modeli)</h3>
            <Formula>{`ETc = Kc·ET0      Kc: baş evrede sabit, gelişmede doğrusal artış, ortada sabit, sonda doğrusal iniş
Su yılı 1 Ekim'de S = 0,3·TAW ile başlar. Ekimden önce ve hasattan sonra tarla boş: S −= 0,2·ET0
Her gün:  S = min(TAW, S + yağış)
          S < TAW·(1−p) ise, kota kaldıysa ve hasada 10 günden fazla varsa sulama:
              net = TAW − S     brüt = net / randıman     (kota brüt kadar azalır)
          Ks = min(1, S / (TAW·(1−p)))      ETa = Ks·Kc·ET0      S −= ETa
Göreli verim = max(0, 1 − Ky·(1 − ΣETa/ΣETc))
Birim: 1 mm su, 1 dekarda 1 m³`}</Formula>
            <p className="mb-0 mt-1 text-ink2">
              <strong className="text-ink">Su bitiş tarihi</strong>: kümülatif sulama ihtiyacının kotayı aştığı ilk gün, yani bir parselin suya ihtiyaç duyup kotanın bunu karşılayamadığı ilk gün. Kota
              kalanı bir sulamaya yetmiyorsa kalan su verilir ve o gün bitiş günü sayılır. Bugünkü ekimde bütün parseller ortak kotadan, ihtiyaç duydukça çeker.
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[14px] font-semibold">3. Su-verim eğrileri</h3>
            <p className="m-0 text-ink2">
              Her ürün ve {FIRST_YEAR}-{LAST_YEAR} arası her hasat yılı için brüt su tavanı {LEVELS.map((l) => levelLabel(l)).join(', ')} seviyelerinde model çalıştırılır. 20 yılın ortalama göreli
              verimi {dec2(RELIABILITY_FLOOR)}'in altında kalan seçenek "model bu kadar az suda güvenilir değil" diye işaretlenir ve varsayılan olarak planlamaya girmez. Tavanı hiçbir yıl bağlamayan
              seviyeler "tam" ile aynı olduğundan listeden düşer.
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[14px] font-semibold">4. Planlama (doğrusal programlama)</h3>
            <Formula>{`Karar değişkeni:  x[üye, ürün, su seviyesi] ≥ 0  (dekar);  ayrıca x[üye, nadas]
Kısıtlar:   Σ x[üye,·,·] = tarla büyüklüğü
            Σ x·ayrılan su(mm) ≤ üyenin kotası (m³)      ayrılan su = o seçeneğin 20 yıldaki en yüksek kullanımı
            Σ x[üye, ürün, ·] ≤ pay sınırı · tarla       (varsayılan 1/3: üç yıllık nöbet kurulabilsin)
            Σ x·beklenen verim(ürün) ≥ taahhüt(ürün)     (kooperatif düzeyi, 20 yıl ortalama verimi)
            Σ x[·, küçük pazarlı ürün, ·] ≤ eşik · toplam alan   (isteğe bağlı)
Amaç:       en yüksek toplam brüt gelir   ya da   taahhüdü karşılayan en az su (sonra o suyla en yüksek gelir)`}</Formula>
            <p className="mb-0 mt-1 text-ink2">
              Taahhüt karşılanamıyorsa önce "taahhüdün en çok yüzde kaçı üretilebilir" sorusu çözülür, plan o düzeye göre kurulur ve ekranda açıkça söylenir. Çözücü: javascript-lp-solver (simpleks),
              tarayıcıda çalışır.
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[14px] font-semibold">5. Toprak puanı ve nöbet</h3>
            <Formula>{SOIL_FORMULA}</Formula>
            <p className="mb-0 mt-1 text-ink2">
              Paylar tarla alanına göredir; nadas ayrı bir ürün gibi sayılır. Bu puan bir toprak analizi değil, baklagil payını ve çeşitliliği özetleyen kaba bir göstergedir; ağırlıkları (60/40, %25)
              takım varsayımıdır. Nöbet tablosu: tarla üç eş parsele bölünür, ürün deseni her yıl bir parsel kayar.
            </p>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-[14px] font-semibold">6. Geçmişte deneme</h3>
            <p className="m-0 text-ink2">
              Plan (alanlar ve su tavanları sabit) {FIRST_YEAR}-{LAST_YEAR}'in her hasat yılında o yılın gerçek NASA havasıyla çalıştırılır. Yeşil: bütün taahhütler karşılandı. Sarı: en zayıf ürün
              taahhüdün en az {pct(YELLOW_FLOOR)}'ini verdi. Kırmızı: daha azı. Bu bir tahmin değil, "bu plan geçmişte uygulansaydı" denemesidir; gelecek 20 yıl geçmişe benzemeyebilir.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <H2
          right={
            <span className="flex items-center gap-2">
              <Tag kind="varsayim" />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (confirm('Üyeler, taahhüt ve bütün varsayımlar başlangıç değerlerine döndürülsün mü?')) s.reset();
                }}
              >
                Başlangıç değerlerine dön
              </button>
            </span>
          }
        >
          Varsayımlar: ürün tablosu
        </H2>
        <p className="m-0 mb-3 text-[13.5px] text-ink2">
          Aşağıdaki değerlerin <strong className="text-ink">hiçbiri doğrulanmadı</strong> (kodda her alan <code>verified: false</code> taşır). Yörenin gerçek değerlerini biliyorsanız değiştirin; bütün
          ekranlar anında yeniden hesaplanır.
        </p>
        <div className="overflow-x-auto">
          <table className="data min-w-[1080px] text-[13px]">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Ekim (gün.ay)</th>
                <th>Evre süreleri (gün): baş, gelişme, orta, son</th>
                <th>Kc: baş, orta, son</th>
                <th>Ky</th>
                <th>Tam sulu verim (kg/da)</th>
                <th>Fiyat (TL/ton)</th>
              </tr>
            </thead>
            <tbody>
              {s.cropDefs.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap">
                    <Swatch id={d.id} />
                    {d.name}
                    {d.legume && <div className="text-[11.5px] text-muted">baklagil</div>}
                    {d.smallMarket && <div className="text-[11.5px] text-muted">küçük pazar</div>}
                  </td>
                  <td>
                    <span className="flex gap-1" title={d.plant.source}>
                      <NumInput className="w-[52px]" label={`${d.name} ekim günü`} value={d.plant.value.day} min={1} max={31} onChange={(v) => setCrop(d.id, (x) => ({ ...x, plant: { ...x.plant, value: { ...x.plant.value, day: Math.round(v) } } }))} />
                      <NumInput className="w-[52px]" label={`${d.name} ekim ayı`} value={d.plant.value.month} min={1} max={12} onChange={(v) => setCrop(d.id, (x) => ({ ...x, plant: { ...x.plant, value: { ...x.plant.value, month: Math.round(v) } } }))} />
                    </span>
                  </td>
                  <td>
                    <span className="flex gap-1" title={d.stages.source}>
                      {d.stages.value.map((st, i) => (
                        <NumInput key={i} className="w-[58px]" label={`${d.name} evre ${i + 1} süresi`} value={st} min={1} max={300} onChange={(v) => setCrop(d.id, (x) => ({ ...x, stages: { ...x.stages, value: x.stages.value.map((o, k) => (k === i ? Math.round(v) : o)) as CropDef['stages']['value'] } }))} />
                      ))}
                    </span>
                  </td>
                  <td>
                    <span className="flex gap-1" title={d.kc.source}>
                      {d.kc.value.map((kc, i) => (
                        <NumInput key={i} className="w-[62px]" label={`${d.name} Kc ${i + 1}`} value={kc} min={0.05} max={2} decimals={2} onChange={(v) => setCrop(d.id, (x) => ({ ...x, kc: { ...x.kc, value: x.kc.value.map((o, k) => (k === i ? v : o)) as CropDef['kc']['value'] } }))} />
                      ))}
                    </span>
                  </td>
                  <td title={d.ky.source}>
                    <NumInput className="w-[62px]" label={`${d.name} Ky`} value={d.ky.value} min={0.1} max={3} decimals={2} onChange={(v) => setCrop(d.id, (x) => ({ ...x, ky: { ...x.ky, value: v } }))} />
                  </td>
                  <td title={d.yieldKgDa.source}>
                    <NumInput className="w-[84px]" label={`${d.name} verim`} value={d.yieldKgDa.value} min={1} max={50000} onChange={(v) => setCrop(d.id, (x) => ({ ...x, yieldKgDa: { ...x.yieldKgDa, value: v } }))} />
                  </td>
                  <td title={d.priceTlTon.source}>
                    <NumInput className="w-[92px]" label={`${d.name} fiyat`} value={d.priceTlTon.value} min={0} max={1e7} onChange={(v) => setCrop(d.id, (x) => ({ ...x, priceTlTon: { ...x.priceTlTon, value: v } }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-3 text-[13px] text-ink2">
          <summary className="cursor-pointer font-semibold text-ink">Bu değerler nereden geliyor?</summary>
          <ul className="mb-0 mt-2 flex flex-col gap-1 pl-5">
            <li><strong className="text-ink">Ekim tarihi ve evre süreleri:</strong> {s.cropDefs[0].stages.source}</li>
            <li><strong className="text-ink">Kc:</strong> {s.cropDefs[0].kc.source}</li>
            <li><strong className="text-ink">Ky:</strong> {s.cropDefs[0].ky.source}</li>
            <li><strong className="text-ink">Verim:</strong> {s.cropDefs[0].yieldKgDa.source}</li>
            <li><strong className="text-ink">Fiyat:</strong> {s.cropDefs[0].priceTlTon.source}</li>
          </ul>
        </details>
      </Card>

      <Card>
        <H2 right={<Tag kind="varsayim" />}>Varsayımlar: toprak ve sulama randımanı</H2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <label className="block text-[12px] text-ink2">
            Kullanılabilir su kapasitesi (TAW)
            <NumInput className="mt-0.5 w-full" label="TAW (mm)" value={s.soil.taw} min={20} max={400} suffix="mm" onChange={(v) => s.update({ soil: { ...s.soil, taw: v } })} />
          </label>
          <label className="block text-[12px] text-ink2">
            İzin verilen boşalma (p)
            <NumInput className="mt-0.5 w-full" label="p" value={s.soil.p} min={0.1} max={0.9} decimals={2} onChange={(v) => s.update({ soil: { ...s.soil, p: v } })} />
          </label>
          {(Object.keys(METHOD_LABEL) as IrrigationMethod[]).map((k) => (
            <label key={k} className="block text-[12px] text-ink2">
              {METHOD_LABEL[k]} randımanı
              <NumInput className="mt-0.5 w-full" label={`${METHOD_LABEL[k]} randımanı`} value={s.eff[k]} min={0.1} max={1} decimals={2} onChange={(v) => s.update({ eff: { ...s.eff, [k]: v } })} />
            </label>
          ))}
        </div>
        <p className="mb-0 mt-2 text-[12px] text-muted">
          Tek bir toprak (TAW ve p) bütün ürünlere ve üyelere uygulanır; gerçekte kök derinliği ürüne, su tutma kapasitesi toprağa göre değişir. Diğer sabit varsayımlar: su yılı başında toprak nemi
          0,3·TAW; boş tarlada günlük kayıp 0,2·ET0; hasada 10 gün kala sulama kesilir.
        </p>
      </Card>

      <Card>
        <H2
          right={
            <label className="flex items-center gap-2 text-[13px] text-ink2">
              Sulama yöntemi
              <select className="field !w-auto" value={method} onChange={(e) => setMethod(e.target.value as IrrigationMethod)}>
                {(Object.keys(METHOD_LABEL) as IrrigationMethod[]).map((k) => (
                  <option key={k} value={k}>
                    {METHOD_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          Su-verim eğrileri <Tag kind="hesap" />
        </H2>
        <div className="overflow-x-auto">
          <table className="data min-w-[720px] text-[13px]">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Su seviyesi (brüt)</th>
                <th className="num">Ort. göreli verim</th>
                <th className="num">En kötü yıl</th>
                <th className="num">Ort. kullanılan su (mm)</th>
                <th className="num">Ayrılan su (mm)</th>
                <th>Planlamada</th>
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
                          {c.name}
                        </>
                      )}
                    </td>
                    <td>{levelLabel(o.level)}</td>
                    <td className="num">{dec2(o.meanRel)}</td>
                    <td className="num">{dec2(o.minRel)}</td>
                    <td className="num">{int(o.meanGross)}</td>
                    <td className="num">{int(o.maxGross)}</td>
                    <td>{o.reliable ? <span className="text-ink2">var</span> : <UnreliableMark rel={o.meanRel} />}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <p className="mb-0 mt-2 text-[12px] text-muted">20 hasat yılının ({FIRST_YEAR}-{LAST_YEAR}) sonuçları. "Tam" satırındaki ayrılan su, en kurak yılın tam sulama ihtiyacıdır.</p>
      </Card>

      <Card>
        <H2>Modelin sınırları</H2>
        <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[13.5px] text-ink2">
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
        </ul>
      </Card>
    </div>
  );
}
