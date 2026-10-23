# 让 AI 替你办银行业务：面向 MCP Connector 的身份认证与授权设计

一个技术博客系列：如果一家银行要像 Interactive Brokers 为 Claude 提供 connector 那样，向 AI 助手开放自己的能力，应该怎么设计和实现——**重点是身份认证（AuthN）与授权（AuthZ）**。

- **目标读者**：银行／金融机构的架构师、安全工程师、平台开发者。懂 OAuth 基础，但没做过面向 AI agent 的开放接口。
- **主线地区**：香港（HKMA 监管框架），中国大陆与欧盟作对照。
- **代码**：TypeScript（MCP server），Python（授权服务器配置与脚本）。
- **图示**：Mermaid（GitHub 可直接渲染）。

> 核心论点：**AI 可以起草、解释和准备；资金变动的最终意思表示，只能由用户本人在银行侧受控界面上完成。**

## 目录

| # | 标题 | 状态 |
|---|---|---|
| 1 | [全景篇：从 IBKR Connector 看「AI 代理访问金融账户」](articles/01-landscape-ibkr-connector.md) | ✅ 已发布 |
| 2 | 场景篇：按风险分级，哪些可以交给 AI | ⏳ |
| 3 | AuthN（上）：MCP 授权规范逐条拆解（2026-07-28） | ⏳ |
| 4 | AuthN（下）：绑定银行现有身份体系，SCA 放在哪一步 | ⏳ |
| 5 | AuthZ（一）：权限模型——从 scope 到 Rich Authorization Requests | ⏳ |
| 6 | AuthZ（二）：受众绑定——token passthrough 与混淆代理 | ⏳ |
| 7 | AuthZ（三）：持有者约束与 FAPI 2.0 差距分析 | ⏳ |
| 8 | AuthZ（四）：token 生命周期、撤销与用户授权管理中心 | ⏳ |
| 9 | AuthZ（五）：高风险操作的「AI 起草，用户签核」 | ⏳ |
| 10 | AI 特有风险：prompt injection、工具投毒与「AI 说的≠用户同意的」 | ⏳ |
| 11 | 治理与合规：审计、风控联动与香港监管要求 | ⏳ |
| 12 | 落地篇：参考架构、骨架代码与上线检查清单 | ⏳ |

完整大纲见 [OUTLINE.md](OUTLINE.md)，规范版本基线见 [REFERENCES.md](REFERENCES.md)。

## 写作约定

- 引用 RFC、MCP 规范、FAPI 时注明编号／版本与状态（Final / Draft）。
- 关于 IBKR connector 内部实现，凡不能从公开资料确认的，一律标注「推测」。
- 每篇结尾附「给银行的设计决策清单」。
- 文中「示例银行（香港）／ExampleBank HK」为虚构案例。

## 免责声明

本系列为技术讨论，不构成法律或合规意见。监管要求请以监管机构发布的原文为准。
