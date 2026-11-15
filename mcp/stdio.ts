// Yerel mod: stdin/stdout üzerinden MCP. Kimlik doğrulama yok.
// stdout protokol kanalıdır; günlük yalnız stderr'e yazılır.
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server';

serveStdio(createServer, { onerror: (e) => console.error('[nobet-mcp]', e.message) });
console.error('[nobet-mcp] stdio sunucusu hazır');
