// Vercel sunucusuz işlevi: sitenin alan adında /mcp (vercel.json bu yolu buraya yönlendirir).
// Bütün mantık mcp/ klasöründe; bu dosya yalnız Vercel'in beklediği giriş noktasıdır.
// Ayarlar ortam değişkeninden: MCP_AUTH=none (varsayılan) ya da key; key için MCP_API_KEY.
import { createFetchHandler, optionsFromEnv } from '../mcp/http-handler';

const handler = createFetchHandler({ ...optionsFromEnv(), log: (l) => console.log(`[nobet-mcp] ${l}`) });

export default {
  fetch(request: Request) {
    return handler(request);
  },
};
