// 授权（grant）状态与客户端开关（第 8、12 篇）。
// 生产环境应由 AS 通过 Shared Signals / CAEP 事件或内部消息总线推送撤销，这里用内存结构示意。

const revokedGrants = new Set<string>();

/** 按 client_id 一键下线某个 AI 客户端（例如发现该平台被攻破）。值为 false 表示已停用 */
const clientSwitch = new Map<string, boolean>([
  // CIMD client_id 是 HTTPS URL；Anthropic 托管凭证模式下则是银行自己分配的 client_id
  ['https://claude.ai/oauth/claude-code-client-metadata', true],
  ['examplebank-claude-hosted', true],
]);

export function isGrantActive(grantId: string): boolean {
  return !revokedGrants.has(grantId);
}

export function onGrantRevoked(grantId: string): void {
  revokedGrants.add(grantId);
}

export function isClientEnabled(clientId: string): boolean {
  return clientSwitch.get(clientId) === true;
}

export function setClientEnabled(clientId: string, enabled: boolean): void {
  clientSwitch.set(clientId, enabled);
}
