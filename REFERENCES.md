# 规范与资料基线

撰写日期：2026-10-23。版本状态以该日期核对结果为准。

## MCP

| 文档 | 版本／状态 | 备注 |
|---|---|---|
| MCP Specification | `2026-07-28`（Current） | 无状态协议；移除 `initialize` 握手与会话；引入 MRTR（Multi Round-Trip Requests） |
| MCP Authorization | `2026-07-28` | CIMD 为推荐注册方式（SHOULD）；DCR 标记为 Deprecated；RFC 9728 / RFC 8707 为 MUST；RFC 9207 `iss`：AS SHOULD 发送，客户端 MUST 校验 |
| MCP Elicitation（URL mode） | 自 `2025-11-25` 引入，`2026-07-28` 改为经 `InputRequiredResult` 下发 | 适用于支付等敏感交互 |
| 历史版本 | `2025-03-26`、`2025-06-18`、`2025-11-25` | 第 3 篇梳理演进 |

## IETF / OAuth

| 文档 | 状态 |
|---|---|
| OAuth 2.1（draft-ietf-oauth-v2-1-13） | Internet-Draft |
| RFC 6750 Bearer Token Usage | Proposed Standard |
| RFC 7009 Token Revocation | Proposed Standard |
| RFC 7591 Dynamic Client Registration | Proposed Standard |
| RFC 7662 Token Introspection | Proposed Standard |
| RFC 8414 Authorization Server Metadata | Proposed Standard |
| RFC 8693 Token Exchange | Proposed Standard |
| RFC 8705 Mutual-TLS Client Auth & Certificate-Bound Tokens | Proposed Standard |
| RFC 8707 Resource Indicators | Proposed Standard |
| RFC 9126 Pushed Authorization Requests | Proposed Standard |
| RFC 9207 Authorization Server Issuer Identification | Proposed Standard |
| RFC 9396 Rich Authorization Requests | Proposed Standard |
| RFC 9449 DPoP | Proposed Standard |
| RFC 9700 OAuth 2.0 Security Best Current Practice（2025-01） | BCP |
| RFC 9728 Protected Resource Metadata | Proposed Standard |
| OAuth Client ID Metadata Document（draft-ietf-oauth-client-id-metadata-document） | Internet-Draft |

## OpenID Foundation

| 文档 | 状态 |
|---|---|
| FAPI 2.0 Security Profile | Final（2025-02） |
| FAPI 2.0 Message Signing | Final（2025-09） |
| OpenID Connect CIBA Core 1.0 | Final |
| OpenID Connect Discovery 1.0 | Final |

## 香港监管（主线，第 11 篇逐条核对原文）

- HKMA, Open API Framework for the Hong Kong Banking Sector（2018）
- HKMA, Supervisory Policy Manual TM-E-1 *Risk Management of E-banking*
- HKMA 关于负责任采用 AI 的监管指引与代理式 AI 概念说明（2026-10 发布，**待核对原文与通函编号**）
- 《个人资料（私隐）条例》（PDPO）及 PCPD 的 AI 相关指引

## IBKR Connector 资料来源

- IBKR Campus 官方文章（自动抓取受限，事实以二手资料交叉印证）
- PromptArmor connector 收录页（2026-05-22）
- 第三方指南与新闻（2026-05 至 2026-06）
- 工具清单：2026-10-23 在 Claude 会话中观察到的 `tools/list` 工具名
