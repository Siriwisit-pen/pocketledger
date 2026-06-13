/* ---------- Dashboard view ---------- */
const DashboardView = (() => {

  function render() {
    const meta = Store.getState().meta;
    const symbol = meta.currencySymbol;
    const monthKey = Util.currentMonthKey();
    const totals = Store.monthlyTotals(monthKey);
    const budget = Store.totalBudgetRemaining(monthKey);
    const topCats = Store.topCategories(monthKey, 5);
    const recent = Store.recentTransactions(6);
    const trend = Store.dailyTrend(14);
    const pace = Store.spendingPace(monthKey);
    const reminders = App.getReminders();
    const overBudgets = Store.budgetUsage(monthKey).filter(b => b.status !== 'safe');

    const totalExpense = topCats.reduce((s, c) => s + c.amount, 0);

    return `
      ${reminders.length ? renderReminders(reminders) : ''}
      ${overBudgets.length ? renderBudgetAlert(overBudgets, symbol) : ''}

      <div class="section">
        ${TxForm.quickAddHtml()}
      </div>

      <div class="grid grid-stats section">
        <div class="card stat-card">
          <span class="stat-label">Income (this month)</span>
          <span class="stat-value income">${Util.formatCurrency(totals.income, symbol)}</span>
          <span class="stat-sub">${Util.monthLabel(monthKey)}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Expenses (this month)</span>
          <span class="stat-value expense">${Util.formatCurrency(totals.expense, symbol)}</span>
          <span class="stat-sub">${Util.monthLabel(monthKey)}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Net Balance</span>
          <span class="stat-value ${totals.net >= 0 ? 'income' : 'expense'}">${Util.formatCurrency(totals.net, symbol)}</span>
          <span class="stat-sub">Total across accounts: ${Util.formatCurrency(Store.totalBalance(), symbol)}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Budget Remaining</span>
          ${budget.hasBudget
            ? `<span class="stat-value ${budget.remaining >= 0 ? '' : 'expense'}">${Util.formatCurrency(budget.remaining, symbol)}</span>
               <span class="stat-sub">of ${Util.formatCurrency(budget.amount, symbol)} budgeted</span>`
            : `<span class="stat-value text-muted" style="font-size:1rem;">No budget set</span>
               <span class="stat-sub"><a href="#/budgets" class="link-set-budget">Set a budget →</a></span>`
          }
        </div>
      </div>

      ${renderPaceCard(pace, symbol, monthKey)}

      <div class="grid grid-2 section">
        <div class="card">
          <div class="card-title">Spending Trend (14 days)</div>
          ${Charts.line(trend.map(d => ({ label: Util.formatDateShort(d.date), value: d.expense })), { color: '#ef4444' })}
        </div>
        <div class="card">
          <div class="card-title">Top Spending Categories</div>
          ${topCats.length ? topCats.map(c => `
            <div style="margin-bottom:10px;">
              <div class="flex-between" style="font-size:0.85rem;margin-bottom:4px;">
                <span>${c.category?.icon || '📦'} ${c.category?.name || 'Unknown'}</span>
                <span style="font-weight:700;">${Util.formatCurrency(c.amount, symbol)}</span>
              </div>
              <div class="progress-track"><div class="progress-fill safe" style="width:${totalExpense ? (c.amount / totalExpense) * 100 : 0}%;background:${Charts.colorFor(topCats.indexOf(c))}"></div></div>
            </div>
          `).join('') : `<div class="empty-state"><span class="emoji">📭</span>No expenses recorded this month yet.</div>`}
        </div>
      </div>

      <div class="card section">
        <div class="card-title">Recent Transactions <a href="#/transactions" style="font-size:0.8rem;font-weight:600;color:var(--primary);text-decoration:none;">View all →</a></div>
        ${renderTxList(recent, symbol)}
      </div>
    `;
  }

  function renderTxList(list, symbol) {
    if (!list.length) {
      return `<div class="empty-state"><span class="emoji">🧾</span>No transactions yet. Use the quick-add bar above to record your first one.</div>`;
    }
    return `<div class="tx-list">${list.map(t => {
      if (t.type === 'transfer') {
        const fromAcc = Store.getAccount(t.accountId);
        const toAcc = Store.getAccount(t.toAccountId);
        return `<div class="tx-row" data-tx="${t.id}">
          <div class="tx-icon">🔁</div>
          <div class="tx-info">
            <div class="tx-title">${Util.escapeHtml(t.note) || 'Transfer'}</div>
            <div class="tx-sub">${Util.relativeDay(t.date)} · ${fromAcc?.name || '?'} → ${toAcc?.name || '?'}</div>
          </div>
          <div class="tx-amount transfer">${Util.formatCurrency(t.amount, symbol)}</div>
        </div>`;
      }
      const cat = Store.getCategoryAny(t.categoryId);
      const acc = Store.getAccount(t.accountId);
      return `<div class="tx-row" data-tx="${t.id}">
        <div class="tx-icon">${cat?.icon || '📦'}</div>
        <div class="tx-info">
          <div class="tx-title">${Util.escapeHtml(t.note) || cat?.name || 'Transaction'}</div>
          <div class="tx-sub">${Util.relativeDay(t.date)} · ${acc?.name || ''}${t.tags?.length ? ' · ' + t.tags.map(tg => '#' + tg).join(' ') : ''}</div>
        </div>
        <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '−'}${Util.formatCurrency(t.amount, symbol)}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderPaceCard(pace, symbol, monthKey) {
    const monthLabel = Util.monthLabel(monthKey);
    const remainingLabel = pace.daysRemaining === 1 ? 'today' : `the next ${pace.daysRemaining} days`;
    const elapsedLabel = pace.daysElapsed === 1 ? 'today' : `the last ${pace.daysElapsed} days`;

    if (!pace.hasBudget) {
      return `
        <div class="card section pace-card">
          <div class="card-title"><span>🚦 Daily Spending Pace</span></div>
          <div class="pace-grid">
            <div class="pace-item">
              <span class="pace-label">Your average</span>
              <span class="pace-value">${Util.formatCurrency(pace.avgDailySpend, symbol)}<small>/day</small></span>
              <span class="pace-sub">over ${elapsedLabel}</span>
            </div>
            <div class="pace-item">
              <span class="pace-label">Projected total</span>
              <span class="pace-value">${Util.formatCurrency(pace.projectedTotal, symbol)}</span>
              <span class="pace-sub">by end of ${monthLabel}</span>
            </div>
          </div>
          <div class="pace-message">💡 <a href="#/budgets">Set a monthly budget</a> to see how today's spending compares to your target pace.</div>
        </div>
      `;
    }

    const safeToSpend = Math.max(pace.recommendedDailyPace, 0);
    const badgeLabel = { safe: 'On Track', warning: 'Over Pace', exceeded: 'Budget Used' }[pace.status];

    let message;
    if (pace.status === 'exceeded') {
      message = `🚫 You've used your full ${Util.formatCurrency(pace.budgetAmount, symbol)} budget for ${monthLabel}. Anything extra will cut into next month.`;
    } else if (pace.status === 'warning') {
      message = `📈 At this rate, you're on track to go about ${Util.formatCurrency(Math.abs(pace.projectedSurplus), symbol)} over budget by month end. Try to keep it under ${Util.formatCurrency(safeToSpend, symbol)}/day for the rest of the month.`;
    } else {
      message = `✅ Nice pace! At this rate, you'll finish ${monthLabel} with about ${Util.formatCurrency(pace.projectedSurplus, symbol)} left over.`;
    }

    return `
      <div class="card section pace-card">
        <div class="card-title">
          <span>🚦 Daily Spending Pace</span>
          <span class="badge ${pace.status}">${badgeLabel}</span>
        </div>
        <div class="pace-grid">
          <div class="pace-item">
            <span class="pace-label">Safe to spend</span>
            <span class="pace-value">${Util.formatCurrency(safeToSpend, symbol)}<small>/day</small></span>
            <span class="pace-sub">${pace.status === 'exceeded' ? `budget for ${monthLabel} is used up` : `for ${remainingLabel}`}</span>
          </div>
          <div class="pace-item">
            <span class="pace-label">Your average</span>
            <span class="pace-value">${Util.formatCurrency(pace.avgDailySpend, symbol)}<small>/day</small></span>
            <span class="pace-sub">over ${elapsedLabel}</span>
          </div>
        </div>
        <div class="pace-message ${pace.status}">${message}</div>
      </div>
    `;
  }

  function renderReminders(reminders) {
    return reminders.map(r => `
      <div class="alert-banner">
        <span>🔁 <b>${Util.escapeHtml(r.recurring.note || Store.getCategoryAny(r.recurring.categoryId)?.name || 'Recurring payment')}</b> of ${Util.formatCurrency(r.recurring.amount, Store.getState().meta.currencySymbol)} was due ${Util.formatDateShort(r.dueDate)}</span>
        <button class="btn btn-sm btn-primary" data-confirm-reminder="${r.recurring.id}" data-due="${r.dueDate}">Add</button>
        <button class="btn btn-sm" data-skip-reminder="${r.recurring.id}" data-due="${r.dueDate}">Skip</button>
      </div>
    `).join('');
  }

  function renderBudgetAlert(overBudgets, symbol) {
    const exceeded = overBudgets.filter(b => b.status === 'exceeded');
    const warning = overBudgets.filter(b => b.status === 'warning');
    let parts = [];
    if (exceeded.length) parts.push(`${exceeded.length} budget${exceeded.length > 1 ? 's' : ''} exceeded`);
    if (warning.length) parts.push(`${warning.length} nearing limit`);
    const cls = exceeded.length ? 'danger' : '';
    return `<div class="alert-banner ${cls}">
      <span>⚠️ ${parts.join(', ')}: ${overBudgets.map(b => `${b.category?.icon || '🎯'} ${b.category?.name || 'Overall'} (${Math.round(b.pct)}%)`).join(', ')}</span>
      <a href="#/budgets" class="btn btn-sm">View</a>
    </div>`;
  }

  function afterRender(container) {
    TxForm.bindQuickAdd(container);

    container.querySelectorAll('[data-tx]').forEach(row => {
      row.addEventListener('click', () => TxForm.open(row.dataset.tx));
    });

    container.querySelectorAll('[data-confirm-reminder]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.confirmReminder(btn.dataset.confirmReminder, btn.dataset.due);
        UI.toast('Recorded');
        App.refreshReminders();
        App.refresh();
      });
    });
    container.querySelectorAll('[data-skip-reminder]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.skipReminder(btn.dataset.skipReminder, btn.dataset.due);
        UI.toast('Skipped');
        App.refreshReminders();
        App.refresh();
      });
    });

    container.querySelectorAll('a[href^="#/"]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        App.navigate(a.getAttribute('href').slice(2));
      });
    });
  }

  return { render, afterRender, renderTxList };
})();
