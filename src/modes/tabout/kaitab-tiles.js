/**
 * KaiTab 叠加层 —— 常用站点磁贴（Shortcuts）
 *
 * ⚠️ 归属：本文件由 KaiTab 新增，不是 Tab Out 上游内容。
 *    它只通过 index.html 的 3 行引入挂载，不修改上游任何逻辑文件
 *    （app.js / style.css / 核心标签逻辑保持原样，便于与上游同步）。
 *
 * 数据源：
 *   ① 自动 —— chrome.topSites（「最常访问的网站」），走 optional_permissions，
 *      默认安装不申请；用户在 KaiTab 设置里授权后才读取。
 *   ② 手动 —— 用户自己加的，存在 kaitab:tilesManual，不依赖任何权限。
 * 图标：chrome-extension://<id>/_favicon/?pageUrl=...&size=64
 *      读的是**浏览器本机的 favicon 缓存**——与 Chrome 新标签页磁贴同一份数据，
 *      不向任何第三方服务发请求；取不到图标时降级为离线字母色块。
 *
 * 对齐 Chrome 的几处设计（参考 Chromium `cr-most-visited` 组件，BSD-3-Clause）：
 *   - 自动项与手动项**各有独立名额**（Chrome：最常访问 8 / 自定义 10），不互相挤占；
 *   - 新加的手动项**追加在末尾**；
 *   - 添加时 URL 只放行 http(s)，缺协议自动补 https://，并做重复校验；
 *   - 拖动排序只在落点真的变了时才写存储。
 *
 * 存储键（前缀 kaitab: 与上游隔离）：
 *   kaitab:tilesEnabled —— 总开关（默认 true）
 *   kaitab:tilesManual  —— 手动添加的 [{url, title}]
 *   kaitab:tilesHidden  —— 被隐藏的自动项 url 数组
 *   kaitab:tilesOrder   —— 拖动排序后的 url 顺序（未拖过则不存在）
 */
