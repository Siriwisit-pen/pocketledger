/* ---------- Data layer: localStorage-backed store ---------- */
const Store = (() => {
  const STORAGE_KEY = 'pocketledger_data_v1';
  let state = null;

  function defaultState() {
    return {
      meta: {
        version: 1,
        currency: 'THB',
        currencySymbol: '฿',
        setupDone: false,
        theme: 'light',
        lastUsedAccountId: null,
        warningThreshold: 0.8,
        helpSeen: {},
        lastBackupAt: null,
      },
      accounts: [
        { id: Util.uid('acc'), name: 'Cash', type: 'cash', icon: '💵', initialBalance: 0, createdAt: Util.todayISO() },
      ],
      categories: {
        expense: [
          { id: Util.uid('cat'), name: 'Food', icon: '🍔' },
          { id: Util.uid('cat'), name: 'Transportation', icon: '🚌' },
          { id: Util.uid('cat'), name: 'Rent', icon: '🏠' },
          { id: Util.uid('cat'), name: 'Shopping', icon: '🛍️' },
          { id: Util.uid('cat'), name: 'Subscriptions', icon: '📱' },
          { id: Util.uid('cat'), name: 'Health', icon: '💊' },
          { id: Util.uid('cat'), name: 'Education', icon: '📚' },
          { id: Util.uid('cat'), name: 'Entertainment', icon: '🎮' },
          { id: Util.uid('cat'), name: 'Other', icon: '📦' },
        ],
        income: [
          { id: Util.uid('cat'), name: 'Salary', icon: '💼' },
          { id: Util.uid('cat'), name: 'Freelance', icon: '💻' },
          { id: Util.uid('cat'), name: 'Investment', icon: '📈' },
          { id: Util.uid('cat'), name: 'Gifts', icon: '🎁' },
          { id: Util.uid('cat'), name: 'Other', icon: '💰' },
        ],
      },
      transactions: [],
      budgets: [],
      recurring: [],
      goals: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        // backfill any missing fields for forward-compatibility
        const def = defaultState();
        state.meta = Object.assign({}, def.meta, state.meta);
        if (!state.accounts) state.accounts = def.accounts;
        if (!state.categories) state.categories = def.categories;
        if (!state.transactions) state.transactions = [];
        if (!state.budgets) state.budgets = [];
        if (!state.recurring) state.recurring = [];
        if (!state.goals) state.goals = [];
        for (const b of state.budgets) {
          if (!b.createdAt) b.createdAt = Util.todayISO();
          if (b.rollover == null) b.rollover = false;
        }
      } else {
        state = defaultState();
      }
    } catch (e) {
      console.error('Failed to load data, resetting.', e);
      state = defaultState();
    }
    return state;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getState() { return state; }

  /* ---------- Meta ---------- */
  function setMeta(patch) {
    Object.assign(state.meta, patch);
    save();
  }

  /* ---------- First-use help ---------- */
  function hasSeenHelp(key) {
    return !!(state.meta.helpSeen && state.meta.helpSeen[key]);
  }
  function markHelpSeen(key) {
    if (!state.meta.helpSeen) state.meta.helpSeen = {};
    state.meta.helpSeen[key] = true;
    save();
  }

  /* ---------- Backup tracking ---------- */
  function markBackedUp() {
    state.meta.lastBackupAt = new Date().toISOString();
    save();
  }
  function daysSinceBackup() {
    if (!state.meta.lastBackupAt) return null;
    const then = new Date(state.meta.lastBackupAt).getTime();
    if (isNaN(then)) return null;
    return Math.floor((Date.now() - then) / 86400000);
  }
  function needsBackupReminder() {
    if (!state.meta.setupDone) return false;
    if (!state.transactions || state.transactions.length === 0) return false;
    const days = daysSinceBackup();
    return days === null || days >= 7;
  }

  /* ---------- Accounts ---------- */
  function addAccount(acc) {
    const item = { id: Util.uid('acc'), initialBalance: 0, icon: '💳', createdAt: Util.todayISO(), ...acc };
    state.accounts.push(item);
    save();
    return item;
  }
  function updateAccount(id, patch) {
    const a = state.accounts.find(x => x.id === id);
    if (a) Object.assign(a, patch);
    save();
  }
  function deleteAccount(id) {
    if (state.accounts.length <= 1) return false;
    state.accounts = state.accounts.filter(a => a.id !== id);
    state.transactions = state.transactions.filter(t => t.accountId !== id && t.toAccountId !== id);
    save();
    return true;
  }
  function getAccount(id) {
    return state.accounts.find(a => a.id === id);
  }
  function accountBalance(id) {
    const acc = getAccount(id);
    if (!acc) return 0;
    let bal = acc.initialBalance || 0;
    for (const t of state.transactions) {
      if (t.type === 'transfer') {
        if (t.accountId === id) bal -= t.amount;
        if (t.toAccountId === id) bal += t.amount;
        continue;
      }
      if (t.accountId !== id) continue;
      bal += t.type === 'income' ? t.amount : -t.amount;
    }
    return bal;
  }
  function totalBalance() {
    return state.accounts.reduce((sum, a) => sum + accountBalance(a.id), 0);
  }

  /* ---------- Categories ---------- */
  function addCategory(type, cat) {
    const item = { id: Util.uid('cat'), icon: '🏷️', ...cat };
    state.categories[type].push(item);
    save();
    return item;
  }
  function updateCategory(type, id, patch) {
    const c = state.categories[type].find(x => x.id === id);
    if (c) Object.assign(c, patch);
    save();
  }
  function deleteCategory(type, id) {
    state.categories[type] = state.categories[type].filter(c => c.id !== id);
    save();
  }
  function getCategory(type, id) {
    return (state.categories[type] || []).find(c => c.id === id);
  }
  function getCategoryAny(id) {
    return getCategory('expense', id) || getCategory('income', id);
  }

  /* ---------- Transactions ---------- */
  function addTransaction(tx) {
    const item = {
      id: Util.uid('tx'),
      type: 'expense',
      amount: 0,
      date: Util.todayISO(),
      categoryId: null,
      accountId: state.meta.lastUsedAccountId || (state.accounts[0] && state.accounts[0].id),
      paymentMethod: '',
      note: '',
      tags: [],
      receipt: null,
      recurringId: null,
      createdAt: new Date().toISOString(),
      ...tx,
    };
    state.transactions.unshift(item);
    state.meta.lastUsedAccountId = item.accountId;
    save();
    return item;
  }
  function updateTransaction(id, patch) {
    const t = state.transactions.find(x => x.id === id);
    if (t) Object.assign(t, patch);
    save();
    return t;
  }
  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    save();
  }
  function getTransaction(id) {
    return state.transactions.find(t => t.id === id);
  }

  function filterTransactions(filters = {}) {
    return state.transactions.filter(t => {
      if (filters.type && t.type !== filters.type) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (filters.accountId && t.accountId !== filters.accountId) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      if (filters.amountMin != null && filters.amountMin !== '' && t.amount < Number(filters.amountMin)) return false;
      if (filters.amountMax != null && filters.amountMax !== '' && t.amount > Number(filters.amountMax)) return false;
      if (filters.tag) {
        const tagLower = filters.tag.toLowerCase();
        if (!(t.tags || []).some(tag => tag.toLowerCase().includes(tagLower))) return false;
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const hay = `${t.note || ''} ${(t.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    }).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }

  function transactionsForMonth(monthKey, type) {
    return state.transactions.filter(t => Util.monthKey(t.date) === monthKey && (!type || t.type === type));
  }

  /* ---------- Computed: dashboard / reports ---------- */
  function monthlyTotals(monthKey) {
    let income = 0, expense = 0;
    for (const t of transactionsForMonth(monthKey)) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }

  function categorySpend(monthKey, type = 'expense') {
    const map = {};
    for (const t of transactionsForMonth(monthKey, type)) {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([categoryId, amount]) => ({ categoryId, amount, category: getCategoryAny(categoryId) }))
      .sort((a, b) => b.amount - a.amount);
  }

  function topCategories(monthKey, n = 5) {
    return categorySpend(monthKey, 'expense').slice(0, n);
  }

  function dailyTrend(days = 14) {
    const result = [];
    const today = Util.parseISODate(Util.todayISO());
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = Util.toISODate(d);
      let income = 0, expense = 0;
      for (const t of state.transactions) {
        if (t.date !== dateStr) continue;
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expense += t.amount;
      }
      result.push({ date: dateStr, income, expense });
    }
    return result;
  }

  function recentTransactions(n = 5) {
    return [...state.transactions]
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))
      .slice(0, n);
  }

  function monthlyHistory(months = 6) {
    const result = [];
    let key = Util.currentMonthKey();
    for (let i = 0; i < months; i++) {
      result.unshift({ key, label: Util.monthLabel(key), ...monthlyTotals(key) });
      key = Util.shiftMonthKey(key, -1);
    }
    return result;
  }

  function averageDailySpend(monthKey) {
    const { expense } = monthlyTotals(monthKey);
    const elapsed = Util.daysElapsedInMonth(monthKey) || 1;
    return expense / elapsed;
  }

  // Daily budget pace: how much is safe to spend per day for the rest of
  // the month, how the user is actually trending, and a month-end forecast.
  function spendingPace(monthKey) {
    const totalDays = Util.daysInMonth(monthKey);
    const daysElapsed = Util.daysElapsedInMonth(monthKey) || 1;
    const daysRemaining = totalDays - daysElapsed + 1; // includes today, always >= 1

    const avgDailySpend = averageDailySpend(monthKey);
    const projectedTotal = avgDailySpend * totalDays;
    const budget = totalBudgetRemaining(monthKey);

    const result = {
      totalDays, daysElapsed, daysRemaining,
      avgDailySpend, projectedTotal,
      hasBudget: budget.hasBudget,
    };

    if (budget.hasBudget) {
      result.budgetAmount = budget.amount;
      result.budgetRemaining = budget.remaining;
      result.recommendedDailyPace = budget.remaining / daysRemaining;
      result.projectedSurplus = budget.amount - projectedTotal;
      result.status = budget.remaining <= 0
        ? 'exceeded'
        : (avgDailySpend > result.recommendedDailyPace ? 'warning' : 'safe');
    }

    return result;
  }

  function highestExpenses(monthKey, n = 5) {
    return transactionsForMonth(monthKey, 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, n);
  }

  /* ---------- Budgets ---------- */
  function setBudget(categoryId, amount, rollover = false) {
    let b = state.budgets.find(x => x.categoryId === categoryId);
    if (!b) {
      b = { id: Util.uid('bud'), categoryId, amount: 0, period: 'monthly', createdAt: Util.todayISO(), rollover: false };
      state.budgets.push(b);
    }
    b.amount = amount;
    b.rollover = rollover;
    save();
    return b;
  }
  function deleteBudget(categoryId) {
    state.budgets = state.budgets.filter(b => b.categoryId !== categoryId);
    save();
  }
  function getBudget(categoryId) {
    return state.budgets.find(b => b.categoryId === categoryId);
  }

  function budgetStatus(spent, amount) {
    const pct = amount > 0 ? (spent / amount) * 100 : 0;
    let status = 'safe';
    if (pct >= 100) status = 'exceeded';
    else if (pct >= (state.meta.warningThreshold || 0.8) * 100) status = 'warning';
    return { pct: Util.clamp(pct, 0, 999), status };
  }

  function spentForBudget(b, monthKey) {
    if (b.categoryId === 'GLOBAL') return monthlyTotals(monthKey).expense;
    return categorySpend(monthKey, 'expense').find(r => r.categoryId === b.categoryId)?.amount || 0;
  }

  // Cumulative leftover (amount - spent) for every month from a budget's
  // creation up to (but excluding) monthKey, summed together.
  function budgetRolloverAmount(b, monthKey) {
    if (!b.rollover) return 0;
    let cumulative = 0;
    let key = Util.monthKey(b.createdAt || Util.todayISO());
    let guard = 0;
    while (key < monthKey && guard < 60) {
      cumulative += b.amount - spentForBudget(b, key);
      key = Util.shiftMonthKey(key, 1);
      guard++;
    }
    return cumulative;
  }

  function budgetUsage(monthKey) {
    const spendMap = {};
    for (const row of categorySpend(monthKey, 'expense')) {
      spendMap[row.categoryId] = row.amount;
    }
    return state.budgets.map(b => {
      const spent = b.categoryId === 'GLOBAL'
        ? Object.values(spendMap).reduce((s, v) => s + v, 0)
        : (spendMap[b.categoryId] || 0);
      const rolloverAmount = budgetRolloverAmount(b, monthKey);
      const effectiveAmount = b.amount + rolloverAmount;
      const { pct, status } = budgetStatus(spent, effectiveAmount);
      const category = b.categoryId === 'GLOBAL' ? null : getCategoryAny(b.categoryId);
      return {
        ...b,
        category,
        spent,
        rolloverAmount,
        effectiveAmount,
        remaining: effectiveAmount - spent,
        pct,
        status,
      };
    }).sort((a, b) => {
      if (a.categoryId === 'GLOBAL') return -1;
      if (b.categoryId === 'GLOBAL') return 1;
      return (b.category?.name || '').localeCompare ? (a.category?.name || '').localeCompare(b.category?.name || '') : 0;
    });
  }

  function totalBudgetRemaining(monthKey) {
    const global = state.budgets.find(b => b.categoryId === 'GLOBAL');
    const { expense } = monthlyTotals(monthKey);
    if (global) {
      const amount = global.amount + budgetRolloverAmount(global, monthKey);
      return { amount, remaining: amount - expense, hasBudget: true };
    }
    const catBudgets = state.budgets.filter(b => b.categoryId !== 'GLOBAL');
    const sumCat = catBudgets.reduce((s, b) => s + b.amount + budgetRolloverAmount(b, monthKey), 0);
    if (sumCat > 0) {
      return { amount: sumCat, remaining: sumCat - expense, hasBudget: true };
    }
    return { amount: 0, remaining: 0, hasBudget: false };
  }

  /* ---------- Recurring ---------- */
  function addRecurring(rec) {
    const item = {
      id: Util.uid('rec'),
      type: 'expense',
      amount: 0,
      categoryId: null,
      accountId: state.accounts[0]?.id,
      paymentMethod: '',
      note: '',
      tags: [],
      frequency: 'monthly',
      startDate: Util.todayISO(),
      endDate: null,
      mode: 'auto',
      lastProcessed: null,
      active: true,
      ...rec,
    };
    state.recurring.push(item);
    save();
    return item;
  }
  function updateRecurring(id, patch) {
    const r = state.recurring.find(x => x.id === id);
    if (r) Object.assign(r, patch);
    save();
  }
  function deleteRecurring(id) {
    state.recurring = state.recurring.filter(r => r.id !== id);
    save();
  }
  function getRecurring(id) {
    return state.recurring.find(r => r.id === id);
  }

  function addInterval(dateStr, frequency) {
    const d = Util.parseISODate(dateStr);
    switch (frequency) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    }
    return Util.toISODate(d);
  }

  // Returns the next due date (first occurrence not yet processed)
  function nextDueDate(rec) {
    let due = rec.lastProcessed ? addInterval(rec.lastProcessed, rec.frequency) : rec.startDate;
    if (due < rec.startDate) due = rec.startDate;
    return due;
  }

  // Run on app load: auto-create due transactions, return list of pending reminders
  function processRecurring() {
    const today = Util.todayISO();
    const reminders = [];
    for (const rec of state.recurring) {
      if (!rec.active) continue;
      if (rec.startDate > today) continue;

      if (rec.mode === 'auto') {
        let safety = 0;
        while (true) {
          const due = nextDueDate(rec);
          if (due > today) break;
          if (rec.endDate && due > rec.endDate) break;
          createRecurringTransaction(rec, due);
          rec.lastProcessed = due;
          safety++;
          if (safety > 60) break; // safety cap
        }
      } else {
        const due = nextDueDate(rec);
        if (due <= today && (!rec.endDate || due <= rec.endDate)) {
          reminders.push({ recurring: rec, dueDate: due });
        }
      }
    }
    save();
    return reminders;
  }

  function createRecurringTransaction(rec, dateStr) {
    const item = {
      id: Util.uid('tx'),
      type: rec.type,
      amount: rec.amount,
      date: dateStr,
      categoryId: rec.categoryId,
      accountId: rec.accountId,
      paymentMethod: rec.paymentMethod,
      note: rec.note,
      tags: rec.tags || [],
      receipt: null,
      recurringId: rec.id,
      createdAt: new Date().toISOString(),
    };
    state.transactions.unshift(item);
    return item;
  }

  function confirmReminder(recId, dueDate) {
    const rec = getRecurring(recId);
    if (!rec) return;
    createRecurringTransaction(rec, dueDate);
    rec.lastProcessed = dueDate;
    save();
  }
  function skipReminder(recId, dueDate) {
    const rec = getRecurring(recId);
    if (!rec) return;
    rec.lastProcessed = dueDate;
    save();
  }

  function monthlyEquivalent(rec) {
    switch (rec.frequency) {
      case 'daily': return rec.amount * 30.44;
      case 'weekly': return rec.amount * 4.345;
      case 'monthly': return rec.amount;
      case 'yearly': return rec.amount / 12;
      default: return rec.amount;
    }
  }

  function subscriptionSummary() {
    const active = state.recurring.filter(r => r.active && r.type === 'expense');
    const total = active.reduce((s, r) => s + monthlyEquivalent(r), 0);
    return { items: active, total };
  }

  /* ---------- Goals ---------- */
  function addGoal(goal) {
    const item = {
      id: Util.uid('goal'),
      name: '',
      target: 0,
      saved: 0,
      deadline: null,
      createdAt: Util.todayISO(),
      ...goal,
    };
    state.goals.push(item);
    save();
    return item;
  }
  function updateGoal(id, patch) {
    const g = state.goals.find(x => x.id === id);
    if (g) Object.assign(g, patch);
    save();
  }
  function deleteGoal(id) {
    state.goals = state.goals.filter(g => g.id !== id);
    save();
  }
  function addToGoalSaved(id, amount) {
    const g = state.goals.find(x => x.id === id);
    if (g) g.saved = Math.max(0, (g.saved || 0) + amount);
    save();
    return g;
  }
  function goalRecommendedMonthly(goal) {
    if (!goal.deadline) return null;
    const today = Util.parseISODate(Util.todayISO());
    const deadline = Util.parseISODate(goal.deadline);
    const months = Math.max(1, (deadline.getFullYear() - today.getFullYear()) * 12 + (deadline.getMonth() - today.getMonth()));
    const remaining = Math.max(0, goal.target - (goal.saved || 0));
    return remaining / months;
  }
  function goalRecommendedDaily(goal) {
    if (!goal.deadline) return null;
    const today = Util.parseISODate(Util.todayISO());
    const deadline = Util.parseISODate(goal.deadline);
    const days = Math.max(1, Math.round((deadline - today) / 86400000));
    const remaining = Math.max(0, goal.target - (goal.saved || 0));
    return remaining / days;
  }

  /* ---------- History helper for category suggestions ---------- */
  function transactionHistory() {
    return state.transactions.map(t => ({ note: t.note, categoryId: t.categoryId, type: t.type }));
  }

  /* ---------- Import / Export / Reset ---------- */
  function exportData() {
    return JSON.stringify(state, null, 2);
  }
  function importData(json) {
    const parsed = JSON.parse(json);
    if (!parsed || !parsed.accounts || !parsed.categories) throw new Error('Invalid backup file');
    state = parsed;
    if (!state.meta) state.meta = {};
    // A current backup file demonstrably exists (the one just imported), so reset the reminder clock.
    state.meta.lastBackupAt = new Date().toISOString();
    save();
  }
  function resetAll() {
    state = defaultState();
    save();
  }
  function exportCSV() {
    const rows = [['Date', 'Type', 'Category', 'Account', 'To Account', 'Amount', 'Payment Method', 'Note', 'Tags']];
    for (const t of [...state.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
      rows.push([
        t.date,
        t.type,
        getCategoryAny(t.categoryId)?.name || '',
        getAccount(t.accountId)?.name || '',
        t.type === 'transfer' ? (getAccount(t.toAccountId)?.name || '') : '',
        t.amount,
        t.paymentMethod || '',
        t.note || '',
        (t.tags || []).join(' '),
      ]);
    }
    return rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
  }

  return {
    load, save, getState,
    setMeta, hasSeenHelp, markHelpSeen,
    markBackedUp, daysSinceBackup, needsBackupReminder,
    addAccount, updateAccount, deleteAccount, getAccount, accountBalance, totalBalance,
    addCategory, updateCategory, deleteCategory, getCategory, getCategoryAny,
    addTransaction, updateTransaction, deleteTransaction, getTransaction, filterTransactions, transactionsForMonth,
    monthlyTotals, categorySpend, topCategories, dailyTrend, recentTransactions, monthlyHistory, averageDailySpend, highestExpenses, spendingPace,
    setBudget, deleteBudget, getBudget, budgetUsage, budgetStatus, totalBudgetRemaining, budgetRolloverAmount,
    addRecurring, updateRecurring, deleteRecurring, getRecurring, processRecurring, nextDueDate, addInterval,
    confirmReminder, skipReminder, monthlyEquivalent, subscriptionSummary,
    addGoal, updateGoal, deleteGoal, addToGoalSaved, goalRecommendedMonthly, goalRecommendedDaily,
    transactionHistory,
    exportData, importData, resetAll, exportCSV,
  };
})();
