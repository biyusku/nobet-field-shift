# Nöbet MCP sunucusu

Nöbet'in hesaplarını bir yapay zekâ asistanına (Claude Code, claude.ai) araç olarak açar. Sayılar sitenin kendi fonksiyonlarından gelir (`src/model.ts`, `src/engine`, `src/data`); motor kopyalanmaz, içe aktarılır. Aynı girdi sitede ve MCP'de aynı sonucu verir (`npm run mcp:test`).

Bütün araçlar **salt okunur**: hiçbir dosyaya, siteye ya da duruma yazmaz. Her çıktıda girdilerin sınıfı (NASA verisi, kaynaklı, varsayım, kurgusal), "kooperatif kurgusaldır" notu ve gelirin brüt olduğu yazar.

| Araç | Ne verir |
|---|---|
| `iklim_ozeti(ilce)` | NASA POWER'dan 2006-2025: yıllık yağış ve ET0, aylık ortalamalar, en kurak yıl |
| `uye_plani(dekar, su_hakki_mm, sulama_yontemi, bugunku_ekim, ilce?)` | Bugünkü ekim ve önerilen plan: su bitiş tarihi, ürün başına dekar ve ton, brüt gelir |
| `soz_kapasitesi(esik_yil = 16)` | Örnek kooperatifin ürün ürün güvenle verebileceği söz; "yalnız mısır" ve "karma" |
| `taahhut_dene(urun, ton)` | Söz 20 yılın kaçında tutuyor: bugün, gelişigüzel, planlı; en kötü yıl |
| `kaynaklar()` | 84 girdinin sınıfı, değeri ve kaynak bağlantısı |

Araçların hepsinde `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` ve Türkçe başlık var. SDK: `@modelcontextprotocol/server` 2.4.0 (v2).

## Kurulum

Node 20 ya da üstü (MCP Inspector için 22.23.4 ya da üstü).

```bash
npm install
```

## 1. Yerel mod (stdio): demo bununla

```bash
npm run mcp
```

Kimlik doğrulama yok. Protokol stdout'tan akar; günlük stderr'e yazılır.

Kendi kendini deneme (sunucuyu başlatır, araç listesini alır, her aracı bir kez ve üç hatalı girdiyle çağırır):

```bash
npm run mcp:deneme -- --md mcp/ornek-cikti.md
```

### Claude Code'a ekleme (yerel)

Proje klasörünün tam yolunu yazın (`--` işaretinden sonrası olduğu gibi sunucuya gider):

```bash
claude mcp add --transport stdio nobet -- npx tsx /TAM/YOL/nasa-project/mcp/stdio.ts
```

Sistem Node'u yoksa (ör. projeye ayrı indirilmiş Node ile çalışılıyorsa) `npx` yerine Node'un ve tsx'in tam yolunu verin:

```bash
claude mcp add --transport stdio nobet -- /TAM/YOL/node /TAM/YOL/nasa-project/node_modules/tsx/dist/cli.mjs /TAM/YOL/nasa-project/mcp/stdio.ts
```

Sonra Claude Code içinde `/mcp` ile bağlantıyı görün; `claude mcp list` ve `claude mcp get nobet` da durumu gösterir.

## 2. HTTP modu (streamable HTTP)

```bash
npm run mcp:http
```

`http://127.0.0.1:8787/mcp` adresinde yanıt verir (yalnız 127.0.0.1; `PORT` ile değişir). İki ayar:

| Ortam değişkeni | Etki |
|---|---|
| `MCP_AUTH=none` (varsayılan) | Girişsiz. Araçlar salt okunur olduğu için yazma riski yok. |
| `MCP_AUTH=key` | Her istek `Authorization: Bearer <anahtar>` ister. Anahtar yoksa ya da yanlışsa **401**. |
| `MCP_API_KEY` | Anahtar. Koda yazılmaz, günlüğe düşmez (günlükte yalnız yöntem, yol ve durum kodu var). |
| `ALLOWED_ORIGINS` | Origin başlığı taşıyan isteklerde izin verilen kaynaklar (virgülle). Varsayılan `claude.ai`; kendi alan adı her zaman geçer. Origin'i olmayan istek geçer; listede olmayan Origin **403**. |
| `MCP_TIMEOUT_MS` | Ağır hesap için süre sınırı, varsayılan 20000 (bkz. "Bilinen sorun"). |

