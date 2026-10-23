// ExampleBank HK 的 scope 词表（第 5 篇）。
// 设计原则：scope 只表达「资源 × 操作」，账户、金额、收款人、有效期交给 RAR（authorization_details）。
// 刻意不存在：任何 *:execute / payments:write / cards:unfreeze / 通配符 scope。

export const Scope = {
  // L0 只读
  AccountsRead: 'accounts:read',
  TransactionsRead: 'transactions:read',
  CardsRead: 'cards:read',
  // L1 低风险写（只朝「更安全」方向）
  AlertsWrite: 'alerts:write',
  BudgetsWrite: 'budgets:write',
  CardsFreeze: 'cards:freeze',
  // L2 起草（只生成草稿，执行永远在银行侧签核后发生）
  PaymentsDraft: 'payments:draft',
} as const;

export type ScopeValue = (typeof Scope)[keyof typeof Scope];

/**
 * 发布在 Protected Resource Metadata `scopes_supported` 中的「最小基础集」。
 * MCP 2026-07-28 规定：401 未带 scope 时，客户端会申请 scopes_supported 全部 scope，
 * 所以这里只放低风险只读能力，其余靠运行时 insufficient_scope 增量申请。
 */
export const baselineScopes: ScopeValue[] = [Scope.AccountsRead, Scope.TransactionsRead];

export function hasScope(granted: readonly string[], needed: ScopeValue): boolean {
  // 本词表没有层级关系；若引入层级（如 accounts:* ⊇ accounts:read），必须在此处展开判断
  return granted.includes(needed);
}
