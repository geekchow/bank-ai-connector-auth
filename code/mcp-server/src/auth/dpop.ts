// DPoP 证明校验（RFC 9449，第 7 篇）。
// 只在 token 带有 cnf.jkt 时启用。撰写时（2026-10）Claude 的 connector 客户端文档未提及 DPoP，
// 因此对不支持 DPoP 的客户端，银行需走第 7 篇的补偿控制，而不是在这里放宽校验。

import { createHash } from 'node:crypto';
import { calculateJwkThumbprint, decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose';

export interface DpopCheckInput {
  proof: string | undefined;
  accessToken: string;
  expectedJkt: string;
  method: string;
  /** 请求的完整 URL，不含 query 和 fragment */
  url: string;
  /** jti 去重：返回 false 表示已见过（重放） */
  rememberJti: (jti: string, expiresAtSec: number) => Promise<boolean>;
}

export async function verifyDpopProof(input: DpopCheckInput): Promise<void> {
  if (!input.proof) throw new Error('missing DPoP proof');

  const header = decodeProtectedHeader(input.proof);
  if (header.typ !== 'dpop+jwt' || !header.jwk) throw new Error('bad DPoP header');
  if (header.alg !== 'ES256' && header.alg !== 'PS256') throw new Error('bad DPoP alg');

  // 证明里的公钥必须正是 token 绑定的那把钥匙
  const jkt = await calculateJwkThumbprint(header.jwk as JWK, 'sha256');
  if (jkt !== input.expectedJkt) throw new Error('DPoP key does not match token cnf.jkt');

  const key = await importJWK(header.jwk as JWK, header.alg);
  const { payload } = await jwtVerify(input.proof, key, { typ: 'dpop+jwt', maxTokenAge: '60s' });

  if (payload.htm !== input.method) throw new Error('htm mismatch');
  if (payload.htu !== input.url) throw new Error('htu mismatch');

  // ath = base64url(SHA-256(access token))，把证明与这一枚 token 绑定
  const ath = createHash('sha256').update(input.accessToken).digest('base64url');
  if (payload.ath !== ath) throw new Error('ath mismatch');

  if (typeof payload.jti !== 'string') throw new Error('missing jti');
  const fresh = await input.rememberJti(payload.jti, (payload.iat ?? 0) + 120);
  if (!fresh) throw new Error('DPoP proof replayed');
}
