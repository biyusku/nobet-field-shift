// HTTP (streamable HTTP) işleyicisi, Web standardı Request -> Response.
// Hem yerel `npm run mcp:http` hem sunucusuz işlev (api/mcp.ts) bunu kullanır.
//
// Ayarlar (ortam değişkeni):
//   MCP_AUTH=none (varsayılan)  girişsiz; araçların hepsi salt okunur
//   MCP_AUTH=key                her istek `Authorization: Bearer <MCP_API_KEY>` ister; yoksa ya da yanlışsa 401
//   MCP_API_KEY                 anahtar; koda yazılmaz, günlüğe yazılmaz
//   MCP_ALLOWED_ORIGINS         tarayıcıdan gelen isteklerde izin verilen Origin ana makineleri (virgülle);
//                               varsayılan: localhost adları ve claude.ai. Origin başlığı olmayan istek geçer.
import { createHash, timingSafeEqual } from 'node:crypto';
import { createMcpHandler, localhostAllowedOrigins, originValidationResponse } from '@modelcontextprotocol/server';
import { createServer } from './server';

export type AuthMode = 'none' | 'key';

export interface HttpOptions {
  auth: AuthMode;
  apiKey?: string;
  allowedOrigins?: string[];
  /** MCP uç noktası sayılan yollar */
  paths?: string[];
  log?: (line: string) => void;
}

export function optionsFromEnv(env: NodeJS.ProcessEnv = process.env): HttpOptions {
  const raw = (env.MCP_AUTH ?? 'none').trim().toLowerCase();
  if (raw !== 'none' && raw !== 'key') throw new Error(`MCP_AUTH yalnız "none" ya da "key" olabilir (verilen: "${raw}").`);
  return {
    auth: raw,
    apiKey: env.MCP_API_KEY || undefined,
    allowedOrigins: env.MCP_ALLOWED_ORIGINS ? env.MCP_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
  };
}

/** Sabit süreli karşılaştırma: anahtarların özetleri karşılaştırılır (uzunluk sızmasın diye). */
function sameKey(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

export function createFetchHandler(opts: HttpOptions): (request: Request) => Promise<Response> {
  const mcp = createMcpHandler(createServer, { responseMode: 'json' });
  const origins = opts.allowedOrigins ?? [...localhostAllowedOrigins(), 'claude.ai'];
  const paths = opts.paths ?? ['/mcp', '/api/mcp'];
  const log = opts.log ?? (() => {});

  return async (request: Request) => {
    const url = new URL(request.url);
    const done = (res: Response) => {
      // yalnız yöntem, yol ve durum; başlık ve gövde (anahtar) yazılmaz
      log(`${request.method} ${url.pathname} -> ${res.status}`);
      return res;
    };
    if (!paths.includes(url.pathname.replace(/\/$/, ''))) return done(json(404, { hata: 'Bulunamadı. MCP uç noktası /mcp yolundadır.' }));

    const bad = originValidationResponse(request, origins);
    if (bad) return done(bad);

    if (opts.auth === 'key') {
      const challenge = { 'www-authenticate': 'Bearer realm="nobet-mcp"' };
      if (!opts.apiKey) return done(json(401, { hata: 'Sunucu anahtarlı modda ama MCP_API_KEY tanımlı değil; istek kabul edilmedi.' }, challenge));
      const h = request.headers.get('authorization') ?? '';
      const m = /^Bearer\s+(.+)$/i.exec(h.trim());
      if (!m || !sameKey(m[1], opts.apiKey)) return done(json(401, { hata: 'Yetkisiz: Authorization: Bearer <anahtar> başlığı eksik ya da yanlış.' }, challenge));
    }

    return done(await mcp.fetch(request));
  };
}
