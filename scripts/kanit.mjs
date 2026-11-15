// Veri kanıtı: tek komutla yeniden üretim.
//   npm run kanit              veriyi NASA POWER'dan yeniden indirir, kayıtlı dosyalarla gün gün karşılaştırır,
//                              ET0'ı ve üç ana sayıyı baştan hesaplar, kayıtlı sonuçlarla karşılaştırır, yazdırır.
//   npm run kanit -- --kaydet  kayıtlı dosyalardan hesaplanan sonuçları docs/kanit-kayit.json'a yazar (referans kaydı).
// Hesap motoru aynen kullanılır (Vite ile src/ altındaki TypeScript yüklenir); bu betik hiçbir girdiyi değiştirmez.
// Ağ yoksa yeniden indirme adımı "yapılamadı" diye yazılır; yapılmış gibi gösterilmez.
// Yan ürünler: src/data/kanit.json (Yöntem sayfası), docs/veri-kaniti.md, docs/kaynak-ozeti.html.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'public', 'data');
const docsDir = join(root, 'docs');
const recordFile = join(docsDir, 'kanit-kayit.json');
const SAVE = process.argv.includes('--kaydet');
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173/#yontem';

const PARAMS = ['T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN', 'WS2M', 'RH2M'];
const FILES = ['karapinar', 'cumra', 'eregli', 'cihanbeyli', 'altinekin', 'civril'];

const lines = [];
const say = (s = '') => {
  lines.push(s);
  console.log(s);
};
const tr = (v, d = 0) => v.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
const ymdToMs = (s) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10).replaceAll('-', '');
const dmy = (s) => `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)}`;

/** POWER yanıtını kayıtlı dosyayla aynı biçime çevirir (scripts/fetch-power.mjs ile aynı kural: -999 -> null). */
function compact(json, stored, url) {
  const p = json.properties.parameter;
  const out = { ...stored, elevation: json.geometry.coordinates[2], source: { ...stored.source, url, fetchedAt: new Date().toISOString() }, params: {} };
  for (const name of PARAMS) {
    const arr = [];
    for (let t = ymdToMs(stored.start); t <= ymdToMs(stored.end); t += 86400000) {
      const v = p[name]?.[ymd(t)];
      arr.push(v === undefined || v === null || v <= -900 ? null : v);
    }
    out.params[name] = arr;
  }
  return out;
}

async function download(stored) {
  const url = stored.source.url;
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return compact(await res.json(), stored, url);
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw last;
}

/** Gün gün karşılaştırma: bir gün, altı parametrenin altısı da birebir eşitse "aynı" sayılır. */
function compare(stored, fresh) {
  const n = stored.params[PARAMS[0]].length;
  let same = 0;
  let firstDiff = null;
  let lastDiff = null;
  const perParam = Object.fromEntries(PARAMS.map((k) => [k, { days: 0, maxAbs: 0 }]));
  for (let i = 0; i < n; i++) {
    let dayDiff = false;
    for (const k of PARAMS) {
      const a = stored.params[k][i];
      const b = fresh.params[k][i];
      if (a !== b) {
        dayDiff = true;
        perParam[k].days++;
        if (a !== null && b !== null) perParam[k].maxAbs = Math.max(perParam[k].maxAbs, Math.abs(a - b));
      }
    }
    if (dayDiff) {
      const d = ymd(ymdToMs(stored.start) + i * 86400000);
      firstDiff ??= d;
      lastDiff = d;
    } else same++;
  }
  return { days: n, same, different: n - same, firstDiff, lastDiff, perParam, elevationSame: stored.elevation === fresh.elevation };
}

