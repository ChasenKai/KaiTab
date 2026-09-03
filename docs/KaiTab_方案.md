# KaiTab — 完整可执行方案

> **版本**：v1.0  
> **日期**：2026-09-01  
> **状态**：可直接执行（Vibe Coding Ready）

---

## 1. 项目概述

### 1.1 背景
- 用户当前使用 **WeTab** 作为 New Tab 页扩展，功能丰富（小组件、收藏夹、AI 工具等）。
- 用户发现 **Tab Out**（GitHub 开源），专注"标签治理"——按域名分组展示所有打开标签、检测重复、一键关闭、保存稍后等。
- **核心矛盾**：Chromium 浏览器（Chrome / Edge / Arc / Brave / Vivaldi / Opera）**只允许一个扩展接管 `chrome://newtab`**。WeTab 与 Tab Out 同时安装会冲突，后安装者覆盖前者。
- **解决思路**：自己开发一个"壳扩展"（Shell Extension），作为唯一接管 New Tab 的入口，内部集成多个模式（WeTab 网页版、Tab Out 源码等），用户可切换使用。

### 1.2 定位
**KaiTab —— 你的 New Tab 万能遥控器**

- 唯一接管浏览器 New Tab 页
- 支持多模式切换（WeTab、Tab Out、未来新模式）
- 设置面板控制显示/隐藏哪些模式
- 持久记忆用户最后选择的模式
- 模块化架构，方便后续扩展

### 1.3 命名由来

**KaiTab** 为暂定产品名，命名逻辑如下：

| 维度 | 考量 |
|------|------|
| **前缀** | `Kai` —— 个人 IP 前缀，建立品牌辨识度 |
| **后缀** | `Tab` —— 直接锚定 New Tab 场景，用户一眼知道这是做什么的 |
| **中文双关** | "开 Tab" —— 天然口语化记忆点，"打开新标签"即"开 Tab" |
| **长度** | 6 个字母，极简，输入和传播成本最低 |
| **壳的概念** | **不体现在名字里**。"壳"是产品内核与哲学（"只壳最好的"），通过 Slogan、视觉设计和定位文案传达，而非硬塞进名字。类比：Docker 不叫 DockerContainer，Chrome 不叫 ChromeBrowser |

**关于是否在名字中体现"壳"的分析：**

| 候选名 | 长度 | 体现壳 | 问题 |
|--------|------|--------|------|
| KaiTab | 6 | ❌ | 当前选定，最简洁 |
| KaiTabShell | 11 | ✅ | 太长，三音节，传播成本高 |
| KaiTabsShell | 12 | ✅ | 更长更啰嗦 |
| KaiShell | 8 | ✅ | 计算机语境下"Shell"=命令行，易歧义 |
| KaiBox | 6 | ✅(盒子) | 容器感有，但与 Tab 场景脱钩 |
| KaiSpace | 8 | ✅(空间) | 有容纳感，但和 New Tab 关联弱 |

**结论**：KaiTab 在"简洁性、场景关联度、传播成本"三个维度上最优。"壳"的概念通过以下方式传达：
- Slogan：*"KaiTab —— 只壳最好的 New Tab"*
- 定位文案：*"KaiTab 不是一个 New Tab，而是一个 New Tab 壳"*
- 视觉设计：Logo 可采用"Tab 外包裹一层轮廓"的意象

### 1.3 目标浏览器
所有 **Chromium 内核**浏览器：Chrome、Edge、Arc、Brave、Vivaldi、Opera。  
（Firefox 需单独适配 Manifest 格式，本方案暂不覆盖。）

---

## 2. 参考信息溯源

| 来源 | 地址 | 关键信息 | 使用方式 |
|------|------|---------|---------|
| **Tab Out** | `https://github.com/zarazhangrui/tab-out` | MIT 开源；纯前端；无服务器/无 npm；使用 `chrome.tabs` + `chrome.storage.local` | 源码移植到 `modes/tabout/` |
| **WeTab 网页版** | `https://web.wetab.link/` | 完整功能网页版；支持账号登录同步；**无 X-Frame-Options / 无 CSP frame-ancestors / 无 frame-busting 代码**；`Access-Control-Allow-Origin: *` | iframe 嵌入 |
| **WeTab 扩展版** | Chrome 商店 | 接管 New Tab，与壳扩展冲突 | **必须卸载或关闭"接管新标签页"** |
| **扩展市场数据** | Chrome 商店统计 | 2026 Q1 净新增 30,125 个扩展；New Tab 是高频入口 | 背景参考 |

