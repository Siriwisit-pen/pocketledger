/* ---------- Budgets view ---------- */
const BudgetsView = (() => {

  function render() {
    const symbol = Store.getState().meta.currencySymbol;
    const monthKey = Util.currentMonthKey();
    const usage = Store.budgetUsage(monthKey);
    const budgetedCatIds = new Set(usage.map(u => u.categoryId));
    const unbudgeted = Store.getState().categories.expense.filter(c => !budgetedCatIds.has(c.id));

    return `
      <div class="flex-between section">
        <span class="text-muted" style="font-size:0.85rem;">Budgets reset monthly · ${Util.monthLabel(monthKey)}</span>
        <button class="btn btn-primary" id="add-budget">＋ Add Budget</button>
      </div>

      ${usage.length ? usage.map(b => budgetCard(b, symbol)).join('') : `
        <div class="card empty-state"><span class="emoji">🎯</span>No budgets set yet. Add one to start tracking your spending limits.</div>
      `}

      ${unbudgeted.length ? `
        <div class="section" style="margin-top:20px;">
          <div class="section-title" style="font-size:0.9rem;">Categories without a budget</div>
          <div class="card">
            ${unbudgeted.map(c => `
              <div class="settings-row">
                <span class="flex flex-gap" style="align-items:center;">
                  <span class="icon-pill">${c.icon}</span>
                  <span class="label">${c.name}</span>
                </span>
                <button class="btn btn-sm" data-quick-budget="${c.id}">Set Budget</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  function budgetCard(b, symbol) {
    const name = b.categoryId === 'GLOBAL' ? 'Overall Monthly Budget' : `${b.category?.icon || '📦'} ${b.category?.name || 'Unknown'}`;
    const statusLabel = { safe: 'Safe', warning: 'Warning', exceeded: 'Exceeded' }[b.status];
    const rolloverLine = b.rollover ? `
      <div class="text-muted" style="font-size:0.78rem;margin-top:6px;">
        ↻ ${b.rolloverAmount >= 0 ? '+' : ''}${Util.formatCurrency(b.rolloverAmount, symbol)} rolled over from previous months · Budget this month: <b>${Util.formatCurrency(b.effectiveAmount, symbol)}</b>
      </div>
    ` : '';
    return `
      <div class="card budget-card" data-budget="${b.categoryId}">
        <div class="budget-head">
          <span class="name">${b.categoryId === 'GLOBAL' ? '🌐' : ''} ${name}</span>
          <span class="badge ${b.status}">${statusLabel}</span>
        </div>
        <div class="progress-track"><div class="progress-fill ${b.status}" style="width:${Math.min(b.pct, 100)}%"></div></div>
        <div class="budget-amounts">
          <span>Spent: <b>${Util.formatCurrency(b.spent, symbol)}</b></span>
          <span>${Math.round(b.pct)}%</span>
          <span>${b.remaining >= 0 ? 'Remaining' : 'Over by'}: <b>${Util.formatCurrency(Math.abs(b.remaining), symbol)}</b></span>
        </div>
        ${rolloverLine}
        <div class="text-right" style="margin-top:8px;">
          <button class="btn btn-sm" data-edit-budget="${b.categoryId}">Edit</button>
        </div>
      </div>
    `;
  }

  function openBudgetModal(categoryId) {
    const monthKey = Util.currentMonthKey();
    const symbol = Store.getState().meta.currencySymbol;
    const existing = categoryId ? Store.getBudget(categoryId) : null;
    const usage = Store.budgetUsage(monthKey);
    const budgetedCatIds = new Set(usage.map(u => u.categoryId));
    const expenseCats = Store.getState().categories.expense;
    const hasGlobal = budgetedCatIds.has('GLOBAL');

    const options = [];
    if (!hasGlobal || categoryId === 'GLOBAL') options.push(`<option value="GLOBAL" ${categoryId === 'GLOBAL' ? 'selected' : ''}>🌐 Overall Monthly Budget</option>`);
    expenseCats.forEach(c => {
      if (categoryId === c.id || !budgetedCatIds.has(c.id)) {
        options.push(`<option value="${c.id}" ${categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`);
      }
    });

    const html = `
      <div class="modal-header"><h2>${existing ? 'Edit Budget' : 'Add Budget'}</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <form id="budget-form">
        <div class="field">
          <label>Category</label>
          <select id="bf-category" ${existing ? 'disabled' : ''}>${options.join('')}</select>
        </div>
        <div class="field">
          <label>Monthly Budget Amount (${symbol})</label>
          <input type="number" id="bf-amount" min="0" step="0.01" value="${existing ? existing.amount : ''}" required autofocus>
        </div>
        <div class="field">
          <label class="flex flex-gap" style="align-items:center;font-weight:400;">
            <input type="checkbox" id="bf-rollover" ${existing?.rollover ? 'checked' : ''} style="width:auto;">
            Roll over unspent budget to next month
          </label>
        </div>
        <div class="modal-actions">
          ${existing ? `<button type="button" class="btn btn-danger" id="bf-delete">Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Budget'}</button>
        </div>
      </form>
    `;
    UI.openModal(html);
    const root = document.getElementById('modal-root');

    if (existing) {
      root.querySelector('#bf-delete').addEventListener('click', async () => {
        const ok = await UI.confirmDialog('Remove this budget?', { okText: 'Delete', danger: true });
        if (!ok) return;
        Store.deleteBudget(existing.categoryId);
        UI.closeModal();
        UI.toast('Budget removed');
        App.refresh();
      });
    }

    root.querySelector('#budget-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(root.querySelector('#bf-amount').value);
      if (!amount || amount <= 0) { UI.toast('Enter a valid amount'); return; }
      const catId = root.querySelector('#bf-category').value;
      const rollover = root.querySelector('#bf-rollover').checked;
      Store.setBudget(catId, amount, rollover);
      UI.closeModal();
      UI.toast('Budget saved');
      App.refresh();
    });
  }

  function afterRender(container) {
    const addBtn = container.querySelector('#add-budget');
    if (addBtn) addBtn.addEventListener('click', () => openBudgetModal(null));

    container.querySelectorAll('[data-edit-budget]').forEach(btn => {
      btn.addEventListener('click', () => openBudgetModal(btn.dataset.editBudget));
    });
    container.querySelectorAll('[data-quick-budget]').forEach(btn => {
      btn.addEventListener('click', () => openBudgetModal(btn.dataset.quickBudget));
    });
  }

  return { render, afterRender };
})();
