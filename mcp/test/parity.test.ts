// MCP araçları Pano ile aynı sayıyı vermeli.
// İki karşılaştırma: (1) Pano'nun kullandığı fonksiyonlar aynı girdilerle burada yeniden çağrılır,
// (2) npm run kanit'in kaydettiği Pano sayıları (docs/kanit-kayit.json).
import { readFileSync } from 'node:fs';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SAFE_YEARS } from '../../src/data/defaults';
import { heldYears, plannedOutcome } from '../../src/engine/plan';
import { maxCropScenario, maxSafeCommitment, mixedScenario, reachedInAtLeast } from '../../src/engine/promise';
import { coopModel, InputError, sozKarma, sozUrun, taahhutDene, uyePlani } from '../core';
import { createFetchHandler } from '../http-handler';

const KAYIT = JSON.parse(readFileSync('docs/kanit-kayit.json', 'utf8')).values;
const K = DEFAULT_SAFE_YEARS;

describe('soz_kapasitesi = Pano', () => {
  const m = coopModel();
  const mcp = sozUrun('misir', K);

  it("üçüncü büyük sayı (bugün → planlı) Pano'nun fonksiyonlarıyla birebir aynı", () => {
    // OverviewScreen: reachedInAtLeast(sc.today.backtest...) ve maxSafeCommitment(model.planInput, headCrop, K)
    expect(mcp.bugunku_ekimle_t).toBe(Math.floor(reachedInAtLeast(m.scenarios.today.backtest.map((y) => y.productionT.misir ?? 0), K)));
    expect(mcp.planli_dagitimla_t).toBe(Math.floor(maxSafeCommitment(m.planInput, 'misir', K)));
  });

  it('kayıtlı Pano sayılarıyla aynı (1.505 t → 2.639 t)', () => {
    expect(mcp.bugunku_ekimle_t).toBe(KAYIT.guvenliSozBugunT);
    expect(mcp.planli_dagitimla_t).toBe(KAYIT.guvenliSozPlanliT);
  });

  it('"Yalnız mısır" ve "Karma" kutuları Pano ile aynı', () => {
    expect(mcp.yalniz_bu_urun_t).toBe(Math.floor(reachedInAtLeast(maxCropScenario(m.planInput, 'misir').yearly.misir, K)));
    const mixed = mixedScenario(m.planInput);
    const pano = m.crops.map((c) => ({ urun: c.name, t: Math.floor(reachedInAtLeast(mixed.yearly[c.id] ?? [], K)) })).filter((r) => r.t >= 1);
    expect(sozKarma(K).urunler).toEqual(pano);
    expect(sozKarma(K).brut_gelir_tl_yil).toBe(Math.round(mixed.revenue));
  });
});

describe('taahhut_dene = Pano', () => {
  const t = taahhutDene('mısır', 2630);

  it('varsayılan söz (2.630 t mısır): bugün 2, gelişigüzel 8, planlı 17 yıl (kayıtlı Pano sayıları)', () => {
    expect([t.bugun.tuttugu_yil, t.gelisiguzel.tuttugu_yil, t.planli.tuttugu_yil]).toEqual([KAYIT.sozTutanYil.bugun, KAYIT.sozTutanYil.gelisiguzel, KAYIT.sozTutanYil.planli]);
    expect(t.planli.toplam_yil).toBe(20);
  });

  it("Pano'nun taslak önizlemesi (plannedOutcome) ile aynı", () => {
    const m = coopModel();
    expect(t.planli.tuttugu_yil).toBe(plannedOutcome(m.planInput, { misir: 2630 }).held);
    expect(t.planli.tuttugu_yil).toBe(heldYears(m.scenarios.planned.backtest));
  });

  it('brüt gelir Pano ile aynı (62,68 → 80,17 milyon TL)', () => {
    expect(t.bugun.brut_gelir_tl_yil).toBe(Math.round(KAYIT.gelirBugunTl));
    expect(t.planli.brut_gelir_tl_yil).toBe(Math.round(KAYIT.gelirPlanliTl));
  });
});

describe('girdi doğrulaması', () => {
  it('bilinmeyen ürün, negatif dekar, geçersiz ilçe anlaşılır hata verir', () => {
    expect(() => taahhutDene('zeytin', 10)).toThrow(InputError);
    expect(() => taahhutDene('mısır', -1)).toThrow(/sıfırdan büyük/);
    expect(() => uyePlani({ dekar: -5, su_hakki_mm: 300, sulama_yontemi: 'damla', bugunku_ekim: [{ urun: 'mısır', dekar: 1 }] })).toThrow(/dekar sıfırdan büyük/);
    expect(() => uyePlani({ dekar: 50, su_hakki_mm: 300, sulama_yontemi: 'damla', bugunku_ekim: [{ urun: 'mısır', dekar: 10 }], ilce: 'Ankara' })).toThrow(/Bilinmeyen ilçe/);
  });
});

describe('MCP protokolü üzerinden (HTTP işleyicisi, bellekte)', () => {
  const call = async (auth: 'none' | 'key', key?: string) => {
    const h = createFetchHandler({ auth, apiKey: 'deneme-anahtari' });
    const client = new Client({ name: 'test', version: '1' });
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost/mcp'), {
      fetch: (url, init) => h(new Request(url, init)),
      requestInit: key ? { headers: { Authorization: `Bearer ${key}` } } : undefined,
    });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      const res = await client.callTool({ name: 'taahhut_dene', arguments: { urun: 'mısır', ton: 2630 } });
      return { tools, res };
    } finally {
      await client.close();
    }
  };

  it('beş araç, hepsi readOnlyHint; taahhut_dene protokolden de aynı sayıyı verir', async () => {
    const { tools, res } = await call('none');
    expect(tools.map((t) => t.name).sort()).toEqual(['iklim_ozeti', 'kaynaklar', 'soz_kapasitesi', 'taahhut_dene', 'uye_plani']);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true && !!t.title)).toBe(true);
    const out = res.structuredContent as ReturnType<typeof taahhutDene>;
    expect(out.planli.tuttugu_yil).toBe(KAYIT.sozTutanYil.planli);
    expect(out.notlar.join(' ')).toMatch(/kurgusal/);
    expect(out.notlar.join(' ')).toMatch(/brüt/);
  });

  it('anahtarlı modda doğru anahtarla çalışır, anahtarsız 401', async () => {
    await expect(call('key', 'deneme-anahtari')).resolves.toBeTruthy();
    const h = createFetchHandler({ auth: 'key', apiKey: 'deneme-anahtari' });
    const r = await h(new Request('http://localhost/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }));
    expect(r.status).toBe(401);
  });
});