> **验证记录**：2026-09-01 通过 HTTP HEAD/GET 检测 `web.wetab.link`，确认响应头中不存在 `X-Frame-Options`、`Content-Security-Policy`（含 `frame-ancestors`）或 frame-busting 代码。**iframe 嵌入可行。**

---

## 3. 核心限制与约束

### 3.1 浏览器级硬限制
1. **唯一 New Tab 接管者**：Chrome 只允许一个扩展通过 `chrome_url_overrides.newtab` 接管新标签页。壳扩展安装后，WeTab 扩展必须卸载/关闭接管功能，否则冲突。
2. **权限全局性**：Manifest V3 中 `tabs`、`storage` 等权限是扩展全局的，无法在"模式级别"做权限隔离。Tab Out 需要的 `tabs` 权限会赋予整个壳扩展。
3. **扩展间无法互相调用**：闭源的 New Tab 扩展无法被其他扩展嵌入或调用其内部逻辑。

### 3.2 嵌入方式限制
- **iframe 嵌入网页版**：仅适用于提供网页版且未设置 iframe 阻断的服务（如 WeTab）。供应链风险（CDN 被篡改等）由被嵌入方承担，壳扩展不新增风险。
- **源码集成**：仅适用于开源项目（如 Tab Out）。需手动审计代码，确认无隐藏网络请求。
- **闭源扩展**：❌ 无法直接集成。如需接入，必须寻找网页版替代或自研 MVP 复刻。

### 3.3 安全边界
- **壳扩展只对自己的代码负责**：不对 WeTab、Tab Out 等第三方服务的安全性负责（用户本来就在直接使用这些服务）。
- **壳扩展必须控制自身的攻击面**：CSP、存储隔离、XSS 防护是壳自己的责任。

---

## 4. 安全策略（壳扩展自身）

| 安全措施 | 必要性 | 实施方式 |
|---------|--------|---------|
| **严格 CSP** | ✅ 必须 | `manifest.json` 中设置 `content_security_policy`，限制 `frame-src` 仅允许 `https://web.wetab.link/`，禁止 `connect-src`，禁止内联脚本 |
| **存储 Key 前缀隔离** | ✅ 必须 | 壳配置使用 `shell:*` 前缀；Tab Out 保持原 key 不变；避免互相覆盖 |
| **关闭其他 New Tab 扩展提示** | ✅ 必须 | 在设置页/关于页提示用户卸载 WeTab 扩展等，避免冲突 |
| **壳层代码零 `innerHTML`** | ✅ 建议 | 所有 DOM 插入使用 `textContent` 或 `createElement`，杜绝 XSS 注入 |
| **审计移植代码** | ✅ 建议 | 检查 Tab Out 源码中是否存在 `fetch`、`XMLHttpRequest`、动态 `<script>` 插入 |
| **零外部依赖** | ✅ 建议 | MVP 阶段不引入任何 npm 包或 CDN 脚本，降低供应链风险 |
| **隐私声明** | ✅ 建议 | 明确声明"本扩展不收集任何用户数据，所有配置存储在本地" |

---

## 5. 技术架构设计

```
📁 KaiTab/                    ← 项目根目录
├── manifest.json                   ← 唯一接管 chrome://newtab
├── shell.html                      ← 主容器页面
├── shell.js                        ← 核心：切换逻辑 + 持久化 + 设置
├── shell.css                       ← 容器 + 切换器样式
│
├── 📁 modes/                       ← 模块化目录
│   ├── wetab/
│   │   └── index.html              ← iframe 加载 https://web.wetab.link/
│   └── tabout/                     ← 从 Tab Out 源码移植
│       ├── index.html
│       ├── app.js
│       └── style.css
│
├── 📁 shared/                      ← 公共组件
│   └── storage.js                  ← chrome.storage 封装（可选）
│
└── 📁 assets/
    └── icons/                      ← 扩展图标
```

