/* ---------- App router & bootstrap ---------- */
const App = (() => {

  const VERSION = '1.0.0';

  const VIEWS = {
    dashboard: { title: 'Dashboard', module: () => DashboardView },
    transactions: { title: 'Transactions', module: () => TransactionsView },
    budgets: { title: 'Budgets', module: () => BudgetsView },
    recurring: { title: 'Recurring', module: () => RecurringView },
    reports: { title: 'Reports', module: () => ReportsView },
    goals: { title: 'Goals', module: () => GoalsView },
    settings: { title: 'Settings', module: () => SettingsView },
  };

  let currentRoute = 'dashboard';
  let reminders = [];

  function init() {
    Store.load();
    applyTheme();
    reminders = Store.processRecurring();

    window.addEventListener('hashchange', routeFromHash);
    document.getElementById('sidebar-add').addEventListener('click', () => TxForm.open());
    document.getElementById('fab').addEventListener('click', () => TxForm.open());
    document.getElementById('help-btn').addEventListener('click', () => Help.openSectionHelp(currentRoute));

    routeFromHash();

    if (!Store.getState().meta.setupDone) {
      setTimeout(() => Wizard.start(), 300);
    } else {
      setTimeout(() => Help.maybeShowOverview(), 300);
      setTimeout(maybeRemindBackup, 1400);
    }
  }

  function maybeRemindBackup() {
    if (!Store.needsBackupReminder()) return;
    UI.actionToast('Back up your data — it only lives on this device.', 'Export', () => {
      UI.downloadFile(`pocketledger-backup-${Util.todayISO()}.json`, Store.exportData(), 'application/json');
      Store.markBackedUp();
      UI.toast('Backup exported');
      if (currentRoute === 'settings') render();
    });
  }

  function routeFromHash() {
    const hash = location.hash.replace('#/', '').replace('#', '');
    const route = VIEWS[hash] ? hash : 'dashboard';
    currentRoute = route;
    render();
  }

  function navigate(route) {
    if (!VIEWS[route]) route = 'dashboard';
    if (location.hash.replace('#/', '').replace('#', '') === route) {
      render();
    } else {
      location.hash = `/${route}`;
    }
  }

  function render() {
    const view = VIEWS[currentRoute];
    document.getElementById('page-title').textContent = view.title;
    UI.renderNav(currentRoute);
    const container = document.getElementById('view');
    const mod = view.module();
    container.innerHTML = mod.render();
    if (mod.afterRender) mod.afterRender(container);

    const banner = Help.bannerHtml(currentRoute);
    if (banner) {
      container.insertAdjacentHTML('afterbegin', banner);
      Help.bindBanner(container, currentRoute);
    }

    window.scrollTo(0, 0);
  }

  function refresh() {
    render();
  }

  function applyTheme() {
    const theme = Store.getState().meta.theme || 'light';
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function getReminders() {
    return reminders;
  }
  function refreshReminders() {
    reminders = Store.processRecurring();
  }

  return { init, navigate, refresh, applyTheme, getReminders, refreshReminders, VERSION };
})();

document.addEventListener('DOMContentLoaded', App.init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            UI.actionToast('A new version of PocketLedger is available.', 'Refresh', () => location.reload());
          }
        });
      });
    }).catch(() => {});
  });
}
