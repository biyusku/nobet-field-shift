# Nöbet MCP: örnek çıktılar

Bağlantı: stdio (npx tsx mcp/stdio.ts) · 2026-11-15T10:13:21.559Z

## Araç listesi (5)

| Ad | Başlık | readOnlyHint | Açıklama |
|---|---|---|---|
| iklim_ozeti | İklim özeti | true | Bir Konya ilçesi için NASA POWER'dan 20 yıllık yıllık yağış ve ET0, aylık ortalamalar ve en kurak yıl. |
| uye_plani | Üye planı | true | Bir tarlanın bugünkü ekimi ve önerilen plan: su bitiş tarihi, ürün başına dekar ve ton, brüt gelir. |
| soz_kapasitesi | Söz kapasitesi | true | Örnek (kurgusal) kooperatifin ürün ürün güvenle verebileceği söz; "yalnız mısır" ve "karma". |
| taahhut_dene | Taahhüt dene | true | Bir satış sözü 20 yılın kaçında tutuyor: bugün, gelişigüzel dağıtım, planlı dağıtım; en kötü yıl. |
| kaynaklar | Kaynaklar | true | Modele giren her girdinin sınıfı (NASA verisi, kaynaklı, varsayım, kurgusal) ve bağlantısı. |

## iklim_ozeti

Girdi: `{"ilce":"Karapınar"}` · 17 ms

```json
{
  "ilce": "Karapınar",
  "nasa_noktasi": {
    "enlem": 37.72,
    "boylam": 33.55,
    "rakim_m": 1236
  },
  "donem": "2006-2025 (takvim yılları)",
  "ortalama": {
    "yillik_yagis_mm": 385,
    "yillik_et0_mm": 1241
  },
  "en_kurak_yil": {
    "yil": 2025,
    "yagis_mm": 222,
    "et0_mm": 1337
  },
  "yillar": [
    {
      "yil": 2006,
      "yagis_mm": 394,
      "et0_mm": 1237
    },
    {
      "yil": 2007,
      "yagis_mm": 379,
      "et0_mm": 1263
    },
    {
      "yil": 2008,
      "yagis_mm": 319,
      "et0_mm": 1273
    },
    {
      "yil": 2009,
      "yagis_mm": 538,
      "et0_mm": 1177
    },
    {
      "yil": 2010,
      "yagis_mm": 451,
      "et0_mm": 1270
    },
    {
      "yil": 2011,
      "yagis_mm": 480,
      "et0_mm": 1110
    },
    {
      "yil": 2012,
      "yagis_mm": 525,
      "et0_mm": 1209
    },
    {
      "yil": 2013,
      "yagis_mm": 288,
      "et0_mm": 1255
    },
    {
      "yil": 2014,
      "yagis_mm": 457,
      "et0_mm": 1240
    },
    {
      "yil": 2015,
      "yagis_mm": 398,
      "et0_mm": 1149
    },
    {
      "yil": 2016,
      "yagis_mm": 381,
      "et0_mm": 1300
    },
    {
      "yil": 2017,
      "yagis_mm": 357,
      "et0_mm": 1228
    },
    {
      "yil": 2018,
      "yagis_mm": 444,
      "et0_mm": 1267
    },
    {
      "yil": 2019,
      "yagis_mm": 435,
      "et0_mm": 1190
    },
    {
      "yil": 2020,
      "yagis_mm": 308,
      "et0_mm": 1276
    },
    {
      "yil": 2021,
      "yagis_mm": 316,
      "et0_mm": 1272
    },
    {
      "yil": 2022,
      "yagis_mm": 332,
      "et0_mm": 1219
    },
    {
      "yil": 2023,
      "yagis_mm": 350,
      "et0_mm": 1248
    },
    {
      "yil": 2024,
      "yagis_mm": 332,
      "et0_mm": 1303
    },
    {
      "yil": 2025,
      "yagis_mm": 222,
      "et0_mm": 1337
    }
  ],
  "aylik_ortalama": [
    {
      "ay": "Ocak",
      "yagis_mm": 57.1,
      "et0_mm": 24.3
    },
    {
      "ay": "Şubat",
      "yagis_mm": 40.9,
      "et0_mm": 35.1
    },
    {
      "ay": "Mart",
      "yagis_mm": 43.4,
      "et0_mm": 65.5
    },
    {
      "ay": "Nisan",
      "yagis_mm": 31.2,
      "et0_mm": 100.3
    },
    {
      "ay": "Mayıs",
      "yagis_mm": 34.4,
      "et0_mm": 139.8
    },
    {
      "ay": "Haziran",
      "yagis_mm": 23.1,
      "et0_mm": 175.7
    },
    {
      "ay": "Temmuz",
      "yagis_mm": 4.4,
      "et0_mm": 214.9
    },
    {
      "ay": "Ağustos",
      "yagis_mm": 3.4,
      "et0_mm": 199.6
    },
    {
      "ay": "Eylül",
      "yagis_mm": 15.3,
      "et0_mm": 137.6
    },
    {
      "ay": "Ekim",
      "yagis_mm": 28.9,
      "et0_mm": 81.7
    },
    {
      "ay": "Kasım",
      "yagis_mm": 39.9,
      "et0_mm": 41.6
    },
    {
      "ay": "Aralık",
      "yagis_mm": 63.2,
      "et0_mm": 25
    }
  ],
  "girdi_siniflari": {
    "NASA verisi": "Günlük sıcaklık, yağış, güneş radyasyonu, rüzgâr ve nem (NASA POWER, community=AG).",
    "hesap": "ET0, FAO-56 Penman-Monteith ile bu verilerden hesaplandı.",
    "varsayım": "İlçe merkezi koordinatı (NASA sorgusu için, yaklaşık)."
  },
  "notlar": [
    "Kooperatif kurgusaldır: üyeler, tarlalar, su hakları, bugünkü ekim ve alıcı gerçek değildir.",
    "Gelir brüttür: tohum, gübre, enerji, işçilik ve su maliyeti düşülmedi.",
    "Hava NASA POWER verisidir (yaklaşık 55 km ızgara); tarla ölçeğinde değildir."
  ]
}
```

