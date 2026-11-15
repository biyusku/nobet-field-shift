# Nöbet: veri kaynakları ve kanıt

Bu dosya `npm run kanit` ile üretilir (son çalıştırma: 2026-11-15T13:15:06.842Z). Elle düzenlenmez; aynı içerik uygulamanın "Yöntem ve kaynaklar" sayfasındaki "Veri kaynakları ve kanıt" bölümünde süzülebilir tablo olarak durur.

## 1. Dürüst özet

| Sınıf | Girdi sayısı | Ne demek |
|---|---:|---|
| NASA verisi | 7 | NASA POWER'dan indirilen günlük seri ya da değer |
| Kaynaklı | 17 | src/data/sources.json'da kaydı olan; sayfası bu projede açılıp içinde görülen değer |
| Varsayım | 48 | Kaynağı bulunamamış; takımın seçtiği değer |
| Kurgusal | 12 | Kooperatif, üyeler, tarlalar, su hakları, alıcı: gerçek değil |
| Toplam | 84 | |

Sayım, aşağıdaki dökümün satırlarıdır. Bir satır tek bir sayı da olabilir, bir dizi de (ör. bir ürünün üç Kc değeri tek satır; bir NASA parametresinin 5 ilçe × 7.762 günlük serisi tek satır). Bu yüzden sayılar "girdi kalemi" sayısıdır, ağırlık ya da önem ölçüsü değildir.

**Üç ana sayı neye dayanır:** Üç ana sayının üçü de dört sınıfın hepsine dayanır: hava NASA verisidir; Kc, bazı evre süreleri ve Ky kaynaklıdır; verimler, kalan evre süreleri ve ekim tarihleri, toprak, randıman ve plan kuralları varsayımdır; üyeler, tarlalar ve su hakları kurgusaldır. Brüt gelir ayrıca fiyatlara dayanır (yedi fiyattan ikisi kaynaklı, beşi varsayım); suyu biten üye sayısı ve mısır sözü fiyatlara yalnızca planın ürün seçimi üzerinden bağlıdır.

## 2. Girdi dökümü

### NASA verisi (7)

