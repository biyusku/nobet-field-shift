// Yayın sunucusu (Railway): tek Node süreci hem siteyi (dist/) hem MCP'yi (/mcp, streamable HTTP) sunar.
//   npm run build && PORT=3000 npm start
// Ortam değişkenleri: PORT (varsayılan 3000), MCP_AUTH, MCP_API_KEY, ALLOWED_ORIGINS, MCP_TIMEOUT_MS
// (ayrıntı: mcp/http-handler.ts ve mcp/README.md).
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createFetchHandler, optionsFromEnv } from './http-handler';
import { mode } from './runner';
import { createStaticHandler } from './static';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const root = fileURLToPath(new URL('../dist', import.meta.url));

const opts = optionsFromEnv();
const mcp = toNodeHandler({ fetch: createFetchHandler({ ...opts, log: (l) => console.log(`[mcp] ${l}`) }) });
const site = createStaticHandler(root);

const server = createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0].replace(/\/+$/, '');
  if (path === '/mcp') return void mcp(req, res);
  site(req, res);
});
// Railway'in kenar sunucusu bağlantıları uzun tutabilir; Node'un varsayılan zaman aşımları yeterli.
server.listen(PORT, HOST, () => {
  console.log(
    `[nobet] http://${HOST}:${PORT} · site: dist/ · MCP: /mcp · giriş: ${opts.auth}${opts.auth === 'key' ? (opts.apiKey ? ' (anahtar tanımlı)' : ' (UYARI: MCP_API_KEY yok, her MCP isteği 401 alır)') : ''} · Origin: ${opts.allowedOrigins === '*' ? 'hepsi' : [...(opts.allowedOrigins ?? []), 'kendi alan adı'].join(', ')} · ağır hesap: ${mode()}`,
  );
});
for (const sig of ['SIGTERM', 'SIGINT'] as const) process.on(sig, () => server.close(() => process.exit(0)));
