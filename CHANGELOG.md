# Changelog

本文档记录 KaiTab 的版本迭代。版本号语义：Phase 0 自用阶段从 `0.x.0` 起步。

## [0.2.3] - 2026-09-03

### Added
- **关闭全部二次确认**：Tab Out 中「Close all N tabs」和分组卡片上的「Close all N tabs」点击时弹出 `window.confirm` 确认，避免误触一次性关闭大量标签。单个关闭、去重保留一个等操作不受影响。

### Fixed
- **分组按钮对比度**：Tab Out 顶栏「⚙ 分组」按钮从浅色 fallback 改为使用 Tab Out 主题变量 `--ink`（深棕）+ `--muted`（边框）+ 浅灰底，确保在浅色主题下可见。
- **favicon 图标加载失败**：Tab Out 使用 Google favicon 服务（`www.google.com/s2/favicons`），该请求会 302 重定向到 `www.gstatic.com`，但 CSP `img-src` 未放行 `gstatic.com` 导致图标裂图。已在 CSP 中增加 `https://www.gstatic.com`。

### Changed
- `manifest.json` 版本 `0.2.2` → `0.2.3`。

## [0.2.2] - 2026-09-03

### Added
- **Tab Out 自定义分组（option B）**：Tab Out 内新增「分组」按钮（顶栏右侧），可自定义分组规则，把指定域名/后缀归到一个命名分组（如「工作」「资讯」），可选路径前缀。
  - 规则存储于 `chrome.storage.local` 的 `tabout:customGroups`（不再是 `config.local.js` 代码文件），因此**自动被 KaiTab 壳的「备份与恢复」覆盖**，无需单独导出。
  - 分组逻辑接入 Tab Out 既有钩子（`matchCustomGroup` / `groupKey` / `groupLabel`），自定义分组优先于默认按域名分组。
  - 保留对原 `config.local.js` 全局 `LOCAL_CUSTOM_GROUPS` / `LOCAL_LANDING_PAGE_PATTERNS` 的向后兼容（仅当 storage 中无规则时回退）。

### Changed
- `manifest.json` 版本 `0.2.1` → `0.2.2`，权限与命令不变。

## [0.2.1] - 2026-09-03

### Added
- **备份与恢复**：设置面板新增「备份与恢复」分区，含「导出配置」「导入配置」两个按钮。
  - **导出**：把 `chrome.storage.local` 中全部 KaiTab 配置（含未来新增的自定义分组等）序列化为带时间戳的 JSON 文件下载。
  - **导入**：读取 JSON 备份写回存储，并重渲染顶栏与设置、切回应加载的模式。
  - 用途：KaiTab 为本地优先、无账号，配置按扩展 ID 隔离；unpacked 模式更换文件夹路径会导致 ID 变化、旧配置丢失，故升级/换设备前可手动导出备份，事后导入恢复。
  - 设计决策：自定义分组（规划中的 option b）将**存储于 `chrome.storage.local` 而非代码文件**，因此会自动被本备份覆盖，无需单独导出。

### Changed
- `manifest.json` 版本 `0.2.0` → `0.2.1`，权限与命令不变。

## [0.2.0] - 2026-09-02

### Added
- **默认启动模式**：设置面板可选「记忆上次使用」或任一已启用模式，新开 New Tab 时按优先级加载（默认模式 > 上次记忆 > 首个启用）。
- **全局快捷键**：`manifest.json` 注册 `background.service_worker` + 9 条 `commands`（`switch-mode-1..9`）；新建 `background.js` 监听 `chrome.commands.onCommand`，按启用顺序把「切换模式」指令经 `chrome.runtime.sendMessage` 转发给 New Tab 页面。
  - 默认快捷键只设前 4 条（`Ctrl+Shift+1..4`）：Chrome 规定 `commands` 里带 `suggested_key` 的条目最多 **4 个**，超过会报 `Too many shortcuts specified for 'commands': The maximum is 4.` 并拒绝加载。后 5 条保留为命令但无默认快捷键，用户可在 `chrome://extensions/shortcuts` 里手动绑定。
  - 选 `Ctrl+Shift` 而非 `Ctrl+1..8`：后者被 Chrome 保留为标签切换，会与扩展命令冲突；`Shift` 组合可稳定触发，且焦点在 iframe 内时也只有浏览器级命令能收到。

