# Kararlar

Belirsiz kalan yerlerde verilen kararlar, her biri tek satır.

## Ortam
- Makinede Node.js yoktu: resmî nodejs.org paketi (v22.23.5, SHA-256 doğrulandı) yalnızca proje içine, `.tools/node` altına açıldı; sisteme kurulum yapılmadı, `.tools/` git dışında.
- Makinede git yoktu (Xcode komut satırı araçları kurulu değil): commit'ler isomorphic-git ile atıldı (`.tools/git/commit.mjs`); depo normal git ile okunur.
- Commit yazarı olarak yer tutucu ("Nöbet takımı") kullanıldı; gerçek ad/e-posta bilinmediği için uydurulmadı.
- LP çözücü: javascript-lp-solver 1.0.3 sorunsuz kuruldu ve tarayıcıda çalıştı; glpk.js'e gerek kalmadı.
- Grafikler Recharts yerine elle SVG: daha az bağımlılık, su bitiş işareti ve 20 yıllık bant üzerinde tam denetim.
- Harita için react-leaflet yerine doğrudan Leaflet; yalnız "Haritadan seç" açılınca yüklenir (ayrı parça).
- Vite `base: './'`: derleme çıktısı kök dizinde de alt dizinde de çalışır.
- Tailwind v4 kullanıldı; renkler CSS değişkeni, koyu tema hem OS ayarını hem düğmeyi izler.

