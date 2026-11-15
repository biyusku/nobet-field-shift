import { defineConfig } from 'vitest/config';

// MCP testleri sitenin testlerinden ayrı çalışır: npm run mcp:test
export default defineConfig({
  test: { environment: 'node', include: ['mcp/test/**/*.test.ts'], root: '.', testTimeout: 60000 },
});
