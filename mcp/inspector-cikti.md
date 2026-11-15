# MCP Inspector CLI çıktısı

Sunucu: `npm run mcp:http` (MCP_AUTH=none), http://127.0.0.1:8787/mcp. Inspector 2.15.0, 2026-11-15T10:13Z.

```bash
npx -y @modelcontextprotocol/inspector@2.15.0 --cli http://127.0.0.1:8787/mcp --transport http --method tools/list
```

```json
{
  "tools": [
    {
      "name": "iklim_ozeti",
      "title": "İklim özeti",
      "description": "Bir Konya ilçesi için NASA POWER'dan 20 yıllık yıllık yağış ve ET0, aylık ortalamalar ve en kurak yıl.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "ilce": {
            "type": "string",
            "description": "Karapınar, Çumra, Ereğli, Cihanbeyli ya da Altınekin"
          }
        },
        "required": [
          "ilce"
        ],
        "$schema": "https://json-schema.org/draft/2020-12/schema"
      },
      "annotations": {
        "title": "İklim özeti",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "uye_plani",
      "title": "Üye planı",
      "description": "Bir tarlanın bugünkü ekimi ve önerilen plan: su bitiş tarihi, ürün başına dekar ve ton, brüt gelir.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "dekar": {
            "type": "number",
            "description": "Tarla büyüklüğü, dekar"
          },
          "su_hakki_mm": {
            "type": "number",
            "description": "Yıllık su hakkı, tarla geneline mm (1 mm × 1 da = 1 m³)"
          },
          "sulama_yontemi": {
            "type": "string",
            "description": "salma, yağmurlama ya da damla"
          },
          "bugunku_ekim": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "urun": {
                  "type": "string"
                },
                "dekar": {
                  "type": "number"
                }
              },
              "required": [
                "urun",
                "dekar"
              ]
            },
            "description": "Bugün ekilenler, ör. [{\"urun\":\"mısır\",\"dekar\":60}]"
          },
          "ilce": {
            "description": "Havanın okunacağı ilçe; varsayılan Karapınar",
            "type": "string"
          }
        },
        "required": [
          "dekar",
          "su_hakki_mm",
          "sulama_yontemi",
          "bugunku_ekim"
        ],
        "$schema": "https://json-schema.org/draft/2020-12/schema"
      },
      "annotations": {
        "title": "Üye planı",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "soz_kapasitesi",
      "title": "Söz kapasitesi",
      "description": "Örnek (kurgusal) kooperatifin ürün ürün güvenle verebileceği söz; \"yalnız mısır\" ve \"karma\".",
      "inputSchema": {
        "type": "object",
        "properties": {
          "esik_yil": {
            "description": "Sözün 20 yılın en az kaçında tutması istenir; varsayılan 16",
            "type": "integer",
            "minimum": -9007199254740991,
            "maximum": 9007199254740991
          }
        },
        "$schema": "https://json-schema.org/draft/2020-12/schema"
      },
      "annotations": {
        "title": "Söz kapasitesi",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "taahhut_dene",
      "title": "Taahhüt dene",
      "description": "Bir satış sözü 20 yılın kaçında tutuyor: bugün, gelişigüzel dağıtım, planlı dağıtım; en kötü yıl.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "urun": {
            "type": "string",
            "description": "Ürün adı, ör. mısır"
          },
          "ton": {
            "type": "number",
            "description": "Söz verilen miktar, ton"
          }
        },
        "required": [
          "urun",
          "ton"
        ],
        "$schema": "https://json-schema.org/draft/
```

