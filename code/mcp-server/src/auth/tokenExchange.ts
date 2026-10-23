// 内外凭证隔离：RFC 8693 Token Exchange（第 6 篇）。
// MCP server 绝不把 AI 客户端给它的 token 转发给内部 API（token passthrough）。
// 它把外部 token 作为 subject_token 交给内部 STS，换取 aud 指向内部 API、带 act 声明的短期内部 token。

import { config } from '../config.js';

export interface InternalToken {
  accessToken: string;
  expiresAt: number;
}

const cache = new Map<string, InternalToken>();

export async function exchangeForInternalToken(externalToken: string, grantId: string): Promise<InternalToken> {
  const cached = cache.get(grantId);
  if (cached && cached.expiresAt - 30 > Date.now() / 1000) return cached;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: externalToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    audience: config.internalApiAudience,
  });

  // MCP server 自身作为机密客户端向 STS 认证（生产环境：mTLS 或 private_key_jwt，此处省略）
  const res = await fetch(config.internalStsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  const token = { accessToken: json.access_token, expiresAt: Math.floor(Date.now() / 1000) + json.expires_in };
  cache.set(grantId, token);
  return token;
}

export function evictInternalToken(grantId: string): void {
  cache.delete(grantId);
}