### Changed
- 设置入口从右下角悬浮按钮改为**顶栏右上角**，与内嵌产品（WeTab/Tab Out）自身的设置入口分离，避免混淆。
- 默认模式顺序调整：**Tab Out 排在第 1 位**，WeTab 排在第 2 位；顶栏、快捷键、默认启动选项均按此顺序。
- 设置 UI 文案清理：模式列表恢复显示 `desc`，但去掉括号里的技术实现描述（如「iframe 嵌入」「开源移植」），只保留总结性说明（如「WeTab 网页版」「标签治理仪表盘」）。
- 提示文案去商业化：关闭其他 New Tab 扩展的示例从「WeTab 扩展版」改为「Tab Out 扩展版」。
- **CSP 微调**：`img-src` 增加 `data:`，解决 Tab Out 内部 inline SVG（`data:image/svg+xml`）被拦截产生的 Console 报错。
- **隐藏 Chrome 原生「自定义 Chrome」按钮**：在 `shell.css` 中增加规则，避免用户误以为是 KaiTab 设置入口。
- `manifest.json` 版本 `0.1.0` → `0.2.0`，权限维持 `storage` + `tabs` + `activeTab` 不变。

### Removed
- **「显示顶部切换器」开关**：设置入口已移到顶栏，且顶栏长期显示，该开关与产品设计冲突，已移除；`shell:showSwitcher` 存储键废弃。

### Fixed
- 修复设置面板关闭时自动切回 WeTab 的 Bug：原 `saveSettings()` 在重新渲染顶栏后才判断当前模式，导致 `active` 按钮丢失，误判为未启用而强行切回第一个模式。现改为在渲染前先记录当前模式，若仍在启用列表则仅恢复高亮，不再重新加载 iframe。

### Notes
- 自定义背景（Phase 4 设想）本次**有意未做**：WeTab / Tab Out 的 iframe 铺满视口，背景不可见，做了也无意义。

## [0.1.0] - 2026-09-02

### Added
- 壳扩展骨架：`manifest.json` + `shell.html` + `shell.js` + `shell.css`
- 模式注册表 + 切换逻辑 + 持久化（记忆上次模式、开关模式）
- 设置面板（开关显示哪些模式）
- 模式一：WeTab 网页版 iframe 嵌入
- 模式二：Tab Out 开源项目移植（本地 iframe 加载）
- 严格 CSP（限制 frame-src / img-src / style-src / font-src 到必要来源，connect-src 全禁）
- 项目结构：GitHub 仓边界下沉到 `extension/`（代码 `extension/src/` + 文档 + 发布包），与 `internal/`（私有，不上传）平行；外层 `KaiTab/` 仅作工作文件夹

### Changed
- 图标不再直接处理豆包原图，改为以豆包那版为参考图用 ImageGen image-to-image 重生成：扁平、透明底、无文字无水印，浏览器窗口 + 青色折纸 K。16/48/128 同一份源图缩放，16px 仍清晰可辨。

### Notes
- 修正原方案一处错误假设：MV3 下 `tabs` 权限本身即可读取全量 `tab.url`/`title`，**无需 `<all_urls>`**；壳 manifest 仅需 `storage` + `tabs` + `activeTab`。
- Tab Out 移植安全审计：纯本地，无主动外联（唯一外联为 Google favicon 图，已通过 CSP `img-src` 放行）；历史上危险的服务端已在 upstream 2026-04-13 安全提交移除。
