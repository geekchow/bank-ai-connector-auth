"""RAR（RFC 9396）授权请求的银行侧校验与同意页文案（第 5 篇）。

AI 客户端（或 MCP server 的 insufficient_scope 引导）发起的 authorization_details 只是「申请」，
银行 AS 要按自己的政策收紧，并把最终授予的内容用人话展示给用户确认。
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

PAYMENT_DRAFT_TYPE = "https://examplebank.hk/rar/payment-draft/v1"

# 银行政策上限：无论客户端申请多少，AI 渠道的草稿授权不超过这些值
POLICY_MAX_PER_TXN = Decimal("10000.00")
POLICY_MAX_CUMULATIVE = Decimal("30000.00")
POLICY_MAX_VALIDITY = timedelta(days=30)


class RarRejected(Exception):
    pass


@dataclass
class GrantedPaymentDraft:
    detail: dict
    consent_text_zh_hk: str


def _money(v: str) -> Decimal:
    try:
        d = Decimal(v)
    except (InvalidOperation, TypeError):
        raise RarRejected(f"invalid amount {v!r}") from None
    if d <= 0 or d.as_tuple().exponent < -2:
        raise RarRejected(f"invalid amount {v!r}")
    return d


def normalise_payment_draft(
    requested: dict,
    *,
    resource: str,
    user_accounts: dict[str, str],
    now: datetime | None = None,
) -> GrantedPaymentDraft:
    """校验并收紧一条 payment-draft 授权申请。

    user_accounts: 该用户名下可选账户 {account_ref: 展示名}，由 AS 查询核心系统得到。
    """
    now = now or datetime.now(timezone.utc)
    if requested.get("type") != PAYMENT_DRAFT_TYPE:
        raise RarRejected("unsupported authorization_details type")
    if requested.get("actions") != ["create_draft"]:
        # 任何「execute」类动作在 AI 渠道一律拒绝，而不是悄悄删掉
        raise RarRejected("only create_draft is grantable to AI clients")

    account = requested.get("debtor_account_ref")
    if account not in user_accounts:
        raise RarRejected("debtor account does not belong to user")

    limit = requested.get("instructed_amount_limit") or {}
    if limit.get("currency") != "HKD":
        raise RarRejected("only HKD is supported")
    per_txn = min(_money(limit.get("per_transaction")), POLICY_MAX_PER_TXN)
    cumulative = min(_money(limit.get("cumulative")), POLICY_MAX_CUMULATIVE)
    if cumulative < per_txn:
        cumulative = per_txn

    valid_until = datetime.fromisoformat(requested["valid_until"].replace("Z", "+00:00"))
    valid_until = min(valid_until, now + POLICY_MAX_VALIDITY)
    if valid_until <= now:
        raise RarRejected("valid_until is in the past")

    creditor = requested.get("creditor_constraint") or {"mode": "registered_payees_only"}
    if creditor.get("mode") not in ("registered_payees_only", "listed"):
        raise RarRejected("unsupported creditor constraint")

    granted = {
        "type": PAYMENT_DRAFT_TYPE,
        "actions": ["create_draft"],
        "locations": [resource],
        "debtor_account_ref": account,
        "creditor_constraint": creditor,
        "instructed_amount_limit": {
            "currency": "HKD",
            "per_transaction": f"{per_txn:.2f}",
            "cumulative": f"{cumulative:.2f}",
        },
        "valid_until": valid_until.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    payees = "已登記收款人" if creditor["mode"] == "registered_payees_only" else "以下指定收款人"
    text = (
        f"允許 AI 助手為你「起草」轉賬，但不能自行付款：\n"
        f"・扣款賬戶：{user_accounts[account]}\n"
        f"・收款人：只限{payees}\n"
        f"・每筆上限 HK${per_txn:,.2f}，合共上限 HK${cumulative:,.2f}\n"
        f"・有效至 {valid_until.astimezone(timezone(timedelta(hours=8))):%Y年%m月%d日 %H:%M}（香港時間）\n"
        f"每一筆轉賬仍需你在示例銀行 App 內核對並驗證後才會執行。你可隨時在 App 的「AI 授權管理」中取消。"
    )
    return GrantedPaymentDraft(granted, text)
