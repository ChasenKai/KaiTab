# Changelog

本文档记录 KaiTab 的版本迭代（语义化版本，SemVer）。

## [1.0.0] - 2026-09-03

首个稳定版（first stable release）。

### 功能
- 壳扩展唯一接管 `chrome://newtab`，内部集成多模式、一键切换、记忆上次选择。
- 模式：WeTab 网页版仪表盘（iframe 嵌入）。
- 模式：Tab Out 标签管理器（本地移植自开源项目），支持按域名分组、重复检测、一键关闭、稍后阅读。
- Tab Out 自定义分组：基于规则的命名分组，规则存于 `chrome.storage.local`，随备份导出自动覆盖。
- 全局快捷键 `Ctrl+Shift+1..4` 切换模式。
- 配置备份与恢复：全部 KaiTab 配置导出 / 导入为带时间戳的 JSON。
- 关闭全部二次确认：域内 / 全局「Close all」点击弹窗确认，避免误关大量标签。
- 浅色 / 深色主题适配。
