# Nöbet

Sulama kooperatifleri için su bütçesi ve ekim planı prototipi. NASA Space Apps Challenge 2026, "Field Shift: Adapting Farms with NASA Data" görevi için hazırlandı.

Kullanıcı bir sulama kooperatifinin ziraat mühendisidir. Araç, üyelerin yıllık su kotasını aşmadan hangi ürünün tarlanın ne kadarına ve ne kadar suyla ekilebileceğini hesaplar; kooperatifin satış taahhüdünü üyelere dağıtır; planı 2006-2025'in gerçek havasında deneyip tutup tutmadığını gösterir.

**Ürün önermiyoruz, su bütçesi yönetiyoruz. Araç karar vermez; seçenekleri ve bedellerini gösterir.**

Pilot bölge Konya: Karapınar (37,72° K, 33,55° D), Çumra, Ereğli, Cihanbeyli ve Altınekin. Açılıştaki "Konya Ovası Örnek Kooperatifi", 50 üyesi ve 2.690 tonluk mısır taahhüdü **kurgusaldır** (söz, planlı dağıtımda 20 yılın en az 16'sında tutan en yüksek miktar olarak hesaplanır).

## Çalıştırma

Node.js 20 ya da üstü gerekir.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

Bu makinede sistemde Node yoktu; proje içinde `.tools/node` altında bir kopya duruyor (git dışı). Onu kullanmak için komutlardan önce bir kez:

```bash
export PATH="$PWD/.tools/node/bin:$PATH"
```

### Veriyi yeniden indirmek

Karapınar ve Çivril verisi `public/data/` altında depoyla birlikte gelir. Yenilemek için (anahtar gerekmez, internet gerekir):

```bash
npm run fetch-data
```

Betik (`scripts/fetch-power.mjs`) NASA POWER günlük API'sinden 1 Ekim 2004 – 31 Aralık 2025 arasını indirir ve parametre başına gün dizisi olarak yazar. Başka bir nokta eklemek için betikteki `POINTS` listesine ve `src/data/defaults.ts` içindeki `PRESET_POINTS` listesine satır ekleyin.

## Dil / Language

Arayüz İngilizce ve Türkçe. Varsayılan İngilizce; kenar menüdeki **Türkçe / English** düğmesi dili değiştirir ve seçim tarayıcıda hatırlanır. Adres sonuna `?lang=tr` ya da `?lang=en` eklenerek de açılabilir. Metinler kodda yerinde iki dillidir: `L('Türkçe', 'English')` (`src/i18n.ts`). MCP sunucusu, `npm run kanit` ve testler Türkçe çalışır.

The interface is available in English (default) and Turkish. Use the **Türkçe / English** button in the side menu, or add `?lang=tr` / `?lang=en` to the address.

## Yayınlama

**Yayın yolu: Railway.** Tek bir Node süreci (`npm start`, `mcp/start.ts`) hem siteyi (`dist/`) hem MCP sunucusunu (`/mcp`) sunar. Adımlar aşağıda "Railway" başlığında. Vercel ve Netlify bölümleri yalnız siteyi (MCP olmadan) statik yayınlamak içindir; `api/mcp.ts` ve `vercel.json` depoda duruyor ama kullanılmıyor.

Sitenin hesabı tarayıcıda yapılır; sunucu yalnız dosyaları ve MCP'yi sunar. `npm run build` çıktısı (`dist/`) herhangi bir statik sunucuda çalışır. `base: './'` kullanıldığı için alt dizinde de çalışır. İlçe verileri (`public/data/*.json`) derlemeye dahildir; yayın sırasında NASA'ya istek atılmaz.

Yayından önce yerelde deneyin:

```bash
npm test
```

```bash
npm run build
```

```bash
npm run preview
```

Tek sunucuyu yerelde deneyin (site http://localhost:3000, MCP http://localhost:3000/mcp):

```bash
npm run build && PORT=3000 npm start
```

### Railway (site + MCP)

Bu adımlar çalıştırılmadı. Railway belgeleri 15.11.2026'da okundu.

1. Depoyu GitHub'a gönderin (git kurulu bir ortamda):

```bash
git push -u origin main
```

2. railway.com → New Project → Deploy from GitHub repo → bu depo.
3. Servis ayarları (Settings → Build / Deploy):
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Node sürümü `package.json` içindeki `"engines": { "node": "22.x" }` alanından okunur.
   - `railway.json` eklenmedi: Railway'in "Config as Code" özelliği belgede "deprecated" olarak işaretli. Railpack bu ayarları zaten `package-lock.json`, `build` ve `start` betiklerinden çıkarır; yukarıdaki iki komutu panoda açıkça yazmak yeterli.
4. Değişkenler (Variables sekmesi):
   - `MCP_AUTH` = `none` (girişsiz, varsayılan) ya da `key`
   - `key` ise `MCP_API_KEY` = uzun rastgele değer (`openssl rand -hex 24`)
   - `ALLOWED_ORIGINS` (isteğe bağlı) = Origin başlığı taşıyan isteklerde izin verilen kaynaklar, virgülle. Boşsa: `claude.ai` ve Railway'in verdiği alan adı (`RAILWAY_PUBLIC_DOMAIN`, otomatik). Sitenin kendi alan adı her zaman geçer. Origin başlığı **olmayan** istekler her zaman geçer (claude.ai bağlayıcısı Anthropic'in bulutundan bağlanır). `*` kontrolü kapatır.
   - `PORT` Railway tarafından verilir; sunucu `0.0.0.0`'a bağlanır.
5. Settings → Networking → Public Networking → **Generate Domain**. HTTPS'i Railway sağlar; adres `https://<ad>.up.railway.app` olur.
6. Deneyin:

```bash
npx -y @modelcontextprotocol/inspector@2.15.0 --cli https://<ad>.up.railway.app/mcp --transport http --method tools/list
```

7. claude.ai → Customize → Connectors → Add custom connector → URL `https://<ad>.up.railway.app/mcp` (ayrıntı: `mcp/README.md`).

Komut satırından (Railway CLI kuruluysa) aynı iş: `railway login`, `railway link`, `railway variable set MCP_AUTH=none`, `railway up`, `railway domain`.

### Vercel (yalnız statik site)

1. Projeyi bir Git deposuna gönderin (GitHub, GitLab ya da Bitbucket) ve vercel.com'da "Add New… → Project" ile içe aktarın. Vercel, Vite'ı kendisi tanır; tanımazsa Framework Preset: Vite, Build Command: `npm run build`, Output Directory: `dist` girin.
2. Ya da komut satırından (ilk çalıştırmada hesap girişi ve birkaç soru sorar):

```bash
npx vercel
```

Önizleme adresi çalışıyorsa canlıya alın:

```bash
npx vercel --prod
```

### Netlify (yalnız statik site)

1. app.netlify.com'da "Add new site → Import an existing project" ile depoyu bağlayın; Build command: `npm run build`, Publish directory: `dist`.
2. Depo olmadan: `npm run build` çalıştırıp `dist` klasörünü app.netlify.com/drop sayfasına sürükleyin.
3. Ya da komut satırından:

```bash
npx netlify deploy --build
```

Taslak adres çalışıyorsa canlıya alın:

```bash
npx netlify deploy --build --prod
```

### Yayınlarken bilinmesi gerekenler

- `dist/index.html` dosyasını çift tıklayıp `file://` ile açmak çalışmaz; bir statik sunucu gerekir.
- Tek sayfalık uygulamadır ve adres çubuğunda yol kullanmaz; yönlendirme (rewrite) kuralı gerekmez.
- Sayfa açıkken tarayıcı şu dış servislere istek atar: harita karoları (OpenStreetMap, Esri World Imagery, NASA GIBS) ve yazı tipi (Google Fonts). Bunlar erişilemezse harita altlığı boş kalır ya da yazı tipi sistem yazı tipine düşer; hesap etkilenmez.
- `.tools/` klasörü (bu makine için indirilen Node ve commit aracı) git dışındadır ve yayına girmez.
- Bu makinede sistem git'i yok; depoyu bir Git servisine göndermek için git kurulu bir ortam gerekir (macOS'ta Xcode komut satırı araçları).

