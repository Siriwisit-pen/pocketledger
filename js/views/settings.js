/* ---------- Settings view ---------- */
const SettingsView = (() => {

  const ACCOUNT_TYPES = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'bank', label: 'Bank Account', icon: '🏦' },
    { value: 'credit', label: 'Credit Card', icon: '💳' },
    { value: 'ewallet', label: 'E-Wallet', icon: '👛' },
    { value: 'other', label: 'Other', icon: '🪙' },
  ];

  const CURRENCIES = [
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'KRW', symbol: '₩', name: 'Korean Won' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  ];

  function backupStatusText() {
    const days = Store.daysSinceBackup();
    if (days === null) return '⚠️ No backup yet — export to keep your data safe';
    if (days === 0) return 'Last backup: today';
    if (days === 1) return 'Last backup: yesterday';
    if (days >= 7) return `⚠️ Last backup: ${days} days ago — time to back up`;
    return `Last backup: ${days} days ago`;
  }

  function render() {
    const meta = Store.getState().meta;
    const accounts = Store.getState().accounts;
    const symbol = meta.currencySymbol;

    return `
      <div class="card section">
        <div class="card-title">General</div>
        <div class="settings-row">
          <div>
            <div class="label">Currency</div>
            <div class="desc">${meta.currency} (${symbol})</div>
          </div>
          <select id="set-currency">
            ${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === meta.currency ? 'selected' : ''}>${c.code} (${c.symbol}) — ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="settings-row">
          <div>
            <div class="label">Dark Mode</div>
            <div class="desc">Switch between light and dark theme</div>
          </div>
          <label class="switch"><input type="checkbox" id="set-theme" ${meta.theme === 'dark' ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div class="settings-row">
          <div>
            <div class="label">Budget warning threshold</div>
            <div class="desc">Show "warning" status once spending reaches this %</div>
          </div>
          <select id="set-threshold">
            ${[0.5, 0.6, 0.7, 0.8, 0.9].map(v => `<option value="${v}" ${meta.warningThreshold === v ? 'selected' : ''}>${Math.round(v * 100)}%</option>`).join('')}
          </select>
        </div>
        <div class="settings-row">
          <div>
            <div class="label">Setup wizard</div>
            <div class="desc">Re-run the initial setup steps</div>
          </div>
          <button class="btn btn-sm" id="rerun-wizard">Run Wizard</button>
        </div>
      </div>

      <div class="card section">
        <div class="card-title">Accounts <button class="btn btn-sm btn-primary" id="add-account">＋ Add</button></div>
        <div class="settings-list">
          ${accounts.map(a => `
            <div class="settings-row">
              <span class="flex flex-gap" style="align-items:center;">
                <span class="icon-pill">${a.icon}</span>
                <span>
                  <div class="label">${Util.escapeHtml(a.name)}</div>
                  <div class="desc">${Util.formatCurrency(Store.accountBalance(a.id), symbol)}</div>
                </span>
              </span>
              <button class="btn btn-sm" data-edit-account="${a.id}">Edit</button>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="grid grid-cols-2 section">
        <div class="card">
          <div class="card-title">Expense Categories <button class="btn btn-sm btn-primary" id="add-cat-expense">＋</button></div>
          <div class="settings-list">
            ${Store.getState().categories.expense.map(c => categoryRow(c, 'expense')).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-title">Income Categories <button class="btn btn-sm btn-primary" id="add-cat-income">＋</button></div>
          <div class="settings-list">
            ${Store.getState().categories.income.map(c => categoryRow(c, 'income')).join('')}
          </div>
        </div>
      </div>

      <div class="card section">
        <div class="card-title">Data</div>
        <div class="settings-list">
          <div class="settings-row">
            <div>
              <div class="label">Export Backup (JSON)</div>
              <div class="desc">${backupStatusText()}</div>
            </div>
            <button class="btn btn-sm" id="export-json">Export</button>
          </div>
          <div class="settings-row">
            <div>
              <div class="label">Import Backup (JSON)</div>
              <div class="desc">Restore from a previously exported file</div>
            </div>
            <label class="btn btn-sm" style="cursor:pointer;">
              Import
              <input type="file" id="import-json" accept="application/json" style="display:none;">
            </label>
          </div>
          <div class="settings-row">
            <div>
              <div class="label">Export Transactions (CSV)</div>
              <div class="desc">For spreadsheets or tax records</div>
            </div>
            <button class="btn btn-sm" id="export-csv">Export</button>
          </div>
          <div class="settings-row">
            <div>
              <div class="label">Reset All Data</div>
              <div class="desc">Erase everything and start fresh</div>
            </div>
            <button class="btn btn-sm btn-danger" id="reset-data">Reset</button>
          </div>
        </div>
      </div>

      <div class="card section">
        <div class="card-title">About</div>
        <div class="settings-list">
          <div class="settings-row">
            <div>
              <div class="label">PocketLedger</div>
              <div class="desc">Personal Expense Manager</div>
            </div>
            <span class="badge">v${App.VERSION}</span>
          </div>
          <div class="settings-row">
            <div>
              <div class="label">Created by</div>
              <div class="desc">Siriwisit Pengkaew</div>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="label">GitHub</div>
              <div class="desc"><a href="https://github.com/Siriwisit-pen" target="_blank" rel="noopener" style="color:var(--primary);">@Siriwisit-pen</a></div>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="label">Email</div>
              <div class="desc"><a href="mailto:siriwisit.pen@gmail.com" style="color:var(--primary);">siriwisit.pen@gmail.com</a></div>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="label">Source code</div>
              <div class="desc"><a href="https://github.com/Siriwisit-pen/pocketledger" target="_blank" rel="noopener" style="color:var(--primary);">github.com/Siriwisit-pen/pocketledger</a></div>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="label">Inspired by</div>
              <div class="desc">Melany Mabel Navas Perez</div>
            </div>
          </div>
        </div>
        <div class="text-muted" style="text-align:center;font-size:0.78rem;padding:10px 0 4px;">Made in Thailand 🇹🇭 · Your data stays private on this device</div>
      </div>
    `;
  }

  function categoryRow(c, type) {
    return `
      <div class="settings-row">
        <span class="flex flex-gap" style="align-items:center;">
          <span class="icon-pill">${c.icon}</span>
          <span class="label">${Util.escapeHtml(c.name)}</span>
        </span>
        <span class="flex flex-gap">
          <button class="btn btn-sm" data-edit-cat="${c.id}" data-cat-type="${type}">Edit</button>
        </span>
      </div>
    `;
  }

  function openCategoryModal(type, catId) {
    const existing = catId ? Store.getCategory(type, catId) : null;
    const data = { name: existing?.name || '', icon: existing?.icon || '🏷️' };
    const html = `
      <div class="modal-header"><h2>${existing ? 'Edit' : 'Add'} ${type === 'expense' ? 'Expense' : 'Income'} Category</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <form id="cat-form">
        <div class="field">
          <label>Name</label>
          <input type="text" id="cf-name" value="${Util.escapeHtml(data.name)}" required autofocus>
        </div>
        <div class="field">
          <label>Icon</label>
          ${UI.iconPicker(data.icon)}
        </div>
        <div class="modal-actions">
          ${existing ? `<button type="button" class="btn btn-danger" id="cf-delete">Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add'}</button>
        </div>
      </form>
    `;
    UI.openModal(html);
    const root = document.getElementById('modal-root');
    let icon = data.icon;
    UI.bindIconPicker(root.querySelector('#icon-picker'), (newIcon) => { icon = newIcon; });

    if (existing) {
      root.querySelector('#cf-delete').addEventListener('click', async () => {
        const inUse = Store.getState().transactions.some(t => t.categoryId === existing.id);
        const msg = inUse
          ? 'This category is used by existing transactions. Deleting it will keep those transactions but they will show as "Unknown" category. Continue?'
          : 'Delete this category?';
        const ok = await UI.confirmDialog(msg, { okText: 'Delete', danger: true });
        if (!ok) return;
        Store.deleteCategory(type, existing.id);
        Store.deleteBudget(existing.id);
        UI.closeModal();
        UI.toast('Category deleted');
        App.refresh();
      });
    }

    root.querySelector('#cat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = root.querySelector('#cf-name').value.trim();
      if (!name) { UI.toast('Enter a category name'); return; }
      if (existing) {
        Store.updateCategory(type, existing.id, { name, icon });
      } else {
        Store.addCategory(type, { name, icon });
      }
      UI.closeModal();
      UI.toast('Category saved');
      App.refresh();
    });
  }

  function openAccountModal(accId) {
    const existing = accId ? Store.getAccount(accId) : null;
    const data = {
      name: existing?.name || '',
      type: existing?.type || 'cash',
      icon: existing?.icon || '💵',
      initialBalance: existing?.initialBalance ?? 0,
    };
    const html = `
      <div class="modal-header"><h2>${existing ? 'Edit Account' : 'Add Account'}</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <form id="acc-form">
        <div class="field">
          <label>Account name</label>
          <input type="text" id="af-name" value="${Util.escapeHtml(data.name)}" placeholder="e.g. Bangkok Bank" required autofocus>
        </div>
        <div class="field">
          <label>Type</label>
          <select id="af-type">
            ${ACCOUNT_TYPES.map(t => `<option value="${t.value}" ${t.value === data.type ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Icon</label>
          ${UI.iconPicker(data.icon, UI.ACCOUNT_ICONS)}
        </div>
        <div class="field">
          <label>${existing ? 'Initial balance (does not include recorded transactions)' : 'Starting balance'}</label>
          <input type="number" id="af-balance" step="0.01" value="${data.initialBalance}">
        </div>
        <div class="modal-actions">
          ${existing ? `<button type="button" class="btn btn-danger" id="af-delete">Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Account'}</button>
        </div>
      </form>
    `;
    UI.openModal(html);
    const root = document.getElementById('modal-root');
    let icon = data.icon;
    UI.bindIconPicker(root.querySelector('#icon-picker'), (newIcon) => { icon = newIcon; });

    if (existing) {
      root.querySelector('#af-delete').addEventListener('click', async () => {
        if (Store.getState().accounts.length <= 1) {
          UI.toast('You must have at least one account');
          return;
        }
        const ok = await UI.confirmDialog('Delete this account? Its transactions will also be deleted.', { okText: 'Delete', danger: true });
        if (!ok) return;
        Store.deleteAccount(existing.id);
        UI.closeModal();
        UI.toast('Account deleted');
        App.refresh();
      });
    }

    root.querySelector('#acc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = root.querySelector('#af-name').value.trim();
      if (!name) { UI.toast('Enter an account name'); return; }
      const payload = {
        name,
        type: root.querySelector('#af-type').value,
        icon,
        initialBalance: parseFloat(root.querySelector('#af-balance').value) || 0,
      };
      if (existing) {
        Store.updateAccount(existing.id, payload);
      } else {
        Store.addAccount(payload);
      }
      UI.closeModal();
      UI.toast('Account saved');
      App.refresh();
    });
  }

  function afterRender(container) {
    container.querySelector('#set-currency').addEventListener('change', (e) => {
      const c = CURRENCIES.find(x => x.code === e.target.value);
      Store.setMeta({ currency: c.code, currencySymbol: c.symbol });
      App.refresh();
    });
    container.querySelector('#set-theme').addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      Store.setMeta({ theme });
      App.applyTheme();
    });
    container.querySelector('#set-threshold').addEventListener('change', (e) => {
      Store.setMeta({ warningThreshold: parseFloat(e.target.value) });
      UI.toast('Threshold updated');
    });
    container.querySelector('#rerun-wizard').addEventListener('click', () => {
      Wizard.start();
    });

    container.querySelector('#add-account').addEventListener('click', () => openAccountModal(null));
    container.querySelectorAll('[data-edit-account]').forEach(btn => {
      btn.addEventListener('click', () => openAccountModal(btn.dataset.editAccount));
    });

    container.querySelector('#add-cat-expense').addEventListener('click', () => openCategoryModal('expense', null));
    container.querySelector('#add-cat-income').addEventListener('click', () => openCategoryModal('income', null));
    container.querySelectorAll('[data-edit-cat]').forEach(btn => {
      btn.addEventListener('click', () => openCategoryModal(btn.dataset.catType, btn.dataset.editCat));
    });

    container.querySelector('#export-json').addEventListener('click', () => {
      UI.downloadFile(`pocketledger-backup-${Util.todayISO()}.json`, Store.exportData(), 'application/json');
      Store.markBackedUp();
      UI.toast('Backup exported');
      App.refresh();
    });
    container.querySelector('#export-csv').addEventListener('click', () => {
      UI.downloadFile(`pocketledger-transactions-${Util.todayISO()}.csv`, Store.exportCSV(), 'text/csv');
      UI.toast('CSV exported');
    });
    container.querySelector('#import-json').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await UI.confirmDialog('Importing a backup will replace all current data. Continue?', { okText: 'Import', danger: true });
      if (!ok) { e.target.value = ''; return; }
      try {
        const text = await file.text();
        Store.importData(text);
        UI.toast('Backup imported');
        App.applyTheme();
        App.refresh();
      } catch (err) {
        UI.toast('Invalid backup file');
      }
      e.target.value = '';
    });
    container.querySelector('#reset-data').addEventListener('click', async () => {
      const ok = await UI.confirmDialog('This will permanently erase all accounts, transactions, budgets, and goals. This cannot be undone.', { okText: 'Erase Everything', danger: true });
      if (!ok) return;
      Store.resetAll();
      App.applyTheme();
      UI.toast('All data has been reset');
      App.refresh();
    });
  }

  return { render, afterRender, CURRENCIES, ACCOUNT_TYPES, openAccountModal, openCategoryModal };
})();