Anahtarlı başlatma:

```bash
MCP_AUTH=key MCP_API_KEY="$(openssl rand -hex 24)" npm run mcp:http
```

Uç nokta yalnız POST kabul eder; GET ve DELETE **405**, `/mcp` dışındaki yollar **404**. Sunucu durumsuzdur (her istek yeni bir sunucu örneğiyle yanıtlanır); hem 2026-07-28 hem 2025 sürümü istemcilere yanıt verir.

### MCP Inspector ile deneme

```bash
npx -y @modelcontextprotocol/inspector@2.15.0 --cli http://127.0.0.1:8787/mcp --transport http --method tools/list
```

```bash
npx -y @modelcontextprotocol/inspector@2.15.0 --cli http://127.0.0.1:8787/mcp --transport http --method tools/call --tool-name taahhut_dene --tool-arg urun=mısır --tool-arg ton=2630
```

Anahtarlı modda `--header "Authorization: Bearer $MCP_API_KEY"` ekleyin. Görsel arayüz için `npx @modelcontextprotocol/inspector` (tarayıcıda açılır; Transport: Streamable HTTP, URL: `http://127.0.0.1:8787/mcp`).

### Claude Code'a ekleme (HTTP)

```bash
claude mcp add --transport http nobet http://127.0.0.1:8787/mcp
```

Anahtarlı:

```bash
claude mcp add --transport http nobet http://127.0.0.1:8787/mcp --header "Authorization: Bearer ANAHTAR"
```

Yayındaki sunucu için adresi `https://ALAN-ADI/mcp` yapın.

## 3. Yayına alma (Railway, tek sunucu)

**Yayın yolu Railway.** `npm start` (`mcp/start.ts`) tek bir Node süreciyle hem siteyi (`dist/`) hem MCP'yi (`/mcp`) sunar; `PORT`'u dinler, `0.0.0.0`'a bağlanır. Bilinmeyen yollar `index.html`'e düşer; `/mcp` bundan etkilenmez. Ağır hesaplardaki süre sınırı (worker) bu sunucuda da çalışır.

Yerelde:

```bash
npm run build && PORT=3000 npm start
```

Ayarlar ve adımlar kök `README.md` → "Railway (site + MCP)". Ortam değişkenleri:

| Değişken | Etki |
|---|---|
| `MCP_AUTH` | `none` (varsayılan) ya da `key` |
| `MCP_API_KEY` | `key` modunda anahtar; günlüğe yazılmaz |
| `ALLOWED_ORIGINS` | Origin başlığı taşıyan isteklerde izin verilen kaynaklar (virgülle, tam adres ya da ana makine). Boşsa `claude.ai` ve `RAILWAY_PUBLIC_DOMAIN`. Kendi alan adı her zaman geçer; Origin'i olmayan istek her zaman geçer; `*` kontrolü kapatır. |
| `MCP_TIMEOUT_MS` | ağır hesap süre sınırı, varsayılan 20000 |

**Origin hakkında.** claude.ai bağlayıcısı sunucuya tarayıcıdan değil Anthropic'in bulutundan bağlanır (support.claude.com, "Get started with custom connectors using remote MCP", 15.11.2026). Claude'un belgeleri hangi Origin değerini gönderdiğini yazmıyor; sorun giderme sayfası "aşırı katı Origin kontrolü Anthropic'in isteklerini reddeder" diyor. Bu yüzden Origin'i olmayan istek reddedilmez. Bağlayıcı 403 alırsa sunucu günlüğündeki `[mcp] POST /mcp -> 403` satırına bakın ve gelen Origin'i `ALLOWED_ORIGINS`'e ekleyin.

Vercel dosyaları (`../api/mcp.ts`, `../vercel.json`) depoda duruyor ama yayın yolu değil; denenmedi.

