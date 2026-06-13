/* ---------- Generic UI helpers: nav, modal, toast ---------- */
const UI = (() => {

  const NAV_ITEMS = [
    { route: 'dashboard', label: 'Dashboard', icon: '📊' },
    { route: 'transactions', label: 'Transactions', icon: '📋' },
    { route: 'budgets', label: 'Budgets', icon: '🎯' },
    { route: 'reports', label: 'Reports', icon: '📈' },
    { route: 'recurring', label: 'Recurring', icon: '🔁' },
    { route: 'goals', label: 'Goals', icon: '🏆' },
    { route: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  // Bottom nav shows a curated subset + "More" sheet for the rest
  const BOTTOM_PRIMARY = ['dashboard', 'transactions', 'budgets', 'reports'];
  const BOTTOM_MORE = ['recurring', 'goals', 'settings'];

  function renderNav(activeRoute) {
    const sidenav = document.getElementById('sidenav');
    sidenav.innerHTML = NAV_ITEMS.map(item => `
      <button class="nav-item ${activeRoute === item.route ? 'active' : ''}" data-route="${item.route}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('');
    sidenav.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.route));
    });

    const bottomnav = document.getElementById('bottomnav');
    const items = NAV_ITEMS.filter(i => BOTTOM_PRIMARY.includes(i.route));
    const moreActive = BOTTOM_MORE.includes(activeRoute);
    bottomnav.innerHTML = items.map(item => `
      <button class="nav-item ${activeRoute === item.route ? 'active' : ''}" data-route="${item.route}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('') + `
      <button class="nav-item ${moreActive ? 'active' : ''}" data-action="more">
        <span class="nav-icon">⋯</span>
        <span>More</span>
      </button>
    `;
    bottomnav.querySelectorAll('.nav-item[data-route]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.route));
    });
    bottomnav.querySelector('[data-action="more"]').addEventListener('click', openMoreSheet);
  }

  function openMoreSheet() {
    const html = `
      <div class="modal-header"><h2>More</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <div class="settings-list">
        ${BOTTOM_MORE.map(route => {
          const item = NAV_ITEMS.find(i => i.route === route);
          return `<button class="settings-row nav-item" data-route="${route}" style="width:100%">
            <span class="flex flex-gap" style="align-items:center;">
              <span class="icon-pill">${item.icon}</span>
              <span class="label">${item.label}</span>
            </span>
            <span>›</span>
          </button>`;
        }).join('')}
      </div>
    `;
    openModal(html);
    document.querySelectorAll('#modal-root [data-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal();
        App.navigate(btn.dataset.route);
      });
    });
  }

  /* ---------- Modal ---------- */
  function openModal(innerHtml, opts = {}) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal">${innerHtml}</div></div>`;
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && !opts.persistent) closeModal();
    });
    root.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeModal));
    document.addEventListener('keydown', escListener);
    return backdrop;
  }
  function escListener(e) {
    if (e.key === 'Escape') closeModal();
  }
  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
    document.removeEventListener('keydown', escListener);
  }

  /* ---------- Toast ---------- */
  function toast(message, duration = 2200) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  // Toast with an action button that stays until clicked or the duration elapses
  function actionToast(message, actionLabel, onAction, duration = 15000) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast toast-action';
    const text = document.createElement('span');
    text.textContent = message;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => { onAction(); el.remove(); });
    el.append(text, btn);
    root.appendChild(el);
    setTimeout(() => el.remove(), duration);
    return el;
  }

  /* ---------- Confirm dialog ---------- */
  function confirmDialog(message, opts = {}) {
    return new Promise((resolve) => {
      const html = `
        <div class="modal-header"><h2>${opts.title || 'Confirm'}</h2></div>
        <p style="color:var(--text-muted);font-size:0.9rem;">${Util.escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn" id="confirm-cancel">${opts.cancelText || 'Cancel'}</button>
          <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${opts.okText || 'Confirm'}</button>
        </div>
      `;
      openModal(html, { persistent: false });
      document.getElementById('confirm-ok').addEventListener('click', () => { closeModal(); resolve(true); });
      document.getElementById('confirm-cancel').addEventListener('click', () => { closeModal(); resolve(false); });
    });
  }

  /* ---------- Common emoji icon sets ---------- */
  const CATEGORY_ICONS = ['🍔','🚌','🏠','🛍️','📱','💊','📚','🎮','💼','💻','📈','🎁','✈️','🐾','🎵','💡','🧾','🏋️','🚗','☕','🍺','🎬','💳','🧴','🧸','🛠️','📦','💰','🎓','🏥'];
  const ACCOUNT_ICONS = ['💵','🏦','💳','📱','👛','🪙','💰'];

  function iconPicker(selectedIcon, icons = CATEGORY_ICONS) {
    return `<div class="chip-grid" id="icon-picker">
      ${icons.map(ic => `<button type="button" class="chip small icon-choice ${ic === selectedIcon ? 'active' : ''}" data-icon="${ic}">${ic}</button>`).join('')}
    </div>`;
  }

  function bindIconPicker(container, onChange) {
    container.querySelectorAll('.icon-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.icon-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange(btn.dataset.icon);
      });
    });
  }

  return {
    NAV_ITEMS, renderNav, openModal, closeModal, toast, actionToast, confirmDialog,
    CATEGORY_ICONS, ACCOUNT_ICONS, iconPicker, bindIconPicker,
  };
})();
