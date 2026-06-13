/* ---------- First-run setup wizard ---------- */
const Wizard = (() => {
  const TOTAL_STEPS = 5;
  let step = 0;

  function start() {
    step = 0;
    UI.openModal(shell(), { persistent: true });
    renderContent();
    bindFooter();
  }

  function shell() {
    return `
      <div class="wizard-steps" id="wizard-dots">
        ${Array.from({ length: TOTAL_STEPS }).map((_, i) => `<div class="wizard-dot ${i <= step ? 'active' : ''}"></div>`).join('')}
      </div>
      <div id="wizard-content"></div>
      <div class="modal-actions">
        <button class="btn" id="wz-back">Back</button>
        <button class="btn btn-primary" id="wz-next">Next</button>
      </div>
      <div class="wizard-skip"><a id="wz-skip">Skip setup, I'll configure later</a></div>
    `;
  }

  function updateChrome() {
    const root = document.getElementById('modal-root');
    root.querySelectorAll('#wizard-dots .wizard-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i <= step);
    });
    const back = root.querySelector('#wz-back');
    const next = root.querySelector('#wz-next');
    back.style.visibility = step === 0 ? 'hidden' : 'visible';
    next.textContent = step === TOTAL_STEPS - 1 ? 'Get Started' : 'Next';
    const skip = root.querySelector('#wz-skip');
    skip.style.display = step === TOTAL_STEPS - 1 ? 'none' : 'block';
  }

  function renderContent() {
    const root = document.getElementById('modal-root');
    const content = root.querySelector('#wizard-content');
    content.innerHTML = STEPS[step].render();
    STEPS[step].bind(content);
    updateChrome();
  }

  function bindFooter() {
    const root = document.getElementById('modal-root');
    root.querySelector('#wz-back').addEventListener('click', () => {
      if (step > 0) { step--; renderContent(); }
    });
    root.querySelector('#wz-next').addEventListener('click', () => {
      if (step < TOTAL_STEPS - 1) {
        step++;
        renderContent();
      } else {
        finish();
      }
    });
    root.querySelector('#wz-skip').addEventListener('click', () => finish());
  }

  function finish() {
    Store.setMeta({ setupDone: true });
    UI.closeModal();
    App.applyTheme();
    App.refresh();
    UI.toast('All set! You can change any of this later in Settings.');
    Help.maybeShowOverview();
  }

  /* ---------- Steps ---------- */
  const STEPS = [
    // Step 1: Welcome + currency
    {
      render() {
        const meta = Store.getState().meta;
        return `
          <h2 style="margin-top:0;">Welcome to PocketLedger 👋</h2>
          <p class="text-muted" style="font-size:0.9rem;">Let's do a quick setup so your dashboard makes sense from day one. You can skip and adjust everything later in Settings.</p>
          <div class="field">
            <label>Default currency</label>
            <select id="wz-currency">
              ${SettingsView.CURRENCIES.map(c => `<option value="${c.code}" ${c.code === meta.currency ? 'selected' : ''}>${c.code} (${c.symbol}) — ${c.name}</option>`).join('')}
            </select>
          </div>
        `;
      },
      bind(content) {
        content.querySelector('#wz-currency').addEventListener('change', (e) => {
          const c = SettingsView.CURRENCIES.find(x => x.code === e.target.value);
          Store.setMeta({ currency: c.code, currencySymbol: c.symbol });
        });
      },
    },

    // Step 2: Accounts
    {
      render() {
        const accounts = Store.getState().accounts;
        return `
          <h2 style="margin-top:0;">Your Accounts</h2>
          <p class="text-muted" style="font-size:0.9rem;">Add the wallets, bank accounts, or cards you want to track. You can always add more later.</p>
          <div class="settings-list" id="wz-account-list">
            ${accounts.map(a => `
              <div class="settings-row">
                <span class="flex flex-gap" style="align-items:center;">
                  <span class="icon-pill">${a.icon}</span>
                  <span class="label">${Util.escapeHtml(a.name)}</span>
                </span>
                ${accounts.length > 1 ? `<button class="btn btn-sm" data-remove-acc="${a.id}">Remove</button>` : ''}
              </div>
            `).join('')}
          </div>
          <div class="field-row" style="margin-top:12px;">
            <div class="field">
              <label>Account name</label>
              <input type="text" id="wz-acc-name" placeholder="e.g. Bank Account">
            </div>
            <div class="field">
              <label>Type</label>
              <select id="wz-acc-type">
                ${SettingsView.ACCOUNT_TYPES.map(t => `<option value="${t.value}" data-icon="${t.icon}">${t.icon} ${t.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <button type="button" class="btn btn-block" id="wz-add-account">＋ Add Account</button>
        `;
      },
      bind(content) {
        content.querySelectorAll('[data-remove-acc]').forEach(btn => {
          btn.addEventListener('click', () => {
            Store.deleteAccount(btn.dataset.removeAcc);
            renderContent();
          });
        });
        content.querySelector('#wz-add-account').addEventListener('click', () => {
          const nameInput = content.querySelector('#wz-acc-name');
          const typeSelect = content.querySelector('#wz-acc-type');
          const name = nameInput.value.trim();
          if (!name) { UI.toast('Enter an account name'); return; }
          const opt = typeSelect.options[typeSelect.selectedIndex];
          Store.addAccount({ name, type: typeSelect.value, icon: opt.dataset.icon, initialBalance: 0 });
          renderContent();
        });
      },
    },

    // Step 3: Categories
    {
      render() {
        const cats = Store.getState().categories;
        return `
          <h2 style="margin-top:0;">Categories</h2>
          <p class="text-muted" style="font-size:0.9rem;">We've pre-filled common categories. Remove any you don't need, or add your own.</p>
          <div class="field">
            <label>Expense Categories</label>
            <div class="chip-grid" id="wz-expense-cats">
              ${cats.expense.map(c => `<span class="chip active" data-remove-cat="expense:${c.id}">${c.icon} ${Util.escapeHtml(c.name)} ✕</span>`).join('')}
            </div>
          </div>
          <div class="field">
            <label>Income Categories</label>
            <div class="chip-grid" id="wz-income-cats">
              ${cats.income.map(c => `<span class="chip active" data-remove-cat="income:${c.id}">${c.icon} ${Util.escapeHtml(c.name)} ✕</span>`).join('')}
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Add category</label>
              <input type="text" id="wz-cat-name" placeholder="e.g. Pet Care">
            </div>
            <div class="field">
              <label>Type</label>
              <select id="wz-cat-type">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <button type="button" class="btn btn-block" id="wz-add-cat">＋ Add Category</button>
        `;
      },
      bind(content) {
        content.querySelectorAll('[data-remove-cat]').forEach(chip => {
          chip.addEventListener('click', () => {
            const [type, id] = chip.dataset.removeCat.split(':');
            Store.deleteCategory(type, id);
            Store.deleteBudget(id);
            renderContent();
          });
        });
        content.querySelector('#wz-add-cat').addEventListener('click', () => {
          const nameInput = content.querySelector('#wz-cat-name');
          const type = content.querySelector('#wz-cat-type').value;
          const name = nameInput.value.trim();
          if (!name) { UI.toast('Enter a category name'); return; }
          Store.addCategory(type, { name, icon: type === 'expense' ? '📦' : '💰' });
          renderContent();
        });
      },
    },

    // Step 4: Budgets (optional)
    {
      render() {
        const cats = Store.getState().categories.expense;
        const symbol = Store.getState().meta.currencySymbol;
        return `
          <h2 style="margin-top:0;">Monthly Budgets <span class="text-muted" style="font-size:0.8rem;font-weight:400;">(optional)</span></h2>
          <p class="text-muted" style="font-size:0.9rem;">Set a monthly spending limit per category. Leave blank to skip — you can add these anytime in Budgets.</p>
          ${cats.map(c => {
            const existing = Store.getBudget(c.id);
            return `
              <div class="field-row" style="align-items:center;">
                <span style="flex:1;font-weight:600;font-size:0.9rem;">${c.icon} ${Util.escapeHtml(c.name)}</span>
                <div class="field" style="flex:1;margin-bottom:0;">
                  <input type="number" min="0" step="0.01" placeholder="${symbol} amount" data-budget-cat="${c.id}" value="${existing ? existing.amount : ''}">
                </div>
              </div>
            `;
          }).join('')}
        `;
      },
      bind(content) {
        content.querySelectorAll('[data-budget-cat]').forEach(input => {
          input.addEventListener('change', () => {
            const val = parseFloat(input.value);
            if (val > 0) {
              Store.setBudget(input.dataset.budgetCat, val);
            } else {
              Store.deleteBudget(input.dataset.budgetCat);
            }
          });
        });
      },
    },

    // Step 5: Done
    {
      render() {
        const meta = Store.getState().meta;
        return `
          <div style="text-align:center;padding:10px 0;">
            <div style="font-size:3rem;">🎉</div>
            <h2>You're all set!</h2>
            <p class="text-muted" style="font-size:0.9rem;">Currency: ${meta.currency} (${meta.currencySymbol}) · ${Store.getState().accounts.length} account(s) · ${Store.getState().categories.expense.length + Store.getState().categories.income.length} categories</p>
            <p class="text-muted" style="font-size:0.9rem;">Use the quick-add bar on your dashboard to record transactions in seconds — try typing "Lunch 120".</p>
          </div>
        `;
      },
      bind() {},
    },
  ];

  return { start };
})();
