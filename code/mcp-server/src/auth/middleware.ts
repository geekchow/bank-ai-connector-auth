// MCP server 的认证闸门（第 3、6、7、8 篇）。
// 没有直接使用 SDK 的 requireBearerAuth，是因为银行还要处理 DPoP 方案、授权撤销和客户端开关；
// 返回的 401 形状与 MCP 2026-07-28 授权规范一致。

import type { RequestHandler, Response } from 'express';
// 引入 req.auth 的类型扩展（由 @modelcontextprotocol/express 声明，toNodeHandler 会把它转交给工具的 ctx.http.authInfo）
import type {} from '@modelcontextprotocol/express';
import { OAuthError, OAuthErrorCode, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/server';
import { config } from '../config.js';
import { baselineScopes } from './scopes.js';
import { verifyAccessToken, type BankAuthExtra } from './verifier.js';
import { verifyDpopProof } from './dpop.js';
import { isClientEnabled, isGrantActive } from './grants.js';
import { audit } from '../audit.js';

export const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(config.resourceUrl);

const seenJti = new Map<string, number>();
async function rememberJti(jti: string, exp: number): Promise<boolean> {
  if (seenJti.has(jti)) return false;
  seenJti.set(jti, exp); // 生产环境用带 TTL 的共享存储（如 Redis SET NX EX）
  return true;
}

function challenge(res: Response, status: 401 | 403, error?: string, description?: string, scheme = 'Bearer'): void {
  const parts = [`resource_metadata="${resourceMetadataUrl}"`];
  if (error) parts.unshift(`error="${error}"`);
  if (description) parts.push(`error_description="${description}"`);
  // 首次 401 给出最小基础 scope，客户端据此申请；更高权限靠运行时 insufficient_scope 增量申请
  if (!error) parts.push(`scope="${baselineScopes.join(' ')}"`);
  res.status(status).set('WWW-Authenticate', `${scheme} ${parts.join(', ')}`).json({ error: error ?? 'unauthorized' });
}

export const bankAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ', 2);
  if (!token || !/^(Bearer|DPoP)$/i.test(scheme ?? '')) return challenge(res, 401);

  try {
    const auth = await verifyAccessToken(token);
    const extra = auth.extra as BankAuthExtra;

    if (!isClientEnabled(auth.clientId)) {
      audit({ action: 'authn', outcome: 'denied', reason: 'client_disabled' }, auth);
      return challenge(res, 401, 'invalid_token', 'client disabled by bank');
    }
    if (!isGrantActive(extra.grantId)) {
      audit({ action: 'authn', outcome: 'denied', reason: 'grant_revoked' }, auth);
      return challenge(res, 401, 'invalid_token', 'authorization revoked');
    }

    if (extra.cnfJkt) {
      // 持有者约束 token：必须使用 DPoP 方案并附带有效证明
      if (scheme!.toLowerCase() !== 'dpop') return challenge(res, 401, 'invalid_token', 'DPoP-bound token');
      await verifyDpopProof({
        proof: req.get('DPoP'),
        accessToken: token,
        expectedJkt: extra.cnfJkt,
        method: req.method,
        url: `${config.resourceUrl.origin}${req.baseUrl}${req.path}`,
        rememberJti,
      }).catch(() => {
        throw new OAuthError(OAuthErrorCode.InvalidDpopProof, 'invalid DPoP proof');
      });
    }

    req.auth = { ...auth, resourceMetadataUrl };
    next();
  } catch (e) {
    const code = e instanceof OAuthError ? e.code : OAuthErrorCode.InvalidToken;
    // RFC 9449 §7.1：DPoP 相关错误用 DPoP 方案回挑战
    const scheme = code === OAuthErrorCode.InvalidDpopProof ? 'DPoP' : 'Bearer';
    return challenge(res, 401, code, 'token rejected', scheme);
  }
};
