// Rich Authorization Requests（RFC 9396）中 ExampleBank 自定义的 authorization_details 类型（第 5 篇）。
// AS 在用户同意后把它写进 access token 的 `authorization_details` claim；MCP server 在每次起草前复核。

export const PAYMENT_DRAFT_TYPE = 'https://examplebank.hk/rar/payment-draft/v1';

export interface PaymentDraftAuthorization {
  type: typeof PAYMENT_DRAFT_TYPE;
  /** RFC 9396 通用字段：允许的动作。这里只有起草，没有执行 */
  actions: ['create_draft'];
  /** RFC 9396 通用字段：可在哪个资源服务器上使用 */
  locations: string[];
  /** 允许扣款的账户（银行内部引用，不是明文账号） */
  debtor_account_ref: string;
  /** 收款人约束：仅已登记收款人，或显式列出的收款人引用 */
  creditor_constraint:
    | { mode: 'registered_payees_only' }
    | { mode: 'listed'; payee_refs: string[] };
  instructed_amount_limit: {
    currency: 'HKD';
    per_transaction: string; // 十进制字符串，避免浮点误差
    cumulative: string;
  };
  /** 授权失效时间（ISO 8601），通常 ≤ 30 天 */
  valid_until: string;
}

export interface DraftRequest {
  debtorAccountRef: string;
  payeeRef: string;
  payeeIsRegistered: boolean;
  amount: string;
  currency: string;
}

/** 把金额字符串转成「分」为单位的整数，拒绝非法格式 */
export function toMinorUnits(amount: string): bigint {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(amount)) throw new Error('invalid amount format');
  const [whole, frac = ''] = amount.split('.');
  return BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0'));
}

export type RarDecision = { ok: true; grant: PaymentDraftAuthorization } | { ok: false; reason: string };

/**
 * 在 token 携带的 authorization_details 中找到能覆盖本次草稿请求的那一条。
 * 注意：累计额度需要查询服务端台账（draftedSoFarMinor），不能只信 token。
 */
export function matchPaymentGrant(
  details: unknown,
  req: DraftRequest,
  resourceUrl: string,
  draftedSoFarMinor: bigint,
  now = new Date(),
): RarDecision {
  if (!Array.isArray(details)) return { ok: false, reason: 'no authorization_details' };

  for (const d of details as PaymentDraftAuthorization[]) {
    if (d?.type !== PAYMENT_DRAFT_TYPE) continue;
    if (!d.actions?.includes('create_draft')) continue;
    if (!d.locations?.includes(resourceUrl)) continue;
    if (new Date(d.valid_until) <= now) continue;
    if (d.debtor_account_ref !== req.debtorAccountRef) continue;
    if (d.instructed_amount_limit.currency !== req.currency) continue;

    const c = d.creditor_constraint;
    const payeeOk =
      c.mode === 'registered_payees_only' ? req.payeeIsRegistered : c.payee_refs.includes(req.payeeRef);
    if (!payeeOk) continue;

    const amount = toMinorUnits(req.amount);
    if (amount > toMinorUnits(d.instructed_amount_limit.per_transaction)) continue;
    if (draftedSoFarMinor + amount > toMinorUnits(d.instructed_amount_limit.cumulative)) continue;

    return { ok: true, grant: d };
  }
  return { ok: false, reason: 'no authorization_details entry covers this draft' };
}
