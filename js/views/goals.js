/* ---------- Savings Goals view ---------- */
const GoalsView = (() => {

  function render() {
    const symbol = Store.getState().meta.currencySymbol;
    const goals = Store.getState().goals;

    return `
      <div class="flex-between section">
        <span class="text-muted" style="font-size:0.85rem;">Set targets and track your progress</span>
        <button class="btn btn-primary" id="add-goal">＋ Add Goal</button>
      </div>

      ${goals.length ? `<div class="grid grid-cols-2">${goals.map(g => goalCard(g, symbol)).join('')}</div>` : `
        <div class="card empty-state"><span class="emoji">🏆</span>No savings goals yet. Add one — like an emergency fund or vacation — to stay motivated.</div>
      `}
    `;
  }

  function goalCard(g, symbol) {
    const pct = g.target > 0 ? Util.clamp((g.saved / g.target) * 100, 0, 100) : 0;
    const recommended = Store.goalRecommendedMonthly(g);
    const recommendedDaily = Store.goalRecommendedDaily(g);
    const status = pct >= 100 ? 'safe' : (pct >= 80 ? 'warning' : 'safe');
    return `
      <div class="card goal-card" data-goal="${g.id}">
        <div class="goal-head">
          <div>
            <div class="goal-name">🎯 ${Util.escapeHtml(g.name)}</div>
            ${g.deadline ? `<div class="goal-deadline">Target date: ${Util.formatDate(g.deadline)}</div>` : `<div class="goal-deadline">No deadline set</div>`}
          </div>
          <span class="badge ${pct >= 100 ? 'safe' : 'warning'}">${pct >= 100 ? 'Reached' : Math.round(pct) + '%'}</span>
        </div>
        <div class="progress-track"><div class="progress-fill ${pct >= 100 ? 'safe' : 'safe'}" style="width:${pct}%"></div></div>
        <div class="goal-amounts">
          <span class="saved">${Util.formatCurrency(g.saved, symbol)}</span>
          <span class="text-muted">of ${Util.formatCurrency(g.target, symbol)}</span>
        </div>
        ${recommended != null ? `<div class="stat-sub">Recommended saving: <b>${Util.formatCurrency(recommended, symbol)}/month</b>${recommendedDaily != null ? ` (≈ ${Util.formatCurrency(recommendedDaily, symbol)}/day)` : ''} to reach your goal on time</div>` : ''}
        <div class="flex flex-gap">
          <button class="btn btn-sm btn-primary" data-add-funds="${g.id}" style="flex:1;">＋ Add Funds</button>
          <button class="btn btn-sm" data-edit-goal="${g.id}" style="flex:1;">Edit</button>
        </div>
      </div>
    `;
  }

  function openModal(goalId) {
    const existing = goalId ? Store.getState().goals.find(g => g.id === goalId) : null;
    const data = {
      name: existing?.name || '',
      target: existing?.target ?? '',
      saved: existing?.saved ?? 0,
      deadline: existing?.deadline || '',
    };
    const html = `
      <div class="modal-header"><h2>${existing ? 'Edit Goal' : 'Add Savings Goal'}</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <form id="goal-form">
        <div class="field">
          <label>Goal name</label>
          <input type="text" id="gf-name" placeholder="e.g. Emergency Fund" value="${Util.escapeHtml(data.name)}" required autofocus>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Target amount</label>
            <input type="number" id="gf-target" min="0" step="0.01" value="${data.target}" required>
          </div>
          <div class="field">
            <label>Already saved</label>
            <input type="number" id="gf-saved" min="0" step="0.01" value="${data.saved}">
          </div>
        </div>
        <div class="field">
          <label>Deadline (optional)</label>
          <input type="date" id="gf-deadline" value="${data.deadline}">
        </div>
        <div class="modal-actions">
          ${existing ? `<button type="button" class="btn btn-danger" id="gf-delete">Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Add Goal'}</button>
        </div>
      </form>
    `;
    UI.openModal(html);
    const root = document.getElementById('modal-root');

    if (existing) {
      root.querySelector('#gf-delete').addEventListener('click', async () => {
        const ok = await UI.confirmDialog('Delete this goal?', { okText: 'Delete', danger: true });
        if (!ok) return;
        Store.deleteGoal(existing.id);
        UI.closeModal();
        UI.toast('Goal deleted');
        App.refresh();
      });
    }

    root.querySelector('#goal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const target = parseFloat(root.querySelector('#gf-target').value);
      if (!target || target <= 0) { UI.toast('Enter a valid target amount'); return; }
      const payload = {
        name: root.querySelector('#gf-name').value.trim(),
        target,
        saved: parseFloat(root.querySelector('#gf-saved').value) || 0,
        deadline: root.querySelector('#gf-deadline').value || null,
      };
      if (existing) {
        Store.updateGoal(existing.id, payload);
        UI.toast('Goal updated');
      } else {
        Store.addGoal(payload);
        UI.toast('Goal added');
      }
      UI.closeModal();
      App.refresh();
    });
  }

  function openAddFundsModal(goalId) {
    const g = Store.getState().goals.find(x => x.id === goalId);
    const symbol = Store.getState().meta.currencySymbol;
    const html = `
      <div class="modal-header"><h2>Add Funds to "${Util.escapeHtml(g.name)}"</h2><button class="btn btn-icon btn-ghost" data-close>✕</button></div>
      <form id="funds-form">
        <div class="field">
          <label>Amount (${symbol}) — use a negative number to withdraw</label>
          <input type="number" id="ff-amount" step="0.01" placeholder="0.00" required autofocus>
        </div>
        <div class="field-help">Currently saved: ${Util.formatCurrency(g.saved, symbol)} of ${Util.formatCurrency(g.target, symbol)}</div>
        <div class="modal-actions">
          <button type="submit" class="btn btn-primary">Update</button>
        </div>
      </form>
    `;
    UI.openModal(html);
    document.getElementById('funds-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('ff-amount').value);
      if (!amount) { UI.toast('Enter an amount'); return; }
      Store.addToGoalSaved(goalId, amount);
      UI.closeModal();
      UI.toast('Goal updated');
      App.refresh();
    });
  }

  function afterRender(container) {
    const addBtn = container.querySelector('#add-goal');
    if (addBtn) addBtn.addEventListener('click', () => openModal(null));
    container.querySelectorAll('[data-edit-goal]').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.editGoal));
    });
    container.querySelectorAll('[data-add-funds]').forEach(btn => {
      btn.addEventListener('click', () => openAddFundsModal(btn.dataset.addFunds));
    });
  }

  return { render, afterRender };
})();
