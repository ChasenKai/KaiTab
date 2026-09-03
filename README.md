# KaiTab

> 你的 New Tab 万能遥控器。壳扩展内嵌多模式（WeTab、Tab Out 等），一键切换，不打架。

## 为什么需要它

Chromium 浏览器（Chrome / Edge / Arc / Brave / Vivaldi / Opera）**只允许一个扩展接管 `chrome://newtab`**。
当你既想要 WeTab 的富功能仪表盘、又想要 Tab Out 的标签治理时，两个扩展会互相覆盖、只能二选一。

KaiTab 是一个**壳（Shell）**：它自己唯一接管 New Tab，内部集成多个模式，用户可一键切换、记忆上次选择。

## 当前模式

| 模式 | 类型 | 来源 | 说明 |
|------|------|------|------|
| WeTab | iframe | `https://web.wetab.link/` 网页版 | 富功能 New Tab 仪表盘 |
| Tab Out | local | 开源项目 [zarazhangrui/tab-out](https://github.com/zarazhangrui/tab-out) 移植 | 按域名分组展示所有打开标签、检测重复、一键关闭、保存稍后 |

新增模式只需在 `src/shell.js` 的 `MODES` 数组加一行。

## 目录结构

```
KaiTab/                          ← 工作文件夹（非 git 仓，仅本地管理用）
├── extension/                   ← ★ GitHub 仓边界（Phase 1 在此 git init）
│   ├── README.md                ← 本文件
│   ├── CHANGELOG.md             ← 版本迭代记录
│   ├── .gitignore
│   ├── docs/                    ← 规划 / 方案文档
│   │   └── KaiTab_方案.md
│   ├── releases/                ← 各版本发布包（Phase 1+ 用）
│   └── src/                     ← ★ 可加载扩展代码（chrome://extensions 指向此）
│       ├── manifest.json
│       ├── shell.html / shell.js / shell.css
│       ├── modes/
│       │   └── tabout/          ← 移植自 Tab Out（保留其 MIT LICENSE；含 KaiTab 自定义分组等优化，见「功能归属」节）
│       └── assets/icons/        ← 壳扩展图标（参考豆包 LOGO 风格：扁平、透明底、浏览器窗口 + K，蓝绿色；16/48/128 同一份源图缩放）
└── internal/                    ← 私有文档 / 物料（与仓平行，永不上传 GitHub）
```

> 仓边界下沉到 `extension/` 的原因：工作文件夹 `KaiTab/` 下还会放内部草稿、调研、私密素材等；
> 把它们和公开仓的内容平行分开，上传时不会误带，git 边界也干净。
> 克隆时可直接落到这个子目录：`git clone <repo-url> extension`。

## 本地安装（开发者模式）

1. 打开 Chrome / Edge → `chrome://extensions`（Edge 为 `edge://extensions`）
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本仓库的 **`extension/src/`** 目录
4. **确认已卸载 / 关闭其他接管 New Tab 的扩展**（如 WeTab 扩展版），避免冲突
5. 按 `Ctrl+T` 打开新标签页，验证 KaiTab 加载

> Edge 本地加载无「请停用以开发者模式运行的扩展程序」横幅；Chrome 会有，不影响功能。

## 功能归属：原版 Tab Out vs KaiTab 优化

为厘清开源合规与后续维护责任，下表区分 **Tab Out 原版自带** 与 **KaiTab 在其基础上新增/优化的部分**。

### Tab Out 原版自带（仅移植，未改核心逻辑）
- New Tab 仪表盘主框架（问候语 / 日期 / 页脚统计）
- 打开标签 **按域名分组** 展示
- **Landing Pages 特殊分组**（Gmail / X / LinkedIn / GitHub / YouTube 首页）
- **Saved for Later**（稍后阅读清单，存 `chrome.storage.local`）
- 归档（Archive）
- 单标签关闭 / 域内全部关闭 / 全部关闭 / 去重保留一个
- 友好域名显示、toast 提示、关闭音效、彩带动画
- `config.local.js` 自定义分组钩子（**原设计概念**，但文件未随包发布，开箱不可用）

### KaiTab 在 Tab Out 基础上的优化 / 开发
- **自定义分组（取代原 `config.local.js` 机制）**：规则改存 `chrome.storage.local` 的 `tabout:customGroups`，并新增「⚙ 分组」弹窗可界面增删规则（分组名 + 精确域名/后缀 + 可选路径前缀）。自动被 KaiTab 备份导出覆盖。
- **关闭二次确认**：域内「Close all」与全局「Close all」点击弹 `window.confirm` 确认，规避误关大量标签；单标签 / 去重不受影响。
- **favicon 加载修复**：Tab Out 用 Google favicon 服务会 302 到 `gstatic.com`，已在 `manifest.json` 的 CSP `img-src` 放行 `https://www.gstatic.com`。
- **分组按钮对比度修复**：顶栏「⚙ 分组」按钮改用 Tab Out 主题变量，确保在浅色主题可见。

### KaiTab 壳本体（独立功能，非 Tab Out）
- 多模式壳：唯一接管 New Tab，内部集成 Tab Out / WeTab 等模式
- 设置面板：模式开关、默认启动模式、版本号
- 全局快捷键：`background.js` + `manifest.commands`（`Ctrl+Shift+1..4`）
- 备份与恢复：导出 / 导入全部配置 JSON（**含 Tab Out 的 `deferred` 与 `tabout:customGroups`**）
- 隐藏 Chrome 原生「自定义 Chrome」按钮（尽力兜底 + 用户右键原生隐藏）
- 图标（参考豆包 LOGO 风格，ImageGen 重生成）

### 壳内 iframe 接入的最小壳适配
为适配壳内 iframe 环境，对 `src/modes/tabout/index.html` 做了两处最小改动：
- 移除可选的 `config.local.js` 引用（避免 404 噪音）
- 页脚外链 `target="_top"` → `target="_blank"`（避免在壳内跳出整个 New Tab）

其余文件（app.js / style.css / background.js / icons）原样保留，以方便日后与上游同步。

## 许可

- KaiTab 壳代码：MIT，© 2026 ChasenKai，见 `LICENSE`
- `src/modes/tabout/`：MIT，© Zara Zhang 2026，保留其 `LICENSE`

## 路线图

见 `docs/KaiTab_方案.md` 的分阶段执行路线图（Phase 0 本地自用 → Phase 1 产品化 → Phase 2/3 上架）。