## Ekranlar

1. **Kooperatif panosu** (açılış): solda harita, sağda taahhüt paneli. Haritada 50 kurgusal üyenin her biri bir pasta daire (büyüklük dekar, dilimler ürün payı; yakınlaşınca tarla dikdörtgeni) ve ilçelerin NASA POWER hücreleri var; üç görünüm arasında geçilir: Bugün, Gelişigüzel dağıtım, Planlı dağıtım. Panelde ürün, ton ve alıcı girilir; iki dağıtım altı sayıyla karşılaştırılır (ürünü eken üye, ortalama verim, sözün tuttuğu yıl, kullanılan su, brüt gelir, suyu biten üye) ve dağıtım tablosu gösterilir. Hücreye tıklayınca o ilçenin NASA iklim kartı açılır.
2. **Üyeler**: bir üyenin bugünkü ekimi ile önerilen plan yan yana: brüt gelir, su bitiş tarihi, iki çizgili su grafiği, ürün başına ton ve TL, üç yıllık nöbet tablosu. Ayrıntılar kapalı bölümde.
3. **Taahhüt**: ürün başına ton taahhüdü, dağıtım tablosu, geçmişte deneme şeridi, plan kuralları. Taahhüt karşılanamıyorsa seçenekler ve bedelleri.
4. **Yöntem ve kaynaklar**: formüller, değiştirilebilir bütün varsayımlar, veri kaynağı, su-verim eğrileri, modelin sınırları.

