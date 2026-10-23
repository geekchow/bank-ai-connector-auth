// Access token 校验（第 3、6、7 篇）。
// 假设 AS 签发 RFC 9068 格式的 JWT access token；若用不透明 token，改为 RFC 7662 内省，校验项不变。

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { OAuthError, OAuthErrorCode, type AuthInfo } from '@modelcontextprotocol/server';
import { config } from '../config.js';

const jwks = createRemoteJWKSet(config.jwksUrl);

/** ExampleBank access token 中我们关心的 claim */
export interface BankAccessTokenClaims extends JWTPayload {
  client_id: string;
  scope?: string;
  /** 本次授权（grant）的标识：审计、撤销、授权管理中心都以它为主键 */
  grant_id: string;
  /** RFC 9396 */
  authorization_details?: unknown[];
  /** RFC 9449 / RFC 8705 持有者约束 */
  cnf?: { jkt?: string; 'x5t#S256'?: string };
  /** 认证强度与时间，用于判断是否需要 step-up */
  acr?: string;
  auth_time?: number;
}

export interface BankAuthExtra {
  [key: string]: unknown;
  sub: string;
  grantId: string;
  authorizationDetails: unknown[];
  cnfJkt?: string;
  acr?: string;
  authTime?: number;
}

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  let payload: BankAccessTokenClaims;
  try {
    const result = await jwtVerify<BankAccessTokenClaims>(token, jwks, {
      issuer: config.issuer,
      // aud 必须是本 MCP server 的规范 URI —— 这一行就是对 token passthrough / 跨资源复用的第一道防线
      audience: config.resourceUrl.href,
      algorithms: config.allowedAlgs,
      typ: 'at+jwt',
      requiredClaims: ['exp', 'iat', 'sub', 'client_id', 'grant_id'],
      clockTolerance: 30,
    });
    payload = result.payload;
  } catch {
    throw new OAuthError(OAuthErrorCode.InvalidToken, 'access token is invalid or expired');
  }

  const extra: BankAuthExtra = {
    sub: payload.sub!,
    grantId: payload.grant_id,
    authorizationDetails: payload.authorization_details ?? [],
    cnfJkt: payload.cnf?.jkt,
    acr: payload.acr,
    authTime: payload.auth_time,
  };

  return {
    token,
    clientId: payload.client_id,
    scopes: payload.scope?.split(' ').filter(Boolean) ?? [],
    expiresAt: payload.exp,
    resource: config.resourceUrl,
    extra,
  };
}

export function bankExtra(auth: AuthInfo | undefined): BankAuthExtra {
  if (!auth?.extra) throw new OAuthError(OAuthErrorCode.InvalidToken, 'unauthenticated');
  return auth.extra as BankAuthExtra;
}
