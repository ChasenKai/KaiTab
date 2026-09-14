# KaiTab

> 你的 New Tab 万能遥控器。壳扩展内嵌多模式（Mission、WeTab 等），一键切换，不打架。

## 为什么需要它

Chromium 浏览器（Chrome / Edge / Arc / Brave / Vivaldi / Opera）**只允许一个扩展作为 `chrome://newtab` 的覆盖页**。
当你既想要 WeTab 的富功能仪表盘、又想要 Tab Out 的标签治理时，两个扩展会互相覆盖、只能二选一。

KaiTab 是一个**壳（Shell）**：它作为 New Tab 的覆盖页，内部集成多个模式，用户可一键切换、记忆上次选择。

## 当前模式

| 模式 | 类型 | 来源 | 说明 |
|------|------|------|------|
| WeTab | iframe | `https://web.wetab.link/` 网页版 | 富功能 New Tab 仪表盘 |
| **Mission** | local | 开源项目 [zarazhangrui/tab-out](https://github.com/zarazhangrui/tab-out) 移植 | 起始页 + 标签治理：常用站点磁贴（`Shortcuts`）、打开标签按域名分组、一键关闭、保存稍后 |

新增模式只需在 `src/shell.js` 的 `MODES` 数组加一行。

> 📌 **命名区分**：`Mission` 是本扩展里**这个模式的显示名**（顶栏看到的就是它）；它的代码移植自上游开源项目 **Tab Out**（目录仍为 `src/modes/tabout/`，许可与归属声明完整保留）。下文出现「Tab Out」时，除特别说明外**均指上游项目**，不是模式名。

## 目录结构

```
KaiTab 仓库（克隆后根目录即以下内容）
├── README.md                ← 本文件
├── CHANGELOG.md             ← 版本迭代记录
├── LICENSE                  ← 壳代码 MIT © ChasenKai
├── .gitignore
└── src/                     ← ★ 可加载扩展代码（chrome://extensions 指向此）
    ├── manifest.json
    ├── shell.html / shell.js / shell.css
    ├── modes/
    │   └── tabout/          ← 移植自 Tab Out（保留其 MIT LICENSE；含 KaiTab 自定义分组等优化，见「功能归属」节）
    └── assets/icons/        ← 壳扩展图标（扁平、透明底、浏览器窗口 + K；16/48/128 同一份源图缩放）
```

> 克隆时可直接落到本地子目录：`git clone <repo-url> extension`，随后加载 `extension/src`。

## 本地安装（开发者模式）

1. 打开 Chrome / Edge → `chrome://extensions`（Edge 为 `edge://extensions`）
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本仓库的 **`src/`** 目录
4. **确认已卸载 / 关闭其它同样覆盖 New Tab 的扩展**（如 WeTab 扩展版），避免冲突
5. 按 `Ctrl+T` 打开新标签页，验证 KaiTab 加载

> Edge 本地加载无「请停用以开发者模式运行的扩展程序」横幅；Chrome 会有，不影响功能。

## 下载（推荐）

推荐从**官网下载已打包的扩展** zip，解压后按上方「本地安装」步骤 1–5 加载：

👉 https://www.kaibuddy.com/kaitab.html

> GitHub 仓库仅托管源码，不提供打包下载；版本以官网发布为准。

## 功能归属：原版 Tab Out vs KaiTab 优化

为厘清开源合规与后续维护责任，下表区分 **Tab Out 原版自带** 与 **KaiTab 在其基础上新增/优化的部分**。

> 本节中的「Tab Out」一律指**上游开源项目**（`src/modes/tabout/` 的代码来源），不是模式显示名。

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
- **favicon 显示**：Tab Out 直接使用 Chrome 原生的 `chrome.tabs` `favIconUrl`，不再依赖 Google 等第三方 favicon 服务；图标若为标签页自身域名的 `http(s)` 链接则由浏览器加载（与已打开标签页同源），加载失败或为空时回退为域名首字母色块，绝不出现空白。
- **分组按钮对比度修复**：顶栏「⚙ 分组」按钮改用 Tab Out 主题变量，确保在浅色主题可见。
- **常用站点磁贴（顶部 `Shortcuts` 区）**：页面顶部新增一条磁贴，圆形图标 + 站点名，分隔风格沿用上游的 `.section-header`。数据取自 `chrome.topSites`——Chrome 新标签页「最常访问」的同一数据源，按浏览习惯自动生成（同一站点自动聚合，最多 10 条）。图标走 `chrome-extension://<id>/_favicon/`，读的是**浏览器本机缓存的 favicon**，不联网、不依赖第三方 favicon 服务，取不到时降级为离线字母色块。数据权限走 `optional_permissions`，**安装时不申请、无权限警告**，需用户在 KaiTab 设置里主动授权后才读取；未授权时只显示一行提示，不读取任何数据。实现在独立文件 `modes/tabout/kaitab-tiles.js` / `kaitab-tiles.css`，经 `index.html` 引入（+3 行），**不修改上游任何逻辑文件**。单条磁贴可悬停点 `×` 隐藏（存 `kaitab:tilesHidden`）。该开关在 KaiTab 设置面板里**缩进显示于 Mission 之下**（它只作用于这个模式）。支持 `+ Add shortcut` 手动添加（地址自动补全协议、重复校验）与**拖动排序**；自动项与手动项各有独立名额（8 / 10），互不挤占。

### KaiTab 壳本体（独立功能，非上游项目）
- 多模式壳：作为 New Tab 覆盖页，内部集成 Mission / WeTab 等模式
- 顶栏：模式切换器（左）+ **品牌簇**（`KaiTab by Kai` · GitHub 源码链接）与设置入口（右）
- 设置面板：模式开关、默认启动模式、常用站点磁贴、**版本号与开源致谢**（上游署名放在此处，模式页页脚不再显示）
- 全局快捷键：`background.js` + `manifest.commands`（`Ctrl+Shift+1..4`）
- 备份与恢复：导出 / 导入全部配置 JSON（**含上游的 `deferred` 与 `tabout:customGroups`**）
- 隐藏 Chrome 原生「自定义 Chrome」按钮（尽力兜底 + 用户右键原生隐藏）

### 对上游文件的最小改动（KaiTab 侧 · 全量清单）
为适配壳内 iframe 环境与品牌策略，只动了下面这些地方：

**`modes/tabout/index.html`**
- 移除可选的 `config.local.js` 引用（避免 404 噪音）
- **页脚上游署名链接移除** → 署名改放壳设置面板的「开源致谢」区
- 页面 `<title>` 改为 `Mission`（原为 `Tab Out`）
- 重复页提示条文案：`Tab Out` → `Mission`
- 为承载「常用站点磁贴」叠加层，引入 3 行（1 个容器节点 + `kaitab-tiles.css` + `kaitab-tiles.js`）

**`modes/tabout/app.js`**
- 用户可见文案：toast `Closed extra Tab Out tabs` → `Closed extra Mission tabs`
- **「重复 New Tab」判定修复**：上游只认扩展根的 `index.html` + `chrome://newtab/`，放在 KaiTab 里**永远匹配不上**（真正的新标签页是壳 `shell.html`，模式页在 `modes/tabout/index.html`），且 Edge 的 newtab 是 `edge://newtab/` → 该提示条**在 Edge 上永不出现**。改为用运行时前缀 `chrome.runtime.getURL('')` + 双浏览器兜底 URL。

其余（`style.css` / `background.js` / `icons` / `LICENSE`）**完全未动**，以方便日后与上游同步。

> **挪的是可见署名，不是版权声明**：上游许可与归属完整保留在 `modes/tabout/LICENSE`，归属说明见上一节。

## 许可

- KaiTab 壳代码：MIT，© 2026 ChasenKai，见 `LICENSE`
- `src/modes/tabout/`：MIT License，© 2026 Zara Zhang，保留其 `LICENSE`
