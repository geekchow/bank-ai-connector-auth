// L1 低风险写工具（第 2 篇「安全方向不对称」）。
// 冻结卡：让账户更安全，AI 可直接执行。
// 解冻卡：让账户更危险，没有对应工具 —— 只返回「请在手机银行 App 内操作」的指引。

import * as z from 'zod';
import { requireScopes, type McpServer } from '@modelcontextprotocol/server';
import { Scope } from '../auth/scopes.js';
import { bankExtra } from '../auth/verifier.js';
import { exchangeForInternalToken } from '../auth/tokenExchange.js';
import { freezeCard } from '../coreApi.js';
import { audit } from '../audit.js';

export function registerCardTools(server: McpServer): void {
  server.registerTool(
    'freeze_card',
    {
      title: '临时冻结卡片',
      description: '立即临时冻结一张卡（可在手机银行 App 中解冻）。适用于用户怀疑卡片遗失或被盗用。',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      inputSchema: z.object({ card_ref: z.string().regex(/^card_[A-Za-z0-9]{4,32}$/) }),
      scopeChallenge: requireScopes(Scope.CardsFreeze),
    },
    async ({ card_ref }, ctx) => {
      const auth = ctx.http?.authInfo;
      const extra = bankExtra(auth);
      const internal = await exchangeForInternalToken(auth!.token, extra.grantId);
      const result = await freezeCard(internal.accessToken, extra.sub, card_ref);
      audit({ action: 'write', tool: 'freeze_card', params_digest: { card_ref }, outcome: 'allowed' }, auth);
      return {
        content: [{ type: 'text', text: `卡片 ${card_ref} 已临时冻结。如需解冻，请在示例银行 App 内完成身份验证后操作。` }],
        structuredContent: result,
      };
    },
  );
}
