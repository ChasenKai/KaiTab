# Security Policy

## 支持的版本

| 版本 | 是否接收安全报告 |
|------|------------------|
| v1.0.x（当前稳定版） | ✅ 是 |
| v0.2.x 及更早 | ❌ 不再维护 |

## 报告安全问题

如果你发现 KaiTab 的安全漏洞或隐私风险，请通过以下方式私下报告：

- GitHub Security Advisories: https://github.com/ChasenKai/KaiTab/security/advisories/new
- 或发送邮件至仓库维护者（如有公开联系方式）

请勿在公开 issue 中披露未修复的漏洞细节。

## 安全设计原则

KaiTab 采用以下设计，最大限度降低用户数据风险：

- **本地优先**：所有配置与标签数据仅存储在浏览器本地的 `chrome.storage.local` 中，不上传至任何服务器。
- **无后端**：KaiTab 自身不运行云端服务，也不收集用户数据。
- **无账号**：无需登录，不关联用户身份。
- **iframe 模式隔离**：WeTab 模式通过 `iframe` 嵌入 `https://web.wetab.link/`，遵循该网站的隐私政策；KaiTab 不拦截或记录其内容。
- **最小权限**：`manifest.json` 仅申请完成 New Tab 壳功能所需的最少权限（`storage`、`tabs`、`activeTab`、`chrome_url_overrides`）。

## 已知注意事项

- 扩展以开发者模式本地加载时，浏览器会提示"请停用以开发者模式运行的扩展程序"，这是 Chromium 的正常行为，不影响功能安全。
- 用户通过"备份与恢复"导出的 JSON 文件包含本地配置，请妥善保管，避免泄露给他人。
