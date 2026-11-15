# OAuth planı (yazılmadı)

Şimdilik iki mod var: girişsiz (`MCP_AUTH=none`) ve sabit anahtar (`MCP_AUTH=key`). OAuth gerekirse plan şu. Kaynak: MCP yetkilendirme belgesi (modelcontextprotocol.io, `specification/latest/basic/authorization`, 2026-07-28 sürümü, 15.11.2026'da okundu) ve claude.ai özel bağlayıcı sayfası.

**Rol.** Nöbet yalnız *kaynak sunucusu* olur; kullanıcı girişi ve belirteç üretimi hazır bir yetkilendirme sunucusunda (Auth0, WorkOS, Clerk, Stytch ya da Keycloak gibi) kalır. Kendi yetkilendirme sunucumuzu yazmayız.

**Eklenecek uç noktalar (Vercel'de aynı alan adı):**
- `GET /.well-known/oauth-protected-resource`: RFC 9728 korumalı kaynak üst verisi (`resource: https://ALAN/mcp`, `authorization_servers: [...]`, `scopes_supported: ["nobet:read"]`). Belgeye göre ZORUNLU.
- `/mcp` belirteçsiz ya da geçersiz belirteçle **401** ve `WWW-Authenticate: Bearer resource_metadata="https://ALAN/.well-known/oauth-protected-resource", scope="nobet:read"`.
- Her istekte belirteç doğrulama: imza (JWKS), süre, `iss` ve **hedef kitle** (`aud` = `https://ALAN/mcp`, RFC 8707). Başka kaynak için verilmiş belirteç reddedilir.

**Yetkilendirme sunucusundan beklenen:** OAuth 2.1 + PKCE; RFC 8414 ya da OIDC keşif belgesi; istemci kaydı için Client ID Metadata Documents (belgeye göre önerilen) ya da Dynamic Client Registration (belgede "deprecated, geriye uyumluluk için"). claude.ai "Register automatically" ya da "Use your own OAuth client" seçeneklerini sunuyor; ikincisinde yönlendirme adresi `https://claude.ai/api/mcp/auth_callback`.

**Kütüphane.** `@modelcontextprotocol/server` 2.4.0 içinde `buildOAuthProtectedResourceMetadata`, `bearerAuthChallengeResponse`, `verifyBearerToken` ve `requireBearerAuth` dışa aktarılıyor (tür dosyalarında gördüm, kullanmadım; ayrıntısı `docs/serving/authorization.md`'de, okumadım). JWT doğrulaması için `jose` (`createRemoteJWKSet`, `jwtVerify`).

**Tahmini iş:** yetkilendirme sunucusunu (hazır hizmet) kurmak ve istemci kaydını ayarlamak 0,5 gün; üst veri uç noktası, 401 başlığı ve belirteç doğrulaması 0,5 gün; claude.ai ve MCP Inspector ile uçtan uca deneme ve testler 0,5-1 gün. Toplam **1,5-2 gün**. Araçlar salt okunur ve veriler kurgusal olduğu için demo için girişsiz mod yeterli; OAuth gerçek üye verisi girildiğinde gerekir.
