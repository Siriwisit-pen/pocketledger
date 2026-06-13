/* ---------- Generic utilities ---------- */
const Util = (() => {

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayISO() {
    return toISODate(new Date());
  }

  function toISODate(d) {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }

  function parseISODate(s) {
    // Avoid timezone shifts: parse as local date
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function monthKey(dateStr) {
    return dateStr.slice(0, 7); // YYYY-MM
  }

  function currentMonthKey() {
    return monthKey(todayISO());
  }

  function shiftMonthKey(key, delta) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function formatDate(dateStr, opts) {
    const d = parseISODate(dateStr);
    return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    const d = parseISODate(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function relativeDay(dateStr) {
    const today = todayISO();
    const yesterday = toISODate(new Date(Date.now() - 86400000));
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return formatDateShort(dateStr);
  }

  function daysInMonth(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  function daysElapsedInMonth(key) {
    const today = todayISO();
    if (monthKey(today) === key) {
      return parseISODate(today).getDate();
    }
    // if the month is in the past, all days elapsed; if future, 0
    return key < monthKey(today) ? daysInMonth(key) : 0;
  }

  function formatCurrency(amount, symbol = '฿') {
    const n = Number(amount) || 0;
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}${symbol}${formatted}`;
  }

  function formatNumber(n) {
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  // Parse quick-add text like "Lunch 120" or "120 lunch with friends #food"
  function parseQuickAdd(text) {
    const trimmed = text.trim();
    const tagMatches = trimmed.match(/#(\w+)/g) || [];
    const tags = tagMatches.map(t => t.slice(1).toLowerCase());
    let working = trimmed.replace(/#\w+/g, '').trim();

    // Find first numeric token (supports decimals)
    const numMatch = working.match(/(\d+(?:\.\d+)?)/);
    let amount = null;
    let note = working;

    if (numMatch) {
      amount = parseFloat(numMatch[1]);
      note = (working.slice(0, numMatch.index) + ' ' + working.slice(numMatch.index + numMatch[1].length)).trim();
      note = note.replace(/\s+/g, ' ').trim();
    }

    return { amount, note, tags };
  }

  // Guess category from note text using keyword map + history
  function guessCategory(note, categories, history) {
    if (!note) return null;
    const lower = note.toLowerCase();

    const keywordMap = {
      food: ['lunch', 'dinner', 'breakfast', 'coffee', 'cafe', 'restaurant', 'snack', 'food', 'eat', 'meal', 'noodle', 'rice', 'drink', 'bar', 'beer'],
      transportation: ['taxi', 'grab', 'uber', 'bus', 'train', 'gas', 'fuel', 'parking', 'bts', 'mrt', 'flight', 'transport', 'car'],
      rent: ['rent', 'apartment', 'lease'],
      shopping: ['shopping', 'clothes', 'shoes', 'mall', 'amazon', 'lazada', 'shopee'],
      subscriptions: ['netflix', 'spotify', 'subscription', 'icloud', 'youtube', 'prime'],
      health: ['pharmacy', 'doctor', 'hospital', 'medicine', 'clinic', 'gym', 'health'],
      education: ['book', 'course', 'tuition', 'school', 'class', 'education'],
      entertainment: ['movie', 'cinema', 'game', 'concert', 'entertainment', 'party'],
    };

    // 1. Check user history for exact note matches first (most relevant)
    if (history && history.length) {
      const exact = history.find(h => h.note && h.note.toLowerCase() === lower);
      if (exact) return exact.categoryId;

      const partial = history.find(h => h.note && lower.includes(h.note.toLowerCase()) && h.note.length > 2);
      if (partial) return partial.categoryId;
    }

    // 2. Keyword match against category names
    for (const cat of categories) {
      const catKey = cat.name.toLowerCase();
      const words = keywordMap[catKey] || [catKey];
      if (words.some(w => lower.includes(w))) return cat.id;
    }

    return null;
  }

  // Downscale an image file to a max dimension and return a data URL
  function downscaleImage(file, maxDim = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return {
    uid, todayISO, toISODate, parseISODate, monthKey, currentMonthKey, shiftMonthKey, monthLabel,
    formatDate, formatDateShort, relativeDay, daysInMonth, daysElapsedInMonth,
    formatCurrency, formatNumber, debounce, escapeHtml, clamp,
    parseQuickAdd, guessCategory, downscaleImage,
  };
})();
