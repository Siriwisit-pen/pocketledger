/* ---------- Recurring transactions view ---------- */
const RecurringView = (() => {

  const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

  function render() {
    const symbol = Store.getState().meta.currencySymbol;
    const recurring = Store.getState().recurring;
    const sub = Store.subscriptionSummary();

    return `
      <div class="flex-between section">
        <span class="text-muted" style="font-size:0.85rem;">Automate bills & subscriptions</span>
        <button class="btn btn-primary" id="add-recurring">＋ Add Recurring</button>
      </div>

      <div class="card section">
        <div class="card-title">Subscription & Recurring Cost Summary</div>
        <div class="stat-value expense">${Util.formatCurrency(sub.total, symbol)}<span style="font-size:0.85rem;font-weight:600;color:var(--text-muted);"> / month (estimated)</span></div>
        <div class="stat-sub">${sub.items.length} active recurring item${sub.items.length === 1 ? '' : 's'}</div>
      </div>

      <div class="card">
        <div class="card-title">All Recurring Items</div>
        ${recurring.length ? recurring.map(r => recurringRow(r, symbol)).join('') : `
          <div class="empty-state"><span class="emoji">🔁</span>No recurring transactions yet. Add rent, subscriptions, or bills to automate tracking.</div>
        `}
      </div>
    `;
  }

  function recurringRow(r, symbol) {
    const cat = Store.getCategoryAny(r.categoryId);
    const acc = Store.getAccount(r.accountId);
    const due = Store.nextDueDate(r);
    return `
      <div class="tx-row" data-recurring="${r.id}" style="${r.active ? '' : 'opacity:0.5;'}">
        <div class="tx-icon">${cat?.icon || '📦'}</div>
        <div class="tx-info">
          <div class="tx-title">${Util.escapeHtml(r.note) || cat?.name || 'Recurring'}</div>
          <div class="tx-sub">${FREQ_LABEL[r.frequency]} · ${acc?.name || ''} · ${r.mode === 'auto' ? 'Auto-add' : 'Reminder'} · Next: ${Util.formatDateShort(due)}</div>
        </div>
        <div class="tx-amount ${r.type}">${r.type === 'income' ? '+' : '−'}${Util.formatCurrency(r.amount, symbol)}</div>
      </div>
    `;
  }

  function categoryOptions(type, selected) {
    return Store.getState().categories[type].map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');
  }
  function accountOptions(selected) {
    return Store.getState().accounts.map(a => `<option value="${a.id}" ${a.id === selected ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('');
  }

  function openModal(recId) {
    const existing = recId ? Store.getRecurring(recId) : null;
    const data = {
      type: existing?.type || 'expense',
      amount: existing?.amount ?? '',
      categoryId: existing?.categoryId || Store.getState().categories.expense[0]?.id,
      accountId: existing?.accountId || Store.getState().accounts[0]?.id,
      paymentMethod: existing?.paymentMethod || 'Cash',
      note: existing?.note || '',
      frequency: existing?.frequency || 'monthly',
      startDate: existing?.startDate || Util.todayISO(),
      endDate: existing?.endDate || '',
      mode: existing?.mode || 'auto',
      active: existing ? existing.active : true,
    };

    const html = `
      <div class="modal-header"><h2>${existing ? 'Edit Recurring' : 'Add Recurring'}</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <form id="rec-form">
        <div class="field">
          <div class="type-toggle">
            <button type="button" class="${data.type === 'expense' ? 'active expense' : ''}" data-type="expense">− Expense</button>
            <button type="button" class="${data.type === 'income' ? 'active income' : ''}" data-type="income">+ Income</button>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Amount</label>
            <input type="number" id="rf-amount" min="0" step="0.01" value="${data.amount}" required autofocus>
          </div>
          <div class="field">
            <label>Category</label>
            <select id="rf-category">${categoryOptions(data.type, data.categoryId)}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Account</label>
            <select id="rf-account">${accountOptions(data.accountId)}</select>
          </div>
          <div class="field">
            <label>Frequency</label>
            <select id="rf-frequency">
              ${Object.entries(FREQ_LABEL).map(([k, v]) => `<option value="${k}" ${data.frequency === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Start date</label>
            <input type="date" id="rf-start" value="${data.startDate}" required>
          </div>
          <div class="field">
            <label>End date (optional)</label>
            <input type="date" id="rf-end" value="${data.endDate}">
          </div>
        </div>
        <div class="field">
          <label>Note (optional)</label>
          <input type="text" id="rf-note" placeholder="e.g. Netflix, Rent, Internet" value="${Util.escapeHtml(data.note)}">
        </div>
        <div class="field">
          <label>Mode</label>
          <select id="rf-mode">
            <option value="auto" ${data.mode === 'auto' ? 'selected' : ''}>Auto-create transaction</option>
            <option value="reminder" ${data.mode === 'reminder' ? 'selected' : ''}>Reminder only (confirm before adding)</option>
          </select>
          <span class="field-help">Auto-create posts the transaction automatically when due. Reminder shows a banner on the dashboard so you can confirm or skip.</span>
        </div>
        ${existing ? `
        <div class="field">
          <div class="settings-row" style="padding:0;">
            <span class="label">Active</span>
            <label class="switch"><input type="checkbox" id="rf-active" ${data.active ? 'checked' : ''}><span class="slider"></span></label>
          </div>
        </div>` : ''}
        <div class="modal-actions">
          ${existing ? `<button type="button" class="btn btn-danger" id="rf-delete">Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Add Recurring'}</button>
        </div>
      </form>
    `;
    UI.openModal(html);
    const root = document.getElementById('modal-root');
    let currentType = data.type;

    root.querySelectorAll('.type-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        currentType = btn.dataset.type;
        root.querySelectorAll('.type-toggle button').forEach(b => b.classList.remove('active', 'expense', 'income'));
        btn.classList.add('active', currentType);
        root.querySelector('#rf-category').innerHTML = categoryOptions(currentType, null);
      });
    });

    if (existing) {
      root.querySelector('#rf-delete').addEventListener('click', async () => {
        const ok = await UI.confirmDialog('Delete this recurring item? Past transactions it created will remain.', { okText: 'Delete', danger: true });
        if (!ok) return;
        Store.deleteRecurring(existing.id);
        UI.closeModal();
        UI.toast('Recurring item deleted');
        App.refresh();
      });
    }

    root.querySelector('#rec-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(root.querySelector('#rf-amount').value);
      if (!amount || amount <= 0) { UI.toast('Enter a valid amount'); return; }
      const startDate = root.querySelector('#rf-start').value;
      const endDate = root.querySelector('#rf-end').value || null;
      if (endDate && endDate < startDate) { UI.toast('End date must be after start date'); return; }

      const payload = {
        type: currentType,
        amount,
        categoryId: root.querySelector('#rf-category').value,
        accountId: root.querySelector('#rf-account').value,
        paymentMethod: 'Recurring',
        note: root.querySelector('#rf-note').value.trim(),
        frequency: root.querySelector('#rf-frequency').value,
        startDate,
        endDate,
        mode: root.querySelector('#rf-mode').value,
      };
      if (existing) {
        payload.active = root.querySelector('#rf-active').checked;
        Store.updateRecurring(existing.id, payload);
        UI.toast('Recurring item updated');
      } else {
        Store.addRecurring(payload);
        UI.toast('Recurring item added');
      }
      UI.closeModal();
      App.refreshReminders();
      App.refresh();
    });
  }

  function afterRender(container) {
    const addBtn = container.querySelector('#add-recurring');
    if (addBtn) addBtn.addEventListener('click', () => openModal(null));
    container.querySelectorAll('[data-recurring]').forEach(row => {
      row.addEventListener('click', () => openModal(row.dataset.recurring));
    });
  }

  return { render, afterRender };
})();