Kenar menüde seçili ilçe: Karapınar, Çumra, Ereğli, Cihanbeyli, Altınekin. Her üye kendi ilçesinin NASA verisiyle hesaplanır. Beş ilçe yalnızca üç NASA hücresine düşer (Karapınar ile Ereğli, Cihanbeyli ile Altınekin aynı hücrededir).

Plan kuralları: bir ürün tarlanın en çok 1/3'ü; bir üyede bir ürün ya en az 10 dekar (tarlası 60 dekardan küçükse 5 dekar) ekilir ya hiç ekilmez; sulanan ürün tam su ihtiyacının en az %60'ını alır (altı plana girmez); şeker pancarı yalnız sözleşmesi olan üyeye ve yalnız tam sulamayla önerilir.

## Kod yapısı

```
scripts/fetch-power.mjs      NASA POWER indirme betiği
public/data/*.json           Karapınar ve Çivril günlük verisi
src/engine/                  hesap motoru: arayüzden bağımsız saf fonksiyonlar
  et0.ts                     FAO-56 Penman-Monteith ve Hargreaves
  weather.ts                 veri temizliği, günlük ET0
  bucket.ts                  günlük toprak-su dengesi (kova modeli)
  curves.ts                  su-verim eğrileri (bellekte tutulur)
  plan.ts                    doğrusal programlama, geçmişte deneme
  farm.ts                    bir üyenin tarlasının 20 yıllık değerlendirmesi
  soil.ts                    toprak puanı, nöbet tablosu
  __tests__/                 Vitest birim testleri ve kabul kontrolleri
src/data/crops.ts            ürün tablosu (her alan: value, source, verified:false)
src/data/defaults.ts         kurgusal kooperatif, toprak, randıman, plan ayarları
src/model.ts                 ekranların gösterdiği bütün türetilmiş sonuçlar
src/screens/, components/    arayüz (React + Tailwind, grafikler elle SVG)
DECISIONS.md                 belirsiz yerlerde verilen kararlar
```

## Veri kaynakları

- **İklim**: NASA Langley Research Center, POWER Project, Daily API (`community=AG`). Parametreler: `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`, `WS2M`, `RH2M`; rakım yanıttaki `geometry.coordinates[2]`. Dönem 2004-10-01 – 2025-12-31. İndirilen iki noktada eksik (-999) değer yok.
- **Harita**: OpenStreetMap katkıcıları; uydu altlığı Esri World Imagery; NASA EOSDIS GIBS, MODIS Terra gerçek renk (CorrectedReflectance_TrueColor).
- **Yöntem**: FAO Sulama ve Drenaj Yayını 56 (ET0, Kc yaklaşımı), FAO 33 (Ky ile verim tepkisi).
- Ürün parametreleri, verim ve fiyatlar bir veri kaynağından değil, proje tanımından gelir: aşağıya bakın.

NASA POWER meteoroloji verisi yaklaşık 55 km çözünürlüklüdür: tarlayı değil **yöre iklimini** gösterir.

