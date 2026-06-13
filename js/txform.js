/* ---------- Transaction add/edit modal + quick-add bar ---------- */
const TxForm = (() => {

  const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'QR Payment', 'E-Wallet', 'Other'];

  function categoryOptions(type, selectedId) {
    const cats = Store.getState().categories[type];
    return cats.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');
  }

  function accountOptions(selectedId, excludeId) {
    return Store.getState().accounts
      .filter(a => a.id !== excludeId)
      .map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('');
  }

  function paymentOptions(selected) {
    return PAYMENT_METHODS.map(p => `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`).join('');
  }

  function open(txId) {
    const meta = Store.getState().meta;
    const existing = txId ? Store.getTransaction(txId) : null;

    const data = {
      type: existing?.type || 'expense',
      amount: existing?.amount ?? '',
      date: existing?.date || Util.todayISO(),
      categoryId: existing?.categoryId || (Store.getState().categories['expense'][0]?.id),
      accountId: existing?.accountId || meta.lastUsedAccountId || Store.getState().accounts[0]?.id,
      toAccountId: existing?.toAccountId || null,
      paymentMethod: existing?.paymentMethod || 'Cash',
      note: existing?.note || '',
      tags: (existing?.tags || []).join(', '),
      receipt: existing?.receipt || null,
    };
    const canTransfer = Store.getState().accounts.length >= 2;

    const html = `
      <div class="modal-header">
        <h2>${existing ? 'Edit Transaction' : 'Add Transaction'}</h2>
        <button class="btn btn-icon btn-ghost" data-close>✕</button>
      </div>
      <form id="tx-form">
        <div class="field">
          <div class="type-toggle">
            <button type="button" class="${data.type === 'expense' ? 'active expense' : ''}" data-type="expense">− Expense</button>
            <button type="button" class="${data.type === 'income' ? 'active income' : ''}" data-type="income">+ Income</button>
            <button type="button" class="${data.type === 'transfer' ? 'active transfer' : ''}" data-type="transfer" ${canTransfer ? '' : 'disabled title="Add a second account to enable transfers"'}>⇄ Transfer</button>
          </div>
        </div>

        <div class="field">
          <label>Amount</label>
          <input type="number" id="f-amount" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${data.amount}" required autofocus>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Date</label>
            <input type="date" id="f-date" value="${data.date}" required>
          </div>
          <div class="field" id="f-category-wrap">
            ${data.type === 'transfer'
              ? `<label>To Account</label><select id="f-to-account">${accountOptions(data.toAccountId, data.accountId)}</select>`
              : `<label>Category</label><select id="f-category">${categoryOptions(data.type, data.categoryId)}</select>`}
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label id="f-account-label">${data.type === 'transfer' ? 'From Account' : 'Account'}</label>
            <select id="f-account">${accountOptions(data.accountId)}</select>
          </div>
          <div class="field">
            <label>Payment method</label>
            <select id="f-payment">${paymentOptions(data.paymentMethod)}</select>
          </div>
        </div>

        <div class="field">
          <label>Note (optional)</label>
          <input type="text" id="f-note" placeholder="e.g. Lunch with team" value="${Util.escapeHtml(data.note)}">
        </div>

        <div class="field">
          <label>Tags (optional, comma separated)</label>
          <input type="text" id="f-tags" placeholder="e.g. work, travel" value="${Util.escapeHtml(data.tags)}">
        </div>

        <div class="field">
          <label>Receipt (optional)</label>
          <input type="file" id="f-receipt" accept="image/*">
          <div id="receipt-preview-wrap">${data.receipt ? `<img src="${data.receipt}" class="receipt-preview" id="receipt-preview">` : ''}</div>
        </div>

        <div class="modal-actions">
          ${existing ? `<button type="button" class="btn btn-danger" id="tx-delete">Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Add Transaction'}</button>
        </div>
      </form>
    `;

    UI.openModal(html);
    const root = document.getElementById('modal-root');
    let receiptData = data.receipt;
    let currentType = data.type;

    function updateCategoryOrTransferField() {
      const wrap = root.querySelector('#f-category-wrap');
      const accountLabel = root.querySelector('#f-account-label');
      if (currentType === 'transfer') {
        accountLabel.textContent = 'From Account';
        const fromId = root.querySelector('#f-account').value;
        wrap.innerHTML = `<label>To Account</label><select id="f-to-account">${accountOptions(null, fromId)}</select>`;
      } else {
        accountLabel.textContent = 'Account';
        wrap.innerHTML = `<label>Category</label><select id="f-category">${categoryOptions(currentType, null)}</select>`;
      }
    }

    root.querySelectorAll('.type-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        currentType = btn.dataset.type;
        root.querySelectorAll('.type-toggle button').forEach(b => {
          b.classList.remove('active', 'expense', 'income', 'transfer');
        });
        btn.classList.add('active', currentType);
        updateCategoryOrTransferField();
      });
    });

    root.querySelector('#f-account').addEventListener('change', () => {
      if (currentType !== 'transfer') return;
      const wrap = root.querySelector('#f-category-wrap');
      const fromId = root.querySelector('#f-account').value;
      const currentTo = root.querySelector('#f-to-account')?.value;
      wrap.innerHTML = `<label>To Account</label><select id="f-to-account">${accountOptions(currentTo, fromId)}</select>`;
    });

    root.querySelector('#f-receipt').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        receiptData = await Util.downscaleImage(file);
        root.querySelector('#receipt-preview-wrap').innerHTML = `<img src="${receiptData}" class="receipt-preview" id="receipt-preview">`;
      } catch (err) {
        UI.toast('Could not read image');
      }
    });

    if (existing) {
      root.querySelector('#tx-delete').addEventListener('click', async () => {
        const ok = await UI.confirmDialog('Delete this transaction? This cannot be undone.', { okText: 'Delete', danger: true });
        if (!ok) return;
        Store.deleteTransaction(existing.id);
        UI.closeModal();
        UI.toast('Transaction deleted');
        App.refresh();
      });
    }

    root.querySelector('#tx-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(root.querySelector('#f-amount').value);
      if (!amount || amount <= 0) { UI.toast('Enter a valid amount'); return; }

      const common = {
        amount,
        date: root.querySelector('#f-date').value,
        accountId: root.querySelector('#f-account').value,
        paymentMethod: root.querySelector('#f-payment').value,
        note: root.querySelector('#f-note').value.trim(),
        tags: root.querySelector('#f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        receipt: receiptData,
      };

      let payload;
      if (currentType === 'transfer') {
        const toAccountId = root.querySelector('#f-to-account').value;
        if (!toAccountId || toAccountId === common.accountId) { UI.toast('Choose two different accounts'); return; }
        payload = { ...common, type: 'transfer', categoryId: null, toAccountId };
      } else {
        payload = { ...common, type: currentType, categoryId: root.querySelector('#f-category').value, toAccountId: null };
      }

      if (existing) {
        Store.updateTransaction(existing.id, payload);
        UI.toast(currentType === 'transfer' ? 'Transfer updated' : 'Transaction updated');
      } else {
        Store.addTransaction(payload);
        UI.toast(currentType === 'transfer'
          ? `Transferred ${Util.formatCurrency(amount, Store.getState().meta.currencySymbol)}`
          : `Added ${Util.formatCurrency(amount, Store.getState().meta.currencySymbol)}`);
      }
      UI.closeModal();
      App.refresh();
    });
  }

  /* ---------- Quick add bar ---------- */
  function quickAddHtml() {
    return `
      <div class="quickadd">
        <input type="text" id="quickadd-input" placeholder='Quick add — e.g. "Lunch 120" or "+5000 salary"'>
        <button class="btn btn-primary" id="quickadd-submit">Add</button>
      </div>
      <div class="quickadd-suggest hide" id="quickadd-suggest"></div>
    `;
  }

  function parseInput(text) {
    let working = text.trim();
    let type = 'expense';
    if (working.startsWith('+')) {
      type = 'income';
      working = working.slice(1).trim();
    }
    const { amount, note, tags } = Util.parseQuickAdd(working);
    return { type, amount, note, tags };
  }

  function guessForType(note, type) {
    const cats = Store.getState().categories[type];
    const history = Store.transactionHistory().filter(h => h.type === type);
    const guessId = Util.guessCategory(note, cats, history);
    return guessId ? Store.getCategoryAny(guessId) : cats[cats.length - 1];
  }

  function bindQuickAdd(container) {
    const input = container.querySelector('#quickadd-input');
    const suggest = container.querySelector('#quickadd-suggest');
    const submitBtn = container.querySelector('#quickadd-submit');
    if (!input) return;

    const updateSuggest = Util.debounce(() => {
      const text = input.value;
      if (!text.trim()) { suggest.classList.add('hide'); return; }
      const { type, amount, note, tags } = parseInput(text);
      if (amount == null) { suggest.classList.add('hide'); return; }
      const cat = guessForType(note, type);
      const symbol = Store.getState().meta.currencySymbol;
      suggest.classList.remove('hide');
      suggest.innerHTML = `${type === 'income' ? '↗ Income' : '↘ Expense'} of <b>${Util.formatCurrency(amount, symbol)}</b> → <b>${cat.icon} ${cat.name}</b>`
        + (note ? ` · "${Util.escapeHtml(note)}"` : '')
        + (tags.length ? ' · ' + tags.map(t => '#' + t).join(' ') : '');
    }, 180);

    input.addEventListener('input', updateSuggest);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    submitBtn.addEventListener('click', submit);

    function submit() {
      const text = input.value.trim();
      if (!text) { open(); return; }
      const { type, amount, note, tags } = parseInput(text);
      if (amount == null || amount <= 0) {
        UI.toast('Include an amount, e.g. "Lunch 120"');
        return;
      }
      const cat = guessForType(note, type);
      const symbol = Store.getState().meta.currencySymbol;
      Store.addTransaction({ type, amount, date: Util.todayISO(), categoryId: cat.id, note, tags });
      UI.toast(`Added ${Util.formatCurrency(amount, symbol)} → ${cat.icon} ${cat.name}`);
      input.value = '';
      suggest.classList.add('hide');
      App.refresh();
    }
  }

  return { open, quickAddHtml, bindQuickAdd, PAYMENT_METHODS };
})();