| Girdi | Değer | Birim | Kaynak | Tablo / sayfa |
|---|---|---|---|---|
| Günlük en yüksek sıcaklık (2 m) · T2M_MAX | 5 ilçe × 7.762 gün | °C | [NASA POWER Daily API (community=AG), NASA Langley Research Center](https://power.larc.nasa.gov/api/temporal/daily/point) | parametre T2M_MAX |
| Günlük en düşük sıcaklık (2 m) · T2M_MIN | 5 ilçe × 7.762 gün | °C | [NASA POWER Daily API (community=AG), NASA Langley Research Center](https://power.larc.nasa.gov/api/temporal/daily/point) | parametre T2M_MIN |
| Günlük yağış (düzeltilmiş) · PRECTOTCORR | 5 ilçe × 7.762 gün | mm/gün | [NASA POWER Daily API (community=AG), NASA Langley Research Center](https://power.larc.nasa.gov/api/temporal/daily/point) | parametre PRECTOTCORR |
| Yüzeye gelen güneş radyasyonu · ALLSKY_SFC_SW_DWN | 5 ilçe × 7.762 gün | MJ/m²/gün | [NASA POWER Daily API (community=AG), NASA Langley Research Center](https://power.larc.nasa.gov/api/temporal/daily/point) | parametre ALLSKY_SFC_SW_DWN |
| Rüzgâr hızı (2 m) · WS2M | 5 ilçe × 7.762 gün | m/s | [NASA POWER Daily API (community=AG), NASA Langley Research Center](https://power.larc.nasa.gov/api/temporal/daily/point) | parametre WS2M |
| Bağıl nem (2 m) · RH2M | 5 ilçe × 7.762 gün | % | [NASA POWER Daily API (community=AG), NASA Langley Research Center](https://power.larc.nasa.gov/api/temporal/daily/point) | parametre RH2M |
| Rakım (POWER ızgara hücresi) | Karapınar 1.236 · Çumra 1.198 · Ereğli 1.236 · Cihanbeyli 973 · Altınekin 973 | m | [NASA POWER Daily API (community=AG), NASA Langley Research Center](https://power.larc.nasa.gov/api/temporal/daily/point) | yanıtta geometry.coordinates[2] |

### Kaynaklı (17)

| Girdi | Değer | Birim | Kaynak | Tablo / sayfa |
|---|---|---|---|---|
| Mısır: evre süreleri (baş, gelişme, orta, son) | 30 / 40 / 50 / 30 | gün | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 11 |
| Mısır: Kc (baş, orta, son) | 0,3 / 1,2 / 0,5 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 12 |
| Mısır: Ky (verim tepki katsayısı) | 1,25 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8](https://www.fao.org/4/x0490e/x0490e0e.htm) | Tablo 24 (FAO 33'ten) |
| Şeker pancarı: evre süreleri (baş, gelişme, orta, son) | 50 / 40 / 50 / 40 | gün | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 11 |
| Şeker pancarı: Kc (baş, orta, son) | 0,35 / 1,2 / 0,7 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 12 |
| Şeker pancarı: Ky (verim tepki katsayısı) | 1 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8](https://www.fao.org/4/x0490e/x0490e0e.htm) | Tablo 24 (FAO 33'ten) |
| Ayçiçeği: evre süreleri (baş, gelişme, orta, son) | 25 / 35 / 45 / 25 | gün | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 11 |
| Ayçiçeği: Kc (baş, orta, son) | 0,35 / 1,1 / 0,35 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 12 |
| Ayçiçeği: Ky (verim tepki katsayısı) | 0,95 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8](https://www.fao.org/4/x0490e/x0490e0e.htm) | Tablo 24 (FAO 33'ten) |
| Buğday (kışlık): Kc (baş, orta, son) | 0,4 / 1,15 / 0,3 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 12 |
| Buğday (kışlık): Ky (verim tepki katsayısı) | 1,05 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8](https://www.fao.org/4/x0490e/x0490e0e.htm) | Tablo 24 (FAO 33'ten) |
| Buğday (kışlık): fiyat | 16.500 | TL/ton | [CNBC-e haberi: TMO 2026 hububat alım fiyatlarını açıkladı (TMO açıklamasını aktarır; TMO'nun kendi sayfası değil)](https://www.cnbce.com/haberler/tmo-2026-hububat-alim-fiyatlarini-acikladi-h30887) | haber metni |
| Arpa (kışlık): Kc (baş, orta, son) | 0,3 / 1,15 / 0,25 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 12 |
| Arpa (kışlık): fiyat | 12.750 | TL/ton | [CNBC-e haberi: TMO 2026 hububat alım fiyatlarını açıkladı (TMO açıklamasını aktarır; TMO'nun kendi sayfası değil)](https://www.cnbce.com/haberler/tmo-2026-hububat-alim-fiyatlarini-acikladi-h30887) | haber metni |
| Nohut: Kc (baş, orta, son) | 0,4 / 1 / 0,35 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 12 |
| Kırmızı mercimek: evre süreleri (baş, gelişme, orta, son) | 25 / 35 / 70 / 40 | gün | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 11 |
| Kırmızı mercimek: Kc (baş, orta, son) | 0,4 / 1,1 / 0,3 | - | [FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6](https://www.fao.org/4/x0490e/x0490e0b.htm) | Tablo 12 |

### Varsayım (48)

| Girdi | Değer | Birim | Kaynak | Tablo / sayfa |
|---|---|---|---|---|
| Mısır: ekim tarihi | 1.5 | gün.ay | – | – |
| Mısır: tam sulu verim | 1.265 | kg/da | – | – |
| Mısır: fiyat | 15.025 | TL/ton | – | – |
| Şeker pancarı: ekim tarihi | 10.4 | gün.ay | – | – |
| Şeker pancarı: tam sulu verim | 7.000 | kg/da | – | – |
| Şeker pancarı: fiyat | 3.720 | TL/ton | – | – |
| Ayçiçeği: ekim tarihi | 1.5 | gün.ay | – | – |
| Ayçiçeği: tam sulu verim | 350 | kg/da | – | – |
| Ayçiçeği: fiyat | 34.250 | TL/ton | – | – |
| Buğday (kışlık): ekim tarihi | 20.10 | gün.ay | – | – |
| Buğday (kışlık): evre süreleri (baş, gelişme, orta, son) | 146 / 47 / 40 / 25 | gün | – | – |
| Buğday (kışlık): tam sulu verim | 550 | kg/da | – | – |
| Arpa (kışlık): ekim tarihi | 20.10 | gün.ay | – | – |
| Arpa (kışlık): evre süreleri (baş, gelişme, orta, son) | 141 / 42 / 35 / 25 | gün | – | – |
| Arpa (kışlık): Ky (verim tepki katsayısı) | 1 | - | – | – |
| Arpa (kışlık): tam sulu verim | 500 | kg/da | – | – |
| Nohut: ekim tarihi | 20.3 | gün.ay | – | – |
| Nohut: evre süreleri (baş, gelişme, orta, son) | 25 / 30 / 35 / 20 | gün | – | – |
| Nohut: Ky (verim tepki katsayısı) | 1 | - | – | – |
| Nohut: tam sulu verim | 220 | kg/da | – | – |
| Nohut: fiyat | 34.250 | TL/ton | – | – |
| Kırmızı mercimek: ekim tarihi | 1.11 | gün.ay | – | – |
| Kırmızı mercimek: Ky (verim tepki katsayısı) | 1 | - | – | – |
| Kırmızı mercimek: tam sulu verim | 180 | kg/da | – | – |
| Kırmızı mercimek: fiyat | 45.000 | TL/ton | – | – |
| Baklagil sayılan ürünler | Nohut, Kırmızı mercimek | - | – | – |
| Pazarı küçük sayılan ürünler | Ayçiçeği, Nohut, Kırmızı mercimek | - | – | – |
| Yalnız sözleşmeyle ve tam sulamayla önerilen ürün | Şeker pancarı | - | – | – |
| Varsayılan olarak öneri dışında tutulan ürün | Kırmızı mercimek | - | – | – |
| Kullanılabilir su kapasitesi (TAW) | 130 | mm | – | – |
| İzin verilen boşalma (p) | 0,5 | - | – | – |
| Salma sulama randımanı | 0,5 | - | – | – |
| Yağmurlama sulama randımanı | 0,75 | - | – | – |
| Damla sulama randımanı | 0,9 | - | – | – |
| Su yılı başında toprak nemi | 0,3 × TAW | mm | – | – |
| Boş tarlada günlük kayıp | 0,2 × ET0 | mm/gün | – | – |
| Hasattan önce sulamanın kesildiği süre | 10 | gün | – | – |
| Denenen brüt su seviyeleri | 0 / 100 / 200 / 350 / 500 / tam | mm | – | – |
| Güvenilirlik eşiği (altı plana girmez) | 0,35 | göreli verim | – | – |
| İlçe merkezi koordinatları (NASA sorgusu için, yaklaşık) | Karapınar 37,72°K 33,55°D · Çumra 37,57°K 32,77°D · Ereğli 37,51°K 34,05°D · Cihanbeyli 38,66°K 32,93°D · Altınekin 38,31°K 32,87°D | derece | – | – |
| Bir ürünün üyedeki en yüksek payı | 33,3 | % | – | – |
| Küçük pazarlı ürün eşiği (kooperatif alanında) | 25 | % | – | – |
| Sulanan ürüne verilecek en az su | 60 | tam ihtiyacın % | – | – |
| En küçük parsel (tarlası 60 dekardan küçük üyede yarısı) | 10 | da | – | – |
| Güvenle söz eşiği | 20 yılın 16'sı | yıl | – | – |
| Nohutlu planda en düşük baklagil payı | 20 | % | – | – |
| Yıl şeridinde "sarı" eşiği | 90 | sözün % | – | – |
| Toprak puanı ağırlıkları (baklagil / çeşitlilik / baklagil hedefi) | 60 / 40 / 25 | puan / puan / % | – | – |

### Kurgusal (12)

| Girdi | Değer | Birim | Kaynak | Tablo / sayfa |
|---|---|---|---|---|
| Kooperatifin adı | Konya Ovası Örnek Kooperatifi | - | – | – |
| Üye sayısı | 50 | üye | – | – |
| Üyelerin ilçelere dağılımı | Karapınar 10 · Çumra 10 · Ereğli 10 · Cihanbeyli 10 · Altınekin 10 | üye | – | – |
| Tarla büyüklükleri (üye başına) | 40–395; toplam 9.182 | da | – | – |
| Su hakları (üye başına) | 200–350 mm; toplam 2.586.100 m³ | mm, m³ | – | – |
| Sulama yöntemleri | Salma 17 · Yağmurlama 20 · Damla 13 | üye | – | – |
| Bugünkü ekim (ürün başına toplam alan) | Mısır 4.832 · Buğday (kışlık) 3.073 · Nohut 588 · Arpa (kışlık) 479 · Şeker pancarı 149 · Ayçiçeği 61 | da | – | – |
| Üyelerin haritadaki konumu ve tarla biçimi | 50 nokta, ilçenin NASA hücresi içinde | enlem, boylam | – | – |
| Pancar sözleşmesi olan üye | 2 | üye | – | – |
| Üyeleri üreten rastgele tohum | 2026 | - | – | – |
| Alıcı | Örnek Alıcı A.Ş. (kurgusal) | - | – | – |
| Satış sözü (sözleşme kurgusal; miktar modelle hesaplandı) | 2.630 ton mısır | ton | – | – |

### Aranıp bulunamayanlar

- Evre süreleri: kışlık buğday, kışlık arpa ve nohut. FAO-56 Tablo 11'de donlu karasal iklim için uygun satır yok (kışlık buğday satırları: Kaliforniya, Akdeniz, Idaho); nohut satırı hiç yok.
- Ekim tarihlerinin hiçbiri.
- Ky: arpa, nohut, mercimek. FAO-56 Tablo 24'te bu ürünler yok.
- Tam sulu verimlerin hiçbiri (TÜİK ilçe verisi alınamadı).
- Fiyatlar: mısır, nohut, mercimek, ayçiçeği, şeker pancarı (aranmadı ya da bulunamadı).
- TAGEM/DSİ bitki su tüketimi rehberi: PDF'e ulaşılmadı.
- TÜİK ilçe ekim alanı ve verimi: sorgu arayüzü gerektirdiği için alınmadı.
- Toprak: ISRIC SoilGrids beş noktadan yalnız birinde (Cihanbeyli) veri döndürdü; Karapınar ve Çumra boş, Ereğli ve Altınekin zaman aşımı. İlçe değerleri uygulanmadı.
- Yeraltı suyu tahsis miktarı ve baklagil desteği: aranmadı.

## 3. NASA verisinin kanıtı

Parametreler (her dosyada aynı): T2M_MAX, T2M_MIN, PRECTOTCORR, ALLSKY_SFC_SW_DWN, WS2M, RH2M. Topluluk: AG. Zaman çözünürlüğü: günlük. Uzamsal çözünürlük: yaklaşık 0,5° × 0,625° (≈ 55 km).

### Karapınar, Konya

- Dosya: `public/data/karapinar.json` (241.539 bayt)
- API adresi: <https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS2M,RH2M&community=AG&longitude=33.55&latitude=37.72&start=20041001&end=20251231&format=JSON>
- Koordinat: 37,72° K, 33,55° D · rakım 1.236,03 m (API yanıtından)
- Tarih aralığı: 01.10.2004 – 31.12.2025 · 7.762 gün
- Eksik değer: 0 (T2M_MAX 0, T2M_MIN 0, PRECTOTCORR 0, ALLSKY_SFC_SW_DWN 0, WS2M 0, RH2M 0)
- İndirme tarihi: 2026-11-14T09:02:30.206Z
- SHA-256: `68837bdd977cf000d5a8964aa30cdb2d28eaa388b17e29de123fc209bf780dbf`

### Çumra, Konya

- Dosya: `public/data/cumra.json` (242.139 bayt)
- API adresi: <https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS2M,RH2M&community=AG&longitude=32.77&latitude=37.57&start=20041001&end=20251231&format=JSON>
- Koordinat: 37,57° K, 32,77° D · rakım 1.197,55 m (API yanıtından)
- Tarih aralığı: 01.10.2004 – 31.12.2025 · 7.762 gün
- Eksik değer: 0 (T2M_MAX 0, T2M_MIN 0, PRECTOTCORR 0, ALLSKY_SFC_SW_DWN 0, WS2M 0, RH2M 0)
- İndirme tarihi: 2026-11-14T14:04:06.241Z
- SHA-256: `dd8804afa97263e4124d8d3d4198aa2514f93b496a9400618315a2d7b7c408bd`

### Ereğli, Konya

- Dosya: `public/data/eregli.json` (241.288 bayt)
- API adresi: <https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS2M,RH2M&community=AG&longitude=34.05&latitude=37.51&start=20041001&end=20251231&format=JSON>
- Koordinat: 37,51° K, 34,05° D · rakım 1.236,03 m (API yanıtından)
- Tarih aralığı: 01.10.2004 – 31.12.2025 · 7.762 gün
- Eksik değer: 0 (T2M_MAX 0, T2M_MIN 0, PRECTOTCORR 0, ALLSKY_SFC_SW_DWN 0, WS2M 0, RH2M 0)
- İndirme tarihi: 2026-11-14T14:04:11.712Z
- SHA-256: `890734c5f5922af98ce2f4e0a095f4aab0af10e23f57022b4d144e7ed3088806`

### Cihanbeyli, Konya

- Dosya: `public/data/cihanbeyli.json` (242.055 bayt)
- API adresi: <https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS2M,RH2M&community=AG&longitude=32.93&latitude=38.66&start=20041001&end=20251231&format=JSON>
- Koordinat: 38,66° K, 32,93° D · rakım 973,44 m (API yanıtından)
- Tarih aralığı: 01.10.2004 – 31.12.2025 · 7.762 gün
- Eksik değer: 0 (T2M_MAX 0, T2M_MIN 0, PRECTOTCORR 0, ALLSKY_SFC_SW_DWN 0, WS2M 0, RH2M 0)
- İndirme tarihi: 2026-11-14T14:04:19.759Z
- SHA-256: `a076a1c20e4bdc31771549fb3749c152963f0fb590198107bc8ac26c8a0ec41b`

### Altınekin, Konya

- Dosya: `public/data/altinekin.json` (242.054 bayt)
- API adresi: <https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS2M,RH2M&community=AG&longitude=32.87&latitude=38.31&start=20041001&end=20251231&format=JSON>
- Koordinat: 38,31° K, 32,87° D · rakım 973,44 m (API yanıtından)
- Tarih aralığı: 01.10.2004 – 31.12.2025 · 7.762 gün
- Eksik değer: 0 (T2M_MAX 0, T2M_MIN 0, PRECTOTCORR 0, ALLSKY_SFC_SW_DWN 0, WS2M 0, RH2M 0)
- İndirme tarihi: 2026-11-14T14:04:26.818Z
- SHA-256: `e8579921cec9832638d4ba98cf5c04a89634b5f8d1433a241944dca1664385c9`

### Çivril, Denizli (kooperatif hesabında kullanılmıyor; uygulamadaki hazır noktalardan biri)

- Dosya: `public/data/civril.json` (242.168 bayt)
- API adresi: <https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS2M,RH2M&community=AG&longitude=29.74&latitude=38.3&start=20041001&end=20251231&format=JSON>
- Koordinat: 38,3° K, 29,74° D · rakım 1.200,80 m (API yanıtından)
- Tarih aralığı: 01.10.2004 – 31.12.2025 · 7.762 gün
- Eksik değer: 0 (T2M_MAX 0, T2M_MIN 0, PRECTOTCORR 0, ALLSKY_SFC_SW_DWN 0, WS2M 0, RH2M 0)
- İndirme tarihi: 2026-11-14T09:02:33.231Z
- SHA-256: `2040d98959f5d9ccdc0b03d1005656ed7de3ecd576f6d1d9a4d0d0d6c4b68ac3`

Aynı seriyi paylaşan ilçeler (dosyalar gün gün karşılaştırılarak sayıldı):

- karapinar ile eregli: T2M_MAX, T2M_MIN, PRECTOTCORR, WS2M, RH2M gün gün aynı; ALLSKY_SFC_SW_DWN 7.721 günde farklı.
- cihanbeyli ile altinekin: altı parametrenin altısı da gün gün aynı.

Yani beş ilçe için beş ayrı hava yok. Sıcaklık, yağış, rüzgâr ve nem yaklaşık 0,5° × 0,625° ızgaradan gelir; güneş radyasyonu ayrı bir ızgaradan gelir, bu yüzden bir çiftte radyasyon farklı olabilir. Dosyaların SHA-256 değerleri ad ve koordinat alanları yüzünden her durumda farklıdır.

## 4. Yeniden indirme karşılaştırması

Bir gün, altı parametrenin altısı da kayıtlı değerle birebir eşitse "aynı" sayılır.

| İlçe | Yeniden indirme | Gün | Birebir aynı | Farklı | Ayrıntı |
|---|---|---:|---:|---:|---|
| karapinar | 2026-11-15T13:15:17.740Z | 7.762 | 7.762 | 0 | fark yok; rakım aynı |
| cumra | 2026-11-15T13:15:22.371Z | 7.762 | 7.762 | 0 | fark yok; rakım aynı |
| eregli | 2026-11-15T13:15:26.919Z | 7.762 | 7.762 | 0 | fark yok; rakım aynı |
| cihanbeyli | 2026-11-15T13:15:31.948Z | 7.762 | 7.762 | 0 | fark yok; rakım aynı |
| altinekin | 2026-11-15T13:15:48.066Z | 7.762 | 7.762 | 0 | fark yok; rakım aynı |

## 5. Yeniden üretim

Komut:

```bash
npm run kanit
```

Betik (`scripts/kanit.mjs`) veriyi yeniden indirir, kayıtlı dosyalarla karşılaştırır, ET0 ve üç ana sayıyı hem kayıtlı dosyalardan hem yeni indirilenden baştan hesaplar ve `docs/kanit-kayit.json` içindeki kayıtlı sonuçlarla karşılaştırır. Kayıtlı sonuçlar aynı hesap motoruyla üretilmiştir; bu karşılaştırma hesabın **tekrarlanabilir** olduğunu gösterir, **doğru** olduğunu değil. Çıkış kodu: 0 hepsi aynı, 1 bir sayı farklı, 2 ağ yok / indirilemedi, 3 kayıt dosyası yok.

Son çıktı:

```text
Nöbet · veri kanıtı · 2026-11-15T13:15:06.842Z

1) Kayıtlı NASA POWER dosyaları (public/data)
   karapinar   7.762 gün · eksik 0 · indirme 2026-11-14T09:02:30.206Z · sha256 68837bdd977cf000d5a8964aa30cdb2d28eaa388b17e29de123fc209bf780dbf
   cumra       7.762 gün · eksik 0 · indirme 2026-11-14T14:04:06.241Z · sha256 dd8804afa97263e4124d8d3d4198aa2514f93b496a9400618315a2d7b7c408bd
   eregli      7.762 gün · eksik 0 · indirme 2026-11-14T14:04:11.712Z · sha256 890734c5f5922af98ce2f4e0a095f4aab0af10e23f57022b4d144e7ed3088806
   cihanbeyli  7.762 gün · eksik 0 · indirme 2026-11-14T14:04:19.759Z · sha256 a076a1c20e4bdc31771549fb3749c152963f0fb590198107bc8ac26c8a0ec41b
   altinekin   7.762 gün · eksik 0 · indirme 2026-11-14T14:04:26.818Z · sha256 e8579921cec9832638d4ba98cf5c04a89634b5f8d1433a241944dca1664385c9
   civril      7.762 gün · eksik 0 · indirme 2026-11-14T09:02:33.231Z · sha256 2040d98959f5d9ccdc0b03d1005656ed7de3ecd576f6d1d9a4d0d0d6c4b68ac3 · kooperatif hesabında kullanılmıyor
   not: karapinar ile eregli dosyalarında T2M_MAX, T2M_MIN, PRECTOTCORR, WS2M, RH2M gün gün aynı; ALLSKY_SFC_SW_DWN 7.721 günde farklı
   not: cihanbeyli ile altinekin dosyalarında altı parametrenin altısı da gün gün aynı

2) Yeniden indirme ve gün gün karşılaştırma (NASA POWER API, şimdi)
   karapinar   7.762 gün: 7.762 gün birebir aynı, 0 gün farklı · rakım aynı
   cumra       7.762 gün: 7.762 gün birebir aynı, 0 gün farklı · rakım aynı
   eregli      7.762 gün: 7.762 gün birebir aynı, 0 gün farklı · rakım aynı
   cihanbeyli  7.762 gün: 7.762 gün birebir aynı, 0 gün farklı · rakım aynı
   altinekin   7.762 gün: 7.762 gün birebir aynı, 0 gün farklı · rakım aynı

3) ET0 ve üç ana sayı: baştan hesap
   kayıt tarihi 2026-11-15T09:03:56.290Z
   sayı                                    kayıtlı   kayıtlı dosyadan  yeni indirilenden  sonuç
   ET0 karapinar (mm/yıl)                  1.241,1            1.241,1            1.241,1  aynı
   ET0 cumra (mm/yıl)                      1.195,3            1.195,3            1.195,3  aynı
   ET0 eregli (mm/yıl)                     1.215,3            1.215,3            1.215,3  aynı
   ET0 cihanbeyli (mm/yıl)                 1.251,7            1.251,7            1.251,7  aynı
   ET0 altinekin (mm/yıl)                  1.253,9            1.253,9            1.253,9  aynı
   Brüt gelir, bugün (TL)               62.676.555         62.676.555         62.676.555  aynı
   Brüt gelir, planlı (TL)              80.165.398         80.165.398         80.165.398  aynı
   Suyu biten üye, bugün                        50                 50                 50  aynı
   Suyu biten üye, planlı                        0                  0                  0  aynı
   Güvenli mısır sözü, bugün (t)             1.505              1.505              1.505  aynı
   Güvenli mısır sözü, planlı (t)            2.639              2.639              2.639  aynı
   hesap süresi 1,5 sn

4) Girdi dökümü (sayım)
   NASA verisi  7 girdi
   Kaynaklı     17 girdi
   Varsayım     48 girdi
   Kurgusal     12 girdi
   toplam       84 girdi

SONUÇ: 5 ilçe dosyası yeniden indirildi; 5 tanesi kayıtlı dosyayla gün gün birebir aynı. Baştan hesaplanan ET0 ve üç ana sayı kayıtlı sonuçlarla aynı.
```