## Varsayımlar (hiçbiri doğrulanmadı)

Hepsi arayüzde "varsayım" etiketiyle gösterilir ve Yöntem sayfasından (ya da ilgili ekrandan) değiştirilebilir.

| ürün | ekim | evre süreleri (gün) | Kc baş/orta/son | Ky | tam sulu verim kg/da | fiyat TL/ton |
|---|---|---|---|---|---|---|
| mısır | 1 Mayıs | 30, 40, 50, 30 | 0,30 / 1,20 / 0,50 | 1,25 | 1265 | 15025 |
| şeker pancarı | 10 Nisan | 30, 45, 80, 35 | 0,35 / 1,20 / 0,70 | 1,00 | 7000 | 3720 |
| ayçiçeği (küçük pazar) | 1 Mayıs | 25, 35, 45, 25 | 0,35 / 1,10 / 0,35 | 0,95 | 350 | 34250 |
| buğday (kışlık) | 20 Ekim | 146, 47, 40, 25 | 0,40 / 1,15 / 0,30 | 1,05 | 550 | 16500 |
| arpa (kışlık) | 20 Ekim | 141, 42, 35, 25 | 0,30 / 1,15 / 0,25 | 1,00 | 500 | 12750 |
| nohut (baklagil, küçük pazar) | 20 Mart | 25, 30, 35, 20 | 0,40 / 1,00 / 0,35 | 1,00 | 220 | 34250 |
| kırmızı mercimek (baklagil, küçük pazar; proje tanımında yok, varsayılan olarak öneri dışında) | 1 Kasım | 120, 40, 35, 20 | 0,40 / 1,10 / 0,30 | 1,00 | 180 | 45000 |