### 5.1 模式注册表（可扩展）
```javascript
const MODES = [
  { id: 'wetab',   name: 'WeTab',     type: 'iframe', url: 'https://web.wetab.link/', icon: '🔷' },
  { id: 'tabout',  name: 'Tab Out',   type: 'local',  path: 'modes/tabout/index.html', icon: '🧹' },
  // 未来新增模式，在此添加一行即可
];
```

### 5.2 适配方式决策树
```
发现想接入的新扩展/服务
    │
    ├── 有网页版且允许 iframe？
    │   └── → iframe 嵌入（如 WeTab）✅ 最简单
    │
    ├── 开源（MIT/Apache）？
    │   └── → 源码集成到 modes/xxx/（如 Tab Out）✅ 可控
    │
    ├── 闭源，仅有扩展商店版？
    │   └── → ❌ 无法嵌入（权限冲突 + 无法调用内部逻辑）
    │   └── → 替代：找网页版，或自研最小 MVP
    │
    └── 以上都无？
        └── → 自研最小 MVP（如极简搜索+壁纸）
```

---

## 6. MVP 实施计划（WeTab + Tab Out）

### 6.1 前置条件
1. **卸载 WeTab 扩展**（或在其设置中关闭"接管新标签页"功能）
2. **卸载 Tab Out 扩展**（壳扩展将内置其功能）
3. 确保浏览器为 Chromium 内核

### 6.2 实施步骤

| 步骤 | 内容 | 预估时间 |
|------|------|---------|
| 1 | 搭建壳扩展骨架（manifest + shell.html + shell.js + shell.css） | 30 min |
| 2 | 实现模式切换逻辑 + 持久化存储 | 30 min |
| 3 | 接入 WeTab（iframe 嵌入网页版） | 15 min |
| 4 | 移植 Tab Out 源码到 modes/tabout/ | 1-2 h |
| 5 | 实现设置面板（开关显示哪些模式） | 30 min |
| 6 | 设置严格 CSP + 安全审计 | 30 min |
| 7 | 测试：切换、持久化、关闭重开、冲突检查 | 30 min |

**总计：约 4-5 小时出可用版本。**

---

## 7. 完整代码实现

### 7.1 manifest.json
```json
{
  "manifest_version": 3,
  "name": "KaiTab",
  "version": "1.0.0",
  "description": "KaiTab —— 你的 New Tab 万能遥控器。支持 WeTab、Tab Out 等多模式切换。",
  "chrome_url_overrides": {
    "newtab": "shell.html"
  },
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://web.wetab.link/*"
  ],
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-src https://web.wetab.link/; connect-src 'none';"
  }
}
```

### 7.2 shell.html
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>KaiTab</title>
  <link rel="stylesheet" href="shell.css">
</head>
<body>
  <!-- 顶部切换器 -->
  <nav id="switcher" role="tablist" aria-label="模式切换"></nav>

  <!-- 视图容器 -->
  <main id="viewport"></main>

  <!-- 设置按钮 -->
  <button id="settings-btn" title="设置" aria-label="打开设置">⚙️</button>

  <!-- 设置面板（默认隐藏） -->
  <div id="settings-panel" class="hidden">
    <div class="settings-header">
      <h2>设置</h2>
      <button id="close-settings" aria-label="关闭设置">✕</button>
    </div>
    <div class="settings-body">
      <h3>显示的模式</h3>
      <div id="mode-toggles"></div>
      <hr>
      <div class="notice">
        <p>⚠️ <strong>提示</strong>：使用本扩展前，请关闭其他接管 New Tab 的扩展（如 WeTab 扩展版），避免冲突。</p>
        <p>🔒 <strong>隐私</strong>：本扩展不收集任何用户数据，所有配置存储在本地。</p>
      </div>
    </div>
  </div>

  <script src="shell.js"></script>
</body>
</html>
```

### 7.3 shell.css
```css
/* ===== 重置 ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

/* ===== 布局 ===== */
body { display: flex; flex-direction: column; }

/* 切换器 */
#switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1a1a2e;
  border-bottom: 1px solid #2d2d44;
  flex-shrink: 0;
  z-index: 10;
}

#switcher button {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: #2d2d44;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

#switcher button:hover { background: #3d3d5c; }
#switcher button.active { background: #4f46e5; color: #fff; }

/* 视图容器 */
#viewport {
  flex: 1;
  position: relative;
  background: #0f0f1a;
}

