"""按客户端能力与 scope 风险决定 token 生命周期（第 7、8 篇）。

核心思路：客户端能做持有者约束（DPoP / mTLS）时可以给得更长；只能拿 bearer token 的公共客户端，
用更短的 access token、强制 refresh token 轮换和绝对有效期来补偿。
"""

from __future__ import annotations

from dataclasses import dataclass

HIGH_RISK_SCOPES = {"payments:draft"}


@dataclass(frozen=True)
class ClientProfile:
    client_id: str
    confidential: bool  # 例如 Anthropic 托管的机密客户端凭证（oauth_anthropic_creds）
    sender_constrained: bool  # 是否在 token 请求中提供 DPoP 证明或 mTLS 证书


@dataclass(frozen=True)
class TokenLifetimes:
    access_token_s: int
    refresh_token_idle_s: int
    refresh_token_absolute_s: int
    rotate_refresh_token: bool
    reauth_after_s: int  # 超过后必须重新走一次带强认证的授权


def lifetimes_for(client: ClientProfile, scopes: set[str]) -> TokenLifetimes:
    high_risk = bool(scopes & HIGH_RISK_SCOPES)

    if client.sender_constrained:
        access = 15 * 60
    elif client.confidential:
        access = 10 * 60
    else:
        access = 5 * 60
    if high_risk:
        access = min(access, 5 * 60)

    # OAuth 2.1 / MCP：公共客户端的 refresh token 必须轮换或持有者约束
    rotate = not client.sender_constrained or not client.confidential

    return TokenLifetimes(
        access_token_s=access,
        refresh_token_idle_s=7 * 24 * 3600 if not high_risk else 24 * 3600,
        refresh_token_absolute_s=(90 if not high_risk else 30) * 24 * 3600,
        rotate_refresh_token=rotate,
        # 只读授权参考「每 90 天重新验证」的业界做法；含起草权限的授权与 RAR valid_until（≤30 天）对齐
        reauth_after_s=(90 if not high_risk else 30) * 24 * 3600,
    )