(function () {
  'use strict';

  const SK_ENABLED = 'kaitab:tilesEnabled';
  const SK_MANUAL  = 'kaitab:tilesManual';
  const SK_HIDDEN  = 'kaitab:tilesHidden';
  const SK_ORDER   = 'kaitab:tilesOrder';

  // 自动项 / 手动项各自的名额（对齐 Chrome 的 8 / 10）
  const MAX_AUTO   = 8;
  const MAX_MANUAL = 10;

  const host = document.getElementById('kaitab-tiles');
  if (!host) return;
  // ⚠️ 不做 `chrome.topSites` 存在性检测：可选权限未授权时该命名空间可能不暴露，
  // 那样会连「去开启」入口都显示不出来。改为先查权限、再 try/catch 读取。

  let currentList = [];       // 当前渲染的列表，供拖拽排序定位
  let suppressClick = false;  // 刚拖完的那一下点击要吞掉，避免误跳转

  // ===== 小工具 =====
  function hashHue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }
  function prettyHost(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return String(url || ''); }
  }
  function letterOf(url) {
    const h = prettyHost(url);
    return h ? h.charAt(0).toUpperCase() : '?';
  }
  function labelOf(item) {
    const t = (item && item.title ? item.title : '').trim();
    return t || prettyHost(item && item.url);
  }

  /**
   * 规范化用户输入的地址：缺协议自动补 https://，且只放行 http(s)。
   * 对齐 Chromium cr-most-visited 的 normalizeUrl() 行为。
   */
  function normalizeUrl(raw) {
    let s = String(raw == null ? '' : raw).trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
    try {
      const u = new URL(s);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return u.href;
    } catch {
      return null;
    }
  }

  function faviconUrl(pageUrl) {
    try {
      const u = new URL(chrome.runtime.getURL('/_favicon/'));
      u.searchParams.set('pageUrl', pageUrl);
      u.searchParams.set('size', '64');
      return u.toString();
    } catch {
      return '';
    }
  }

  async function readState() {
    const o = await chrome.storage.local.get([SK_ENABLED, SK_MANUAL, SK_HIDDEN, SK_ORDER]);
    return {
      enabled: o[SK_ENABLED] !== false,
      manual: Array.isArray(o[SK_MANUAL]) ? o[SK_MANUAL] : [],
      hidden: Array.isArray(o[SK_HIDDEN]) ? o[SK_HIDDEN] : [],
      order: Array.isArray(o[SK_ORDER]) ? o[SK_ORDER] : []
    };
  }

  async function hasTopSitesPermission() {
    try {
      return await chrome.permissions.contains({ permissions: ['topSites'] });
    } catch {
      return false;
    }
  }

  // ===== 渲染骨架 =====
  // 复用上游的 .section-header / .section-line，与 "Open tabs" 同一套分隔风格
  function mountHeader() {
    const header = document.createElement('div');
    header.className = 'section-header';
    const h2 = document.createElement('h2');
    h2.textContent = 'Shortcuts';
    const line = document.createElement('div');
    line.className = 'section-line';
    header.append(h2, line);
    host.appendChild(header);
  }

  function buildHintLine(text, withButton) {
    const wrap = document.createElement('div');
    wrap.className = 'kt-hint';

    const span = document.createElement('span');
    span.textContent = text;
    wrap.appendChild(span);

    if (withButton) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kt-btn';
      btn.textContent = 'Enable';
      // 权限申请放在壳（顶层扩展页）里做，用户手势更可靠；这里只请求壳打开设置面板
      btn.addEventListener('click', () => {
        try { window.parent.postMessage({ type: 'kaitab:open-settings' }, '*'); } catch {}
      });
      wrap.appendChild(btn);
    }
    return wrap;
  }

  function buildIcon(url) {
    const icon = document.createElement('span');
    icon.className = 'kt-icon';

    // 先放离线字母色块，保证任何时候都不出现空白；
    // 真图标加载成功后再把字母块换掉（MV3 禁止内联 onerror，统一用监听器）
    const letter = letterOf(url);
    const dot = document.createElement('span');
    dot.className = 'kt-dot';
    dot.style.background = `hsl(${hashHue(letter)} 62% 52%)`;
    dot.textContent = letter;
    icon.appendChild(dot);

    const fav = faviconUrl(url);
    if (fav) {
      const img = document.createElement('img');
      img.className = 'kt-favicon';
      img.alt = '';
      img.addEventListener('load', () => dot.remove());
      img.addEventListener('error', () => img.remove());
      img.src = fav;
      icon.appendChild(img);
    }
    return icon;
  }

  // ===== 列表组装 =====
  async function buildList(state) {
    const out = [];

    // ① 自动：最常访问（需要授权）；同一站点只留一条
    if (await hasTopSitesPermission()) {
      let sites = [];
      try { sites = await chrome.topSites.get(); } catch { sites = []; }
      const seen = new Set();
      for (const s of (sites || [])) {
        const url = s && s.url;
        if (!url || state.hidden.includes(url)) continue;
        const h = prettyHost(url);
        if (seen.has(h)) continue;
        seen.add(h);
        out.push({ url, title: (s.title || '').trim(), kind: 'auto' });
        if (out.length >= MAX_AUTO) break;
      }
    }

    // ② 手动：追加在末尾（与 Chrome 一致），自带名额、不被自动项挤占
    const manual = state.manual
      .filter((m) => m && m.url && !state.hidden.includes(m.url))
      .slice(0, MAX_MANUAL)
      .map((m) => ({ url: m.url, title: (m.title || '').trim(), kind: 'manual' }));

    let list = out.concat(manual);

    // ③ 用户拖过的话，按保存的顺序排；没排到的（如刚新增）自然落到最后
    if (state.order.length) {
      const rank = new Map(state.order.map((u, i) => [u, i]));
      list = list
        .map((item, i) => ({ item, i }))
        .sort((a, b) => {
          const ra = rank.has(a.item.url) ? rank.get(a.item.url) : Infinity;
          const rb = rank.has(b.item.url) ? rank.get(b.item.url) : Infinity;
          if (ra !== rb) return ra - rb;
          return a.i - b.i;
        })
        .map((x) => x.item);
    }
    return list;
  }

  // ===== 单项渲染 =====
  function buildTile(item) {
    const tile = document.createElement('div');
    tile.className = 'kt-tile';
    tile.dataset.url = item.url;

    const link = document.createElement('a');
    link.className = 'kt-link';
    // 保险：地址缺失时干脆不做成链接，避免 href="undefined" 被当成相对路径跳走
    if (item.url) link.href = item.url;
    link.title = labelOf(item);
    // ⚠️ 磁贴跑在壳的 iframe 里：若让它「原地跳」，被换掉的是 Mission 页面本身，
    // 且多数站点会因 X-Frame-Options 拒绝被嵌 → 白屏。
    // 顶层导航 = Chrome 新标签页点快捷方式的行为（当前这个新标签页变成目标站）；
    // Ctrl/⌘ / 中键点击仍由浏览器原生处理成新标签页。
    link.target = '_top';
    link.draggable = false;   // 让拖拽源落到 .kt-tile 上，而不是链接本身

    const label = document.createElement('span');
    label.className = 'kt-label';
    label.textContent = labelOf(item);
    link.append(buildIcon(item.url), label);

    // 「更多」菜单放在 <a> 之外——交互元素嵌套在链接里是非法 HTML。
    // 对齐 Chrome：悬停出现 ⋮，点开是「修改快捷方式 / 移除」。
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'kt-more';
    more.textContent = '⋮';
    more.title = 'Shortcut options';
    more.setAttribute('aria-label', 'Shortcut options');
    more.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu(tile, item);
    });

    tile.append(link, more);

    // ---- 拖动排序（指针式，视觉自己接管）----
    // 不用原生 HTML5 DnD：它的拖拽快照是静态半透明图，**看不到"被拖的过程"**，手感发木。
    // 这里自己接管：跟手浮动副本 + 实时让位 + 松手落位。
    let pressX = 0, pressY = 0, grabDX = 0, grabDY = 0;
    let capturedPointerId = null;
    let armed = false;        // 已按下，但还没越过阈值
    let dragging = false;     // 真的在拖了
    let ghostEl = null;
    let orderAtStart = '';

    function onPointerMove(e) {
      if (!armed && !dragging) return;

      if (!dragging) {
        // 阈值 5px：区分「点击跳转」和「拖动排序」
        if (Math.hypot(e.clientX - pressX, e.clientY - pressY) < 5) return;
        dragging = true;
        orderAtStart = currentList.map((x) => x.url).join('\n');

        // ⚠️ 指针捕获必须等到「真的开始拖」才做，绝不能放在 pointerdown：
        // 一旦在 pointerdown 就捕获，click 会被重定向到捕获元素（磁贴本身），
        // 里面的 <a> 永远收不到点击 → 点磁贴没反应。放在这里既能保证拖到 iframe
        // 之外也收得到 pointerup，又不影响正常点击跳转。
        try {
          tile.setPointerCapture(e.pointerId);
          capturedPointerId = e.pointerId;
        } catch {}

        const rect = tile.getBoundingClientRect();
        ghostEl = tile.cloneNode(true);
        ghostEl.className = 'kt-tile kt-ghost';
        ghostEl.style.width = rect.width + 'px';
        ghostEl.style.height = rect.height + 'px';
        document.body.appendChild(ghostEl);
        tile.classList.add('kt-dragging');
        document.body.classList.add('kt-reordering');
      }

      ghostEl.style.transform = `translate(${e.clientX - grabDX}px, ${e.clientY - grabDY}px)`;

      // 落点判定：ghost 设了 pointer-events:none，事件会穿透到下面的真实磁贴
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const overTile = (under && under.closest) ? under.closest('.kt-tile') : null;
      if (overTile && overTile !== tile && !overTile.classList.contains('kt-ghost') &&
          overTile.parentElement === tile.parentElement) {
        const r = overTile.getBoundingClientRect();
        const insertAfter = (e.clientX - r.left) > r.width / 2;   // 过中点就换到它后面
        tile.parentElement.insertBefore(tile, insertAfter ? overTile.nextSibling : overTile);
      }
    }

    async function onPointerUp() {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      if (capturedPointerId !== null) {
        try { tile.releasePointerCapture(capturedPointerId); } catch {}
        capturedPointerId = null;
      }

      if (dragging) {
        const next = syncListFromDom();
        const ordered = next.map((x) => x.url).join('\n');
        // 顺序真的变了才写存储（对齐 Chromium 的 drop_ 判断）
        if (ordered && ordered !== orderAtStart) {
          await chrome.storage.local.set({ [SK_ORDER]: next.map((x) => x.url) });
        }
        suppressClick = true;   // 拖完这一下不该触发跳转
      }

      if (ghostEl) ghostEl.remove();
      ghostEl = null;
      tile.classList.remove('kt-dragging');
      document.body.classList.remove('kt-reordering');
      armed = false;
      dragging = false;
    }

    // 彻底掐掉浏览器原生拖拽：磁贴内任何元素都不再产生原生 drag。
    // 否则原生「链接拖拽」会和我们的指针拖动打架，甚至在松手时补一次跳转。
    tile.addEventListener('dragstart', (e) => e.preventDefault());

    tile.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;                                              // 只接左键
      if (e.target.closest('.kt-more') || e.target.closest('.kt-menu')) return; // 别和 ⋮ 菜单抢
      suppressClick = false;
      armed = true;
      dragging = false;
      pressX = e.clientX;
      pressY = e.clientY;
      const rect = tile.getBoundingClientRect();
      grabDX = e.clientX - rect.left;
      grabDY = e.clientY - rect.top;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    });

    return tile;
  }

  // 以 DOM 实际顺序回写内存列表并返回它（松手时据此落位）
  function syncListFromDom() {
    const order = Array.from(host.querySelectorAll('.kt-row .kt-tile')).map((el) => el.dataset.url);
    const byUrl = new Map(currentList.map((x) => [x.url, x]));
    currentList = order.map((u) => byUrl.get(u)).filter(Boolean);
    return currentList;
  }

  // ===== 磁贴右上角「⋮」菜单（修改 / 移除）=====
  function closeMenus() {
    host.querySelectorAll('.kt-menu').forEach((el) => el.remove());
  }

  function openMenu(tile, item) {
    closeMenus();

    const menu = document.createElement('div');
    menu.className = 'kt-menu';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'kt-menu-item';
    edit.textContent = 'Edit shortcut';
    edit.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMenus();
      openForm(item);
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'kt-menu-item';
    // 自动项与手动项都叫 Remove（与 Chrome 一致）；内部一个是隐藏、一个是删除
    del.textContent = 'Remove';
    del.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMenus();
      await removeItem(item);
    });

    menu.append(edit, del);
    tile.appendChild(menu);
  }

  // 点空白处收起菜单（⋮ 自身的点击已 stopPropagation，不会误关）
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('.kt-menu')) return;
    closeMenus();
  });

  // 拖动结束后紧跟的那一次 click 要吞掉（capture 阶段拦截，链接就不会跳转）
  document.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // 任何一次新的按下都算新一轮交互，清掉上一轮遗留的抑制标记，
  // 免得不小心把页面里其它按钮的点击也吞掉
  document.addEventListener('pointerdown', () => { suppressClick = false; }, true);

  // "+ Add shortcut" —— 与 Chrome 一致，放在行尾
  function buildAddTile() {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'kt-add';

    const icon = document.createElement('span');
    icon.className = 'kt-icon kt-icon-add';
    icon.textContent = '+';

    const label = document.createElement('span');
    label.className = 'kt-label';
    label.textContent = 'Add shortcut';

    el.append(icon, label);
    el.addEventListener('click', openForm);
    return el;
  }

  // ===== 添加表单 =====
  function closeForm() {
    const form = document.getElementById('kt-add-form');
    if (form) form.remove();
  }

  /**
   * 添加 / 修改表单。
   * - 不带参数：新增（由 "+ Add shortcut" 触发）
   * - 传 item：修改。手动项原地替换；**自动项则是「固化为手动项 + 隐藏原自动项」**
   *   —— 因为自动项来自 chrome.topSites，本身不可写，这与 Chrome「编辑即固定」的语义一致。
   */
  function openForm(editing) {
    closeForm();
    const isEdit = !!editing;

    const form = document.createElement('form');
    form.id = 'kt-add-form';
    form.className = 'kt-form';

    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'kt-input';
    name.placeholder = 'Name (optional)';

    const url = document.createElement('input');
    url.type = 'text';
    url.className = 'kt-input kt-input-url';
    url.placeholder = 'example.com';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'kt-btn kt-btn-primary';
    submit.textContent = isEdit ? 'Save' : 'Add';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'kt-btn';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', closeForm);

    const msg = document.createElement('span');
    msg.className = 'kt-form-msg';

    if (isEdit) {
      name.value = editing.title || '';
      url.value = editing.url;
    }

    form.append(name, url, submit, cancel, msg);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const normalized = normalizeUrl(url.value);
      if (!normalized) {
        msg.textContent = 'Enter an http(s) address.';
        url.focus();
        return;
      }

      const state = await readState();
      const title = (name.value || '').trim() || prettyHost(normalized);

      // 重复校验：修改时要把「它自己」排除掉
      const clash = state.manual.some(
        (m) => m && m.url === normalized && !(isEdit && m.url === editing.url)
      );
      if (clash) {
        msg.textContent = 'That shortcut already exists.';
        return;
      }

      if (!isEdit) {
        state.manual.push({ url: normalized, title });
        await chrome.storage.local.set({ [SK_MANUAL]: state.manual });
      } else if (editing.kind === 'manual') {
        // 原地替换，保留它在手动列表里的位置
        await chrome.storage.local.set({
          [SK_MANUAL]: state.manual.map((m) =>
            (m && m.url === editing.url) ? { url: normalized, title } : m
          )
        });
      } else {
        // 自动项：固化成手动项，并把原来那条自动项隐藏掉
        const nextManual = state.manual.filter((m) => !(m && m.url === normalized));
        nextManual.push({ url: normalized, title });
        await chrome.storage.local.set({
          [SK_MANUAL]: nextManual,
          [SK_HIDDEN]: Array.from(new Set([...state.hidden, editing.url]))
        });
      }

      // 顺序里把旧 url 换成新 url，避免排序错位
      if (isEdit && state.order.length) {
        await chrome.storage.local.set({
          [SK_ORDER]: state.order.map((u) => (u === editing.url ? normalized : u))
        });
      }

      closeForm();
      init();
    });

    host.appendChild(form);
    url.focus();
  }

  // ===== 移除 =====
  async function removeItem(item) {
    const state = await readState();

    if (item.kind === 'manual') {
      await chrome.storage.local.set({
        [SK_MANUAL]: state.manual.filter((m) => m && m.url !== item.url)
      });
    } else {
      await chrome.storage.local.set({
        [SK_HIDDEN]: Array.from(new Set([...state.hidden, item.url]))
      });
    }

    // 顺序里也清掉，避免残留
    if (state.order.length) {
      await chrome.storage.local.set({
        [SK_ORDER]: state.order.filter((u) => u !== item.url)
      });
    }
    init();
  }

  // ===== 整体渲染 =====
  function renderAll(list, state, canAuto) {
    host.textContent = '';
    mountHeader();

    if (!canAuto) {
      host.appendChild(buildHintLine('Shortcuts from most visited sites are off.', true));
    }

    currentList = list;

    const row = document.createElement('div');
    row.className = 'kt-row';
    for (const item of list) row.appendChild(buildTile(item));

    // 手动名额没用完才显示 "+"
    if (state.manual.length < MAX_MANUAL) row.appendChild(buildAddTile());
    host.appendChild(row);

    if (!list.length && canAuto) {
      host.appendChild(buildHintLine('Not enough browsing history yet.', false));
    }
  }

  function renderHint(text, withButton) {
    host.textContent = '';
    mountHeader();
    host.appendChild(buildHintLine(text, withButton));
  }

  // ===== 入口 =====
  async function init() {
    const state = await readState();

    if (!state.enabled) { host.textContent = ''; return; }

    const canAuto = await hasTopSitesPermission();
    const list = await buildList(state);

    // 既没授权、又没手动项 → 只给一行提示
    if (!canAuto && !list.length) {
      renderHint('Shortcuts are off. Needs access to your most visited sites.', true);
      return;
    }
    renderAll(list, state, canAuto);
  }

  // 壳在授权成功后通知刷新，免去手动重开新标签页
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'kaitab:tiles-refresh') init();
  });

  init();
})();