#viewport iframe {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border: none;
}

/* 设置按钮 */
#settings-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 40px; height: 40px;
  border-radius: 50%;
  border: none;
  background: #2d2d44;
  color: #e0e0e0;
  font-size: 18px;
  cursor: pointer;
  z-index: 100;
  transition: background 0.2s;
}
#settings-btn:hover { background: #3d3d5c; }

/* 设置面板 */
#settings-panel {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 360px;
  max-width: 90vw;
  background: #1a1a2e;
  border: 1px solid #2d2d44;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  z-index: 200;
  color: #e0e0e0;
}

#settings-panel.hidden { display: none; }

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #2d2d44;
}
.settings-header h2 { font-size: 16px; font-weight: 600; }
#close-settings {
  background: none; border: none; color: #888;
  font-size: 18px; cursor: pointer;
}
#close-settings:hover { color: #fff; }

.settings-body { padding: 16px 20px; }
.settings-body h3 { font-size: 14px; margin-bottom: 12px; color: #aaa; }

.mode-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #2d2d44;
}
.mode-toggle-row:last-child { border-bottom: none; }
.mode-toggle-row label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; }
.mode-toggle-row input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }

.notice { margin-top: 16px; padding: 12px; background: #2d2d44; border-radius: 8px; font-size: 12px; line-height: 1.6; color: #aaa; }
.notice p { margin-bottom: 8px; }
.notice p:last-child { margin-bottom: 0; }

/* 遮罩层 */
#overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 150;
  display: none;
}
#overlay.show { display: block; }
```

### 7.4 shell.js
```javascript
/**
 * KaiTab — 核心逻辑
 * 负责：模式注册、切换、持久化、设置面板
 */

// ===== 模式注册表 =====
// 新增模式只需在此添加对象，无需改其他代码
const MODES = [
  {
    id: 'wetab',
    name: 'WeTab',
    type: 'iframe',
    url: 'https://web.wetab.link/',
    icon: '🔷',
    desc: 'WeTab 网页版（iframe 嵌入）'
  },
  {
    id: 'tabout',
    name: 'Tab Out',
    type: 'local',
    path: 'modes/tabout/index.html',
    icon: '🧹',
    desc: '标签治理仪表盘'
  }
  // 未来新增模式，在此添加
];

// Storage keys（前缀隔离）
const SK_LAST_MODE      = 'shell:lastMode';
const SK_ENABLED_MODES  = 'shell:enabledModes';
const SK_SETTINGS_OPEN  = 'shell:settingsOpen';

// ===== DOM 引用 =====
const switcherEl      = document.getElementById('switcher');
const viewportEl      = document.getElementById('viewport');
const settingsBtn     = document.getElementById('settings-btn');
const settingsPanel   = document.getElementById('settings-panel');
const closeSettingsBtn= document.getElementById('close-settings');
const modeTogglesEl   = document.getElementById('mode-toggles');

// 遮罩层（动态创建）
const overlay = document.createElement('div');
overlay.id = 'overlay';
document.body.appendChild(overlay);

// ===== 初始化 =====
async function init() {
  // 读取配置
  const { [SK_LAST_MODE]: lastMode, [SK_ENABLED_MODES]: enabledModes } =
    await chrome.storage.local.get([SK_LAST_MODE, SK_ENABLED_MODES]);

  const defaultEnabled = MODES.map(m => m.id);
  const activeEnabled  = enabledModes || defaultEnabled;
  const activeLast     = lastMode && activeEnabled.includes(lastMode)
                         ? lastMode
                         : activeEnabled[0];

  // 渲染切换器（只显示启用的模式）
  renderSwitcher(activeEnabled);

  // 渲染设置面板
  renderSettings();

  // 加载默认模式
  if (activeLast) {
    await switchMode(activeLast);
  } else {
    viewportEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;font-size:14px;">请在设置中启用至少一个模式</div>';
  }

  // 绑定事件
  bindEvents();
}

