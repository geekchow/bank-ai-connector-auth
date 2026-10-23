// 银行侧签核校验（第 9 篇）。这段代码运行在银行签核服务中，不在 MCP 工具路径上：
// AI 客户端没有任何途径调用它。
//
// dynamic linking：手机银行 App 用已绑定设备上的私钥（生物识别解锁）对「草稿规范化内容」签名。
// 服务端执行前，用同一草稿重新生成规范化内容并验签——金额、收款人、扣款账户任何一项变化，签名都会失效。

import { compactVerify, importJWK, type JWK } from 'jose';
import { markApproved, type PaymentDraft } from './store.js';

/** 规范化：固定字段顺序，只包含会影响资金去向的字段，不包含 AI 填写的自由文本 */
export function canonicalDraftPayload(d: PaymentDraft): string {
  return JSON.stringify({
    v: 1,
    draft_id: d.draft_id,
    debtor_account_ref: d.debtor_account_ref,
    payee_ref: d.payee_ref,
    amount: d.amount,
    currency: d.currency,
    expires_at: d.expires_at,
  });
}

export interface BoundDevice {
  device_id: string;
  owner_sub: string;
  public_jwk: JWK;
  status: 'active' | 'revoked';
}

export interface ApprovalInput {
  draft: PaymentDraft;
  /** App 提交的 JWS（compact），payload 即规范化内容 */
  jws: string;
  device: BoundDevice;
  /** 一次性：返回 false 表示该签名已被使用过 */
  consumeOnce: (jws: string) => Promise<boolean>;
  now?: number;
}

export async function verifyAndApprove(input: ApprovalInput): Promise<void> {
  const { draft, device } = input;
  const now = input.now ?? Math.floor(Date.now() / 1000);

  if (draft.status !== 'pending_approval') throw new Error(`draft is ${draft.status}`);
  if (draft.expires_at <= now) throw new Error('draft expired');
  if (device.status !== 'active' || device.owner_sub !== draft.owner_sub) throw new Error('device not bound to draft owner');

  const key = await importJWK(device.public_jwk, 'ES256');
  const { payload, protectedHeader } = await compactVerify(input.jws, key, { algorithms: ['ES256'] });
  if (protectedHeader.typ !== 'examplebank-approval+jws') throw new Error('unexpected approval type');

  // 签的必须正是服务端此刻持有的草稿内容
  if (new TextDecoder().decode(payload) !== canonicalDraftPayload(draft)) throw new Error('approval does not match draft');

  if (!(await input.consumeOnce(input.jws))) throw new Error('approval replayed');

  markApproved(draft.draft_id);
}
