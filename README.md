# PocketLedger — Personal Expense Manager

A local-first, installable Progressive Web App for tracking income, expenses, budgets, and savings goals. All data stays on your device (`localStorage`) — no server, no account, no tracking.

## Features

- **Dashboard** — balance overview, recent transactions, daily spending pace
- **Transactions** — add, edit, search, filter, and group income/expense/transfer entries
- **Accounts & transfers** — manage multiple accounts and move money between them
- **Budgets** — monthly spending limits per category or overall, with optional rollover of unspent amounts
- **Recurring transactions** — automate regular bills and income
- **Goals** — savings targets with recommended daily contributions
- **Reports** — charts and breakdowns of spending over time
- **Offline support** — installable PWA with a service worker for offline use and update notifications

## Getting Started

This is a static site with no build step.

1. Serve the folder with any static file server, e.g.:
   ```bash
   python -m http.server 5500
   ```
2. Open `http://localhost:5500` in your browser.
3. (Optional) Install it as an app via your browser's "Install" / "Add to Home Screen" option.

## Tech Stack

- Vanilla HTML, CSS, and JavaScript (no frameworks or build tools)
- `localStorage` for data persistence
- Service Worker for offline caching and updates
