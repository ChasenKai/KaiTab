/**
 * KaiTab — 壳核心逻辑
 * 职责：模式注册、切换、持久化、设置面板
 */
'use strict';

// ===== 模式注册表（新增模式只需在此加一行）=====
// 顺序 = 顶栏/快捷键/默认选项的顺序。desc 显示在设置面板中作为简短说明。
const MODES = [
  {
    id: 'tabout',
    name: 'Tab Out',
    type: 'local',
    path: 'modes/tabout/index.html',
    icon: '🧹',
    desc: '标签治理仪表盘'
  },
  {
    id: 'wetab',
    name: 'WeTab',
    type: 'iframe',
    url: 'https://web.wetab.link/',
    icon: '🔷',
    desc: 'WeTab 网页版'
  }
  // 未来新增模式，在此添加
];

// Storage keys（前缀隔离，避免与模式内部 key 冲突）
const SK_LAST_MODE = 'shell:lastMode';
const SK_ENABLED_MODES = 'shell:enabledModes';
const SK_DEFAULT_MODE = 'shell:defaultMode';      // 'last' | modeId，决定打开新标签时的初始模式

// ===== DOM 引用 =====
const switcherEl = document.getElementById('switcher');
const viewportEl = document.getElementById('viewport');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings');
const modeTogglesEl = document.getElementById('mode-toggles');
const defaultModeSel = document.getElementById('default-mode');
const exportBtn = document.getElementById('export-config');
const importBtn = document.getElementById('import-config');
const importFileEl = document.getElementById('import-file');

// 遮罩层（动态创建）
const overlay = document.createElement('div');
overlay.id = 'overlay';
document.body.appendChild(overlay);

// ===== 隐藏 Chrome 原生「自定义 Chrome」按钮 =====
// 该按钮属于 Chrome 自己的 UI 合成层，不在扩展页面 DOM 内。最干净的隐藏方式是
// 用户右键该按钮 → 原生隐藏（Chrome 自带）。以下 JS 仅为「尽力兜底」，
// 能藏则藏（扫描含该文字的最小节点 + 下钻 shadow DOM），藏不掉也不影响功能。
function hideChromeCustomizeButton() {
  const TARGET = '自定义 Chrome';
  const findTargets = (root) => {
    if (!root || !root.querySelectorAll) return [];
    const out = [];
    root.querySelectorAll('*').forEach(el => {
      if ((el.textContent || '').includes(TARGET) || (el.getAttribute?.('aria-label') || '').includes(TARGET)) {
        out.push(el);
      }
    });
    return out;
  };
  const hide = (els) => {
    els.forEach(el => {
      // 只隐藏「最小包含元素」，避免误藏整个 body
      const deepest = !Array.from(el.children).some(c => (c.textContent || '').includes(TARGET));
      if (deepest && el.style.display !== 'none') {
        el.style.setProperty('display', 'none', 'important');
      }
    });
  };
  const scan = (root) => {
    if (!root || !root.querySelectorAll) return;
    hide(findTargets(root));
    root.querySelectorAll('*').forEach(n => { if (n.shadowRoot) scan(n.shadowRoot); });
  };
  scan(document);
  new MutationObserver((muts) => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) { scan(n); if (n.shadowRoot) scan(n.shadowRoot); }
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
}

// ===== 初始化 =====
async function init() {
  const {
    [SK_LAST_MODE]: lastMode,
    [SK_ENABLED_MODES]: enabledModes,
    [SK_DEFAULT_MODE]: defaultMode
  } = await chrome.storage.local.get([SK_LAST_MODE, SK_ENABLED_MODES, SK_DEFAULT_MODE]);

  const defaultEnabled = MODES.map(m => m.id);
  const activeEnabled = Array.isArray(enabledModes) ? enabledModes : defaultEnabled;

  // 初始模式：默认模式优先（非 'last' 时），否则记忆上次，否则第一个
  const initialMode = pickInitialMode(defaultMode, lastMode, activeEnabled);

  renderSwitcher(activeEnabled);
  renderSettings();

  if (initialMode) {
    await switchMode(initialMode);
  } else {
    showEmptyState();
  }
  bindEvents();
  hideChromeCustomizeButton();
}

// 决定打开 New Tab 时加载哪个模式
function pickInitialMode(defaultMode, lastMode, activeEnabled) {
  if (defaultMode && defaultMode !== 'last' && activeEnabled.includes(defaultMode)) {
    return defaultMode;
  }
  if (lastMode && activeEnabled.includes(lastMode)) {
    return lastMode;
  }
  return activeEnabled[0];
}