## uye_plani

Girdi: `{"dekar":100,"su_hakki_mm":300,"sulama_yontemi":"yağmurlama","bugunku_ekim":[{"urun":"mısır","dekar":70},{"urun":"buğday","dekar":30}]}` · 126 ms

```json
{
  "ilce": "Karapınar",
  "tarla": {
    "dekar": 100,
    "su_hakki_mm": 300,
    "su_hakki_m3": 30000,
    "sulama_yontemi": "Yağmurlama"
  },
  "bugun": {
    "urunler": [
      {
        "urun": "Mısır",
        "dekar": 70,
        "ortalama_ton": 29.5
      },
      {
        "urun": "Buğday (kışlık)",
        "dekar": 30,
        "ortalama_ton": 16.5
      }
    ],
    "bos_dekar": 0,
    "brut_gelir_tl_yil": 715035,
    "kullanilan_su_m3_yil": 30000,
    "su_bitiyor": {
      "yil_sayisi": 20,
      "toplam_yil": 20,
      "ortanca_bitis_tarihi": "13 Temmuz"
    }
  },
  "onerilen": {
    "urunler": [
      {
        "urun": "Mısır",
        "dekar": 21.6,
        "ortalama_ton": 27.3
      },
      {
        "urun": "Ayçiçeği",
        "dekar": 20,
        "ortalama_ton": 6.1
      },
      {
        "urun": "Buğday (kışlık)",
        "dekar": 33.3,
        "ortalama_ton": 9.8
      },
      {
        "urun": "Nohut",
        "dekar": 25,
        "ortalama_ton": 3.1
      }
    ],
    "bos_dekar": 0,
    "brut_gelir_tl_yil": 887170,
    "kullanilan_su_m3_yil": 28495,
    "su_bitiyor": {
      "yil_sayisi": 0,
      "toplam_yil": 20,
      "ortanca_bitis_tarihi": null
    }
  },
  "aciklama": "Değerler 20 hasat yılının (2006-2025) ortalamasıdır. Önerilen plan bu üyeyi tek başına, satış sözü olmadan planlar; sitedeki Üyeler ekranı ise üyeyi örnek kooperatifin ortak planı içinde gösterir, bu yüzden sonuçlar farklı olabilir. Su bitiş tarihi, suyun sezon ortasında bittiği yılların ortancasıdır; bitmiyorsa null.",
  "girdi_siniflari": {
    "NASA verisi": "İlçenin günlük havası.",
    "kaynaklı": "Kc (7 ürün), Ky (4 ürün), 4 ürünün evre süreleri, buğday ve arpa fiyatı.",
    "varsayım": "Tam sulu verimler, diğer fiyatlar, toprak su kapasitesi (130 mm), sulama randımanı, ekim tarihleri, plan kuralları.",
    "kullanıcı girdisi": "Tarla büyüklüğü, su hakkı, sulama yöntemi, bugünkü ekim."
  },
  "notlar": [
    "Kooperatif kurgusaldır: üyeler, tarlalar, su hakları, bugünkü ekim ve alıcı gerçek değildir.",
    "Gelir brüttür: tohum, gübre, enerji, işçilik ve su maliyeti düşülmedi.",
    "Hava NASA POWER verisidir (yaklaşık 55 km ızgara); tarla ölçeğinde değildir."
  ]
}
```

