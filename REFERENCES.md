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
| RFC 9068 JWT Profile for Access Tokens | Proposed Standard |
| RFC 9470 Step-Up Authentication Challenge | Proposed Standard |
| RFC 7523 JWT Profile for Client Authentication and Authorization Grants | Proposed Standard |
| OAuth Client ID Metadata Document（draft-ietf-oauth-client-id-metadata-document） | Internet-Draft |

## OpenID Foundation

| 文档 | 状态 |
|---|---|
| FAPI 2.0 Security Profile | Final（2025-02） |
| FAPI 2.0 Message Signing | Final（2025-09） |
| OpenID Connect CIBA Core 1.0 | Final |
| OpenID Connect Discovery 1.0 | Final |
| Shared Signals Framework 1.0、CAEP 1.0 | Final（2025） |

## AI 客户端（Claude）行为

| 文档 | 用途 |
|---|---|
| Anthropic, *Authentication for connectors* | CIMD 选择条件、托管机密客户端、回调地址、token 刷新行为、端点超时、出站网段（第 3、7 篇） |
| Anthropic, *Enterprise Managed Auth for connectors* | RFC 7523 JWT bearer + Identity Assertion JWT Authorization Grant（第 2、4 篇） |

## 示例代码依赖

| 包 | 版本 |
|---|---|
| `@modelcontextprotocol/server` | 2.3.1（实现 MCP `2026-07-28`） |
| `@modelcontextprotocol/node` | 2.1.1 |
| `@modelcontextprotocol/express` | 2.0.2 |
| `jose` | 6.2.13 |
| `zod` | 4.6.7 |
| `express` | 5.3.0 |

## 香港监管（主线）

| 文档 | 核对状态 |
|---|---|
| HKMA, *New Anti-Digital Fraud Measures: "E-Banking Security ABC"*（附件，2025-04-11） | 已核对原文 |
| HKMA, *HKMA announces "ART" Framework to promote responsible A.I. adoption*（新闻稿，2026-10-15） | 已核对新闻稿 |
| HKMA 通函 B1/15C *Responsible Adoption of Artificial Intelligence* 及附件（2026-10-15） | **二手资料**，未取得原文 |
| HKMA, *Consumer Protection in respect of Use of Generative Artificial Intelligence*（通函，2024-08-19） | 发布日期已核对；具体要求来自二手资料 |
| HKMA, Supervisory Policy Manual TM-E-1 *Risk Management of E-banking* | 仅引用名称 |
| HKMA, Open API Framework for the Hong Kong Banking Sector（2018）及第三、四阶段实施状态 | 已核对 HKMA 网页 |
| PCPD, *Artificial Intelligence: Model Personal Data Protection Framework*（2024-06）；雇员使用生成式 AI 指引清单（2025-03） | 二手资料 |
| 《保护关键基础设施（电脑系统）条例》（2026-01-01 实施） | 笔者既有知识 |

## 对照地区

| 文档 | 状态 |
|---|---|
| EU PSD3 / PSR | 2025-11-27 达成政治协议；2026-04-23 公布最终妥协文本；撰写时尚待正式通过（二手资料） |
| EU Delegated Regulation 2018/389 及 2022/2360（RTS on SCA） | 生效 |
| EU Regulation 2022/2554（DORA） | 2025-01-17 起适用 |
| EU Regulation 2024/1689（AI Act） | 分阶段适用 |
| JR/T 0185-2020《商业银行应用程序接口安全管理规范》；JR/T 0171-2020《个人金融信息保护技术规范》 | 现行行业标准 |

## IBKR Connector 资料来源

- IBKR Campus 官方文章（自动抓取受限，事实以二手资料交叉印证）
- PromptArmor connector 收录页（2026-05-22）
- 第三方指南与新闻（2026-05 至 2026-06）
- 工具清单：2026-10-23 在 Claude 会话中观察到的 `tools/list` 工具名