// ===== 渲染切换器 =====
function renderSwitcher(enabledIds) {
  switcherEl.textContent = '';
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

  viewportEl.textContent = '';
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';

  if (mode.type === 'iframe') {
    iframe.src = mode.url;
    // WeTab 需要 same-origin（cookie/存储），故 allow-same-origin；与 allow-scripts 组合有沙箱逃逸风险，
    // 但 WeTab 为受信任的第三方网页服务，且此为个人工具场景，可接受。
    iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms';
  } else if (mode.type === 'local') {
    // 本地模式（如 Tab Out 移植）：不加 sandbox，否则 chrome.* API 不可用
    iframe.src = chrome.runtime.getURL(mode.path);
  }

  viewportEl.appendChild(iframe);
  await chrome.storage.local.set({ [SK_LAST_MODE]: modeId });

  switcherEl.querySelectorAll('button').forEach(btn => {
    const isActive = btn.dataset.mode === modeId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
}

// ===== 空状态 =====
function showEmptyState() {
  viewportEl.textContent = '';
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:#666;font-size:14px;';
  el.textContent = '请在设置中启用至少一个模式';
  viewportEl.appendChild(el);
}

// ===== 渲染设置面板 =====
function renderSettings() {
  // 版本信息
  const vi = document.getElementById('version-info');
  if (vi) {
    const v = chrome.runtime.getManifest().version;
    vi.textContent = `KaiTab v${v}`;
  }

  // 1) 模式开关
  modeTogglesEl.textContent = '';
  chrome.storage.local.get([SK_ENABLED_MODES]).then(({ [SK_ENABLED_MODES]: saved }) => {
    const enabled = Array.isArray(saved) ? saved : MODES.map(m => m.id);
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
      desc.className = 'mode-desc';
      desc.textContent = mode.desc;
      row.appendChild(label);
      row.appendChild(desc);
      modeTogglesEl.appendChild(row);
    }
  });

  // 2) 默认启动模式
  chrome.storage.local.get([SK_DEFAULT_MODE, SK_ENABLED_MODES])
    .then(({ [SK_DEFAULT_MODE]: defaultMode, [SK_ENABLED_MODES]: saved }) => {
      const enabled = Array.isArray(saved) ? saved : MODES.map(m => m.id);
      const def = defaultMode || 'last';

      defaultModeSel.textContent = '';
      const optLast = document.createElement('option');
      optLast.value = 'last';
      optLast.textContent = '记忆上次使用';
      defaultModeSel.appendChild(optLast);
      for (const mode of MODES) {
        if (!enabled.includes(mode.id)) continue;
        const o = document.createElement('option');
        o.value = mode.id;
        o.textContent = `${mode.icon} ${mode.name}`;
        defaultModeSel.appendChild(o);
      }
      defaultModeSel.value = def;
    });
}

// ===== 保存设置 =====
async function saveSettings() {
  const checkboxes = modeTogglesEl.querySelectorAll('input[type="checkbox"]');
  const enabled = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  if (enabled.length === 0) {
    alert('请至少启用一个模式');
    return;
  }
  const defaultMode = defaultModeSel.value;

  // 在重新渲染前先记下当前模式，避免渲染后丢失 active 状态导致误判为未启用
  const currentModeId = switcherEl.querySelector('button.active')?.dataset.mode;

  await chrome.storage.local.set({
    [SK_ENABLED_MODES]: enabled,
    [SK_DEFAULT_MODE]: defaultMode
  });

  renderSwitcher(enabled);

  if (currentModeId && enabled.includes(currentModeId)) {
    // 仍在启用列表中，仅恢复高亮即可，不要重新加载 iframe
    const btn = switcherEl.querySelector(`button[data-mode="${currentModeId}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    }
  } else {
    // 当前模式被禁用或不存在，才切到第一个启用模式
    await switchMode(enabled[0]);
  }
}

// ===== 备份与恢复 =====
// 导出全部 KaiTab 配置（chrome.storage.local 中所有键），存成 JSON 文件。
// 由于存储按扩展 ID 隔离，unpacked 模式换文件夹路径会导致 ID 变化、旧配置丢失，
// 故此功能用于升级/换设备前的手动备份。
async function exportConfig() {
  const all = await chrome.storage.local.get(null);
  const payload = {
    _kaitab_backup: true,
    app: 'KaiTab',
    version: chrome.runtime.getManifest().version,
    exportedAt: new Date().toISOString(),
    storage: all
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = payload.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `kaitab-config-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 从 JSON 文件恢复配置：写入全部键后重新渲染。
async function importConfig(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.storage || typeof data.storage !== 'object') {
      alert('文件格式不正确，不是有效的 KaiTab 备份');
      return;
    }
    await chrome.storage.local.set(data.storage);

    // 重新应用：重渲染顶栏 + 设置，并切到当前应加载的模式
    const {
      [SK_LAST_MODE]: lastMode,
      [SK_ENABLED_MODES]: enabledModes,
      [SK_DEFAULT_MODE]: defaultMode
    } = await chrome.storage.local.get([SK_LAST_MODE, SK_ENABLED_MODES, SK_DEFAULT_MODE]);
    const activeEnabled = Array.isArray(enabledModes) ? enabledModes : MODES.map(m => m.id);
    renderSwitcher(activeEnabled);
    renderSettings();
    const initialMode = pickInitialMode(defaultMode, lastMode, activeEnabled);
    if (initialMode) await switchMode(initialMode);

    alert('配置已恢复 ✓');
  } catch (e) {
    alert('导入失败：' + (e && e.message ? e.message : e));
  }
}

// ===== 事件绑定 =====
function bindEvents() {
  switcherEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    switchMode(btn.dataset.mode);
  });
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
    overlay.classList.add('show');
    renderSettings();
  });
  function closeSettings() {
    settingsPanel.classList.add('hidden');
    overlay.classList.remove('show');
    saveSettings();
  }
  closeSettingsBtn.addEventListener('click', closeSettings);
  overlay.addEventListener('click', closeSettings);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsPanel.classList.contains('hidden')) closeSettings();
  });

  // 接收全局快捷键指令（来自 background.js / chrome.commands）
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'kaitab:switch' && msg.modeId) {
      switchMode(msg.modeId);
    }
  });

  // 备份与恢复
  exportBtn.addEventListener('click', exportConfig);
  importBtn.addEventListener('click', () => importFileEl.click());
  importFileEl.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importConfig(file);
    e.target.value = ''; // 允许重复导入同一文件
  });
}

init();
