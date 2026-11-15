// dist/ klasörünü statik olarak sunar. Tek sayfa uygulaması: dosya olmayan GET yolları index.html'e düşer.
import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
};

/** Uzantısız kısa adresler: /presentation, sunum PDF'ini tarayıcıda açar. */
const ALIASES: Record<string, string> = {
  '/presentation': '/presentation.pdf',
  '/presentation/': '/presentation.pdf',
};

export function createStaticHandler(root: string) {
  const index = join(root, 'index.html');
  if (!existsSync(index)) throw new Error(`${index} yok: önce "npm run build" çalıştırın.`);

  const send = (req: IncomingMessage, res: ServerResponse, file: string, status = 200) => {
    const st = statSync(file);
    const immutable = file.includes(`${sep}assets${sep}`);
    res.writeHead(status, {
      'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': st.size,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'x-content-type-options': 'nosniff',
      ...(extname(file).toLowerCase() === '.pdf' ? { 'content-disposition': 'inline; filename="Nobet-presentation.pdf"' } : {}),
    });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  };

  return (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' });
      return res.end();
    }
    let path: string;
    try {
      path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    path = ALIASES[path] ?? path;
    // klasör dışına çıkmayı engelle
    const file = normalize(join(root, path));
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403);
      return res.end();
    }
    if (existsSync(file) && statSync(file).isFile()) return send(req, res, file);
    // uzantılı ama olmayan dosya (ör. /assets/yok.js) 404; diğer yollar uygulamaya
    if (extname(path)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Bulunamadı');
    }
    return send(req, res, index);
  };
}
