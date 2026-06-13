/* ---------- First-use help: per-section tips + app overview tour ---------- */
const Help = (() => {

  const SECTIONS = [
    {
      route: 'dashboard',
      icon: '📊',
      title: 'Dashboard',
      tip: 'Your monthly snapshot — income, expenses, net total, and budget remaining. Use the quick-add bar to log something in seconds, e.g. "Lunch 120" or "+5000 salary".',
    },
    {
      route: 'transactions',
      icon: '📋',
      title: 'Transactions',
      tip: 'Every transaction, grouped by date. Search by note or tag, or tap Filters to narrow by type, category, account, date range, or amount. Tap any entry to edit or delete it.',
    },
    {
      route: 'budgets',
      icon: '🎯',
      title: 'Budgets',
      tip: 'Set a monthly limit per category (or one overall budget) and watch the progress bar — it turns yellow near your limit and red once you go over.',
    },
    {
      route: 'reports',
      icon: '📈',
      title: 'Reports',
      tip: 'Deeper insights: income vs. expense history, spending by category, daily trends, and your biggest expenses. Use the arrows to browse other months.',
    },
    {
      route: 'recurring',
      icon: '🔁',
      title: 'Recurring',
      tip: 'Set up bills and subscriptions like rent or Netflix. "Auto-add" logs them automatically when due; "Reminder" shows a dashboard prompt you can confirm or skip.',
    },
    {
      route: 'goals',
      icon: '🏆',
      title: 'Goals',
      tip: 'Set a savings target and deadline — PocketLedger works out how much to save each month and tracks your progress as you add funds.',
    },
    {
      route: 'settings',
      icon: '⚙️',
      title: 'Settings',
      tip: 'Manage accounts, categories, currency, and theme. Export a backup anytime, import one, or re-run this setup tour from the wizard.',
    },
  ];

  function bannerHtml(route) {
    const sec = SECTIONS.find(s => s.route === route);
    if (!sec || Store.hasSeenHelp(route)) return '';
    return `
      <div class="alert-banner info" data-help-banner="${sec.route}">
        <span style="font-size:1.2rem;">${sec.icon}</span>
        <span><strong>${sec.title}.</strong> ${sec.tip}</span>
        <button class="btn btn-sm" data-help-dismiss="${sec.route}">Got it</button>
      </div>
    `;
  }

  function bindBanner(container, route) {
    const btn = container.querySelector(`[data-help-dismiss="${route}"]`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      Store.markHelpSeen(route);
      const banner = container.querySelector(`[data-help-banner="${route}"]`);
      if (banner) banner.remove();
    });
  }

  function openSectionHelp(route) {
    const sec = SECTIONS.find(s => s.route === route) || SECTIONS[0];
    const html = `
      <div class="modal-header"><h2>${sec.icon} ${sec.title}</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.5;">${sec.tip}</p>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" data-close>Got it</button>
      </div>
    `;
    UI.openModal(html);
  }

  function openOverview() {
    const html = `
      <div class="modal-header"><h2>Welcome to PocketLedger 👋</h2></div>
      <p style="color:var(--text-muted);font-size:0.9rem;">Here's what each section does. You'll also see a short tip the first time you open one.</p>
      <div class="settings-list">
        ${SECTIONS.map(s => `
          <div class="settings-row">
            <span class="flex flex-gap" style="align-items:flex-start;">
              <span class="icon-pill">${s.icon}</span>
              <span>
                <div class="label">${s.title}</div>
                <div class="desc">${s.tip}</div>
              </span>
            </span>
          </div>
        `).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" id="tour-done">Got it, let's go</button>
      </div>
    `;
    UI.openModal(html, { persistent: true });
    document.getElementById('tour-done').addEventListener('click', () => {
      Store.markHelpSeen('overview');
      UI.closeModal();
    });
  }

  function maybeShowOverview() {
    if (Store.hasSeenHelp('overview')) return;
    openOverview();
  }

  return { SECTIONS, bannerHtml, bindBanner, openSectionHelp, openOverview, maybeShowOverview };
})();
