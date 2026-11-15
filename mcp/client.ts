// Küçük deneme istemcisi: sunucuya bağlanır, araç listesini alır, her aracı bir kez çağırır.
//   npx tsx mcp/client.ts                       yerel (stdio) sunucuyu kendisi başlatır
//   npx tsx mcp/client.ts http://127.0.0.1:8787/mcp   çalışan HTTP sunucusuna bağlanır
//                                               (MCP_API_KEY varsa Authorization: Bearer başlığıyla)
//   --md <dosya>                                sonuçları Markdown olarak da yazar
import { writeFileSync } from 'node:fs';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const args = process.argv.slice(2);
const mdIdx = args.indexOf('--md');
const mdFile = mdIdx >= 0 ? args[mdIdx + 1] : null;
const url = args.find((a) => a.startsWith('http'));

const CALLS: { name: string; arguments: Record<string, unknown> }[] = [
  { name: 'iklim_ozeti', arguments: { ilce: 'Karapınar' } },
  {
    name: 'uye_plani',
    arguments: { dekar: 100, su_hakki_mm: 300, sulama_yontemi: 'yağmurlama', bugunku_ekim: [{ urun: 'mısır', dekar: 70 }, { urun: 'buğday', dekar: 30 }] },
  },
  { name: 'soz_kapasitesi', arguments: { esik_yil: 16 } },
  { name: 'taahhut_dene', arguments: { urun: 'mısır', ton: 2630 } },
  { name: 'kaynaklar', arguments: {} },
  // hatalı girdiler: anlaşılır hata dönmeli
  { name: 'iklim_ozeti', arguments: { ilce: 'Ankara' } },
  { name: 'uye_plani', arguments: { dekar: -5, su_hakki_mm: 300, sulama_yontemi: 'damla', bugunku_ekim: [{ urun: 'mısır', dekar: 5 }] } },
  { name: 'taahhut_dene', arguments: { urun: 'zeytin', ton: 100 } },
];

const transport = url
  ? new StreamableHTTPClientTransport(new URL(url), process.env.MCP_API_KEY ? { requestInit: { headers: { Authorization: `Bearer ${process.env.MCP_API_KEY}` } } } : undefined)
  : new StdioClientTransport({ command: process.execPath, args: ['--import', 'tsx', 'mcp/stdio.ts'], stderr: 'inherit' });

const client = new Client({ name: 'nobet-deneme-istemcisi', version: '0.1.0' });
const md: string[] = [`# Nöbet MCP: örnek çıktılar`, '', `Bağlantı: ${url ?? 'stdio (npx tsx mcp/stdio.ts)'} · ${new Date().toISOString()}`, ''];
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  console.log(`ARAÇLAR (${tools.length}):`);
  md.push(`## Araç listesi (${tools.length})`, '', '| Ad | Başlık | readOnlyHint | Açıklama |', '|---|---|---|---|');
  for (const t of tools) {
    console.log(`  ${t.name} · ${t.title ?? ''} · readOnlyHint=${t.annotations?.readOnlyHint} · ${t.description}`);
    md.push(`| ${t.name} | ${t.title ?? ''} | ${t.annotations?.readOnlyHint} | ${t.description} |`);
  }
  md.push('');
  for (const c of CALLS) {
    const t0 = Date.now();
    const res = await client.callTool(c);
    const ms = Date.now() - t0;
    const text = (res.content as { type: string; text?: string }[]).map((b) => b.text ?? '').join('\n');
    console.log(`\n=== ${c.name} ${JSON.stringify(c.arguments)} · ${ms} ms${res.isError ? ' · HATA' : ''}`);
    console.log(text.length > 1500 ? text.slice(0, 1500) + `\n… (${text.length} karakter)` : text);
    md.push(`## ${c.name}${res.isError ? ' (hatalı girdi)' : ''}`, '', `Girdi: \`${JSON.stringify(c.arguments)}\` · ${ms} ms${res.isError ? ' · isError: true' : ''}`, '', '```json', text, '```', '');
  }
} finally {
  await client.close();
}
if (mdFile) writeFileSync(mdFile, md.join('\n'));
