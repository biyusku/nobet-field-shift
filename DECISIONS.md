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
- Sonradan istenen görsele göre karşılama sayfası eklendi (ortalanmış başlık, tek düğme, elle çizilmiş SVG tarla manzarası); ilk tanımdaki "süslü hero yok" kuralı bu istekle değişti. Rozetteki "500+ ajans" gibi bir sosyal kanıt uydurulmadı; yerine veri kaynağı yazıldı.
- Karşılama manzarası iki temada da gündüzdür; koyu temada yalnız çevresi kararır.
