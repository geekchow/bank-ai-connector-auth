// 审计事件（第 11 篇）。回答四个问题：谁、通过哪个 AI 客户端、基于哪次授权、做了什么。

import { randomUUID } from 'node:crypto';
import type { AuthInfo } from '@modelcontextprotocol/server';
import type { BankAuthExtra } from './auth/verifier.js';

export interface AuditEvent {
  event_id: string;
  ts: string;
  channel: 'ai_connector';
  /** 谁 */
  sub?: string;
  /** 通过哪个 AI 客户端 */
  client_id?: string;
  /** 基于哪次授权 */
  grant_id?: string;
  token_jti_hash?: string;
  /** 做了什么 */
  action: string;
  tool?: string;
  /** 参数摘要：只记录引用和金额，不记录自由文本（防止把注入内容写进下游系统） */
  params_digest?: Record<string, string | number | boolean>;
  outcome: 'allowed' | 'denied' | 'draft_created' | 'approved' | 'rejected' | 'error';
  reason?: string;
  draft_id?: string;
  core_txn_ref?: string;
  traceparent?: string;
}

export function audit(e: Omit<AuditEvent, 'event_id' | 'ts' | 'channel'>, auth?: AuthInfo): void {
  const extra = auth?.extra as BankAuthExtra | undefined;
  const event: AuditEvent = {
    event_id: randomUUID(),
    ts: new Date().toISOString(),
    channel: 'ai_connector',
    sub: extra?.sub,
    client_id: auth?.clientId,
    grant_id: extra?.grantId,
    ...e,
  };
  // 生产环境：写入不可篡改存储（WORM）并旁路到 SIEM 与反欺诈引擎
  process.stdout.write(JSON.stringify(event) + '\n');
}
