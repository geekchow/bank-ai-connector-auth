// 内部业务 API 的演示桩。真实实现调用银行内部网关，并携带 tokenExchange 换来的内部 token。
// 所有返回值都已做数据最小化：账号掩码、对方信息截断（第 10 篇）。

export interface AccountSummary {
  account_ref: string; // 不透明引用，不是账号
  display_name: string;
  masked_number: string;
  currency: string;
  available_balance: string;
}

export interface TransactionLine {
  booking_date: string;
  amount: string;
  currency: string;
  /** 对方名称截断，备注只保留银行分类结果，不回传原始自由文本 */
  counterparty_hint: string;
  category: string;
}

export interface Payee {
  payee_ref: string;
  display_name: string;
  masked_account: string;
  registered: boolean;
}

const demoAccounts: AccountSummary[] = [
  { account_ref: 'acc_7Hq2', display_name: '港元储蓄', masked_number: '***-***-381', currency: 'HKD', available_balance: '52310.25' },
  { account_ref: 'acc_9Lm4', display_name: '港元往来', masked_number: '***-***-902', currency: 'HKD', available_balance: '8120.00' },
];

const demoPayees: Payee[] = [
  { payee_ref: 'pay_Ab12', display_name: '陈**', masked_account: '***-***-118', registered: true },
  { payee_ref: 'pay_Cd34', display_name: '物业管理处', masked_account: '***-***-560', registered: true },
];

export async function listAccounts(_internalToken: string, _sub: string): Promise<AccountSummary[]> {
  return demoAccounts;
}

export async function listTransactions(
  _internalToken: string,
  _sub: string,
  accountRef: string,
  limit: number,
): Promise<TransactionLine[]> {
  if (!demoAccounts.some((a) => a.account_ref === accountRef)) throw new Error('unknown account');
  return [
    { booking_date: '2026-10-20', amount: '-238.50', currency: 'HKD', counterparty_hint: '超市**', category: 'groceries' },
    { booking_date: '2026-10-19', amount: '-1200.00', currency: 'HKD', counterparty_hint: '物业**', category: 'housing' },
  ].slice(0, limit);
}

export async function findPayee(_internalToken: string, _sub: string, payeeRef: string): Promise<Payee | undefined> {
  return demoPayees.find((p) => p.payee_ref === payeeRef);
}

export async function freezeCard(_internalToken: string, _sub: string, cardRef: string): Promise<{ card_ref: string; status: 'frozen' }> {
  return { card_ref: cardRef, status: 'frozen' };
}

/** 推送签核请求到用户已绑定设备上的手机银行 App（HKMA「Authenticate in-App」） */
export async function pushApprovalToBoundDevice(_sub: string, draftId: string): Promise<void> {
  void draftId;
}
