// 示例银行（香港）MCP server 配置。所有 URL 均为虚构示例。

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}

export const config = {
  /** MCP server 的规范 URI（RFC 8707 resource / RFC 9728 resource），也是 access token 的 aud */
  resourceUrl: new URL(required('MCP_RESOURCE_URL', 'https://mcp.examplebank.hk/mcp')),

  /** 授权服务器 issuer，必须与 AS 元数据中的 issuer 完全一致 */
  issuer: required('AS_ISSUER', 'https://auth.examplebank.hk'),
  jwksUrl: new URL(required('AS_JWKS_URL', 'https://auth.examplebank.hk/jwks')),

  /** 内部 STS：MCP server 用 RFC 8693 Token Exchange 换取访问核心 API 的内部 token */
  internalStsUrl: new URL(required('INTERNAL_STS_URL', 'https://sts.internal.examplebank.hk/token')),
  internalApiAudience: 'https://api.internal.examplebank.hk',

  /** 用户在银行侧签核草稿的页面（由银行渲染，AI 客户端不可见其内容） */
  approvalBaseUrl: new URL(required('APPROVAL_BASE_URL', 'https://secure.examplebank.hk/ai/approve')),

  /** MRTR requestState 的 HMAC 密钥，至少 32 字节；多实例部署时须共享 */
  requestStateKey: required('REQUEST_STATE_KEY', 'dev-only-key-change-me-dev-only-key-change-me'),

  /** access token 允许的签名算法（FAPI 2.0 要求 PS256 / ES256 / EdDSA） */
  allowedAlgs: ['PS256', 'ES256'] as string[],
} as const;