## soz_kapasitesi

Girdi: `{"esik_yil":16}` · 14004 ms

```json
{
  "kooperatif": "Konya Ovası Örnek Kooperatifi (kurgusal), 50 üye, 9182 da",
  "esik": "20 yılın en az 16'sında ulaşılan üretim",
  "urunler": [
    {
      "urun": "Mısır",
      "bugunku_ekimle_t": 1505,
      "planli_dagitimla_t": 2639,
      "yalniz_bu_urun_t": 3146,
      "yalniz_bu_urun_brut_gelir_tl": 78959188
    },
    {
      "urun": "Şeker pancarı",
      "bugunku_ekimle_t": 235,
      "planli_dagitimla_t": 836,
      "yalniz_bu_urun_t": 836,
      "yalniz_bu_urun_brut_gelir_tl": 80194032,
      "not": "Yalnız pancar sözleşmesi olan üyelere ve tam sulamayla önerilir."
    },
    {
      "urun": "Ayçiçeği",
      "bugunku_ekimle_t": 10,
      "planli_dagitimla_t": 234,
      "yalniz_bu_urun_t": 802,
      "yalniz_bu_urun_brut_gelir_tl": 68901982
    },
    {
      "urun": "Buğday (kışlık)",
      "bugunku_ekimle_t": 1527,
      "planli_dagitimla_t": 803,
      "yalniz_bu_urun_t": 1656,
      "yalniz_bu_urun_brut_gelir_tl": 65332713
    },
    {
      "urun": "Arpa (kışlık)",
      "bugunku_ekimle_t": 239,
      "planli_dagitimla_t": 162,
      "yalniz_bu_urun_t": 1524,
      "yalniz_bu_urun_brut_gelir_tl": 63634737
    },
    {
      "urun": "Nohut",
      "bugunku_ekimle_t": null,
      "planli_dagitimla_t": null,
      "yalniz_bu_urun_t": null,
      "yalniz_bu_urun_brut_gelir_tl": null,
      "not": "Hesaplanamadı: Hesap 10 saniyede bitmedi; doğrusal programlama çözücüsü bu girdide takıldı. Daha küçük bir miktar ya da başka bir ürün deneyin."
    },
    {
      "urun": "Kırmızı mercimek",
      "bugunku_ekimle_t": 0,
      "planli_dagitimla_t": 0,
      "yalniz_bu_urun_t": 0,
      "yalniz_bu_urun_brut_gelir_tl": 80165398,
      "not": "Varsayılan olarak öneri dışında (sitede ayrıca açılır); planlı değer bu yüzden 0 olabilir."
    }
  ],
  "yalniz_misir_t": 3146,
  "karma": {
    "aciklama": "Söz olmadan geliri en yükseğe çıkaran plan; her ürünün yılların en az K'sında ulaşılan üretimi.",
    "urunler": [
      {
        "urun": "Mısır",
        "t": 2639
      },
      {
        "urun": "Şeker pancarı",
        "t": 836
      },
      {
        "urun": "Ayçiçeği",
        "t": 234
      },
      {
        "urun": "Buğday (kışlık)",
        "t": 803
      },
      {
        "urun": "Arpa (kışlık)",
        "t": 162
      },
      {
        "urun": "Nohut",
        "t": 255
      }
    ],
    "brut_gelir_tl_yil": 80165398
  },
  "aciklama": "bugunku_ekimle_t: kurgusal bugünkü ekimle; planli_dagitimla_t: o miktar söz verilip plan kurulduğunda yılların en az K'sında tutan en yüksek söz (Pano'daki üçüncü büyük sayı); yalniz_bu_urun_t: kooperatif bu ürüne öncelik verirse. null: hesap süre sınırında bitmedi (nota bakın).",
  "girdi_siniflari": {
    "NASA verisi": "Beş ilçenin günlük havası.",
    "kaynaklı": "Kc, Ky, bazı evre süreleri, buğday ve arpa fiyatı.",
    "varsayım": "Verimler, diğer fiyatlar, toprak, randıman, plan kuralları, güven eşiği.",
    "kurgusal": "Kooperatif, 50 üye, tarlalar, su hakları, bugünkü ekim."
  },
  "notlar": [
    "Kooperatif kurgusaldır: üyeler, tarlalar, su hakları, bugünkü ekim ve alıcı gerçek değildir.",
    "Gelir brüttür: tohum, gübre, enerji, işçilik ve su maliyeti düşülmedi.",
    "Hava NASA POWER verisidir (yaklaşık 55 km ızgara); tarla ölçeğinde değildir."
  ]
}
```

