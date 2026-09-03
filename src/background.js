/**
 * KaiTab — 后台 service worker
 * 职责：响应全局快捷键（chrome.commands），把"切换模式"指令发给当前 New Tab 页面。
 * 为什么走 service worker：当焦点在 WeTab/Tab Out 的 iframe 内时，页面级 keydown 收不到，
 * 只有浏览器级命令能触发，故用 chrome.commands + 此处转发。
 */
'use strict';

const SK_ENABLED_MODES = 'shell:enabledModes';

chrome.commands.onCommand.addListener(async (command) => {
  const m = /^switch-mode-(\d+)$/.exec(command);
  if (!m) return;
  const idx = parseInt(m[1], 10) - 1;

  const { [SK_ENABLED_MODES]: enabled } = await chrome.storage.local.get(SK_ENABLED_MODES);
  const list = Array.isArray(enabled) ? enabled : [];
  const modeId = list[idx];
  if (!modeId) return;

  // 发给所有 KaiTab 页面（当前打开的 New Tab 会收到并执行切换）
  try {
    await chrome.runtime.sendMessage({ type: 'kaitab:switch', modeId });
  } catch (_) {
    /* 没有接收方时静默忽略 */
  }
});