```bash
npx -y @modelcontextprotocol/inspector@2.15.0 --cli http://127.0.0.1:8787/mcp --transport http --method tools/call --tool-name taahhut_dene --tool-arg urun=mısır --tool-arg ton=2630
```

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"soz\": \"2630 ton mısır\",\n  \"bugun\": {\n    \"tuttugu_yil\": 2,\n    \"toplam_yil\": 20,\n    \"en_kotu_yil\": {\n      \"yil\": 2008,\n      \"uretim_t\": 1179,\n      \"sozun_yuzdesi\": 45\n    },\n    \"brut_gelir_tl_yil\": 62676555\n  },\n  \"gelisiguzel\": {\n    \"tuttugu_yil\": 8,\n    \"toplam_yil\": 20,\n    \"en_kotu_yil\": {\n      \"yil\": 2008,\n      \"uretim_t\": 1820,\n      \"sozun_yuzdesi\": 69\n    },\n    \"brut_gelir_tl_yil\": 64573148\n  },\n  \"planli\": {\n    \"tuttugu_yil\": 17,\n    \"toplam_yil\": 20,\n    \"en_kotu_yil\": {\n      \"yil\": 2025,\n      \"uretim_t\": 2585,\n      \"sozun_yuzdesi\": 98\n    },\n    \"brut_gelir_tl_yil\": 80165398\n  },\n  \"plan_durumu\": \"ok\",\n  \"aciklama\": \"Söz bir yıl tutar: o yılın havasıyla üretilen miktar söze ulaşırsa. bugun: kurgusal bugünkü ekim; gelisiguzel: söz rastgele üyelere dağıtılır; planli: Nöbet planı. Pano'da bu söz \\\"Dağıt\\\" ile uygulandığında görülen sayılarla aynıdır.\",\n  \"girdi_siniflari\": {\n    \"NASA verisi\": \"Beş ilçenin günlük havası (2006-2025).\",\n    \"kaynaklı\": \"Kc, Ky, bazı evre süreleri, buğday ve arpa fiyatı.\",\n    \"varsayım\": \"Verimler, diğer fiyatlar, toprak, randıman, plan kuralları.\",\n    \"kurgusal\": \"Kooperatif, üyeler, su hakları, bugünkü ekim, alıcı ve söz.\"\n  },\n  \"notlar\": [\n    \"Kooperatif kurgusaldır: üyeler, tarlalar, su hakları, bugünkü ekim ve alıcı gerçek değildir.\",\n    \"Gelir brüttür: tohum, gübre, enerji, işçilik ve su maliyeti düşülmedi.\",\n    \"Hava NASA POWER verisidir (yaklaşık 55 km ızgara); tarla ölçeğinde değildir.\"\n  ]\n}"
    }
  ],
  "structuredContent": {
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
}

