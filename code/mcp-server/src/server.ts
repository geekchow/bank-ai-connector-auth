// 示例银行（香港）MCP server 入口（第 12 篇）。
//   GET  /.well-known/oauth-protected-resource/mcp   RFC 9728 Protected Resource Metadata
//   POST /mcp                                         MCP Streamable HTTP（2026-07-28，无状态）

import express from 'express';
import { McpServer, createMcpHandler, createRequestStateCodec } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { config } from './config.js';
import { baselineScopes } from './auth/scopes.js';
import { bankAuth } from './auth/middleware.js';
import { registerAccountTools } from './tools/accounts.js';
import { registerCardTools } from './tools/cards.js';
import { registerPaymentTools, type DraftState } from './tools/payments.js';

// MRTR 的 requestState 会经过客户端往返，必须做完整性保护并绑定到当前用户与方法
const codec = createRequestStateCodec<DraftState>({
  key: config.requestStateKey,
  ttlSeconds: 15 * 60,
  bind: (ctx) => {
    const sub = (ctx.http?.authInfo?.extra as { sub?: string } | undefined)?.sub ?? '';
    return `${ctx.mcpReq.method}\0${sub}`;
  },
});

function buildServer(): McpServer {
  const server = new McpServer(
    { name: 'examplebank-hk', version: '0.1.0' },
    { requestState: { verify: codec.verify } },
  );
  // 工具列表对所有调用者一致（2026-07-28：list 结果不再按连接变化），权限由 scopeChallenge 与 RAR 控制
  registerAccountTools(server);
  registerCardTools(server);
  registerPaymentTools(server, codec);
  return server;
}

const mcpHandler = createMcpHandler(() => buildServer(), {
  // 银行上线新服务时可以直接只服务 2026-07-28；若需兼容旧客户端，改为 'stateless'
  legacy: 'reject',
});

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // 位于银行 API 网关之后

// RFC 9728：resource 必须与用户在客户端里填写的 MCP URL 完全一致（含路径）
app.get(`/.well-known/oauth-protected-resource${config.resourceUrl.pathname}`, (_req, res) => {
  res.json({
    resource: config.resourceUrl.href,
    authorization_servers: [config.issuer],
    scopes_supported: baselineScopes,
    bearer_methods_supported: ['header'],
    resource_name: '示例银行（香港）AI 连接',
    resource_documentation: 'https://developer.examplebank.hk/ai-connector',
    // 支持 DPoP 的客户端可以使用持有者约束 token（RFC 9449 §5.1 / RFC 9728）
    dpop_signing_alg_values_supported: ['ES256', 'PS256'],
  });
});

app.post(config.resourceUrl.pathname, express.json({ limit: '64kb' }), bankAuth, (req, res) =>
  toNodeHandler(mcpHandler)(req, res, req.body),
);

app.listen(Number(process.env.PORT ?? 8080));