## taahhut_dene

Girdi: `{"urun":"mısır","ton":2630}` · 345 ms

```json
{
  "soz": "2630 ton mısır",
  "bugun": {
    "tuttugu_yil": 2,
    "toplam_yil": 20,
    "en_kotu_yil": {
      "yil": 2008,
      "uretim_t": 1179,
      "sozun_yuzdesi": 45
    },
    "brut_gelir_tl_yil": 62676555
  },
  "gelisiguzel": {
    "tuttugu_yil": 8,
    "toplam_yil": 20,
    "en_kotu_yil": {
      "yil": 2008,
      "uretim_t": 1820,
      "sozun_yuzdesi": 69
    },
    "brut_gelir_tl_yil": 64573148
  },
  "planli": {
    "tuttugu_yil": 17,
    "toplam_yil": 20,
    "en_kotu_yil": {
      "yil": 2025,
      "uretim_t": 2585,
      "sozun_yuzdesi": 98
    },
    "brut_gelir_tl_yil": 80165398
  },
  "plan_durumu": "ok",
  "aciklama": "Söz bir yıl tutar: o yılın havasıyla üretilen miktar söze ulaşırsa. bugun: kurgusal bugünkü ekim; gelisiguzel: söz rastgele üyelere dağıtılır; planli: Nöbet planı. Pano'da bu söz \"Dağıt\" ile uygulandığında görülen sayılarla aynıdır.",
  "girdi_siniflari": {
    "NASA verisi": "Beş ilçenin günlük havası (2006-2025).",
    "kaynaklı": "Kc, Ky, bazı evre süreleri, buğday ve arpa fiyatı.",
    "varsayım": "Verimler, diğer fiyatlar, toprak, randıman, plan kuralları.",
    "kurgusal": "Kooperatif, üyeler, su hakları, bugünkü ekim, alıcı ve söz."
  },
  "notlar": [
    "Kooperatif kurgusaldır: üyeler, tarlalar, su hakları, bugünkü ekim ve alıcı gerçek değildir.",
    "Gelir brüttür: tohum, gübre, enerji, işçilik ve su maliyeti düşülmedi.",
    "Hava NASA POWER verisidir (yaklaşık 55 km ızgara); tarla ölçeğinde değildir."
  ]
}
```

## kaynaklar

Girdi: `{}` · 10 ms

