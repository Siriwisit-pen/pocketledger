/* ---------- Reports & Analytics view ---------- */
const ReportsView = (() => {

  let selectedMonth = Util.currentMonthKey();

  function render() {
    const symbol = Store.getState().meta.currencySymbol;
    const totals = Store.monthlyTotals(selectedMonth);
    const prevKey = Util.shiftMonthKey(selectedMonth, -1);
    const prevTotals = Store.monthlyTotals(prevKey);
    const avgDaily = Store.averageDailySpend(selectedMonth);
    const catSpend = Store.categorySpend(selectedMonth, 'expense');
    const history = Store.monthlyHistory(6);
    const trend = Store.dailyTrend(30);
    const highest = Store.highestExpenses(selectedMonth, 5);
    const sub = Store.subscriptionSummary();

    const expenseDelta = prevTotals.expense ? ((totals.expense - prevTotals.expense) / prevTotals.expense) * 100 : null;

    return `
      <div class="flex-between section">
        <button class="btn btn-icon" id="month-prev">‹</button>
        <span style="font-weight:700;">${Util.monthLabel(selectedMonth)}</span>
        <button class="btn btn-icon" id="month-next" ${selectedMonth >= Util.currentMonthKey() ? 'disabled' : ''}>›</button>
      </div>

      <div class="grid grid-stats section">
        <div class="card stat-card">
          <span class="stat-label">Total Income</span>
          <span class="stat-value income">${Util.formatCurrency(totals.income, symbol)}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Total Expense</span>
          <span class="stat-value expense">${Util.formatCurrency(totals.expense, symbol)}</span>
          ${expenseDelta !== null ? `<span class="stat-sub">${expenseDelta >= 0 ? '▲' : '▼'} ${Math.abs(expenseDelta).toFixed(1)}% vs last month</span>` : ''}
        </div>
        <div class="card stat-card">
          <span class="stat-label">Net</span>
          <span class="stat-value ${totals.net >= 0 ? 'income' : 'expense'}">${Util.formatCurrency(totals.net, symbol)}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Avg Daily Spend</span>
          <span class="stat-value">${Util.formatCurrency(avgDaily, symbol)}</span>
        </div>
      </div>

      <div class="grid grid-2 section">
        <div class="card">
          <div class="card-title">Income vs Expense (6 months)</div>
          ${Charts.dualBars(history.map(h => ({ label: h.label.split(' ')[0], a: h.income, b: h.expense })), { colorA: '#16a34a', colorB: '#dc2626', labelA: 'Income', labelB: 'Expense' })}
        </div>
        <div class="card">
          <div class="card-title">Spending by Category</div>
          ${catSpend.length ? Charts.pieWithLegend(catSpend.map((c, i) => ({ label: c.category?.name || 'Unknown', value: c.amount, color: Charts.colorFor(i) }))) : `<div class="empty-state"><span class="emoji">📭</span>No expenses this month.</div>`}
        </div>
      </div>

      <div class="card section">
        <div class="card-title">Spending Trend (30 days)</div>
        ${Charts.line(trend.map(d => ({ label: Util.formatDateShort(d.date), value: d.expense })), { color: '#ef4444', height: 180 })}
      </div>

      <div class="grid grid-2 section">
        <div class="card">
          <div class="card-title">This Month vs Last Month</div>
          ${Charts.dualBars([
            { label: Util.monthLabel(prevKey).split(' ')[0], a: prevTotals.income, b: prevTotals.expense },
            { label: Util.monthLabel(selectedMonth).split(' ')[0], a: totals.income, b: totals.expense },
          ], { colorA: '#16a34a', colorB: '#dc2626', labelA: 'Income', labelB: 'Expense' })}
        </div>
        <div class="card">
          <div class="card-title">Subscription Cost Summary</div>
          <div class="stat-value expense">${Util.formatCurrency(sub.total, symbol)}<span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);"> /month</span></div>
          <div class="legend" style="margin-top:10px;">
            ${sub.items.length ? sub.items.map(r => {
              const cat = Store.getCategoryAny(r.categoryId);
              return `<div class="legend-row">
                <span class="legend-name">${cat?.icon || '🔁'} ${Util.escapeHtml(r.note) || cat?.name || 'Recurring'}</span>
                <span class="legend-value">${Util.formatCurrency(Store.monthlyEquivalent(r), symbol)}</span>
              </div>`;
            }).join('') : `<span class="text-muted" style="font-size:0.85rem;">No recurring expenses set up.</span>`}
          </div>
        </div>
      </div>

      <div class="card section">
        <div class="card-title">Highest Expenses (${Util.monthLabel(selectedMonth)})</div>
        ${highest.length ? `<div class="tx-list">${highest.map(t => {
          const cat = Store.getCategoryAny(t.categoryId);
          return `<div class="tx-row" data-tx="${t.id}">
            <div class="tx-icon">${cat?.icon || '📦'}</div>
            <div class="tx-info">
              <div class="tx-title">${Util.escapeHtml(t.note) || cat?.name || 'Transaction'}</div>
              <div class="tx-sub">${Util.formatDate(t.date)} · ${cat?.name || ''}</div>
            </div>
            <div class="tx-amount expense">−${Util.formatCurrency(t.amount, symbol)}</div>
          </div>`;
        }).join('')}</div>` : `<div class="empty-state"><span class="emoji">📭</span>No expenses recorded.</div>`}
      </div>
    `;
  }

  function afterRender(container) {
    container.querySelector('#month-prev').addEventListener('click', () => {
      selectedMonth = Util.shiftMonthKey(selectedMonth, -1);
      App.refresh();
    });
    container.querySelector('#month-next').addEventListener('click', () => {
      if (selectedMonth >= Util.currentMonthKey()) return;
      selectedMonth = Util.shiftMonthKey(selectedMonth, 1);
      App.refresh();
    });
    container.querySelectorAll('[data-tx]').forEach(row => {
      row.addEventListener('click', () => TxForm.open(row.dataset.tx));
    });
  }

  return { render, afterRender };
})();