```

```bash
npx -y @modelcontextprotocol/inspector@2.15.0 --cli http://127.0.0.1:8787/mcp --transport http --method tools/call --tool-name iklim_ozeti --tool-arg ilce=Çumra
```

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"ilce\": \"Çumra\",\n  \"nasa_noktasi\": {\n    \"enlem\": 37.57,\n    \"boylam\": 32.77,\n    \"rakim_m\": 1198\n  },\n  \"donem\": \"2006-2025 (takvim yılları)\",\n  \"ortalama\": {\n    \"yillik_yagis_mm\": 537,\n    \"yillik_et0_mm\": 1195\n  },\n  \"en_kurak_yil\": {\n    \"yil\": 2013,\n    \"yagis_mm\": 331,\n    \"et0_mm\": 1230\n  },\n  \"yillar\": [\n    {\n      \"yil\": 2006,\n      \"yagis_mm\": 639,\n      \"et0_mm\": 1177\n    },\n    {\n      \"yil\": 2007,\n      \"yagis_mm\": 460,\n      \"et0_mm\": 1240\n    },\n    {\n      \"yil\": 2008,\n      \"yagis_mm\": 366,\n      \"et0_mm\": 1253\n    },\n    {\n      \"yil\": 2009,\n      \"yagis_mm\": 756,\n      \"et0_mm\": 1119\n    },\n    {\n      \"yil\": 2010,\n      \"yagis_mm\": 582,\n      \"et0_mm\": 1218\n    },\n    {\n      \"yil\": 2011,\n      \"yagis_mm\": 605,\n      \"et0_mm\": 1065\n    },\n    {\n      \"yil\": 2012,\n      \"yagis_mm\": 720,\n      \"et0_mm\": 1181\n    },\n    {\n      \"yil\": 2013,\n      \"yagis_mm\": 331,\n      \"et0_mm\": 1230\n    },\n    {\n      \"yil\": 2014,\n      \"yagis_mm\": 593,\n      \"et0_mm\": 1200\n    },\n    {\n      \"yil\": 2015,\n      \"yagis_mm\": 535,\n      \"et0_mm\": 1111\n    },\n    {\n      \"yil\": 2016,\n      \"yagis_mm\": 472,\n      \"et0_mm\": 1253\n    },\n    {\n      \"yil\": 2017,\n      \"yagis_mm\": 527,\n      \"et0_mm\": 1178\n    },\n    {\n      \"yil\": 2018,\n      \"yagis_mm\": 575,\n      \"et0_mm\": 1208\n    },\n    {\n      \"yil\": 2019,\n      \"yagis_mm\": 670,\n      \"et0_mm\": 1139\n    },\n    {\n      \"yil\": 2020,\n      \"yagis_mm\": 485,\n      \"et0_mm\": 1223\n    },\n    {\n      \"yil\": 2021,\n      \"yagis_mm\": 457,\n      \"et0_mm\": 1221\n    },\n    {\n      \"yil\": 2022,\n      \"yagis_mm\": 533,\n      \"et0_mm\": 1176\n    },\n    {\n      \"yil\": 2023,\n      \"yagis_mm\": 528,\n      \"et0_mm\": 1186\n    },\n    {\n      \"yil\": 2024,\n      \"yagis_mm\": 557,\n      \"et0_mm\": 1248\n    },\n    {\n      \"yil\": 2025,\n      \"yagis_mm\": 347,\n      \"et0_mm\": 1278\n    }\n  ],\n  \"aylik_ortalama\": [\n    {\n      \"ay\": \"Ocak\",\n      \"yagis_mm\": 98.3,\n      \"et0_mm\": 20.4\n    },\n    {\n      \"ay\": \"Şubat\",\n      \"yagis_mm\": 58.3,\n      \"et0_mm\": 31.6\n    },\n    {\n      \"ay\": \"Mart\",\n      \"yagis_mm\": 50.9,\n      \"et0_mm\": 60\n    },\n    {\n      \"ay\": \"Nisan\",\n      \"yagis_mm\": 33.8,\n      \"et0_mm\": 93.4\n    },\n    {\n      \"ay\": \"Mayıs\",\n      \"yagis_mm\": 39,\n      \"et0_mm\": 132.6\n    },\n    {\n      \"ay\": \"Haziran\",\n      \"yagis_mm\": 24,\n      \"et0_mm\": 171\n    },\n    {\n      \"ay\": \"Temmuz\",\n      \"yagis_mm\": 6.1,\n      \"et0_mm\": 213.2\n    },\n    {\n      \"ay\": \"Ağustos\",\n      \"yagis_mm\": 3.7,\n      \"et0_mm\": 199.6\n    },\n    {\n      \"ay\": \"Eylül\",\n      \"yagis_mm\": 22.5,\n      \"et0_mm\": 135.8\n    },\n    {\n      \"ay\": \"Ekim\",\n      \"yagis_mm\": 49.3,\n      \"et0_mm\": 77.6\n    },\n    {\n      \"ay\": \"Kasım\",\n      \"yagis_mm\": 55,\n      \"et0_mm\": 38.7\n    },\n    {\n      \"ay\": \"Aralık\",\n      \"yagis_mm\": 96,\n      \"et0_mm\": 21.3\n    }\n  ],\n  \"girdi_siniflari\": {\n    \"NASA verisi\": \"Günlük sıcaklık, yağış, güneş radyasyonu, rüzgâr ve nem (NASA POWER, community=AG).\",\n    \"hesap\": \"ET0, FAO-56 Penman-Monteith ile bu verilerden hesaplandı.\",\n    \"varsayım\": \"İlçe merkezi koordinatı (NASA sorgusu için, yaklaşık).\"\n  },\n  \"notlar\": [\n    \"Kooperatif kurgusaldır: üyeler, tarlalar, su hakları, bugünkü ekim ve alıcı gerçek değildir.\",\n    \"Gelir brüttür: tohum, gübre, enerji, işçilik ve su maliyeti düşülmedi.\",\n    \"Hava NASA POWER verisidir (yaklaşık 55 km ızgara); tarla ölçeğinde değildir.\"\n  ]\n}"
    }
  ],
  "structuredContent": {
    "ilce": "Ç
```

```bash
npx -y @modelcontextprotocol/inspector@2.15.0 --cli http://127.0.0.1:8787/mcp --transport http --method tools/call --tool-name taahhut_dene --tool-arg urun=zeytin --tool-arg ton=10
```

```json
{
  "content": [
    {
      "type": "text",
      "text": "Bilinmeyen ürün: \"zeytin\". Geçerli ürünler: Mısır, Şeker pancarı, Ayçiçeği, Buğday (kışlık), Arpa (kışlık), Nohut, Kırmızı mercimek."
    }
  ],
  "isError": true
}
{"error":{"code":"tool_is_error","message":"Tool 'taahhut_dene' returned isError:true."}}

```
