// 支付草稿（第 9 篇）。草稿是 AI 能触达的最远位置；执行只在用户于银行侧签核后发生。
//
// 状态机：created → pending_approval → approved → executed / failed
//                                   ↘ rejected / expired / cancelled

import { randomBytes } from 'node:crypto';

export type DraftStatus = 'pending_approval' | 'approved' | 'executed' | 'failed' | 'rejected' | 'expired' | 'cancelled';

export interface PaymentDraft {
  draft_id: string;
  /** 草稿归属：由已验证 token 的 sub 决定，不接受客户端传入 */
  owner_sub: string;
  client_id: string;
  grant_id: string;
  debtor_account_ref: string;
  payee_ref: string;
  amount: string;
  currency: 'HKD';
  /** AI 提供的用途说明只作展示参考，签核页面以银行字段为准并明确标注「由 AI 填写」 */
  purpose_from_ai: string;
  status: DraftStatus;
  created_at: number;
  expires_at: number;
  idempotency_key: string;
  core_txn_ref?: string;
}

const drafts = new Map<string, PaymentDraft>();
const byIdempotencyKey = new Map<string, string>();

export const DRAFT_TTL_SECONDS = 15 * 60;

export function createDraft(
  input: Omit<PaymentDraft, 'draft_id' | 'status' | 'created_at' | 'expires_at'>,
): { draft: PaymentDraft; reused: boolean } {
  const idemKey = `${input.owner_sub}:${input.idempotency_key}`;
  const existingId = byIdempotencyKey.get(idemKey);
  if (existingId) return { draft: drafts.get(existingId)!, reused: true };

  const now = Math.floor(Date.now() / 1000);
  const draft: PaymentDraft = {
    ...input,
    // 不可猜测的句柄；即使泄露也会因 owner_sub 绑定而无法被他人使用
    draft_id: `drf_${randomBytes(16).toString('base64url')}`,
    status: 'pending_approval',
    created_at: now,
    expires_at: now + DRAFT_TTL_SECONDS,
  };
  drafts.set(draft.draft_id, draft);
  byIdempotencyKey.set(idemKey, draft.draft_id);
  return { draft, reused: false };
}

/** 读取草稿：句柄必须属于当前已认证用户，否则视同不存在 */
export function getOwnedDraft(draftId: string, sub: string): PaymentDraft | undefined {
  const d = drafts.get(draftId);
  if (!d || d.owner_sub !== sub) return undefined;
  if (d.status === 'pending_approval' && d.expires_at <= Date.now() / 1000) d.status = 'expired';
  return d;
}

/** 汇总某次授权下已起草（未被拒绝/取消/过期）的金额，用于 RAR 累计额度校验 */
export function draftedTotalMinor(grantId: string, toMinor: (a: string) => bigint): bigint {
  let total = 0n;
  for (const d of drafts.values()) {
    if (d.grant_id !== grantId) continue;
    if (d.status === 'pending_approval' || d.status === 'approved' || d.status === 'executed') total += toMinor(d.amount);
  }
  return total;
}

/** 只由银行签核服务调用（用户在已绑定设备上完成认证后），AI 侧没有任何入口能走到这里 */
export function markApproved(draftId: string): void {
  const d = drafts.get(draftId);
  if (d?.status === 'pending_approval') d.status = 'approved';
}

export function cancelDraft(draftId: string, sub: string): boolean {
  const d = getOwnedDraft(draftId, sub);
  if (!d || d.status !== 'pending_approval') return false;
  d.status = 'cancelled';
  return true;
}
