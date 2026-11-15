// Yerel HTTP modu: http://127.0.0.1:8787/mcp
//   npm run mcp:http                          girişsiz (MCP_AUTH=none)
//   MCP_AUTH=key MCP_API_KEY=... npm run mcp:http   anahtarlı
// Yalnız 127.0.0.1'e bağlanır ve Host başlığını localhost adlarıyla sınırlar (DNS rebinding'e karşı).
import { createServer } from 'node:http';
import { localhostHostValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { createFetchHandler, optionsFromEnv } from './http-handler';
import { mode } from './runner';

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.MCP_HOST || '127.0.0.1';
const opts = optionsFromEnv();
const handler = createFetchHandler({ ...opts, log: (l) => console.error(`[nobet-mcp] ${l}`) });
const node = toNodeHandler({ fetch: (req: Request) => handler(req) });
const validateHost = localhostHostValidation();

createServer((req, res) => {
  if (!validateHost(req, res)) return;
  void node(req, res);
}).listen(PORT, HOST, () => {
  console.error(`[nobet-mcp] HTTP: http://${HOST}:${PORT}/mcp · giriş: ${opts.auth}${opts.auth === 'key' ? (opts.apiKey ? ' (anahtar tanımlı)' : ' (UYARI: MCP_API_KEY yok, her istek 401 alır)') : ''} · hesap: ${mode()}`);
});
