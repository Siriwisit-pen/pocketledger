/* ---------- Transactions: list, search, filters ---------- */
const TransactionsView = (() => {

  let filters = {
    keyword: '', type: '', categoryId: '', accountId: '',
    dateFrom: '', dateTo: '', amountMin: '', amountMax: '', tag: '',
  };

  function activeFilterCount() {
    return Object.entries(filters).filter(([k, v]) => k !== 'keyword' && v !== '').length;
  }

  function render() {
    const symbol = Store.getState().meta.currencySymbol;
    const list = Store.filterTransactions(filters);
    const total = list.reduce((s, t) => {
      if (t.type === 'income') return s + t.amount;
      if (t.type === 'expense') return s - t.amount;
      return s;
    }, 0);
    const fCount = activeFilterCount();

    return `
      <div class="filter-bar">
        <input type="text" class="search-input" id="tx-search" placeholder="Search notes or tags..." value="${Util.escapeHtml(filters.keyword)}">
        <button class="btn" id="open-filters">🔍 Filters ${fCount ? `<span class="badge safe">${fCount}</span>` : ''}</button>
        ${fCount ? `<button class="btn btn-ghost" id="clear-filters">Clear</button>` : ''}
      </div>

      <div class="card section">
        <div class="flex-between">
          <span class="text-muted" style="font-size:0.85rem;">${list.length} transaction${list.length === 1 ? '' : 's'}</span>
          <span style="font-weight:700;color:${total >= 0 ? 'var(--income)' : 'var(--expense)'}">${total >= 0 ? '+' : ''}${Util.formatCurrency(total, symbol)}</span>
        </div>
      </div>

      <div class="card">
        ${renderGroupedList(list, symbol)}
      </div>
    `;
  }

  function renderGroupedList(list, symbol) {
    if (!list.length) {
      return `<div class="empty-state"><span class="emoji">🔎</span>No transactions match your filters.</div>`;
    }
    let html = '';
    let lastDate = null;
    for (const t of list) {
      if (t.date !== lastDate) {
        if (lastDate !== null) html += '';
        html += `<div class="text-muted" style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:10px 8px 4px;">${Util.formatDate(t.date, { weekday: 'short', month: 'short', day: 'numeric' })}</div>`;
        lastDate = t.date;
      }
      if (t.type === 'transfer') {
        const fromAcc = Store.getAccount(t.accountId);
        const toAcc = Store.getAccount(t.toAccountId);
        html += `<div class="tx-row" data-tx="${t.id}">
          <div class="tx-icon">🔁</div>
          <div class="tx-info">
            <div class="tx-title">${Util.escapeHtml(t.note) || 'Transfer'}</div>
            <div class="tx-sub">${fromAcc?.name || '?'} → ${toAcc?.name || '?'}${t.paymentMethod ? ' · ' + t.paymentMethod : ''}${t.tags?.length ? ' · ' + t.tags.map(tg => '#' + tg).join(' ') : ''}</div>
          </div>
          <div class="tx-amount transfer">${Util.formatCurrency(t.amount, symbol)}</div>
        </div>`;
        continue;
      }
      const cat = Store.getCategoryAny(t.categoryId);
      const acc = Store.getAccount(t.accountId);
      html += `<div class="tx-row" data-tx="${t.id}">
        <div class="tx-icon">${cat?.icon || '📦'}</div>
        <div class="tx-info">
          <div class="tx-title">${Util.escapeHtml(t.note) || cat?.name || 'Transaction'}</div>
          <div class="tx-sub">${cat?.name || ''} · ${acc?.name || ''}${t.paymentMethod ? ' · ' + t.paymentMethod : ''}${t.tags?.length ? ' · ' + t.tags.map(tg => '#' + tg).join(' ') : ''}</div>
        </div>
        <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '−'}${Util.formatCurrency(t.amount, symbol)}</div>
      </div>`;
    }
    return `<div class="tx-list">${html}</div>`;
  }

  function filterModalHtml() {
    const cats = [...Store.getState().categories.expense, ...Store.getState().categories.income];
    const accounts = Store.getState().accounts;
    return `
      <div class="modal-header"><h2>Filter Transactions</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <form id="filter-form">
        <div class="field">
          <label>Type</label>
          <select id="ff-type">
            <option value="">All</option>
            <option value="expense" ${filters.type === 'expense' ? 'selected' : ''}>Expense</option>
            <option value="income" ${filters.type === 'income' ? 'selected' : ''}>Income</option>
            <option value="transfer" ${filters.type === 'transfer' ? 'selected' : ''}>Transfer</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label>From date</label>
            <input type="date" id="ff-from" value="${filters.dateFrom}">
          </div>
          <div class="field">
            <label>To date</label>
            <input type="date" id="ff-to" value="${filters.dateTo}">
          </div>
        </div>
        <div class="field">
          <label>Category</label>
          <select id="ff-category">
            <option value="">All categories</option>
            ${cats.map(c => `<option value="${c.id}" ${filters.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Account</label>
          <select id="ff-account">
            <option value="">All accounts</option>
            ${accounts.map(a => `<option value="${a.id}" ${filters.accountId === a.id ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Min amount</label>
            <input type="number" id="ff-min" min="0" step="0.01" value="${filters.amountMin}">
          </div>
          <div class="field">
            <label>Max amount</label>
            <input type="number" id="ff-max" min="0" step="0.01" value="${filters.amountMax}">
          </div>
        </div>
        <div class="field">
          <label>Tag contains</label>
          <input type="text" id="ff-tag" placeholder="e.g. work" value="${Util.escapeHtml(filters.tag)}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="ff-reset">Reset</button>
          <button type="submit" class="btn btn-primary">Apply Filters</button>
        </div>
      </form>
    `;
  }

  function afterRender(container) {
    container.querySelector('#tx-search').addEventListener('input', Util.debounce((e) => {
      filters.keyword = e.target.value;
      App.refresh();
      // restore focus to search input after re-render
      const input = document.getElementById('tx-search');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 250));

    container.querySelectorAll('[data-tx]').forEach(row => {
      row.addEventListener('click', () => TxForm.open(row.dataset.tx));
    });

    const clearBtn = container.querySelector('#clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      filters = { keyword: filters.keyword, type: '', categoryId: '', accountId: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '', tag: '' };
      App.refresh();
    });

    container.querySelector('#open-filters').addEventListener('click', () => {
      UI.openModal(filterModalHtml());
      const root = document.getElementById('modal-root');
      root.querySelector('#filter-form').addEventListener('submit', (e) => {
        e.preventDefault();
        filters.type = root.querySelector('#ff-type').value;
        filters.dateFrom = root.querySelector('#ff-from').value;
        filters.dateTo = root.querySelector('#ff-to').value;
        filters.categoryId = root.querySelector('#ff-category').value;
        filters.accountId = root.querySelector('#ff-account').value;
        filters.amountMin = root.querySelector('#ff-min').value;
        filters.amountMax = root.querySelector('#ff-max').value;
        filters.tag = root.querySelector('#ff-tag').value.trim();
        UI.closeModal();
        App.refresh();
      });
      root.querySelector('#ff-reset').addEventListener('click', () => {
        filters = { keyword: filters.keyword, type: '', categoryId: '', accountId: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '', tag: '' };
        UI.closeModal();
        App.refresh();
      });
    });
  }

  return { render, afterRender };
})();