// ---------------------------------------------------------------- hesap motoru
const vite = await createServer({ root, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
let exitCode = 0;
try {
  const [{ computeModel }, { buildWeather, sumCalendar }, { DEFAULT_CROPS }, defaults, { DISTRICTS, generateMembers }, promise, inv, types] = await Promise.all(
    ['/src/model.ts', '/src/engine/weather.ts', '/src/data/crops.ts', '/src/data/defaults.ts', '/src/data/members.ts', '/src/engine/promise.ts', '/src/data/inventory.ts', '/src/engine/types.ts'].map((m) => vite.ssrLoadModule(m)),
  );
  const sources = JSON.parse(await readFile(join(root, 'src', 'data', 'sources.json'), 'utf8'));
  const BUYER = 'Örnek Alıcı A.Ş. (kurgusal)';
  const inputs = () => ({
    members: generateMembers(),
    cropDefs: structuredClone(DEFAULT_CROPS),
    soil: { ...defaults.DEFAULT_SOIL },
    eff: { ...defaults.DEFAULT_EFF },
    settings: structuredClone(defaults.DEFAULT_SETTINGS),
  });
  const K = defaults.DEFAULT_SAFE_YEARS;

  /** Ham dosyalardan ET0 ve üç ana sayı. */
  function results(raws) {
    const weathers = Object.fromEntries(DISTRICTS.map((d) => [d.id, buildWeather(raws[d.id])]));
    const model = computeModel(weathers, 'karapinar', inputs());
    const sc = model.scenarios;
    const et0 = {};
    for (const d of DISTRICTS) {
      let sum = 0;
      for (let y = types.FIRST_YEAR; y <= types.LAST_YEAR; y++) sum += sumCalendar(weathers[d.id], weathers[d.id].et0, y);
      et0[d.id] = sum / (types.LAST_YEAR - types.FIRST_YEAR + 1);
    }
    return {
      et0MmYil: et0,
      hargreavesGun: Object.fromEntries(DISTRICTS.map((d) => [d.id, weathers[d.id].hargreavesDays])),
      gelirBugunTl: sc.today.revenue,
      gelirPlanliTl: sc.planned.revenue,
      uye: model.members.length,
      suyuBitenBugun: sc.today.exceeded,
      suyuBitenPlanli: sc.planned.exceeded,
      guvenliSozBugunT: Math.floor(promise.reachedInAtLeast(sc.today.backtest.map((y) => y.productionT.misir ?? 0), K)),
      guvenliSozPlanliT: Math.floor(promise.maxSafeCommitment(model.planInput, 'misir', K)),
      sozTutanYil: { bugun: sc.today.held, gelisiguzel: sc.scatter.held, planli: sc.planned.held, toplam: sc.planned.total },
    };
  }
  const flat = (r) => ({
    ...Object.fromEntries(Object.entries(r.et0MmYil).map(([k, v]) => [`ET0 ${k} (mm/yıl)`, v])),
    'Brüt gelir, bugün (TL)': r.gelirBugunTl,
    'Brüt gelir, planlı (TL)': r.gelirPlanliTl,
    'Suyu biten üye, bugün': r.suyuBitenBugun,
    'Suyu biten üye, planlı': r.suyuBitenPlanli,
    'Güvenli mısır sözü, bugün (t)': r.guvenliSozBugunT,
    'Güvenli mısır sözü, planlı (t)': r.guvenliSozPlanliT,
  });
  const equal = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
  const fmt = (k, v) => (k.includes('TL') ? tr(v) : k.startsWith('ET0') ? tr(v, 1) : tr(v));

  // ---------------------------------------------------------------- 1. kayıtlı dosyalar
  const now = new Date();
  say(`Nöbet · veri kanıtı · ${now.toISOString()}`);
  say('');
  say('1) Kayıtlı NASA POWER dosyaları (public/data)');
  const stored = {};
  const files = [];
  for (const id of FILES) {
    const buf = await readFile(join(dataDir, `${id}.json`));
    const raw = JSON.parse(buf.toString('utf8'));
    stored[id] = raw;
    const days = raw.params[PARAMS[0]].length;
    const missing = Object.fromEntries(PARAMS.map((k) => [k, raw.params[k].filter((v) => v === null).length]));
    const f = {
      id,
      file: `public/data/${id}.json`,
      name: raw.name,
      lat: raw.lat,
      lon: raw.lon,
      elevation: raw.elevation,
      start: raw.start,
      end: raw.end,
      days,
      params: PARAMS,
      missing,
      missingTotal: Object.values(missing).reduce((a, b) => a + b, 0),
      url: raw.source.url,
      fetchedAt: raw.source.fetchedAt,
      sha256: createHash('sha256').update(buf).digest('hex'),
      bytes: buf.length,
      used: DISTRICTS.some((d) => d.id === id),
    };
    files.push(f);
    say(`   ${id.padEnd(11)} ${tr(days)} gün · eksik ${f.missingTotal} · indirme ${f.fetchedAt} · sha256 ${f.sha256}${f.used ? '' : ' · kooperatif hesabında kullanılmıyor'}`);
  }

  // ilçe çiftleri: hangi parametre serileri gün gün aynı (sayılarak yazılır)
  const pairs = [];
  for (let i = 0; i < DISTRICTS.length; i++)
    for (let j = i + 1; j < DISTRICTS.length; j++) {
      const A = stored[DISTRICTS[i].id];
      const B = stored[DISTRICTS[j].id];
      const diff = Object.fromEntries(PARAMS.map((k) => [k, A.params[k].reduce((n, v, x) => n + (v !== B.params[k][x] ? 1 : 0), 0)]));
      const sameParams = PARAMS.filter((k) => diff[k] === 0);
      if (sameParams.length) pairs.push({ a: DISTRICTS[i].id, b: DISTRICTS[j].id, sameParams, diff });
    }
  for (const p of pairs)
    say(`   not: ${p.a} ile ${p.b} dosyalarında ${p.sameParams.length === PARAMS.length ? 'altı parametrenin altısı da' : p.sameParams.join(', ')} gün gün aynı${p.sameParams.length === PARAMS.length ? '' : '; ' + PARAMS.filter((k) => p.diff[k]).map((k) => `${k} ${tr(p.diff[k])} günde farklı`).join(', ')}`);

  // ---------------------------------------------------------------- 2. yeniden indirme
  say('');
  say('2) Yeniden indirme ve gün gün karşılaştırma (NASA POWER API, şimdi)');
  const fresh = {};
  const redownload = [];
  for (const d of DISTRICTS) {
    try {
      fresh[d.id] = await download(stored[d.id]);
      const c = compare(stored[d.id], fresh[d.id]);
      redownload.push({ id: d.id, ok: true, at: fresh[d.id].source.fetchedAt, ...c });
      const diffs = PARAMS.filter((k) => c.perParam[k].days > 0).map((k) => `${k} ${c.perParam[k].days} gün (en büyük fark ${String(+c.perParam[k].maxAbs.toFixed(4)).replace('.', ',')})`);
      say(`   ${d.id.padEnd(11)} ${tr(c.days)} gün: ${tr(c.same)} gün birebir aynı, ${tr(c.different)} gün farklı${c.different ? ` · ilk ${dmy(c.firstDiff)}, son ${dmy(c.lastDiff)} · ${diffs.join('; ')}` : ''} · rakım ${c.elevationSame ? 'aynı' : 'farklı'}`);
    } catch (err) {
      redownload.push({ id: d.id, ok: false, error: String(err?.cause?.code ?? err?.message ?? err) });
      say(`   ${d.id.padEnd(11)} YAPILAMADI: indirilemedi (${redownload.at(-1).error}). Karşılaştırma yapılmadı.`);
    }
  }
  const allFresh = redownload.every((r) => r.ok);
  if (!allFresh) exitCode = 2;

  // ---------------------------------------------------------------- 3. baştan hesap
  say('');
  say('3) ET0 ve üç ana sayı: baştan hesap');
  const t0 = Date.now();
  const fromStored = results(stored);
  const fromFresh = allFresh ? results(fresh) : null;
  const secs = (Date.now() - t0) / 1000;

  await mkdir(docsDir, { recursive: true });
  if (SAVE) {
    await writeFile(recordFile, JSON.stringify({ recordedAt: now.toISOString(), note: 'Kayıtlı public/data dosyalarından, depodaki hesap motoruyla üretildi (npm run kanit -- --kaydet).', values: fromStored }, null, 2) + '\n');
    say(`   Referans kaydı yazıldı: docs/kanit-kayit.json`);
  }
  let record = null;
  try {
    record = JSON.parse(await readFile(recordFile, 'utf8'));
  } catch {
    say('   Kayıtlı sonuç dosyası (docs/kanit-kayit.json) yok: karşılaştırma yapılamadı. Önce "npm run kanit -- --kaydet" çalıştırın.');
    exitCode = exitCode || 3;
  }
  const rows = [];
  if (record) {
    const R = flat(record.values);
    const S = flat(fromStored);
    const F = fromFresh ? flat(fromFresh) : null;
    say(`   kayıt tarihi ${record.recordedAt}`);
    say(`   ${'sayı'.padEnd(32)} ${'kayıtlı'.padStart(14)} ${'kayıtlı dosyadan'.padStart(18)} ${'yeni indirilenden'.padStart(18)}  sonuç`);
    for (const k of Object.keys(R)) {
      const okS = equal(R[k], S[k]);
      const okF = F ? equal(R[k], F[k]) : null;
      const verdict = !okS ? 'FARKLI (kayıtlı dosyadan)' : okF === null ? 'aynı; yeni veriyle denenemedi' : okF ? 'aynı' : 'yeni veriyle FARKLI';
      rows.push({ name: k, recorded: R[k], stored: S[k], fresh: F ? F[k] : null, okStored: okS, okFresh: okF });
      say(`   ${k.padEnd(32)} ${fmt(k, R[k]).padStart(14)} ${fmt(k, S[k]).padStart(18)} ${(F ? fmt(k, F[k]) : 'yok').padStart(18)}  ${verdict}`);
      if (!okS || okF === false) exitCode = exitCode || 1;
    }
  }
  say(`   hesap süresi ${String(secs.toFixed(1)).replace('.', ',')} sn`);

  // ---------------------------------------------------------------- 4. özet
  const rowsInv = inv.buildInventory({
    ...inputs(),
    buyer: BUYER,
    days: files[0].days,
    elevations: Object.fromEntries(files.map((f) => [f.id, f.elevation])),
  });
  const counts = inv.countByClass(rowsInv);
  say('');
  say('4) Girdi dökümü (sayım)');
  for (const c of inv.CLASS_ORDER) say(`   ${inv.CLASS_LABEL[c].padEnd(12)} ${counts[c]} girdi`);
  say(`   toplam       ${rowsInv.length} girdi`);
  say('');
  const sameAll = redownload.filter((r) => r.ok && r.different === 0).length;
  const okCount = redownload.filter((r) => r.ok).length;
  const verdict =
    okCount === 0
      ? 'SONUÇ: Ağ yok ya da API yanıt vermedi; yeniden indirme karşılaştırması YAPILAMADI. Kayıtlı dosyalardan hesap ' + (rows.every((r) => r.okStored) && record ? 'kayıtlı sonuçlarla aynı.' : 'kayıtlı sonuçlarla karşılaştırılamadı ya da farklı.')
      : `SONUÇ: ${okCount} ilçe dosyası yeniden indirildi; ${sameAll} tanesi kayıtlı dosyayla gün gün birebir aynı${okCount - sameAll ? `, ${okCount - sameAll} tanesinde fark var` : ''}${okCount < redownload.length ? `, ${redownload.length - okCount} tanesi indirilemedi` : ''}. ` +
        (record ? (rows.every((r) => r.okStored && r.okFresh !== false) ? 'Baştan hesaplanan ET0 ve üç ana sayı kayıtlı sonuçlarla aynı.' : 'Baştan hesaplanan sayılardan en az biri kayıtlı sonuçtan FARKLI (yukarıdaki tabloya bakın).') : 'Kayıtlı sonuç yok.');
  say(verdict);

  // ---------------------------------------------------------------- yan ürünler
  const kanit = { generatedAt: now.toISOString(), command: 'npm run kanit', files, pairs, redownload, record: record ? { recordedAt: record.recordedAt } : null, rows, counts, total: rowsInv.length, verdict, output: lines.join('\n') };
  await writeFile(join(root, 'src', 'data', 'kanit.json'), JSON.stringify(kanit, null, 2) + '\n');

  // --- docs/veri-kaniti.md
  const esc = (s) => String(s ?? '').replaceAll('|', '\\|');
  const md = [];
  md.push('# Nöbet: veri kaynakları ve kanıt', '');
  md.push(`Bu dosya \`npm run kanit\` ile üretilir (son çalıştırma: ${now.toISOString()}). Elle düzenlenmez; aynı içerik uygulamanın "Yöntem ve kaynaklar" sayfasındaki "Veri kaynakları ve kanıt" bölümünde süzülebilir tablo olarak durur.`, '');
  md.push('## 1. Dürüst özet', '');
  md.push('| Sınıf | Girdi sayısı | Ne demek |', '|---|---:|---|');
  const meaning = {
    nasa: "NASA POWER'dan indirilen günlük seri ya da değer",
    kaynakli: "src/data/sources.json'da kaydı olan; sayfası bu projede açılıp içinde görülen değer",
    varsayim: 'Kaynağı bulunamamış; takımın seçtiği değer',
    kurgusal: 'Kooperatif, üyeler, tarlalar, su hakları, alıcı: gerçek değil',
  };
  for (const c of inv.CLASS_ORDER) md.push(`| ${inv.CLASS_LABEL[c]} | ${counts[c]} | ${meaning[c]} |`);
  md.push(`| Toplam | ${rowsInv.length} | |`, '');
  md.push('Sayım, aşağıdaki dökümün satırlarıdır. Bir satır tek bir sayı da olabilir, bir dizi de (ör. bir ürünün üç Kc değeri tek satır; bir NASA parametresinin 5 ilçe × 7.762 günlük serisi tek satır). Bu yüzden sayılar "girdi kalemi" sayısıdır, ağırlık ya da önem ölçüsü değildir.', '');
  md.push(`**Üç ana sayı neye dayanır:** ${inv.DEPENDENCE}`, '');
  md.push('## 2. Girdi dökümü', '');
  for (const c of inv.CLASS_ORDER) {
    md.push(`### ${inv.CLASS_LABEL[c]} (${counts[c]})`, '', '| Girdi | Değer | Birim | Kaynak | Tablo / sayfa |', '|---|---|---|---|---|');
    for (const r of rowsInv.filter((x) => x.cls === c)) md.push(`| ${esc(r.name)} | ${esc(r.value)} | ${esc(r.unit)} | ${r.source ? `[${esc(r.source)}](${r.url})` : '–'} | ${esc(r.table ?? '–')} |`);
    md.push('');
  }
  md.push('### Aranıp bulunamayanlar', '', ...sources.notFound.map((x) => `- ${x}`), '');
  md.push('## 3. NASA verisinin kanıtı', '');
  md.push(`Parametreler (her dosyada aynı): ${PARAMS.join(', ')}. Topluluk: AG. Zaman çözünürlüğü: günlük. Uzamsal çözünürlük: yaklaşık 0,5° × 0,625° (≈ 55 km).`, '');
  for (const f of files) {
    md.push(`### ${f.name}${f.used ? '' : ' (kooperatif hesabında kullanılmıyor; uygulamadaki hazır noktalardan biri)'}`, '');
    md.push(`- Dosya: \`${f.file}\` (${tr(f.bytes)} bayt)`);
    md.push(`- API adresi: <${f.url}>`);
    md.push(`- Koordinat: ${String(f.lat).replace('.', ',')}° K, ${String(f.lon).replace('.', ',')}° D · rakım ${tr(f.elevation, 2)} m (API yanıtından)`);
    md.push(`- Tarih aralığı: ${dmy(f.start)} – ${dmy(f.end)} · ${tr(f.days)} gün`);
    md.push(`- Eksik değer: ${f.missingTotal} (${PARAMS.map((k) => `${k} ${f.missing[k]}`).join(', ')})`);
    md.push(`- İndirme tarihi: ${f.fetchedAt}`);
    md.push(`- SHA-256: \`${f.sha256}\``, '');
  }
  md.push('Aynı seriyi paylaşan ilçeler (dosyalar gün gün karşılaştırılarak sayıldı):', '');
  for (const p of pairs) md.push(`- ${p.a} ile ${p.b}: ${p.sameParams.length === PARAMS.length ? 'altı parametrenin altısı da gün gün aynı' : `${p.sameParams.join(', ')} gün gün aynı; ` + PARAMS.filter((k) => p.diff[k]).map((k) => `${k} ${tr(p.diff[k])} günde farklı`).join(', ')}.`);
  md.push('', 'Yani beş ilçe için beş ayrı hava yok. Sıcaklık, yağış, rüzgâr ve nem yaklaşık 0,5° × 0,625° ızgaradan gelir; güneş radyasyonu ayrı bir ızgaradan gelir, bu yüzden bir çiftte radyasyon farklı olabilir. Dosyaların SHA-256 değerleri ad ve koordinat alanları yüzünden her durumda farklıdır.', '');
  md.push('## 4. Yeniden indirme karşılaştırması', '');
  md.push('Bir gün, altı parametrenin altısı da kayıtlı değerle birebir eşitse "aynı" sayılır.', '');
  md.push('| İlçe | Yeniden indirme | Gün | Birebir aynı | Farklı | Ayrıntı |', '|---|---|---:|---:|---:|---|');
  for (const r of redownload) {
    if (!r.ok) md.push(`| ${r.id} | **yapılamadı** (${esc(r.error)}) | – | – | – | karşılaştırma yapılmadı |`);
    else
      md.push(
        `| ${r.id} | ${r.at} | ${tr(r.days)} | ${tr(r.same)} | ${tr(r.different)} | ${r.different ? `ilk ${dmy(r.firstDiff)}, son ${dmy(r.lastDiff)}; ` + PARAMS.filter((k) => r.perParam[k].days).map((k) => `${k}: ${r.perParam[k].days} gün, en büyük fark ${String(+r.perParam[k].maxAbs.toFixed(4)).replace('.', ',')}`).join('; ') : 'fark yok'}; rakım ${r.elevationSame ? 'aynı' : 'farklı'} |`,
      );
  }
  md.push('', '## 5. Yeniden üretim', '', 'Komut:', '', '```bash', 'npm run kanit', '```', '');
  md.push('Betik (`scripts/kanit.mjs`) veriyi yeniden indirir, kayıtlı dosyalarla karşılaştırır, ET0 ve üç ana sayıyı hem kayıtlı dosyalardan hem yeni indirilenden baştan hesaplar ve `docs/kanit-kayit.json` içindeki kayıtlı sonuçlarla karşılaştırır. Kayıtlı sonuçlar aynı hesap motoruyla üretilmiştir; bu karşılaştırma hesabın **tekrarlanabilir** olduğunu gösterir, **doğru** olduğunu değil. Çıkış kodu: 0 hepsi aynı, 1 bir sayı farklı, 2 ağ yok / indirilemedi, 3 kayıt dosyası yok.', '');
  md.push('Son çıktı:', '', '```text', ...lines, '```', '');
  await writeFile(join(docsDir, 'veri-kaniti.md'), md.join('\n'));

  // --- docs/kaynak-ozeti.html (tek slayt, 16:9)
  const h = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const pick = (cls, names) => names.map((n) => rowsInv.find((r) => r.cls === cls && r.name.includes(n))).filter(Boolean);
  const cards = [
    { cls: 'nasa', color: '#0b5cad', sub: 'İndirildi, dosyada duruyor', items: [`Sıcaklık, yağış, güneş, rüzgâr, nem: 6 günlük seri`, `5 ilçe · ${dmy(files[0].start)} – ${dmy(files[0].end)} · ${tr(files[0].days)} gün`, `Eksik değer: ${files.filter((f) => f.used).reduce((a, f) => a + f.missingTotal, 0)}`, 'NASA POWER, ≈ 55 km ızgara'] },
    { cls: 'kaynakli', color: '#1a7f4b', sub: 'Sayfası açıldı, değer içinde görüldü', items: ['Kc: 7 ürünün 7’si (FAO-56 Tablo 12)', 'Ky: mısır, buğday, ayçiçeği, pancar (FAO-56 Tablo 24)', 'Evre süreleri: 4 ürün (FAO-56 Tablo 11)', 'Fiyat: buğday, arpa (TMO 2026, haber sayfasından)'] },
    { cls: 'varsayim', color: '#a15c00', sub: 'Kaynak bulunamadı; biz seçtik', items: ['Tam sulu verimler: 7 ürünün 7’si', 'Fiyat: mısır, pancar, ayçiçeği, nohut, mercimek', `Toprak su kapasitesi ${tr(defaults.DEFAULT_SOIL.taw)} mm, sulama randımanları`, 'Ekim tarihleri ve plan kuralları'] },
    { cls: 'kurgusal', color: '#6b4fbb', sub: 'Gerçek değil; demo için üretildi', items: pick('kurgusal', ['Üye sayısı']).map((r) => `Kooperatif ve ${r.value} üyesi`).concat(['Tarla büyüklükleri ve bugünkü ekim', 'Su hakları', 'Alıcı ve satış sözleşmesi']) },
  ];
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nöbet · Kaynak özeti</title>
<style>
  :root { --bg:#f4f5f7; --card:#fff; --ink:#15171a; --ink2:#5b616b; --line:#e2e4e8; }
  * { box-sizing: border-box; }
  html, body { margin:0; height:100%; background:#1a1b1e; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color:var(--ink); }
  body { display:grid; place-items:center; }
  /* 16:9 sahne: pencereye sığan en büyük 16:9 dikdörtgen; yazı boyu sahneye göre ölçeklenir */
  .slide { width:min(100vw, 177.78vh); height:min(56.25vw, 100vh); background:var(--bg); font-size:min(1vw, 1.778vh); padding:2.6em 3.2em 2em; display:flex; flex-direction:column; gap:1.4em; }
  h1 { margin:0; font-size:3.3em; line-height:1.05; font-weight:700; letter-spacing:-.02em; }
  .lead { margin:.35em 0 0; font-size:1.75em; color:var(--ink2); }
  .grid { flex:1; display:grid; grid-template-columns:repeat(4, 1fr); gap:1.4em; min-height:0; }
  .card { background:var(--card); border-radius:1.1em; box-shadow:0 0 0 1px var(--line); padding:1.3em 1.4em 1.2em; display:flex; flex-direction:column; border-top:.55em solid var(--c); }
  .n { font-size:4.6em; line-height:1; font-weight:700; letter-spacing:-.03em; font-variant-numeric:tabular-nums; color:var(--c); }
  .n small { font-size:.22em; font-weight:600; letter-spacing:0; color:var(--ink2); margin-left:.4em; }
  .k { font-size:2em; font-weight:700; margin-top:.25em; }
  .s { font-size:1.45em; color:var(--ink2); margin-top:.15em; }
  ul { list-style:none; margin:.8em 0 0; padding:.8em 0 0; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:.6em; }
  li { font-size:1.58em; line-height:1.25; padding-left:.9em; position:relative; }
  li::before { content:""; position:absolute; left:0; top:.5em; width:.35em; height:.35em; border-radius:50%; background:var(--c); }
  footer { display:flex; justify-content:space-between; align-items:baseline; gap:2em; font-size:1.3em; color:var(--ink2); }
  footer b { color:var(--ink); font-weight:600; }
  a { color:#0b5cad; }
</style>
</head>
<body>
<main class="slide">
  <header>
    <h1>Hangi sayı nereden geliyor?</h1>
    <p class="lead">Modele giren ${rowsInv.length} girdi kalemi, dört sınıfta. Üç ana sayının üçü de dört sınıfın hepsine dayanır.</p>
  </header>
  <section class="grid">
${cards
  .map(
    (c) => `    <article class="card" style="--c:${c.color}">
      <div class="n">${counts[c.cls]}<small>girdi</small></div>
      <div class="k">${h(inv.CLASS_LABEL[c.cls])}</div>
      <div class="s">${h(c.sub)}</div>
      <ul>
${c.items.map((i) => `        <li>${h(i)}</li>`).join('\n')}
      </ul>
    </article>`,
  )
  .join('\n')}
  </section>
  <footer>
    <span><b>Yeniden üretim:</b> npm run kanit · ${h(okCount === 0 ? 'yeniden indirme yapılamadı (ağ yok)' : `${okCount} ilçe dosyası yeniden indirildi, ${sameAll} tanesi kayıtlı dosyayla gün gün aynı`)} · ${now.toISOString().slice(0, 10).split('-').reverse().join('.')}</span>
    <span>Tam döküm: <a href="${h(SITE_URL)}">Yöntem ve kaynaklar sayfası</a> · docs/veri-kaniti.md</span>
  </footer>
</main>
</body>
</html>
`;
  await writeFile(join(docsDir, 'kaynak-ozeti.html'), html);
} finally {
  await vite.close();
}
process.exit(exitCode);
