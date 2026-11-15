// HTTP (streamable HTTP) işleyicisi, Web standardı Request -> Response.
// Hem yerel `npm run mcp:http` hem sunucusuz işlev (api/mcp.ts) bunu kullanır.
//
// Ayarlar (ortam değişkeni):
//   MCP_AUTH=none (varsayılan)  girişsiz; araçların hepsi salt okunur
//   MCP_AUTH=key                her istek `Authorization: Bearer <MCP_API_KEY>` ister; yoksa ya da yanlışsa 401
//   MCP_API_KEY                 anahtar; koda yazılmaz, günlüğe yazılmaz
//   ALLOWED_ORIGINS             Origin başlığı taşıyan isteklerde izin verilen kaynaklar (virgülle; tam adres ya da
//                               ana makine adı). Varsayılan: claude.ai ve RAILWAY_PUBLIC_DOMAIN. Kendi alan adı (isteğin
//                               Host'u) her zaman geçer. "*" Origin kontrolünü kapatır. Eski adı MCP_ALLOWED_ORIGINS.
//                               Origin başlığı OLMAYAN istek her zaman geçer: claude.ai bağlayıcısı Anthropic'in
//                               bulutundan sunucudan sunucuya bağlanır (support.claude.com, 15.11.2026).
import { createHash, timingSafeEqual } from 'node:crypto';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer } from './server';

export type AuthMode = 'none' | 'key';

export interface HttpOptions {
  auth: AuthMode;
  apiKey?: string;
  /** izin verilen Origin ana makineleri; '*' = kontrol yok. Kendi alan adı her zaman eklenir. */
  allowedOrigins?: string[] | '*';
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
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS ?? env.MCP_ALLOWED_ORIGINS, env.RAILWAY_PUBLIC_DOMAIN),
  };
}

/** "https://a.com, b.com" -> ['a.com','b.com']; boşsa varsayılan: claude.ai ve Railway alan adı. */
export function parseOrigins(raw: string | undefined, railwayDomain?: string): string[] | '*' {
  if (raw?.trim() === '*') return '*';
  const list = (raw ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      try {
        return new URL(x.includes('://') ? x : `https://${x}`).hostname.toLowerCase();
      } catch {
        return x.toLowerCase();
      }
    });
  return list.length ? list : ['claude.ai', ...(railwayDomain ? [railwayDomain.toLowerCase()] : [])];
}

/** Origin denetimi: başlık yoksa geçer; varsa ana makinesi listede ya da isteğin kendi Host'u olmalı. */
function originRejected(request: Request, allowed: string[] | '*'): Response | null {
  const origin = request.headers.get('origin');
  if (origin === null || allowed === '*') return null;
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    host = '';
  }
  const own = new URL(request.url).hostname.toLowerCase();
  if (host && (host === own || allowed.includes(host))) return null;
  return json(403, { hata: `Bu kaynaktan (Origin: ${origin}) gelen istek kabul edilmiyor. İzin verilenler: kendi alan adı, ${allowed.join(', ')}.` });
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
  const origins = opts.allowedOrigins ?? ['claude.ai'];
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

    const bad = originRejected(request, origins);
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
