# 示例代码

配合系列文章的骨架实现，**仅用于说明设计，不可直接用于生产**。所有域名、客户号、账户均为虚构。

## mcp-server（TypeScript）

示例银行（香港）的 MCP server：OAuth 资源服务器、只读工具、冻结卡、支付草稿与 MRTR URL 模式 elicitation、dynamic linking 签核校验。

- 依赖：`@modelcontextprotocol/server` 2.3.1（MCP `2026-07-28`）、`@modelcontextprotocol/node` 2.1.1、`@modelcontextprotocol/express` 2.0.2、`jose`、`zod`、`express`
- Node.js ≥ 20

```bash
cd mcp-server
npm install
npm run typecheck
npm run build && npm start   # 环境变量见 src/config.ts
```

生产化前需替换的内存结构：`drafts/store.ts`（草稿）、`auth/grants.ts`（撤销表与客户端开关）、`auth/middleware.ts` 中的 DPoP `jti` 去重、`auth/tokenExchange.ts` 中的缓存与 STS 客户端认证、`coreApi.ts`（内部 API 桩）。

## authz-server（Python）

授权服务器侧的策略组件，仅依赖标准库：

- `as_metadata.json`：AS 元数据示例
- `cimd_policy.py`：CIMD 域名允许名单、SSRF 防护、元数据与回调地址校验
- `rar_consent.py`：RAR 申请的政策收紧与繁体中文同意文案
- `token_policy.py`：按客户端能力与 scope 风险决定 token 生命周期

```bash
cd authz-server
python3 -m unittest -v test_authz
```

对应文章见仓库根目录 [README](../README.md)。
