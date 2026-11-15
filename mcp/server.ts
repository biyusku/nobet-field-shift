// MCP sunucusu: beş salt okunur araç. Hem stdio hem HTTP bu fabrikayı kullanır.
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { iklimOzeti, InputError, kaynaklar, sozSonuc, URUN_ADI, URUN_IDLERI, type SozSatiri, type sozKarma } from './core';
import { call, TimeoutError } from './runner';

/** Ürün başına süre sınırı: normal ürünler 1,2 sn'nin altında bitiyor (Node, M serisi Mac). */
const SOZ_URUN_LIMIT_MS = 10000;
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

/** Sonucu metin (JSON) ve yapılandırılmış içerik olarak döndürür; hatayı anlaşılır metne çevirir. */
async function run(fn: () => Record<string, unknown> | Promise<Record<string, unknown>>) {
  try {
    const out = await fn();
    return { content: [{ type: 'text' as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
  } catch (err) {
    const msg = err instanceof InputError || err instanceof TimeoutError ? err.message : `Hesap yapılamadı: ${err instanceof Error ? err.message : String(err)}`;
    return { content: [{ type: 'text' as const, text: msg }], isError: true };
  }
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'nobet', title: 'Nöbet', version: '0.1.0' });

  server.registerTool(
    'iklim_ozeti',
    {
      title: 'İklim özeti',
      description: "Bir Konya ilçesi için NASA POWER'dan 20 yıllık yıllık yağış ve ET0, aylık ortalamalar ve en kurak yıl.",
      inputSchema: z.object({ ilce: z.string().describe('Karapınar, Çumra, Ereğli, Cihanbeyli ya da Altınekin') }),
      annotations: { title: 'İklim özeti', ...READ_ONLY },
    },
    async ({ ilce }) => run(() => iklimOzeti(ilce)),
  );

  server.registerTool(
    'uye_plani',
    {
      title: 'Üye planı',
      description: 'Bir tarlanın bugünkü ekimi ve önerilen plan: su bitiş tarihi, ürün başına dekar ve ton, brüt gelir.',
      inputSchema: z.object({
        dekar: z.number().describe('Tarla büyüklüğü, dekar'),
        su_hakki_mm: z.number().describe('Yıllık su hakkı, tarla geneline mm (1 mm × 1 da = 1 m³)'),
        sulama_yontemi: z.string().describe('salma, yağmurlama ya da damla'),
        bugunku_ekim: z.array(z.object({ urun: z.string(), dekar: z.number() })).describe('Bugün ekilenler, ör. [{"urun":"mısır","dekar":60}]'),
        ilce: z.string().optional().describe('Havanın okunacağı ilçe; varsayılan Karapınar'),
      }),
      annotations: { title: 'Üye planı', ...READ_ONLY },
    },
    async (a) => run(() => call('uyePlani', [a])),
  );

  server.registerTool(
    'soz_kapasitesi',
    {
      title: 'Söz kapasitesi',
      description: 'Örnek (kurgusal) kooperatifin ürün ürün güvenle verebileceği söz; "yalnız mısır" ve "karma".',
      inputSchema: z.object({ esik_yil: z.number().int().optional().describe('Sözün 20 yılın en az kaçında tutması istenir; varsayılan 16') }),
      annotations: { title: 'Söz kapasitesi', ...READ_ONLY },
    },
    async ({ esik_yil }) =>
      run(async () => {
        const K = esik_yil ?? 16;
        const karma = await call<ReturnType<typeof sozKarma>>('sozKarma', [K]);
        const urunler: SozSatiri[] = [];
        for (const id of URUN_IDLERI) {
          try {
            urunler.push(await call<SozSatiri>('sozUrun', [id, K], SOZ_URUN_LIMIT_MS));
          } catch (e) {
            if (!(e instanceof TimeoutError)) throw e;
            urunler.push({ urun: URUN_ADI[id] ?? id, bugunku_ekimle_t: null, planli_dagitimla_t: null, yalniz_bu_urun_t: null, yalniz_bu_urun_brut_gelir_tl: null, not: `Hesaplanamadı: ${e.message}` });
          }
        }
        return sozSonuc(K, urunler, karma);
      }),
  );

  server.registerTool(
    'taahhut_dene',
    {
      title: 'Taahhüt dene',
      description: 'Bir satış sözü 20 yılın kaçında tutuyor: bugün, gelişigüzel dağıtım, planlı dağıtım; en kötü yıl.',
      inputSchema: z.object({ urun: z.string().describe('Ürün adı, ör. mısır'), ton: z.number().describe('Söz verilen miktar, ton') }),
      annotations: { title: 'Taahhüt dene', ...READ_ONLY },
    },
    async ({ urun, ton }) => run(() => call('taahhutDene', [urun, ton])),
  );

  server.registerTool(
    'kaynaklar',
    {
      title: 'Kaynaklar',
      description: 'Modele giren her girdinin sınıfı (NASA verisi, kaynaklı, varsayım, kurgusal) ve bağlantısı.',
      annotations: { title: 'Kaynaklar', ...READ_ONLY },
    },
    async () => run(() => kaynaklar()),
  );

  return server;
}