## 4. claude.ai'ye özel bağlayıcı olarak ekleme

Gereksinimler (support.claude.com, "Get started with custom connectors using remote MCP", 15.11.2026'da okundu): sunucu herkese açık internetten, **HTTPS 443** üzerinden erişilebilir olmalı; Claude sunucuya kendi bulutundan bağlanır, yerel `127.0.0.1` adresi eklenemez. Ücretsiz planda tek özel bağlayıcı eklenebilir.

1. claude.ai → Customize → Connectors → **+ Add** → **Add custom connector**.
2. Ad: `Nöbet`; URL: `https://ALAN-ADI/mcp`.
3. Authentication: `MCP_AUTH=none` ise **No sign in**. `MCP_AUTH=key` ise **Request headers** alanına `Authorization` başlığı ve `Bearer ANAHTAR` değeri.
4. **Add**. Sohbette "+" → Connectors ile açın.

OAuth yok; plan için [OAUTH-PLAN.md](OAUTH-PLAN.md).

## Örnek üç soru

1. "Karapınar'da son 20 yılın en kurak yılı hangisiydi, o yıl ET0 ne kadardı?"
2. "100 dekar tarlam var, su hakkım 300 mm, yağmurlamayla 70 dekar mısır 30 dekar buğday ekiyorum. Su ne zaman bitiyor, ne ekmemi önerirsin?"
3. "Örnek kooperatif 3.000 ton mısır sözü verse 20 yılın kaçında tutar? Planlı dağıtım ne değiştirir?"

## Testler

```bash
npm run mcp:test
```

`mcp/test/parity.test.ts`: `soz_kapasitesi` ve `taahhut_dene` Pano'nun kullandığı fonksiyonlarla ve `docs/kanit-kayit.json`'daki kayıtlı Pano sayılarıyla birebir aynı (1.505 t → 2.639 t; söz 2/20, 8/20, 17/20; gelir 62.676.555 → 80.165.398 TL); girdi doğrulaması; protokol üzerinden araç listesi ve readOnlyHint; anahtarlı modda 401.

## Bilinen sorun: nohut sözünde çözücü

`javascript-lp-solver` örnek kooperatifte bazı karşılanamaz nohut sözlerinde dönmüyordu (2.000 t). Düzeltme (çözücü değiştirilmeden):

- Motor, çözücüyü çağırmadan önce sözün üst sınırını denetler (`maxProductionT`: her üyede izin verilen en yüksek pay × tam sulu verim; küçük pazarlı üründe kooperatif payı sınırı). Nohut için sınır yaklaşık **505 t**; üstündeki söz çözücüye gitmez, "bu söz bu tarlalarla karşılanamaz, en çok yaklaşık 505 ton" hatası döner.
- "Yalnız nohut" senaryosu Node'da çözücüden hata dönüyor; MCP bunu `null` ve açıklamayla verir. Tarayıcı derlemesinde aynı hesap takılıyor; sitede 5 sn sınırlı Web Worker bunu keser.
- Yerel MCP modlarında ağır hesap yine worker'da süre sınırıyla çalışır (güvenlik payı).

## Dosyalar

| Dosya | İş |
|---|---|
| `core.ts` | Araçların hesabı ve girdi doğrulaması (sitenin fonksiyonlarını çağırır) |
| `server.ts` | `McpServer` ve beş aracın kaydı |
| `stdio.ts` | Yerel mod |
| `http-handler.ts` | Web standardı HTTP işleyicisi: yol, Origin ve anahtar denetimi |
| `http.ts` | Yerel HTTP sunucusu (Node `http`, 127.0.0.1) |
| `runner.ts`, `worker.ts` | Ağır hesabı süre sınırıyla ayrı iş parçacığında çalıştırma |
| `client.ts` | Deneme istemcisi (stdio ya da HTTP) |
| `test/parity.test.ts` | Pano ile eşitlik testi |
| `start.ts`, `static.ts` | Yayın sunucusu (Railway): site + /mcp |
| `../api/mcp.ts`, `../vercel.json` | Vercel giriş noktası (kullanılmıyor, denenmedi) |