## Veri
- Çivril koordinatı 38,30° K, 29,74° D olarak doğrulandı (ilçe merkezi yaklaşık 38°18′ K, 29°44′ D).
- Veri dosyaları ham POWER JSON'u değil, parametre başına gün dizisi olarak saklanır (dosya başına ~240 kB); -999 değerleri `null` yazılır, temizlik motorda yapılır.
- Eksik değer kuralı: yağışta 0; sıcaklıkta bir önceki gün; güneş, rüzgâr ya da nemde değer doldurulmaz, o gün ET0 Hargreaves ile hesaplanır (iki kural çelişince Hargreaves'e düşme kuralı öne alındı). İndirilen iki noktada eksik değer yok.
- Haritadan seçilen koordinat 0,01 dereceye yuvarlanır; IndexedDB önbellek anahtarı budur.
- NASA POWER tarayıcıdan çağrıya izin veriyor (Access-Control-Allow-Origin: *); yine de çağrı başarısız olursa hata ekranda söylenir ve son çalışan noktaya dönülür.
- Hasat yılları 2006-2025 (20 yıl); 2005 için de veri var ama tanımdaki aralık korundu.

## Motor
- Su yılı penceresi 1 Ekim (Y-1) – 31 Ekim (Y): şeker pancarı 10 Nisan + 190 gün ile 17 Ekim'de söküldüğü için pencere eylül sonunda kesilmedi.
- Ekim ayı 8 ve sonrası olan ürün "kışlık" sayılır ve hasat yılından önceki yıl ekilir.
- Hasattan sonra da tarla "boş" sayılır (günlük kayıp 0,2·ET0).
- Kota bir sulamaya tam yetmiyorsa kalan su verilir; o gün "su bitiş günü" sayılır (kotanın yetmediği ilk gün).
- Bugünkü ekimde bütün parseller ortak kotadan ihtiyaç duydukça çeker (ilk isteyen alır); önerilen planda her parselin kendi su tavanı vardır.
- Ks her gün uygulanır (yalnız kota bitince değil): S eşiğin altındaysa stres vardır.
- ETa, topraktaki sudan fazla olamaz (S eksiye düşmez).
- TmaxK = Tmax + 273,16 (FAO-56).
- "Tam" su seviyesinde tavan yoktur; tavanı 20 yılın hiçbirinde bağlamayan sayısal seviyeler "tam" ile aynı olduğu için listeden çıkarılır.
- Uyarı kuralı (0,35) 20 yılın ortalama göreli verimine uygulanır.
- Su-verim eğrileri sulama randımanına bağlı olduğu için üç yöntemin her biri için ayrı hesaplanır ve bellekte tutulur.

## Planlama
- LP'de bir seçeneğin su katsayısı, o seçeneğin 20 yıldaki en yüksek kullanımıdır ("ayrılan su"): böylece plan hiçbir yıl kotayı aşmaz; bedeli, çoğu yıl suyun bir kısmının kullanılmamasıdır.
- LP'ye su ve gelir getirmeyen bir "nadas" etkinliği eklendi: alan eşitliği her zaman sağlanabilsin diye.
- Taahhüt karşılanamıyorsa plan "bulunamadı" denip bırakılmaz: önce taahhüdün karşılanabilen en yüksek ortak oranı çözülür, plan o düzeye göre kurulur ve ekranda açıkça söylenir.
- Karşılanamayan taahhüt için üç seçenek ve bedeli hesaplanır: taahhüdü indirmek, ürün payı sınırını gevşetmek, kotaları artırmak (ikili arama ile en küçük yeterli değer).
- "En az su" modu iki adımlıdır: önce en az su, sonra o su ile en yüksek gelir (aksi halde susuz seçenekler arasında keyfî seçim olurdu).
- Küçük pazar eşiği varsayılan olarak açık ve ürün başına kooperatif alanının %25'i.
- Geçmişte denemede sarı = en zayıf taahhütlü ürün taahhüdün %90'ı ile %100'ü arasında; kırmızı = %90'ın altı.
- Toprak puanı: 60 × min(1, baklagil payı/0,25) + 40 × min(1, (etkin ürün sayısı − 1)/2); nadas ayrı ürün sayılır. Ağırlıklar takım varsayımıdır.
- Nöbet tablosu: tarla üç eş parsel, desen her yıl bir parsel kayar; her yıl aynı ürün karışımı ekilir.
- Varsayılan 300 ton mısır taahhüdü Karapınar'da bu kota ve 1/3 kuralıyla karşılanamıyor (en çok ~247 ton); sayı değiştirilmedi, açılış ekranı bunu olduğu gibi gösterir.

## Arayüz
- "Su bitiş tarihi" büyük sayısı 20 yılın ortancasıdır; yanında en erken ve en geç tarih ile kotanın kaç yıl bittiği yazar.
- Grafik 1 Mart – 31 Ekim arasını gösterir (kümülatif değer 1 Ekim'den başlar); y ekseni iki panelde ortaktır.
- Önerilen plan kooperatif düzeyinde tek LP ile çözülür; üye ekranındaki öneri o çözümün üyeye düşen dilimidir.
- Kurgusal üyelere kişi adı uydurulmadı: "Üye 1 (kurgusal)" … "Üye 4 (kurgusal)".
- Kullanıcının değişiklikleri localStorage'da saklanır; "Kurgusal örneğe dön" düğmesi başlangıca döndürür.
- Sayı girişlerinde binlik ayırıcı yok; virgül de nokta da ondalık kabul edilir.
- Ürün tablosunda ad, baklagil ve küçük pazar işaretleri sabit; ekim tarihi, evre süreleri, Kc, Ky, verim ve fiyat değiştirilebilir.
- Karşılama sayfası ve elle çizilmiş SVG manzara kaldırıldı: istenen şey bir açılış sayfası değil, panelin kendisinin estetik olmasıydı.
- Tasarım dili kullanıcının kendi iki projesinden (shopify ve creator.rusk.agency panelleri) alındı: koyu, daraltılabilir kenar menü; açık gri zemin; ince gölgeli beyaz kartlar; 13 px Inter; KPI kartları, hap seçiciler, bölmeli seçici, etiket çipleri ve bantlar. Kod kopyalanmadı, yalnız görsel dil uyarlandı.
- İkonlar için lucide-react eklendi; Inter yazı tipi Google Fonts'tan yüklenir (çevrimdışıyken sistem yazı tipine düşer).
- Su bitiş tarihi kartın içindeki en büyük sayı olarak kaldı ama panel ölçeğine indirildi (34 px); ayrıca her ekranın başına dört KPI kartı geldi.
- Nokta seçici ve tema düğmesi kenar menüye taşındı; "Veri kaynağı" satırı NASA POWER yükleme durumunu gösterir.
- Dürüstlük notları (kurgusal, brüt gelir, 55 km) her ekranın başında mavi bantta ve sayfa altında durur.
- Ekranlar su bütçesi etrafında yeniden kuruldu: önde kota, tam sulama ihtiyacı, karşılanan kısım, su bitiş tarihi ve verim düzeyi var; brüt gelir öne çıkan bir gösterge değil, panelin altında tek bir sonuç satırı.
- Üst sıradaki kartlar "bugünkü ekim → önerilen plan" biçiminde: su bitiş tarihi, karşılanan su ihtiyacı, ortalama verim düzeyi, toprak puanı.
- "Verim düzeyi" = alan ağırlıklı ortalama göreli verim (tam sulu verimin yüzdesi); "karşılanan su ihtiyacı" = kullanılan su ÷ tam sulama ihtiyacı (20 yıl ort.).
- Üye bilgileri sayfanın başındaki büyük form yerine sağdan açılan çekmecede düzenlenir; Kooperatif'teki üye tablosu salt okunurdur.
- Yerel seçici, confirm() kutusu ve title ipuçları yerine Radix tabanlı bileşenler (seçici, çekmece, onay penceresi, ipucu) kullanıldı.
- Tablo başlıklarında kaynak etiketi zeminli çip değil, başlığın altında küçük renkli yazıdır (başlıklar şişmesin diye); anlamı aynı.
- Yıl yıl grafik artık geliri değil, su ihtiyacının karşılanan kısmını gösterir.
- Her ekranın başına düz Türkçe "Kısaca" özeti eklendi ve terimler sadeleştirildi (kota → su hakkı, tam sulama ihtiyacı → ürünlerin istediği su, verim düzeyi → alınan ürün, taahhüt → satış sözü): ekran, ziraat terimlerini bilmeyen birine de okunabilsin diye.
- Örnek kooperatifin mısır taahhüdü 300 tondan 40 tona çekildi. Hesap (Karapınar, gelir amaçlı plan): 30 ton ve altında söz 20 yılın 20'sinde, 40 tonda 18'inde tutuyor; 45 ton ve üstünde taahhüt planı bağlıyor ve plan ortalama verime göre kurulduğu için söz yalnız 10 yılda tutuyor (kalan yılların çoğu %90-100 arası). 40 ton, 20 yılın çoğunda tutan en yüksek yuvarlak değer. Daha yüksek bir taahhüdün çoğu yıl tutması için plana güvenlik payı eklemek gerekir; bu yapılmadı.
- Üye ekranı sadeleştirildi: en üstte tek karşılaştırma şeridi (bugünkü brüt gelir ve su bitiş tarihi → önerideki), üç cümlelik özet, iki sade panel (iki çizgili grafik, ürün başına ton ve TL). Su bütçesi çubukları, parsel parsel su, yıl yıl grafik ve toprak puanı formülü kapalı "Ayrıntılar" bölümünde.
- Grafikte varsayılan olarak yalnız verilen su ve su hakkı çizilir, y ekseni su hakkının 1,5 katıdır; "Ayrıntıyı göster" 20 yılın çizgilerini ve ürünlerin istediği suyu açar (eksen o zaman ihtiyaca göre büyür).
- "Nohutlu plan": her üyenin tarlasında en az %20 baklagil kısıtıyla ikinci bir LP çözümü. Üyenin gelir planında hiç baklagil yoksa iki plan gelir ve toprak puanıyla yan yana gösterilir; seçim kooperatifin tamamına uygulanır (plan tek LP olduğu için). Bunun için motora isteğe bağlı tek bir kısıt eklendi; varsayılan davranış değişmedi.
- Nokta seçimi artık saklanmaz: uygulama her açılışta Karapınar (37,72° K, 33,55° D) ile başlar. Saklanan durumun anahtarı v2 oldu; eski kayıtlar (300 tonluk taahhüt dahil) yok sayılır.
- "Su yetiyor" ifadesi her yerde "Su hakkı aşılmıyor" oldu: su, ürünlerin istediği kadar değil; yalnızca hak aşılmıyor.
- Şeker pancarı öneri kümesinden çıkarıldı: yalnız "pancar sözleşmesi var" işaretli üyeye ve yalnız tam sulama seviyesinde seçilebilir. Gerekçe: bölgenin en çok su isteyen ürünü ve doğrusal verim modeli az suda pancar için güvenilir değil.
- Genel kural eklendi: sulanan bir seçenek, o ürünün tam su ihtiyacının (20 yıl ort.) en az %60'ını almalı; altı plana girmez. Ürün ya yeterince sulanır, ya yağmura bırakılır, ya ekilmez. Eşik "Plan kuralları"ndan değiştirilebilir.
- Kurgusal Üye 3 bugün pancar ektiği için "sözleşmesi var" sayıldı; öbür üç üyede sözleşme yok.
- Düzeltmeden sonra Üye 1: bugün 333 bin TL → öneri 524 bin TL (+%57; düzeltmeden önce 602 bin TL, +%81). Kooperatif önerilen brüt gelir 6,85 → 5,99 milyon TL.
- 40 tonluk mısır taahhüdü artık planı zorlamıyor: pancar çıkınca plan zaten ortalama 164 ton mısır üretiyor, söz 20 yılın 20'sinde tutuyor. Değer değiştirilmedi.
- Saklanan durumun anahtarı v3 oldu (üyeye sözleşme alanı eklendi).
- Uygulama artık "Genel bakış" ile açılır; menü sırası Genel bakış, Üyeler, Taahhüt, Yöntem. Eski Kooperatif ekranı kaldırıldı: üye ekleme/düzenleme Genel bakış'ta, plan kuralları Taahhüt ekranında, ürün başına tablo ve fiyat riski Genel bakış'ın kapalı "Ayrıntılar" bölümünde.
- Haritadaki NASA POWER hücresi, 0,5° x 0,625° ızgarada noktaya en yakın merkezin çevresi olarak çizilir (merkezler bu adımların katı varsayıldı); "yaklaşık" diye etiketlidir, POWER'ın gerçek hücre sınırı API'den okunmuyor.
- NASA GIBS MODIS Terra gerçek renk katmanı ilk denemede çalıştı (WMTS, EPSG:3857, tarayıcıdan erişime açık) ve üçüncü altlık olarak eklendi. Sabit bir gün gösterilir (15.07.2025); en çok 9. yakınlaştırma düzeyine kadar keskindir.
- "Uydu" altlığı Esri World Imagery karolarıdır (anahtarsız, atıflı).
- Yıllık yağış grafiği 2005-2025'i gösterir (veri 1 Ekim 2004'te başladığı için ilk tam yıl 2005); ortalamalar 2006-2025 hasat yıllarıyla aynı dönemden. Eğilim en küçük kareler doğrusudur; anlamlılığı sınanmadı ve ekranda öyle yazıyor.
- "35 °C üstü gün": temmuz-ağustosta günlük en yüksek sıcaklığı (T2M_MAX) 35 °C'yi aşan gün sayısı; son yıl 2025.
- Genel bakış'taki taahhüt şeridi, Taahhüt ekranındakiyle aynı üç durumu kullanır (yeşil tuttu, sarı %90-100, kırmızı altı).
- Açılış sayfası harita merkezli kooperatif panosuna çevrildi: solda harita (üç görünüm: Bugün, Gelişigüzel dağıtım, Planlı dağıtım), sağda taahhüt paneli, altı sayılık karşılaştırma ve dağıtım tablosu. Önceki "Genel bakış" içeriğinden iklim kartı kaldı (hücreye tıklayınca açılır); büyük sayılar ve üye tablosu yerini karşılaştırmaya ve dağıtım tablosuna bıraktı.
- Kurgusal kooperatif artık 50 üye, beş ilçe (Karapınar, Çumra, Ereğli, Cihanbeyli, Altınekin; ilçe başına 10 üye), adı "Konya Ovası Örnek Kooperatifi". Üyeler sabit tohumla (2026) üretilir; ad yerine "Üye 01"… kullanıldı. Taahhüt yeniden 300 ton mısır.
- Beş ilçe yalnızca üç NASA POWER hücresine düşüyor: Karapınar ile Ereğli aynı hücrede, Cihanbeyli ile Altınekin aynı hücrede; indirilen veriler gün gün birebir aynı. Beş dosya da duruyor ama üç farklı hava var. Haritada hücreler birleştirilip ilçe adlarıyla etiketlendi ve bu durum ekranda yazıyor.
- Üyenin haritadaki konumu, havasıyla hesaplandığı hücrenin içinde tutulur (ilçe merkezi ile hücre merkezi arasına dağıtılır).
- Gelişigüzel dağıtım: üyeler sabit tohumla karıştırılır; tam verim varsayımıyla hesaplanan üretim sözü geçene dek sıradaki üyenin bütün tarlası sözleşme ürününe ayrılır. Söz yalnız bu görevlendirilen üyelerin teslimatıyla ölçülür; öbür üyeler bugünkü ekimini sürdürür (gelir ve su toplamına onlar da girer).
- Planlı dağıtımda "ürünü eken üye" ve "teslim", planın o üründen ürettiğinin tamamıdır. Plan geliri en yükseğe çıkardığı için sözden çok fazlasını üretebilir (300 tonluk sözde ortalama 2.844 ton mısır); iki sütun bu yüzden tam aynı şeyi ölçmüyor ve ekranda not edildi.
- Çözüm süresi: 50 üyeyle iki plan (gelir planı ve nohutlu plan) 24-49 ms, bütün değerlendirmeyle 75-95 ms (Node, test ortamı). 3 saniye sınırının çok altında; su seviyesi sayısı azaltılmadı, ilçe ilçe çözüme gerek kalmadı.
- Nokta seçici "seçili ilçe"ye dönüştü (iklim kartı, Yöntem ekranı ve yeni üyenin ilçesi için). Haritadan serbest nokta seçme ve Çivril seçeneği kaldırıldı: hesap artık üyenin ilçesine bağlı, tek bir seçili noktaya değil. Çivril veri dosyası ve indirme betiğindeki satırı duruyor.
- Taahhüt panelinde tek ürün girilir; "Dağıt" düğmesine basılana kadar hesap değişmez. Alıcı adı serbest metindir ve hiçbir hesaba girmez.
- Yakınlaşınca (12. düzey ve üstü) daireler yerine gerçek alanında bir kare çizilir, ürün paylarına göre şeritlere bölünür; tarlanın biçimi ve konumu kurgusaldır.
- Saklanan durumun anahtarı v6 oldu.
- "Söz vermeden önce" bölümü eklendi. "Güvenle söz verilebilecek miktar": plan (alanlar ve su tavanları sabit) 2006-2025'in her yılında o yılın havasıyla çalıştırılır; yılların en az K'sinde ulaşılan üretim alınır (büyükten küçüğe sıralanınca K. değer). K varsayılan 16; 14, 16, 18 seçilebilir.
- "Yalnız [ürün]" senaryosu: o üründen en çok üretimi veren plan (kalan alan ve su gelire göre doldurulur). Panelde seçili ürüne göre hesaplanır; varsayılan mısır. "Karma" senaryosu: taahhüt yokken geliri en yükseğe çıkaran plan; her ürünün miktarı aynı planın o yıl dağılımından gelir, yani hepsi aynı anda verilebilir.
- Yazılan söz miktarı için "20 yılın N'inde tutar" sayısı "yalnız [ürün]" planına göre hesaplanır: kooperatif o ürüne öncelik verseydi kaç yıl tutardı. Böylece N eşiğin altına düştüğü an ile "en çok X ton" uyarısı aynı sınırda buluşur. "Dağıt" ise geliri en yükseğe çıkaran planı kurar; söz üst sınıra yakınsa o plan daha az yılda tutabilir (plan ortalama verime göre kurulduğu için). Bu fark ekranda not edildi; plana güvenlik payı eklenmedi.
- Kırmızı mercimek ürün tablosuna eklendi (baklagil; kışlık ekim 1 Kasım; evreler 120, 40, 35, 20 gün; Kc 0,40/1,10/0,30; Ky 1,00; tam sulu verim 180 kg/da; fiyat 45.000 TL/ton). HEPSİ takım varsayımıdır, proje tanımında yoktu, verified:false. Konya'da kışlık kırmızı mercimeğin yetişip yetişmediği de doğrulanmadı.
- Mercimeğin etkisi büyük: bu varsayımlarla plan tarlaların üçte birine (3.061 da) susuz mercimek koyuyor, nohut ve arpayı itiyor ve kooperatif brüt gelirini 79,97 → 84,72 milyon TL'ye çıkarıyor. Bu artış doğrulanmamış tek bir fiyat/verim çiftine dayanıyor.
- Karma senaryoda nohut ve ayçiçeğinin yanındaki "Türkiye'nin ithal ettiği ürün" notu istendiği gibi rakamsız yazıldı; bir kaynakla doğrulanmadı ve ekranda öyle belirtiliyor.
- Saklanan durumun anahtarı v7 oldu (ürün tablosu değişti).
- Karşılaştırma mantığı düzeltildi: üç senaryo (bugün, gelişigüzel, planlı) aynı ölçüyle ölçülür. "Söz tutuyor mu", her senaryoda kooperatifin o üründeki TOPLAM üretimine bakar. Pano ve Taahhüt sayfası aynı kaynağı (model.scenarios) okur; ayrı hesap kalmadı.
- Varsayılan söz hesaptan gelir: planlı dağıtımda 20 yılın en az 16'sında tutan en yüksek mısır miktarı, 10 tona aşağı yuvarlanmış = 2.770 ton. Bir test sabiti hesaba bağlar; varsayımlar değişirse test kırılır. Arama, taahhütsüz gelir planının 16. en iyi yılından başlayıp en yüksek üretime kadar ara noktaları dener; daha büyük tutan değer çıkmadı (32 adımla da aynı).
- Aynı sözle sonuç: bugünkü ekim 20 yılın 2'sinde, gelişigüzel dağıtım 8'inde, planlı dağıtım 16'sında tutuyor. Gelişigüzel dağıtım söz ölçüsünde beklenenden iyi çıktı (ortalama 2.700 ton), çünkü görevlendirilmeyen üyeler de bugün zaten mısır ekiyor; sayı olduğu gibi gösteriliyor.
- Panonun üstünde üç büyük sayı var (bugün → planlı): kooperatif brüt geliri, suyu sezon ortasında biten üye, güvenle verilebilecek söz. "Eken üye" satırı kaldırıldı.
- Kırmızı mercimek varsayılan olarak öneri kümesinin dışında (değerleri doğrulanmadı); Plan kurallarındaki "Kırmızı mercimeği dahil et" kutusuyla açılır. Küçük pazar eşiği mercimeğe de uygulanır.
- Taahhüt sayfasındaki dağıtım tablosu ilçe toplamlarıyla açılır (5 satır), ilçeye tıklayınca üyeleri görünür; kooperatif toplamı en üst satırdadır.
- "En kötü yıl" satırında yüzde yalnız sözün altında kalındığında gösterilir.
- Haritada hücre etiketi hücrenin ekrandaki genişliğiyle sınırlanır; dar olunca yalnız ilçe adları yazar.
- Saklanan durumun anahtarı v10 oldu.
- Miktar kutusunun altındaki "20 yılın N'inde tutar" mesajı yanlış planı ölçüyordu: kooperatif o ürüne öncelik verseydi kurulacak "yalnız [ürün]" planını. Karşılaştırma tablosu ve yıl şeridi ise "Dağıt"ın kurduğu planı ölçüyordu; bu yüzden aynı söz için biri 20, öbürü 16 diyordu. Mesaj artık "Dağıt"ın kuracağı planı aynı fonksiyonla (plannedOutcome / heldYears) ölçer; "en çok X ton" uyarısı da planlı dağıtımdaki güvenli miktarı gösterir. "Yalnız [ürün]" kutusu ayrı bir senaryo olarak kaldı.
- Panoda dağıtım tablosu ve yıl şeridi haritanın altına (sol sütun) taşındı; harita 470 px, tablo en çok 188 px yüksekliğinde kaydırılır. 1440 px genişlikte iki sütun 1.026 ve 963 px'de bitiyor.
- Sağ paneldeki uzun açıklamalar tek cümleye indi; ayrıntı Yöntem sayfasındaki "7. Panodaki söz hesabı ve üç dağıtım" bölümüne taşındı ve "Nasıl hesaplandı?" bağlantısı oraya gider.
- Pano'daki dağıtım tablosu varsayılan olarak ilk 5 üyeyi tam gösterir; "N üyenin tümünü göster" düğmesiyle açılınca en çok 400 px yükseklikte kendi içinde kayar, başlık satırı sabit kalır; yıl şeridi düğmenin altındadır. Sonuç: sol sütun sağdan yaklaşık 225 px uzun (1.189 ve 963 px); önceki "iki sütun aynı boyda" dengesi bu istek için bozuldu, yeniden ayarlanmadı.
- Haritada NASA hücre etiketleri dikdörtgenin dışında, sol üst köşesinin hemen üstünde; beyaz yarı saydam kutuda; üye dairelerinin üstündeki ayrı bir katmanda (z-index 640). Metin hep tam yazılır. Köşe görünümün dışına çıkarsa etiket, hücre görünür kaldıkça haritanın içinde tutulur; hücre hiç görünmüyorsa etiket çizilmez. Etiketler birbirine binmesin diye en uzak yakınlaştırma 7,5 ile sınırlandı. Yer açmak için altlık seçici haritanın dışına (üstüne), yakınlaştırma düğmeleri sağ üste alındı.
- "En küçük parsel" kuralı eklendi: bir üyede bir ürün ya en az 10 dekar ekilir ya hiç ekilmez; tarlası 60 dekardan küçük üyede eşik 5 dekar. Plan kurallarında tek bir sayı olarak ayarlanır; küçük tarlalarda bu sayının yarısı uygulanır (iki ayrı ayar yerine). 0 kuralı kapatır.
- Kural tam sayılı değişkenle değil yinelemeli uygulanır: plan çözülür, eşiğin altında kalan (üye, ürün) çiftleri yasaklanıp yeniden çözülür, en çok 5 tur. Aynı ürünün farklı su seviyeleri tek parsel sayılır. Kural solvePlan'ın içinde olduğu için üye önerisi, planlı dağıtım, nohutlu plan ve "söz vermeden önce" hesabının hepsinde geçerlidir.
- Tur sınırı dolunca kalan eşik altı parça, su hakkını aşmayan en büyük parsele katılır (hiçbiri uymuyorsa nadasa). Varsayılan kooperatifte bu son çareye hiç gerek kalmadı (birleştirilen parça: 0).
- Ürün payı sınırı eşikten küçük olan çok küçük tarlalarda eşik o sınıra iner; aksi halde üyeye hiçbir ürün ekilemezdi.
- Nöbet tablosu: dilim sınırında bölünen bir ürünün parçaları da eşiğin altında kalmasın diye ürünlerin şeritteki sırası aranır (en küçük parçası en büyük olan sıra). Hiçbir sıra yetmezse kalan parça aynı dilimdeki en büyük komşuya katılır ve tabloda not düşülür. Varsayılan kooperatifte 50 üyenin hiçbirinde bu gerekmedi.
- Kuralın etkisi (öncesi → sonrası): kooperatif brüt geliri 79,97 → 79,67 milyon TL; güvenle verilebilecek mısır sözü 2.770 → 2.690 ton; eşik altı parsel 18 → 0; toplam çözüm süresi 272 → 735 ms (Node, test ortamı).
- Varsayılan söz hesaba bağlı olduğu için 2.770 → 2.690 ton oldu; planlı dağıtım bu sözü yine 20 yılın 16'sında tutuyor. Saklanan durumun anahtarı v11.

## gercek-veri dalı (15.11.2026)

- Bu dal ana dala birleştirilmedi; karar kullanıcıda.
- Kural: bir değer ancak kaynağının sayfası bu oturumda açılıp içinde görüldüyse "kaynak" sayıldı. Kayıtlar src/data/sources.json'da (değer, birim, kaynak, URL, tablo, erişim tarihi, geçtiği ifade).
- Doğrulanan ve mevcut değerle aynı çıkanlar (FAO-56): mısır ve ayçiçeği evre süreleri (Tablo 11); yedi ürünün Kc değerleri (Tablo 12); mısır, kışlık buğday, ayçiçeği ve şeker pancarı Ky değerleri (Tablo 24, FAO 33'ten). Üç Kc değeri tabloda aralık olarak verilir ve mevcut değer aralığın içindedir (mısır Kc son, buğday Kc son, ayçiçeği Kc orta).
- Değişen değerler: şeker pancarı evre süreleri 30/45/80/35 → 50/40/50/40 gün (FAO-56 Tablo 11, nisan ekimi, Idaho); kırmızı mercimek evre süreleri 120/40/35/20 → 25/35/70/40 gün (Tablo 11, ekim-kasım ekimi, kurak bölge). Tabloda pancar için yedi satır var; nisan ekimli karasal iklim satırı seçildi (seçim bir yargıdır).
- Kışlık buğday, kışlık arpa ve nohut evre süreleri DEĞİŞTİRİLMEDİ: Tablo 11'de donlu karasal iklime uyan satır yok (dipnot donlu iklimde sürelerin uzadığını söylüyor), nohut satırı hiç yok. Varsayım olarak kaldılar.
- Fiyat: buğday 16.500 ve arpa 12.750 TL/ton, 2026 TMO alım fiyatı olarak bir haber sayfasında (CNBC-e) görüldü; mevcut değerlerle aynı. TMO'nun kendi duyuru sayfası açılmadı; kaynak kaydında bu belirtildi.
- Alınamayanlar: TAGEM/DSİ bitki su tüketimi rehberi, TÜİK ilçe ekim alanı ve verimleri, kalan beş ürünün fiyatı, su tahsis miktarı ve baklagil desteği. Bu yüzden istenen iki karşılaştırma tablosu (su tüketimi, verim) kurulamadı ve kurgusal üyelerin ekim deseni TÜİK oranlarına göre yeniden üretilmedi.
- Toprak: ISRIC SoilGrids beş noktadan yalnız Cihanbeyli'de veri döndürdü (Karapınar ve Çumra boş, Ereğli ve Altınekin zaman aşımı). Tek noktayla ilçe bazlı toprak uygulanmadı; sabit 130 mm kaldı. Cihanbeyli'nin su tutma katmanlarından (33 ve 1500 kPa, 0-100 cm) yaklaşık 50 mm çıkıyor; birim dönüşümü (0,1 hacim %) varsayılarak hesaplandı.
- Varsayılan söz hesaba bağlı olduğu için 2.690 → 2.630 ton oldu (pancar evre süresi değişince plan değişti). Bu, bir kabul kontrolünün gevşetilmesi değil; sabiti hesaba eşitleyen test bunu zorunlu kılıyor. Kabul kontrollerinin hiçbiri bozulmadı.
- Arayüz: Yöntem sayfasındaki ürün tablosunda her hücrenin altında "kaynak" (tıklanınca kaynak adı, tablo, ifade ve bağlantı) ya da "varsayım" etiketi var; değer elle değiştirilirse etiket varsayıma döner. "Doğrulama" bölümü eklendi. Harita bileşeninde, sayfa hızla değişince konsola düşen bir zamanlayıcı hatası giderildi. Saklanan durumun anahtarı v12.