```json
{
  "sayim": {
    "NASA verisi": 7,
    "Kaynaklı": 17,
    "Varsayım": 48,
    "Kurgusal": 12
  },
  "toplam": 84,
  "uc_ana_sayi_neye_dayanir": "Üç ana sayının üçü de dört sınıfın hepsine dayanır: hava NASA verisidir; Kc, bazı evre süreleri ve Ky kaynaklıdır; verimler, kalan evre süreleri ve ekim tarihleri, toprak, randıman ve plan kuralları varsayımdır; üyeler, tarlalar ve su hakları kurgusaldır. Brüt gelir ayrıca fiyatlara dayanır (yedi fiyattan ikisi kaynaklı, beşi varsayım); suyu biten üye sayısı ve mısır sözü fiyatlara yalnızca planın ürün seçimi üzerinden bağlıdır.",
  "girdiler": [
    {
      "girdi": "Günlük en yüksek sıcaklık (2 m) · T2M_MAX",
      "deger": "5 ilçe × 7.762 gün",
      "birim": "°C",
      "sinif": "NASA verisi",
      "kaynak": "NASA POWER Daily API (community=AG), NASA Langley Research Center",
      "baglanti": "https://power.larc.nasa.gov/api/temporal/daily/point",
      "tablo": "parametre T2M_MAX"
    },
    {
      "girdi": "Günlük en düşük sıcaklık (2 m) · T2M_MIN",
      "deger": "5 ilçe × 7.762 gün",
      "birim": "°C",
      "sinif": "NASA verisi",
      "kaynak": "NASA POWER Daily API (community=AG), NASA Langley Research Center",
      "baglanti": "https://power.larc.nasa.gov/api/temporal/daily/point",
      "tablo": "parametre T2M_MIN"
    },
    {
      "girdi": "Günlük yağış (düzeltilmiş) · PRECTOTCORR",
      "deger": "5 ilçe × 7.762 gün",
      "birim": "mm/gün",
      "sinif": "NASA verisi",
      "kaynak": "NASA POWER Daily API (community=AG), NASA Langley Research Center",
      "baglanti": "https://power.larc.nasa.gov/api/temporal/daily/point",
      "tablo": "parametre PRECTOTCORR"
    },
    {
      "girdi": "Yüzeye gelen güneş radyasyonu · ALLSKY_SFC_SW_DWN",
      "deger": "5 ilçe × 7.762 gün",
      "birim": "MJ/m²/gün",
      "sinif": "NASA verisi",
      "kaynak": "NASA POWER Daily API (community=AG), NASA Langley Research Center",
      "baglanti": "https://power.larc.nasa.gov/api/temporal/daily/point",
      "tablo": "parametre ALLSKY_SFC_SW_DWN"
    },
    {
      "girdi": "Rüzgâr hızı (2 m) · WS2M",
      "deger": "5 ilçe × 7.762 gün",
      "birim": "m/s",
      "sinif": "NASA verisi",
      "kaynak": "NASA POWER Daily API (community=AG), NASA Langley Research Center",
      "baglanti": "https://power.larc.nasa.gov/api/temporal/daily/point",
      "tablo": "parametre WS2M"
    },
    {
      "girdi": "Bağıl nem (2 m) · RH2M",
      "deger": "5 ilçe × 7.762 gün",
      "birim": "%",
      "sinif": "NASA verisi",
      "kaynak": "NASA POWER Daily API (community=AG), NASA Langley Research Center",
      "baglanti": "https://power.larc.nasa.gov/api/temporal/daily/point",
      "tablo": "parametre RH2M"
    },
    {
      "girdi": "Rakım (POWER ızgara hücresi)",
      "deger": "Karapınar 1.236 · Çumra 1.198 · Ereğli 1.236 · Cihanbeyli 973 · Altınekin 973",
      "birim": "m",
      "sinif": "NASA verisi",
      "kaynak": "NASA POWER Daily API (community=AG), NASA Langley Research Center",
      "baglanti": "https://power.larc.nasa.gov/api/temporal/daily/point",
      "tablo": "yanıtta geometry.coordinates[2]"
    },
    {
      "girdi": "Mısır: ekim tarihi",
      "deger": "1.5",
      "birim": "gün.ay",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Mısır: evre süreleri (baş, gelişme, orta, son)",
      "deger": "30 / 40 / 50 / 30",
      "birim": "gün",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 11"
    },
    {
      "girdi": "Mısır: Kc (baş, orta, son)",
      "deger": "0,3 / 1,2 / 0,5",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 12"
    },
    {
      "girdi": "Mısır: Ky (verim tepki katsayısı)",
      "deger": "1,25",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0e.htm",
      "tablo": "Tablo 24 (FAO 33'ten)"
    },
    {
      "girdi": "Mısır: tam sulu verim",
      "deger": "1.265",
      "birim": "kg/da",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Mısır: fiyat",
      "deger": "15.025",
      "birim": "TL/ton",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Şeker pancarı: ekim tarihi",
      "deger": "10.4",
      "birim": "gün.ay",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Şeker pancarı: evre süreleri (baş, gelişme, orta, son)",
      "deger": "50 / 40 / 50 / 40",
      "birim": "gün",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 11"
    },
    {
      "girdi": "Şeker pancarı: Kc (baş, orta, son)",
      "deger": "0,35 / 1,2 / 0,7",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 12"
    },
    {
      "girdi": "Şeker pancarı: Ky (verim tepki katsayısı)",
      "deger": "1",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0e.htm",
      "tablo": "Tablo 24 (FAO 33'ten)"
    },
    {
      "girdi": "Şeker pancarı: tam sulu verim",
      "deger": "7.000",
      "birim": "kg/da",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Şeker pancarı: fiyat",
      "deger": "3.720",
      "birim": "TL/ton",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Ayçiçeği: ekim tarihi",
      "deger": "1.5",
      "birim": "gün.ay",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Ayçiçeği: evre süreleri (baş, gelişme, orta, son)",
      "deger": "25 / 35 / 45 / 25",
      "birim": "gün",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 11"
    },
    {
      "girdi": "Ayçiçeği: Kc (baş, orta, son)",
      "deger": "0,35 / 1,1 / 0,35",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 12"
    },
    {
      "girdi": "Ayçiçeği: Ky (verim tepki katsayısı)",
      "deger": "0,95",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0e.htm",
      "tablo": "Tablo 24 (FAO 33'ten)"
    },
    {
      "girdi": "Ayçiçeği: tam sulu verim",
      "deger": "350",
      "birim": "kg/da",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Ayçiçeği: fiyat",
      "deger": "34.250",
      "birim": "TL/ton",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Buğday (kışlık): ekim tarihi",
      "deger": "20.10",
      "birim": "gün.ay",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Buğday (kışlık): evre süreleri (baş, gelişme, orta, son)",
      "deger": "146 / 47 / 40 / 25",
      "birim": "gün",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Buğday (kışlık): Kc (baş, orta, son)",
      "deger": "0,4 / 1,15 / 0,3",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 12"
    },
    {
      "girdi": "Buğday (kışlık): Ky (verim tepki katsayısı)",
      "deger": "1,05",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0e.htm",
      "tablo": "Tablo 24 (FAO 33'ten)"
    },
    {
      "girdi": "Buğday (kışlık): tam sulu verim",
      "deger": "550",
      "birim": "kg/da",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Buğday (kışlık): fiyat",
      "deger": "16.500",
      "birim": "TL/ton",
      "sinif": "Kaynaklı",
      "kaynak": "CNBC-e haberi: TMO 2026 hububat alım fiyatlarını açıkladı (TMO açıklamasını aktarır; TMO'nun kendi sayfası değil)",
      "baglanti": "https://www.cnbce.com/haberler/tmo-2026-hububat-alim-fiyatlarini-acikladi-h30887",
      "tablo": "haber metni"
    },
    {
      "girdi": "Arpa (kışlık): ekim tarihi",
      "deger": "20.10",
      "birim": "gün.ay",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Arpa (kışlık): evre süreleri (baş, gelişme, orta, son)",
      "deger": "141 / 42 / 35 / 25",
      "birim": "gün",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Arpa (kışlık): Kc (baş, orta, son)",
      "deger": "0,3 / 1,15 / 0,25",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 12"
    },
    {
      "girdi": "Arpa (kışlık): Ky (verim tepki katsayısı)",
      "deger": "1",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Arpa (kışlık): tam sulu verim",
      "deger": "500",
      "birim": "kg/da",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Arpa (kışlık): fiyat",
      "deger": "12.750",
      "birim": "TL/ton",
      "sinif": "Kaynaklı",
      "kaynak": "CNBC-e haberi: TMO 2026 hububat alım fiyatlarını açıkladı (TMO açıklamasını aktarır; TMO'nun kendi sayfası değil)",
      "baglanti": "https://www.cnbce.com/haberler/tmo-2026-hububat-alim-fiyatlarini-acikladi-h30887",
      "tablo": "haber metni"
    },
    {
      "girdi": "Nohut: ekim tarihi",
      "deger": "20.3",
      "birim": "gün.ay",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Nohut: evre süreleri (baş, gelişme, orta, son)",
      "deger": "25 / 30 / 35 / 20",
      "birim": "gün",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Nohut: Kc (baş, orta, son)",
      "deger": "0,4 / 1 / 0,35",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 12"
    },
    {
      "girdi": "Nohut: Ky (verim tepki katsayısı)",
      "deger": "1",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Nohut: tam sulu verim",
      "deger": "220",
      "birim": "kg/da",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Nohut: fiyat",
      "deger": "34.250",
      "birim": "TL/ton",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Kırmızı mercimek: ekim tarihi",
      "deger": "1.11",
      "birim": "gün.ay",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Kırmızı mercimek: evre süreleri (baş, gelişme, orta, son)",
      "deger": "25 / 35 / 70 / 40",
      "birim": "gün",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 11"
    },
    {
      "girdi": "Kırmızı mercimek: Kc (baş, orta, son)",
      "deger": "0,4 / 1,1 / 0,3",
      "birim": "-",
      "sinif": "Kaynaklı",
      "kaynak": "FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6",
      "baglanti": "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "tablo": "Tablo 12"
    },
    {
      "girdi": "Kırmızı mercimek: Ky (verim tepki katsayısı)",
      "deger": "1",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Kırmızı mercimek: tam sulu verim",
      "deger": "180",
      "birim": "kg/da",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Kırmızı mercimek: fiyat",
      "deger": "45.000",
      "birim": "TL/ton",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Baklagil sayılan ürünler",
      "deger": "Nohut, Kırmızı mercimek",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Pazarı küçük sayılan ürünler",
      "deger": "Ayçiçeği, Nohut, Kırmızı mercimek",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Yalnız sözleşmeyle ve tam sulamayla önerilen ürün",
      "deger": "Şeker pancarı",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Varsayılan olarak öneri dışında tutulan ürün",
      "deger": "Kırmızı mercimek",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Kullanılabilir su kapasitesi (TAW)",
      "deger": "130",
      "birim": "mm",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "İzin verilen boşalma (p)",
      "deger": "0,5",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Salma sulama randımanı",
      "deger": "0,5",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Yağmurlama sulama randımanı",
      "deger": "0,75",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Damla sulama randımanı",
      "deger": "0,9",
      "birim": "-",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Su yılı başında toprak nemi",
      "deger": "0,3 × TAW",
      "birim": "mm",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Boş tarlada günlük kayıp",
      "deger": "0,2 × ET0",
      "birim": "mm/gün",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Hasattan önce sulamanın kesildiği süre",
      "deger": "10",
      "birim": "gün",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Denenen brüt su seviyeleri",
      "deger": "0 / 100 / 200 / 350 / 500 / tam",
      "birim": "mm",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Güvenilirlik eşiği (altı plana girmez)",
      "deger": "0,35",
      "birim": "göreli verim",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "İlçe merkezi koordinatları (NASA sorgusu için, yaklaşık)",
      "deger": "Karapınar 37,72°K 33,55°D · Çumra 37,57°K 32,77°D · Ereğli 37,51°K 34,05°D · Cihanbeyli 38,66°K 32,93°D · Altınekin 38,31°K 32,87°D",
      "birim": "derece",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Bir ürünün üyedeki en yüksek payı",
      "deger": "33,3",
      "birim": "%",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Küçük pazarlı ürün eşiği (kooperatif alanında)",
      "deger": "25",
      "birim": "%",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Sulanan ürüne verilecek en az su",
      "deger": "60",
      "birim": "tam ihtiyacın %",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "En küçük parsel (tarlası 60 dekardan küçük üyede yarısı)",
      "deger": "10",
      "birim": "da",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Güvenle söz eşiği",
      "deger": "20 yılın 16'sı",
      "birim": "yıl",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Nohutlu planda en düşük baklagil payı",
      "deger": "20",
      "birim": "%",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Yıl şeridinde \"sarı\" eşiği",
      "deger": "90",
      "birim": "sözün %",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Toprak puanı ağırlıkları (baklagil / çeşitlilik / baklagil hedefi)",
      "deger": "60 / 40 / 25",
      "birim": "puan / puan / %",
      "sinif": "Varsayım",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Kooperatifin adı",
      "deger": "Konya Ovası Örnek Kooperatifi",
      "birim": "-",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Üye sayısı",
      "deger": "50",
      "birim": "üye",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Üyelerin ilçelere dağılımı",
      "deger": "Karapınar 10 · Çumra 10 · Ereğli 10 · Cihanbeyli 10 · Altınekin 10",
      "birim": "üye",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Tarla büyüklükleri (üye başına)",
      "deger": "40–395; toplam 9.182",
      "birim": "da",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Su hakları (üye başına)",
      "deger": "200–350 mm; toplam 2.586.100 m³",
      "birim": "mm, m³",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Sulama yöntemleri",
      "deger": "Salma 17 · Yağmurlama 20 · Damla 13",
      "birim": "üye",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Bugünkü ekim (ürün başına toplam alan)",
      "deger": "Mısır 4.832 · Buğday (kışlık) 3.073 · Nohut 588 · Arpa (kışlık) 479 · Şeker pancarı 149 · Ayçiçeği 61",
      "birim": "da",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Üyelerin haritadaki konumu ve tarla biçimi",
      "deger": "50 nokta, ilçenin NASA hücresi içinde",
      "birim": "enlem, boylam",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Pancar sözleşmesi olan üye",
      "deger": "2",
      "birim": "üye",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Üyeleri üreten rastgele tohum",
      "deger": "2026",
      "birim": "-",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Alıcı",
      "deger": "Örnek Alıcı A.Ş. (kurgusal)",
      "birim": "-",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    },
    {
      "girdi": "Satış sözü (sözleşme kurgusal; miktar modelle hesaplandı)",
      "deger": "2.630 ton mısır",
      "birim": "ton",
      "sinif": "Kurgusal",
      "kaynak": null,
      "baglanti": null,
      "tablo": null
    }
  ],
  "bulunamayanlar": [
    "Evre süreleri: kışlık buğday, kışlık arpa ve nohut. FAO-56 Tablo 11'de donlu karasal iklim için uygun satır yok (kışlık buğday satırları: Kaliforniya, Akdeniz, Idaho); nohut satırı hiç yok.",
    "Ekim tarihlerinin hiçbiri.",
    "Ky: arpa, nohut, mercimek. FAO-56 Tablo 24'te bu ürünler yok.",
    "Tam sulu verimlerin hiçbiri (TÜİK ilçe verisi alınamadı).",
    "Fiyatlar: mısır, nohut, mercimek, ayçiçeği, şeker pancarı (aranmadı ya da bulunamadı).",
    "TAGEM/DSİ bitki su tüketimi rehberi: PDF'e ulaşılmadı.",
    "TÜİK ilçe ekim alanı ve verimi: sorgu arayüzü gerektirdiği için alınmadı.",
    "Toprak: ISRIC SoilGrids beş noktadan yalnız birinde (Cihanbeyli) veri döndürdü; Karapınar ve Çumra boş, Ereğli ve Altınekin zaman aşımı. İlçe değerleri uygulanmadı.",
    "Yeraltı suyu tahsis miktarı ve baklagil desteği: aranmadı."
  ],
  "aciklama": "Sayım dökümün satır sayısıdır; ağırlık ya da önem ölçüsü değildir. Kaynaklı değerlerin sayfası bu projede açılıp içinde görüldü (erişim 15.11.2026).",
  "girdi_siniflari": {
    "açıklama": "Bu aracın çıktısı girdilerin kendisidir; her satırda sınıfı yazar."
  },
  "notlar": [
    "Kooperatif kurgusaldır: üyeler, tarlalar, su hakları, bugünkü ekim ve alıcı gerçek değildir.",
    "Gelir brüttür: tohum, gübre, enerji, işçilik ve su maliyeti düşülmedi.",
    "Hava NASA POWER verisidir (yaklaşık 55 km ızgara); tarla ölçeğinde değildir."
  ]
}
```

## iklim_ozeti (hatalı girdi)

Girdi: `{"ilce":"Ankara"}` · 1 ms · isError: true

```json
Bilinmeyen ilçe: "Ankara". Geçerli ilçeler: Karapınar, Çumra, Ereğli, Cihanbeyli, Altınekin.
```

## uye_plani (hatalı girdi)

Girdi: `{"dekar":-5,"su_hakki_mm":300,"sulama_yontemi":"damla","bugunku_ekim":[{"urun":"mısır","dekar":5}]}` · 1 ms · isError: true

```json
dekar sıfırdan büyük olmalı (verilen: -5).
```

## taahhut_dene (hatalı girdi)

Girdi: `{"urun":"zeytin","ton":100}` · 0 ms · isError: true

```json
Bilinmeyen ürün: "zeytin". Geçerli ürünler: Mısır, Şeker pancarı, Ayçiçeği, Buğday (kışlık), Arpa (kışlık), Nohut, Kırmızı mercimek.
```
