"""Client ID Metadata Document 信任策略（第 3 篇）。

MCP 2026-07-28 推荐用 CIMD 注册客户端：client_id 本身是一个 HTTPS URL，AS 按需抓取其元数据。
对银行而言，「接受任意 HTTPS client_id」过于宽松，这里实现：
  1. 域名允许名单（只接受银行尽调过的 AI 平台）；
  2. 抓取前的 SSRF 防护（只允许 https、拒绝私有/保留地址、不跟随重定向）；
  3. 元数据校验（client_id 完全匹配、redirect_uris 精确匹配、public client 限制）。
"""

from __future__ import annotations

import ipaddress
import json
import socket
import time
import urllib.request
from dataclasses import dataclass, field
from urllib.parse import urlsplit

# 银行尽调通过的 AI 平台：client_id 的 host 必须在此列表中
TRUSTED_CLIENT_HOSTS = {
    "claude.ai",
}

MAX_DOC_BYTES = 5 * 1024
FETCH_TIMEOUT_S = 3


class CimdRejected(Exception):
    pass


@dataclass
class ClientMetadata:
    client_id: str
    client_name: str
    redirect_uris: list[str]
    token_endpoint_auth_method: str = "none"
    raw: dict = field(default_factory=dict)


def _assert_public_address(host: str) -> None:
    """解析主机名并拒绝私有、环回、链路本地等地址（RFC 9728 §7.7 / CIMD §6 的 SSRF 建议）。

    注意：生产环境应把解析结果钉住（pin）后用于实际连接，或通过出口代理抓取，避免 DNS rebinding 的 TOCTOU。
    """
    for info in socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP):
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise CimdRejected(f"client_id host resolves to non-public address {ip}")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):  # noqa: D401
        raise CimdRejected("redirects are not followed when fetching client metadata")


def validate_client_id_url(client_id: str) -> None:
    parts = urlsplit(client_id)
    if parts.scheme != "https":
        raise CimdRejected("client_id must use https")
    if not parts.path or parts.path == "/":
        raise CimdRejected("client_id must contain a path component")
    if parts.fragment or parts.username or parts.password:
        raise CimdRejected("client_id must not contain fragment or userinfo")
    if parts.hostname not in TRUSTED_CLIENT_HOSTS:
        raise CimdRejected(f"client host {parts.hostname!r} is not on the bank allowlist")


def validate_metadata(client_id: str, doc: dict) -> ClientMetadata:
    if doc.get("client_id") != client_id:
        raise CimdRejected("metadata client_id does not exactly match the document URL")
    for key in ("client_name", "redirect_uris"):
        if key not in doc:
            raise CimdRejected(f"metadata missing {key}")
    redirect_uris = doc["redirect_uris"]
    if not isinstance(redirect_uris, list) or not redirect_uris:
        raise CimdRejected("redirect_uris must be a non-empty list")
    for uri in redirect_uris:
        p = urlsplit(uri)
        loopback = p.scheme == "http" and p.hostname in ("127.0.0.1", "localhost")
        if p.scheme != "https" and not loopback:
            raise CimdRejected(f"redirect_uri {uri!r} must be https or loopback")
    method = doc.get("token_endpoint_auth_method", "none")
    if method not in ("none", "private_key_jwt"):
        raise CimdRejected(f"unsupported token_endpoint_auth_method {method!r}")
    return ClientMetadata(doc["client_id"], doc["client_name"], redirect_uris, method, doc)


_cache: dict[str, tuple[float, ClientMetadata]] = {}


def resolve_client(client_id: str, max_age_s: int = 3600) -> ClientMetadata:
    """授权请求到达时调用：返回已校验的客户端元数据，失败抛 CimdRejected（AS 返回 invalid_client）。"""
    hit = _cache.get(client_id)
    if hit and hit[0] > time.time():
        return hit[1]

    validate_client_id_url(client_id)
    _assert_public_address(urlsplit(client_id).hostname or "")

    opener = urllib.request.build_opener(_NoRedirect)
    req = urllib.request.Request(client_id, headers={"Accept": "application/json"})
    with opener.open(req, timeout=FETCH_TIMEOUT_S) as resp:
        body = resp.read(MAX_DOC_BYTES + 1)
    if len(body) > MAX_DOC_BYTES:
        raise CimdRejected("client metadata document too large")

    meta = validate_metadata(client_id, json.loads(body))
    _cache[client_id] = (time.time() + max_age_s, meta)
    return meta


def check_redirect_uri(meta: ClientMetadata, redirect_uri: str) -> None:
    """精确匹配；仅对 IP 字面量环回地址按 RFC 8252 §7.3 忽略端口。"""
    if redirect_uri in meta.redirect_uris:
        return
    req = urlsplit(redirect_uri)
    if req.scheme == "http" and req.hostname in ("127.0.0.1", "localhost"):
        for registered in meta.redirect_uris:
            r = urlsplit(registered)
            if (r.scheme, r.hostname, r.path) == (req.scheme, req.hostname, req.path):
                return
    raise CimdRejected("redirect_uri does not match client metadata")
