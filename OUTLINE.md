# 系列大纲（12 篇）

> 主线地区：**香港**（HKMA 监管框架为主线，中国大陆、欧盟作对照）
> 代码语言：TypeScript（MCP server / 中间件），Python（授权服务器配置与脚本示例）
> 规范基线：MCP `2026-07-28`（当前版本）；OAuth 2.1 `draft-ietf-oauth-v2-1-13`；FAPI 2.0 Security Profile Final（2025-02）

贯穿全系列的虚构案例：**示例银行（香港）／ExampleBank HK**。scope 命名、RAR 结构、审计字段在各篇之间保持一致。

核心论点：**AI 可以起草、解释和准备；资金变动的最终意思表示，只能由用户本人在银行侧受控界面上完成。**

---

## 第 1 篇｜全景篇：从 IBKR Connector 看「AI 代理访问金融账户」
- **核心问题**：AI connector 与传统开放银行 API 的本质区别？参与方与信任边界？IBKR 为什么只生成指令？
- **要点**：参与方模型；与 HKMA Open API 框架的结构差异；IBKR connector 能力面；「指令而非成交」的四层动机；券商→银行的三个差异。
- **图示**：参与方与信任边界架构图；IBKR 指令流转时序图；指令状态机。

## 第 2 篇｜场景篇：按风险分级，哪些可以交给 AI
- **核心问题**：每类银行能力适合 AI 做到哪一步？
- **要点**：L0 只读 / L1 低风险写 / L2 高风险写 / L3 对公四级模型；「安全方向不对称」原则（冻结≠解冻）；对公 maker-checker 中 AI 只能是 maker。
- **图示**：可逆性 × 资金影响风险矩阵；对公制单审批流程图。

## 第 3 篇｜AuthN（上）：MCP 授权规范逐条拆解（2026-07-28）
- **核心问题**：从 401 到拿到 token，每一步遵循哪条规范？银行要实现哪些端点？
- **要点**：MCP 授权规范演进（2025-03-26 → 2025-06-18 → 2025-11-25 → 2026-07-28）；RFC 9728 PRM 发现；RFC 8414 / OIDC Discovery；客户端注册优先级（CIMD 推荐、预注册、DCR 已 Deprecated）；PKCE；RFC 9207 `iss` 校验；无状态协议对授权的影响。
- **图示**：发现与授权全流程时序图；客户端注册方式决策树。
- **代码**：MCP server 返回 401 + PRM 文档（TS）。

## 第 4 篇｜AuthN（下）：绑定银行现有身份体系，SCA 放在哪一步
- **核心问题**：如何复用手机银行身份？强认证放在授权时、调用时还是交易时？
- **要点**：AS 作为银行 IAM 的协议适配层；扫码 / App-to-App / CIBA 解耦认证；HKMA 对网上银行双重认证的要求；三层 SCA 布点；pairwise `sub`。
- **图示**：「连接 connector」端到端时序图；三层 SCA 分层图。

## 第 5 篇｜AuthZ（一）：权限模型——从 scope 到 Rich Authorization Requests
- **核心问题**：「只能查 A 账户」「只能给张三转账、每笔 ≤ HK$5,000、30 天有效」如何表达？
- **要点**：scope 五维度（资源、操作、账户、金额、有效期）；ExampleBank scope 词表；RFC 9396 `authorization_details` 设计；同意页渲染；增量授权（scope challenge）。
- **图示**：scope 与 RAR 分工结构图；增量授权时序图。
- **代码**：RAR JSON Schema；工具级授权中间件（TS）。

## 第 6 篇｜AuthZ（二）：受众绑定——token passthrough 与混淆代理
- **核心问题**：发给 AI 的 token 如何保证只能用在银行 MCP server？MCP server 访问核心系统用什么凭证？
- **要点**：RFC 8707 与 `aud` 校验；MCP 规范明令禁止的 token passthrough；confused deputy 场景；RFC 8693 Token Exchange 内外凭证隔离。
- **图示**：两层 token 隔离架构图；confused deputy 攻击时序图。

## 第 7 篇｜AuthZ（三）：持有者约束与 FAPI 2.0 差距分析
- **核心问题**：bearer token 被偷了怎么办？通用 AI 客户端达不到 FAPI 2.0 时银行如何补偿？
- **要点**：RFC 9449 DPoP vs RFC 8705 mTLS；FAPI 2.0 Security Profile 逐条对照（PAR、sender-constrained、机密客户端等）；客户端能力差距与补偿控制。
- **图示**：DPoP 证明生成与校验时序图；FAPI 2.0 差距矩阵。

## 第 8 篇｜AuthZ（四）：token 生命周期、撤销与用户授权管理中心
- **核心问题**：token 多长？怎么续？用户在哪里看见、撤销 AI 的权限？
- **要点**：access / refresh token 时长建议与轮换；RFC 7009 撤销、RFC 7662 内省；Shared Signals / CAEP；手机银行内「AI 授权管理」设计。
- **图示**：撤销实时生效时序图；授权管理中心信息架构图。

## 第 9 篇｜AuthZ（五）：高风险操作的「AI 起草，用户签核」
- **核心问题**：如何让 AI 帮上忙，但资金不会因为 AI 的一句话转走？
- **要点**：draft 工具 + 银行侧签核；CIBA 推送签核与 MCP URL-mode elicitation（MRTR）；dynamic linking；所见即所签；mandate 与逐笔签核边界；幂等与过期；理财适当性不可代答；对公多人审批。
- **图示**：起草→签核→记账核心时序图；draft 状态机。
- **代码**：draft 工具与签核回调校验（TS）。

## 第 10 篇｜AI 特有风险：prompt injection、工具投毒与「AI 说的≠用户同意的」
- **核心问题**：OAuth 做对之后，还剩哪些 AI 独有攻击面？
- **要点**：间接 prompt injection（流水备注、收款人名称）；工具描述投毒与 rug pull；跨 server 工具影子；数据最小化；同意证据只能来自银行侧；红队用例。
- **图示**：injection→资金损失攻击树；恶意备注被签核环节拦截时序图。

## 第 11 篇｜治理与合规：审计、风控联动与香港监管要求
- **核心问题**：如何还原「谁、通过哪个 AI 客户端、基于哪次授权、做了什么」？香港监管要求什么？
- **要点**：审计事件模型；反欺诈引擎中的 AI 渠道；HKMA（SPM TM-E-1、Open API 框架、负责任采用 AI 的监管指引及代理式 AI 概念文件——撰写时核对原文）、PCPD/PDPO；对照中国大陆（JR/T 0185-2020 等）与欧盟（PSD2 RTS、DORA、AI Act）；第三方风险管理。
- **图示**：审计事件流转数据流图；监管要求↔设计点映射表。

## 第 12 篇｜落地篇：参考架构、骨架代码与上线检查清单
- **核心问题**：把前 11 篇拼起来，最小可运行实现是什么？上线前查什么？
- **要点**：参考架构；MCP server 骨架（TS，官方 SDK）；授权服务器配置（Python 脚本 + Keycloak 示例）；约 40 项上线清单；分阶段上线路线。
- **图示**：完整参考架构图；部署拓扑图；端到端时序图。
