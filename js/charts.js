/* ---------- Lightweight SVG chart helpers ---------- */
const Charts = (() => {
  const PALETTE = [
    '#4f46e5', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
    '#8b5cf6', '#ec4899', '#84cc16', '#f97316', '#0ea5e9',
    '#a855f7', '#14b8a6',
  ];

  function colorFor(index) {
    return PALETTE[index % PALETTE.length];
  }

  // data: [{label, value}]
  function pie(data, opts = {}) {
    const size = opts.size || 180;
    const r = size / 2;
    const total = data.reduce((s, d) => s + d.value, 0);

    if (!total) {
      return `<div class="chart-wrap"><svg viewBox="0 0 ${size} ${size}" width="100%" height="${size}">
        <circle cx="${r}" cy="${r}" r="${r - 2}" fill="none" stroke="var(--border)" stroke-width="14"/>
      </svg></div>`;
    }

    let cumulative = 0;
    const radius = r - 2;
    const cx = r, cy = r;
    let paths = '';

    data.forEach((d, i) => {
      const fraction = d.value / total;
      if (fraction <= 0) return;
      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
      cumulative += fraction;
      const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = fraction > 0.5 ? 1 : 0;

      if (fraction >= 0.9999) {
        paths += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${d.color || colorFor(i)}" stroke-width="${radius}"/>`;
      } else {
        paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${d.color || colorFor(i)}"/>`;
      }
    });

    return `<div class="chart-wrap"><svg viewBox="0 0 ${size} ${size}" width="100%" height="${size}" style="max-width:${size}px;display:block;margin:0 auto;">
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="${radius * 0.55}" fill="var(--surface)"/>
    </svg></div>`;
  }

  // series: [{date/label, value}], single line
  function line(series, opts = {}) {
    const w = opts.width || 600;
    const h = opts.height || 160;
    const pad = 24;
    const values = series.map(s => s.value);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = (max - min) || 1;

    const stepX = (w - pad * 2) / Math.max(series.length - 1, 1);

    const points = series.map((s, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((s.value - min) / range) * (h - pad * 2);
      return [x, y];
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${h - pad} L ${points[0][0].toFixed(1)} ${h - pad} Z`;

    const color = opts.color || PALETTE[0];
    const gradId = 'lineGrad' + Math.random().toString(36).slice(2, 8);

    // x-axis labels: show first, middle, last
    const labelIdx = [0, Math.floor((series.length - 1) / 2), series.length - 1];
    const labels = labelIdx.map(i => {
      if (!series[i]) return '';
      const x = points[i][0];
      return `<text x="${x}" y="${h - 4}" font-size="9" fill="var(--text-muted)" text-anchor="middle">${Util.escapeHtml(series[i].label)}</text>`;
    }).join('');

    return `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="overflow:visible">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#${gradId})"/>
      <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${points.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="${color}"/>`).join('')}
      ${labels}
    </svg></div>`;
  }

  // data: [{label, value, color}] rendered as HTML bar chart (easier responsive sizing than SVG)
  function bars(data, opts = {}) {
    const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
    return `<div class="bar-chart">${data.map((d, i) => {
      const pct = Math.max((Math.abs(d.value) / max) * 100, d.value === 0 ? 0 : 2);
      const color = d.color || colorFor(i);
      return `<div class="bar-col">
        <div style="font-size:0.72rem;font-weight:700;color:${color}">${d.valueLabel ?? ''}</div>
        <div style="width:100%;height:100%;display:flex;align-items:flex-end;">
          <div class="bar-fill" style="height:${pct}%;background:${color}"></div>
        </div>
        <div class="bar-label">${Util.escapeHtml(d.label)}</div>
      </div>`;
    }).join('')}</div>`;
  }

  // data: [{label, a, b}] rendered as paired bars (e.g. income vs expense per month)
  function dualBars(data, opts = {}) {
    const colorA = opts.colorA || '#16a34a';
    const colorB = opts.colorB || '#dc2626';
    const max = Math.max(...data.flatMap(d => [d.a, d.b]), 1);
    const cols = data.map(d => {
      const pctA = Math.max((d.a / max) * 100, d.a === 0 ? 0 : 2);
      const pctB = Math.max((d.b / max) * 100, d.b === 0 ? 0 : 2);
      return `<div class="bar-col">
        <div style="width:100%;height:100%;display:flex;align-items:flex-end;gap:3px;">
          <div class="bar-fill" style="height:${pctA}%;background:${colorA};flex:1;"></div>
          <div class="bar-fill" style="height:${pctB}%;background:${colorB};flex:1;"></div>
        </div>
        <div class="bar-label">${Util.escapeHtml(d.label)}</div>
      </div>`;
    }).join('');
    const legend = (opts.labelA || opts.labelB) ? `<div class="legend" style="flex-direction:row;gap:16px;justify-content:center;margin-top:10px;">
      ${opts.labelA ? `<div class="legend-row" style="margin:0;"><span class="legend-swatch" style="background:${colorA}"></span><span>${Util.escapeHtml(opts.labelA)}</span></div>` : ''}
      ${opts.labelB ? `<div class="legend-row" style="margin:0;"><span class="legend-swatch" style="background:${colorB}"></span><span>${Util.escapeHtml(opts.labelB)}</span></div>` : ''}
    </div>` : '';
    return `<div class="bar-chart">${cols}</div>${legend}`;
  }

  // Renders a pie chart with a legend listing label/value/percentage
  function pieWithLegend(data, opts = {}) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const pieHtml = pie(data, opts);
    const legend = data.map((d, i) => {
      const pct = total ? ((d.value / total) * 100).toFixed(1) : '0.0';
      return `<div class="legend-row">
        <span class="legend-swatch" style="background:${d.color || colorFor(i)}"></span>
        <span class="legend-name">${Util.escapeHtml(d.label)}</span>
        <span class="legend-value">${pct}%</span>
      </div>`;
    }).join('');
    return `${pieHtml}<div class="legend">${legend}</div>`;
  }

  return { PALETTE, colorFor, pie, line, bars, dualBars, pieWithLegend };
})();