- Toprak: kullanılabilir su kapasitesi TAW = 130 mm, izin verilen boşalma p = 0,5; bütün ürün ve üyeler için aynı.
- Sulama randımanı: salma 0,50, yağmurlama 0,75, damla 0,90.
- Su yılı 1 Ekim'de toprak nemi 0,3·TAW ile başlar; boş tarlada günlük kayıp 0,2·ET0; hasada 10 gün kala sulama kesilir; sulama her seferinde tarla kapasitesine tamamlar.
- Kışlık ürünler hasat yılından önceki sonbaharda ekilir; ekim tarihi her yıl aynıdır.
- Bir ürünün üyedeki payı en çok 1/3; küçük pazarlı ürünlerin her biri kooperatif alanının en çok %25'i.
- Göreli verimi 0,35'in altındaki seçenekler güvenilmez sayılır ve varsayılan olarak planlamaya girmez.
- Toprak puanının ağırlıkları (60 baklagil, 40 çeşitlilik, %25 baklagil hedefi) takım varsayımıdır.
- Geçmişte denemede "sarı" eşiği: taahhüdün %90'ı.
- Kurgusal kooperatif: 80, 120, 200 ve 350 dekarlık dört üye, 200 mm kota, ağırlıklı mısır; 40 ton mısır taahhüdü (önerilen planın 20 yılın 18'inde tutturduğu değer).

## Kabul kontrolleri: gerçek sonuçlar (Karapınar)

`src/engine/__tests__/acceptance.test.ts`. Hedef bantlar proje tanımındandır; sayılar zorlanmadı. Testler 20 yılın ortalamasını banda karşı, tek tek yılları da "en az şu kadar yıl" diye sınar.

| kontrol | hedef | sonuç |
|---|---|---|
| Yıllık ET0 | yaklaşık 1140-1320 mm | ortalama 1241; aralık 1110-1337; 20 yılın 18'i bantta (2011: 1110, 2025: 1337) |
| Temmuz yağışı | birkaç mm | ortalama 4,3 mm; 20 yılın 19'unda 9 mm altı (2009: 26 mm) |
| Temmuz ET0 | 200 mm civarı | ortalama 215; aralık 190-231 |
| Mısır tam sulama, randıman 0,80 | 700-870 mm brüt | ortalama 801; aralık 683-866; 18'i bantta (2011: 691, 2015: 683) |
| 200 mm kota, tümü mısır: su bitiş | her yıl temmuzun ilk üç haftası | yağmurlama ve damlada 7-24 Temmuz; 19'u ilk üç haftada (2015: 24 Temmuz). Salmada (0,50) 27 Haziran – 15 Temmuz; 5 yılda haziran sonuna düşüyor |
| Susuz mısır göreli verimi | 0,1 altı | ortalama 0,05; en yüksek 0,16 (2015); 3-4 yıl 0,10-0,16 arasında |
| Susuz buğday göreli verimi | 0,4-0,6 | ortalama 0,53; aralık 0,41-0,83; yağışlı 2011 (0,83) ve 2015 (0,64) bandın üstünde |
| ET0 fonksiyonu | FAO-56 Örnek 18: 3,9 mm/gün | 3,8-3,95 aralığında (geçiyor); Örnek 8'deki Ra = 32,2 de tutuyor |

Bantların dışına düşen yıllar hata değil, yağışlı (2011, 2015) ve kurak-sıcak (2025) yıllardır. Ham sayıları görmek için:

```bash
PROBE=1 npx vitest run src/engine/__tests__/probe.test.ts --disable-console-intercept
```

Kurgusal kooperatifte taahhüt 40 ton mısırdır: önerilen plan bunu 20 yılın 18'inde tutturur. 45 ton ve üstünde taahhüt planı bağlar ve söz yalnız 10 yılda tutar; 247 tonun üstü bu su hakkı ve 1/3 kuralıyla hiç üretilemez.

## Bilinen sınırlar

- Gelir brüttür: tohum, gübre, ilaç, mazot, elektrik, işçilik, su ücreti ve yatırım maliyeti düşülmemiştir.
- İklim verisi yöre ölçeğindedir (yaklaşık 55 km); yerel yağış, don ve dolu görünmez. Yağış verisi istasyon ölçümü değildir.
- Ürün katsayıları, verimler ve fiyatlar doğrulanmamış varsayımlardır; sonuçlar doğrudan bunlara bağlıdır.
- Verim tepkisi tek katsayılıdır (sezonluk Ky); stresin hangi evrede geldiği ayrıca hesaba katılmaz. Çok az suda model güvenilir değildir.
- Kova modeli tek katmanlıdır: sabit kök derinliği, kılcal yükselme, tuzluluk, taban suyu, yüzey akışı ayrıntısı yoktur. Gerçek sulama takvimi ve su sırası modellenmez.
- Sıcaklık, don, hastalık ve ekim tarihi kayması verimi etkilemez.
- Fiyatlar sabittir; fiyat tahmini, pazar derinliği, şeker pancarı kotası ve sözleşme koşulları yoktur.
- Plan 20 yılın ortalama verimine göre kurulur; taahhüt tek tek yıllarda tutmayabilir (şerit bunu gösterir). Ayrılan su en kurak yıla göre tutulduğu için çoğu yıl bir kısmı kullanılmaz.
- Geçmiş 20 yıl geleceğin garantisi değildir.
- Nöbet tablosu şematiktir; ön bitki etkisi ve ekim-hasat çakışmaları hesaba katılmaz (ör. 17 Ekim'de sökülen pancarın ardından 20 Ekim'de buğday).
- Yeraltı suyu düzeyi ve kotanın kendisinin sürdürülebilirliği bu aracın kapsamı dışındadır.
- Arayüz yalnız Türkçedir. Tarayıcıdan NASA POWER çağrısı ağa ve servisin erişilebilirliğine bağlıdır; başarısız olursa araç bunu söyler ve hazır noktalarla devam eder.

## Veri kaynakları ve kanıt

```bash
npm run kanit
```

Veriyi NASA POWER'dan yeniden indirir, kayıtlı dosyalarla gün gün karşılaştırır, ET0'ı ve üç ana sayıyı baştan hesaplar, `docs/kanit-kayit.json` ile karşılaştırır. Ağ yoksa bunu yazar (çıkış kodu 2). Çıktıları: `docs/veri-kaniti.md` (tam döküm ve kanıt), `docs/kaynak-ozeti.html` (tek slayt), `src/data/kanit.json` (Yöntem sayfasındaki bölüm). Uygulamada: Yöntem ve kaynaklar → Veri kaynakları ve kanıt (adres sonuna `#yontem` yazınca doğrudan açılır).