// ===== 渲染切换器 =====
function renderSwitcher(enabledIds) {
  switcherEl.innerHTML = '';

  for (const mode of MODES) {
    if (!enabledIds.includes(mode.id)) continue;

    const btn = document.createElement('button');
    btn.dataset.mode = mode.id;
    btn.textContent = `${mode.icon} ${mode.name}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    switcherEl.appendChild(btn);
  }
}

// ===== 切换模式 =====
async function switchMode(modeId) {
  const mode = MODES.find(m => m.id === modeId);
  if (!mode) return;

  // 清空视口
  viewportEl.innerHTML = '';

  // 创建 iframe
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';

  if (mode.type === 'iframe') {
    iframe.src = mode.url;
    // 安全：sandbox 限制，但保留必要权限
    iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms';
  } else if (mode.type === 'local') {
    iframe.src = chrome.runtime.getURL(mode.path);
  }

  viewportEl.appendChild(iframe);

  // 持久化
  await chrome.storage.local.set({ [SK_LAST_MODE]: modeId });

  // 更新按钮状态
  switcherEl.querySelectorAll('button').forEach(btn => {
    const isActive = btn.dataset.mode === modeId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
}

// ===== 渲染设置面板 =====
function renderSettings() {
  modeTogglesEl.innerHTML = '';

  chrome.storage.local.get(SK_ENABLED_MODES).then(({ [SK_ENABLED_MODES]: saved }) => {
    const enabled = saved || MODES.map(m => m.id);

    for (const mode of MODES) {
      const row = document.createElement('div');
      row.className = 'mode-toggle-row';

      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = mode.id;
      checkbox.checked = enabled.includes(mode.id);
      checkbox.dataset.modeId = mode.id;

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(`${mode.icon} ${mode.name}`));

      const desc = document.createElement('span');
      desc.style.cssText = 'font-size:12px;color:#666;';
      desc.textContent = mode.desc;

      row.appendChild(label);
      row.appendChild(desc);
      modeTogglesEl.appendChild(row);
    }
  });
}

// ===== 保存设置 =====
async function saveSettings() {
  const checkboxes = modeTogglesEl.querySelectorAll('input[type="checkbox"]');
  const enabled = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (enabled.length === 0) {
    alert('请至少启用一个模式');
    return;
  }

  await chrome.storage.local.set({ [SK_ENABLED_MODES]: enabled });

  // 重新渲染切换器
  renderSwitcher(enabled);

  // 如果当前模式被禁用，切换到第一个可用模式
  const currentActive = switcherEl.querySelector('button.active');
  if (!currentActive || !enabled.includes(currentActive.dataset.mode)) {
    await switchMode(enabled[0]);
  }
}

// ===== 事件绑定 =====
function bindEvents() {
  // 切换器点击
  switcherEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    switchMode(btn.dataset.mode);
  });

  // 打开设置
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
    overlay.classList.add('show');
    renderSettings(); // 刷新状态
  });

  // 关闭设置
  function closeSettings() {
    settingsPanel.classList.add('hidden');
    overlay.classList.remove('show');
    saveSettings();
  }

  closeSettingsBtn.addEventListener('click', closeSettings);
  overlay.addEventListener('click', closeSettings);

  // ESC 关闭设置
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsPanel.classList.contains('hidden')) {
      closeSettings();
    }
  });
}

// 启动
init();
```

### 7.5 modes/wetab/index.html
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WeTab</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0f0f1a; }
    iframe { width: 100%; height: 100%; border: none; }
    .loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #666; font-family: sans-serif; font-size: 14px; }
  </style>
</head>
<body>
  <div class="loading" id="loading">正在加载 WeTab...</div>
  <iframe src="https://web.wetab.link/" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" onload="document.getElementById('loading').style.display='none'"></iframe>
</body>
</html>
```

> **注意**：shell.js 中已经通过 iframe 直接加载 WeTab，此文件是备用方案。如果 shell.js 的 iframe 方式工作正常，可以省略此文件，直接在 shell.js 中加载 `https://web.wetab.link/`。

### 7.6 modes/tabout/ — Tab Out 移植说明

Tab Out 源码位于 `https://github.com/zarazhangrui/tab-out`，MIT 协议。

**移植步骤：**
1. Clone 仓库：`git clone https://github.com/zarazhangrui/tab-out.git`
2. 将 `tab-out/extension/` 目录下的所有文件复制到 `modes/tabout/`
3. 修改 `modes/tabout/manifest.json`（如果存在）——**删除** `chrome_url_overrides` 字段，避免与壳扩展冲突
4. 检查并修改资源路径：
   - 所有相对路径（如 `./style.css`、`./app.js`）在 iframe 中加载时，基地址是 `chrome-extension://<id>/modes/tabout/`，通常无需修改
   - 如有 `chrome.runtime.getURL()` 调用，确认路径正确
5. **审计代码**：搜索以下关键词，确认不存在隐藏网络请求：
   ```bash
   grep -n "fetch\|XMLHttpRequest\|ajax\|\.post\|\.get\|WebSocket" modes/tabout/*.js
   ```
6. 确保 Tab Out 的 `chrome.storage.local` key 与壳的 `shell:*` key 不冲突（Tab Out 使用 `savedTabs` 等，无冲突）

**Tab Out 核心文件清单（移植后）：**
```
modes/tabout/
├── index.html
├── style.css
├── app.js
├── icons/
└── sounds/   （如果有）
```

---

## 8. 安装与测试清单

### 8.1 安装步骤
1. 创建项目文件夹 `KaiTab/`
2. 按第 7 节创建所有文件
3. 移植 Tab Out 源码到 `modes/tabout/`
4. 准备图标文件到 `assets/icons/`（可用任意 16/48/128 PNG）
5. 打开 Chrome/Edge，进入 `chrome://extensions/`
6. 开启右上角"开发者模式"
7. 点击"加载已解压的扩展程序"，选择 `KaiTab/` 文件夹
8. **确认 WeTab 扩展已卸载或关闭 New Tab 接管**
9. 按 `Ctrl+T` 打开新标签页，验证壳扩展加载

### 8.2 测试清单

| # | 测试项 | 预期结果 |
|---|--------|---------|
| 1 | 首次打开 New Tab | 加载「默认启动模式」设定的模式（默认"记忆上次使用"；首次无记录时加载首个启用模式 = Tab Out） |
| 2 | 点击切换器切换模式 | 视口内容即时切换，无闪烁 |
| 3 | 切换到 WeTab | iframe 正确加载 `web.wetab.link`，功能正常 |
| 4 | 切换到 Tab Out | 显示所有打开的标签，按域名分组 |
| 5 | 关闭浏览器，重新打开 New Tab | 仍显示上次选择的模式 |
| 6 | 打开设置，取消勾选某个模式 | 切换器中该模式按钮消失 |
| 7 | 取消勾选当前模式 | 自动切换到第一个可用模式 |
| 8 | 取消勾选所有模式 | 提示"请至少启用一个模式" |
| 9 | Tab Out 中关闭标签 | 有动画效果，标签确实关闭 |
| 10 | Tab Out 中"保存稍后" | 数据写入 storage，刷新后仍在 |
| 11 | 检查 CSP 是否生效 | DevTools Console 无 CSP 违规报错 |
| 12 | 检查存储隔离 | DevTools → Application → Storage → Extension Storage 中，`shell:*` 与 Tab Out 的 key 互不覆盖 |
| 13 | 设置「默认启动模式」 | 改后开新标签直接进该模式 |
| 14 | 备份与恢复 → 导出配置 | 下载 JSON，含 `shell:*` 与 Tab Out 的 `deferred` / `tabout:customGroups` |
| 15 | 备份与恢复 → 导入配置 | 选回 JSON 后配置恢复、界面重渲染 |
| 16 | Tab Out「⚙ 分组」增删规则 | 规则存 `tabout:customGroups`，对应域名归到自定义分组 |
| 17 | 关闭全部 / 域内全部 | 弹 `confirm` 确认框；单标签 / 去重不受影响 |
| 18 | 全局快捷键 Ctrl+Shift+1..4 | 焦点在 iframe 内也能切换对应模式 |
| 19 | Chrome「自定义 Chrome」按钮 | 右键可原生隐藏，不影响 KaiTab |

---

## 9. 分阶段执行路线图

> **重要声明**：以下阶段中，**仅 Phase 0（MVP）为确定执行项**，后续各阶段均为**计划性草案**，是否执行完全基于用户后续指令。每阶段完成后，可向用户确认是否进入下一阶段。

### Phase 0：MVP（确定执行）
| 功能 | 适配方式 | 状态 |
|------|---------|------|
| WeTab 网页版嵌入 | iframe | ✅ 确定 |
| Tab Out 源码集成 | 本地移植 | ✅ 确定 |
| 模式切换 + 持久化 | 壳层自研 | ✅ 确定 |
| 设置面板（开关模式） | 壳层自研 | ✅ 确定 |

**交付物**：本地可运行的壳扩展，通过 `chrome://extensions/` 加载使用。

---

### Phase 1：产品化准备（计划，待确认）
**触发条件**：Phase 0 使用体验良好，用户明确指令进入。

| 任务 | 说明 |
|------|------|
| 代码托管至 GitHub | 建立公开/私有仓库，版本管理 |
| README 完善 | 项目介绍、安装说明、截图、贡献指南 |
| 图标与视觉优化 | 设计专属图标、完善 UI 细节 |
| 代码审计与清理 | 移除调试代码、优化性能、确保无敏感信息 |
| 隐私政策页面 | 简单说明"不收集数据"（上架必需） |

---

### Phase 2：国内市场上架（计划，待确认）
**触发条件**：Phase 1 完成，用户明确指令上架。

**目标商店：Edge Add-ons（国内市场优先）**

| 事项 | 详情 |
|------|------|
| 注册费用 | **免费** |
| 所需账号 | 微软账号（Outlook/Hotmail 即可） |
| 审核周期 | 通常 1–7 个工作日 |
| 上架材料 | `.zip` 包、图标、截图（1280×800 或 640×400）、描述、隐私政策链接 |
| 优势 | Edge 国内用户基数大；审核相对宽松；无开发者注册费 |

**注意**：上架后用户可从 Edge 商店一键安装，无"开发者模式"警告，支持自动更新。

---

### Phase 3：国际市场上架（计划，待确认）
**触发条件**：Phase 2 上架后反馈良好，用户明确指令拓展国际市场。

**目标商店：Chrome Web Store**

| 事项 | 详情 |
|------|------|
| 注册费用 | **$5 美元**（一次性开发者账号费） |
| 所需账号 | Google 账号 + 支持国际支付的信用卡/借记卡 |
| 审核周期 | 通常 1–3 天，New Tab 类扩展可能更长 |
| 上架材料 | 同 Edge，需英文描述 |
| 优势 | Chrome 全球用户基数最大；自动同步至所有 Chrome 用户 |

---

### Phase 4：功能迭代（计划，待确认）
**触发条件**：前序阶段完成，用户有新增功能需求。

| 版本 | 功能 | 适配方式 |
|------|------|---------|
| **v1.1** | 增加"极简模式"（搜索框+壁纸） | 自研本地页面 |
| **v1.2** | 增加"专注模式"（全屏时钟+白噪音） | 自研本地页面 |
| **v1.3** | 支持自定义背景图/壁纸 | 壳层功能增强 |
| **v2.0** | 支持用户导入第三方网页版 New Tab（自定义 URL） | iframe 动态配置 |
| **v2.1** | 快捷键切换模式（如 Ctrl+1/2/3） | 壳层功能增强 |
| **v3.0** | 模式市场/社区分享 | 架构升级 |

---

## 10. 已知问题与注意事项

1. **WeTab 网页版登录态**：WeTab 网页版的登录态通过 Cookie 维持，iframe 中可正常使用。如果用户清除浏览器 Cookie，需重新登录。
2. **Tab Out 的 `tabs` 权限**：壳扩展声明了 `tabs` 权限，Tab Out 模式可用。但壳层本身不使用 `tabs`，这是全局性限制。
3. **iframe 内 WeTab 的弹窗**：WeTab 中的外部链接点击可能受 `sandbox` 限制，当前配置 `allow-popups` 应可正常打开新标签页。如遇问题，调整 sandbox 属性。
4. **性能**：频繁切换模式会重新加载 iframe。如需优化，可考虑隐藏/显示而非销毁/重建，但 MVP 阶段无需优化。
5. **图标占位**：`assets/icons/` 下的图标需要自行准备，或使用在线工具生成。

---

## 11. 发布与分发策略

> 本章节说明开发完成后，扩展的多种使用/分发方式，以及各阶段的决策机制。

### 11.1 使用方式对比

| 方式 | 操作难度 | 用户体验 | 适用场景 | 是否需要商店 |
|------|---------|---------|---------|-------------|
| **本地加载（开发者模式）** | 极低 | 有警告横幅 | 仅自己开发/测试 | ❌ 不需要 |
| **打包 .crx 分发** | 低 | 有警告横幅 | 发给少数朋友 | ❌ 不需要 |
| **Edge Add-ons 上架** | 中 | 无警告，一键安装 | 国内用户分发 | ✅ 需要（免费） |
| **Chrome Web Store 上架** | 中 | 无警告，一键安装 | 国际用户分发 | ✅ 需要（$5） |

### 11.2 各阶段使用方式

#### Phase 0（MVP）：仅自己用
- **方式**：本地加载已解压的扩展程序
- **步骤**：开发完成后，文件夹保持不动，`chrome://extensions/` 中已加载即可持续使用
- **注意**：Chrome 会有"请停用以开发者模式运行的扩展程序"横幅（Edge 无此提示），不影响功能

#### Phase 1（如执行）：给少数朋友试用
- **方式**：打包 `.crx` 文件分发
- **步骤**：
  1. `chrome://extensions/` → "打包扩展程序" → 选择项目文件夹
  2. 生成 `.crx` + `.pem` 密钥文件（**务必保存 `.pem`，后续更新必需**）
  3. 朋友将 `.crx` 拖放到 `chrome://extensions/` 页面安装
- **局限**：Chrome 可能阻止拖放安装，需开启开发者模式

#### Phase 2（如执行）：国内产品级分发
- **方式**：上架 Edge Add-ons
- **前提**：代码托管至 GitHub，准备好上架材料
- **流程**：注册微软开发者账号 → 提交扩展包 → 等待审核 → 上架

#### Phase 3（如执行）：国际产品级分发
- **方式**：上架 Chrome Web Store
- **前提**：Phase 2 反馈良好
- **流程**：支付 $5 注册费 → 提交扩展包 → 等待审核 → 上架

### 11.3 阶段确认机制

> **核心原则**：除 Phase 0 外，后续各阶段均为计划草案，执行权完全归用户。

```
Phase 0 完成（MVP 可用）
    │
    ▼
[用户评估体验] ── 满意？──→ 用户指令"进入 Phase 1" ──→ 执行 Phase 1
    │                           │
    └── 不满意/暂不需要 ──→ 暂停，保持 Phase 0 本地使用
                                │
                                ▼
                    Phase 1 完成（GitHub + 材料准备）
                                │
                                ▼
                    [用户评估] ── 值得上架？──→ 用户指令"上架 Edge" ──→ 执行 Phase 2
                                │
                                └── 暂不上架 ──→ 暂停
                                                    │
                                                    ▼
                                        Phase 2 完成（Edge 上架）
                                                    │
                                                    ▼
                                        [用户评估反馈] ── 好？──→ 用户指令"上架 Chrome" ──→ 执行 Phase 3
                                                                │
                                                                └── 一般/不需要 ──→ 暂停或仅维护 Edge 版
```

**每阶段完成后，助手应主动向用户汇报成果，并询问是否进入下一阶段。**

---

## 12. 快速开始（复制即用）



如果你不想手动创建文件，以下是**最小可运行文件树**，直接复制保存即可：

```
KaiTab/
├── manifest.json      ← 7.1
├── shell.html         ← 7.2
├── shell.js           ← 7.4
├── shell.css          ← 7.3
├── modes/
│   └── tabout/        ← 从 GitHub 移植
└── assets/
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

**下一步动作（Phase 0）**：
1. 创建上述文件夹结构
2. 复制代码
3. 移植 Tab Out
4. `chrome://extensions/` → 加载已解压
5. 按 `Ctrl+T` 验收

**Phase 0 完成后**：向助手反馈使用体验，由用户决定是否进入 Phase 1 及后续。

---

*本方案基于 2026-09-01 的沟通内容整理，涵盖背景、定位、技术决策、安全策略、完整代码、测试清单、发布策略与分阶段执行计划。*

*修订记录：*
- *v1.0（2026-09-01 16:49）：初始版本，含 MVP 技术方案与代码*
- *v1.1（2026-09-01 21:21）：新增发布与分发策略、分阶段执行路线图、阶段确认机制*
- *v1.2（2026-09-02 14:11）：产品名确定为 KaiTab；新增命名由来章节；统一全文产品名；项目文件夹名统一为 KaiTab；文件名同步更新*
