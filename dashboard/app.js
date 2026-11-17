// Cyberpunk / Midnight High-Performance Token Radar Dashboard
// Offline, zero network calls, instant client-side sorting, filtering, and protocol detail modal.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }

  function impliedOf(row, model) {
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var chainMult = (row.chains && row.chains.length >= 3) ? 1.15 : 1.0;
    return Math.max(1, Math.round(row.tvl_usd * model.base_multiple * chainMult * growthMult * maturity));
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }

  function farmPlan(p) {
    var c = (p.category || '').toLowerCase();
    var chain = p.chains && p.chains.length ? p.chains[0] : 'its main chain';
    var cap = capitalFor(p);
    var hold = (p.age_days !== null && p.age_days < 180) ? 60 : 30;
    var action = 'Supply $' + cap + ' to ' + p.name + ' on ' + chain + ' and maintain position.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0) action = 'Provide $' + cap + ' liquidity to ' + p.name + ' core pool on ' + chain + '.';
    else if (c.indexOf('bridge') >= 0) action = 'Bridge $' + cap + ' USDC to ' + chain + ' via ' + p.name + '.';
    else if (c.indexOf('staking') >= 0) action = 'Stake $' + cap + ' of native asset via ' + p.name + '.';

    return [
      { text: 'Set up isolated farming wallet on ' + chain + ' with gas funds.', cost: '<$3 gas', time: '5m' },
      { text: action, cost: '$' + cap + ' capital', time: '15m' },
      { text: 'Execute qualifying weekly on-chain transaction cadence.', cost: '~$2 gas/wk', time: '10m/wk' },
      { text: 'Retain active position for ' + hold + ' days through snapshots.', cost: '$' + cap + ' locked', time: hold + 'd' },
      { text: 'Monitor governance voting and token announcement deadlines.', cost: 'Free', time: '5m/wk' },
      { text: 'Record TX hashes and confirm allocation before safe withdrawal.', cost: 'None', time: '5m' }
    ];
  }

  function render() {
    app.innerHTML = '';
    var shell = el('div', { class: 'shell' });

    // Top Brand Bar
    var top = el('div', { class: 'top' },
      el('div', { class: 'brand' },
        el('div', { class: 'mark' }),
        el('div', { class: 'brand-name', text: 'TOKEN RADAR // ' + DATA.model_version })
      ),
      el('div', { class: 'top-meta' },
        el('span', { text: 'SNAPSHOT: ' + DATA.as_of }),
        el('span', { text: 'WATCHLIST: ' + DATA.watchlist_size }),
        el('span', { text: 'SCORED: ' + DATA.board_size })
      )
    );
    shell.appendChild(top);

    // Lede Header
    var lede = el('div', { class: 'lede' },
      el('div', null,
        el('h1', { text: 'Pre-Token Valuation Radar & Airdrop Farm Alpha' }),
        el('p', { text: 'Continuous valuation discovery model ranking pre-token DeFi protocols by implied fully diluted valuation, 7d growth momentum, and actionable multi-phase farming roadmaps.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact-row' }, el('span', { class: 'fact-label', text: 'Floor TVL' }), el('span', { class: 'fact-val', text: fmtUsd(DATA.floor_usd) })),
        el('div', { class: 'fact-row' }, el('span', { class: 'fact-label', text: 'Base Multiple' }), el('span', { class: 'fact-val', text: DATA.model.base_multiple + 'x' })),
        el('div', { class: 'fact-row' }, el('span', { class: 'fact-label', text: 'Growth Weight' }), el('span', { class: 'fact-val', text: DATA.model.growth_weight + 'x' })),
        el('div', { class: 'fact-row' }, el('span', { class: 'fact-label', text: 'Total Scored' }), el('span', { class: 'fact-val', text: DATA.board_size + ' protocols' }))
      )
    );
    shell.appendChild(lede);

    // Filter & Search Controls
    var filterBar = el('div', { class: 'filter-bar' },
      el('div', { class: 'search-box' },
        el('input', {
          type: 'text',
          placeholder: 'Search protocol, chain, or category...',
          value: state.q,
          oninput: function (e) { state.q = e.target.value.toLowerCase(); renderTable(); }
        })
      ),
      el('div', { class: 'chips' },
        el('button', {
          class: 'chip' + (state.category === 'all' ? ' active' : ''),
          text: 'All Categories',
          onclick: function () { state.category = 'all'; render(); }
        }),
        el('button', {
          class: 'chip' + (state.category === 'dex' ? ' active' : ''),
          text: 'DEXes',
          onclick: function () { state.category = 'dex'; render(); }
        }),
        el('button', {
          class: 'chip' + (state.category === 'lending' ? ' active' : ''),
          text: 'Lending',
          onclick: function () { state.category = 'lending'; render(); }
        }),
        el('button', {
          class: 'chip' + (state.category === 'staking' ? ' active' : ''),
          text: 'Liquid Staking',
          onclick: function () { state.category = 'staking'; render(); }
        }),
        el('button', {
          class: 'chip' + (state.category === 'bridge' ? ' active' : ''),
          text: 'Bridges',
          onclick: function () { state.category = 'bridge'; render(); }
        })
      )
    );
    shell.appendChild(filterBar);

    // Table
    var tableWrap = el('div', { class: 'table-wrap' });
    var table = el('table', null);
    var thead = el('thead', null,
      el('tr', null,
        el('th', { class: 'sortable', text: 'Rank', onclick: function () { setSort('rank'); } }),
        el('th', { text: 'Protocol' }),
        el('th', { text: 'Category' }),
        el('th', { text: 'Chains' }),
        el('th', { class: 'num sortable', text: 'TVL', onclick: function () { setSort('tvl_usd'); } }),
        el('th', { class: 'num sortable', text: '7d Growth', onclick: function () { setSort('change_7d'); } }),
        el('th', { class: 'num sortable', text: 'Implied FDV', onclick: function () { setSort('implied_value_usd'); } }),
        el('th', { class: 'num', text: 'Age' }),
        el('th', { text: 'Farm Status' })
      )
    );
    table.appendChild(thead);

    var tbody = el('tbody', { id: 'table-body' });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    shell.appendChild(tableWrap);

    app.appendChild(shell);
    renderTable();

    if (state.selected) renderDrawer(state.selected);
  }

  function setSort(col) {
    if (state.sort === col) state.dir = -state.dir;
    else { state.sort = col; state.dir = col === 'rank' ? 1 : -1; }
    renderTable();
  }

  function renderTable() {
    var tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    var rows = DATA.rows.filter(function (r) {
      if (state.category !== 'all') {
        var cat = (r.category || '').toLowerCase();
        if (state.category === 'dex' && cat.indexOf('dex') < 0 && cat.indexOf('swap') < 0) return false;
        if (state.category === 'lending' && cat.indexOf('lend') < 0 && cat.indexOf('cdp') < 0) return false;
        if (state.category === 'staking' && cat.indexOf('stak') < 0) return false;
        if (state.category === 'bridge' && cat.indexOf('bridge') < 0) return false;
      }
      if (state.q) {
        var match = r.name.toLowerCase().indexOf(state.q) >= 0 ||
          (r.category && r.category.toLowerCase().indexOf(state.q) >= 0) ||
          (r.chains && r.chains.some(function (c) { return c.toLowerCase().indexOf(state.q) >= 0; }));
        if (!match) return false;
      }
      return true;
    });

    rows.sort(function (a, b) {
      var valA = a[state.sort] !== null ? a[state.sort] : -Infinity;
      var valB = b[state.sort] !== null ? b[state.sort] : -Infinity;
      return (valA > valB ? 1 : valA < valB ? -1 : 0) * state.dir;
    });

    rows.forEach(function (row) {
      var isSelected = state.selected && state.selected.slug === row.slug;
      var tr = el('tr', {
        class: 'protocol-row' + (isSelected ? ' selected' : ''),
        onclick: function () {
          state.selected = row;
          renderDrawer(row);
        }
      },
        el('td', { class: 'num', text: '#' + row.rank }),
        el('td', null, el('strong', { text: row.name })),
        el('td', { text: row.category || 'General DeFi' }),
        el('td', { text: row.chains && row.chains.length ? row.chains.slice(0, 3).join(', ') : 'Multi' }),
        el('td', { class: 'num', text: fmtUsd(row.tvl_usd) }),
        el('td', { class: 'num ' + (row.change_7d >= 0 ? 'positive' : 'negative'), text: fmtPct(row.change_7d) }),
        el('td', { class: 'num', style: 'color: var(--accent); font-weight: 700;', text: fmtUsd(row.implied_value_usd) }),
        el('td', { class: 'num', text: fmtAge(row.age_days) }),
        el('td', null, el('span', { class: 'badge ' + (row.rank <= 40 ? 'badge-watch' : 'badge-early'), text: row.rank <= 40 ? 'WATCHLIST' : 'EARLY ALPHA' }))
      );
      tbody.appendChild(tr);
    });
  }

  function renderDrawer(row) {
    var existing = document.getElementById('drawer-root');
    if (existing) existing.remove();

    var backdrop = el('div', {
      id: 'drawer-root',
      class: 'drawer-backdrop',
      onclick: function (e) { if (e.target === backdrop) closeDrawer(); }
    });

    var drawer = el('div', { class: 'drawer' });

    var header = el('div', { class: 'drawer-header' },
      el('div', null,
        el('h2', { text: row.name }),
        el('p', { text: 'Rank #' + row.rank + ' · ' + (row.category || 'DeFi') + ' · ' + (row.chains ? row.chains.join(', ') : '') })
      ),
      el('button', { class: 'close-btn', text: '✕', onclick: closeDrawer })
    );
    drawer.appendChild(header);

    // Valuation breakdown
    var valCard = el('div', { class: 'step-card' },
      el('h3', { text: 'Valuation & Multiplier Matrix' }),
      el('div', { class: 'fact-row' }, el('span', { class: 'fact-label', text: 'Current TVL' }), el('span', { class: 'fact-val', text: fmtUsd(row.tvl_usd) })),
      el('div', { class: 'fact-row' }, el('span', { class: 'fact-label', text: '7d TVL Momentum' }), el('span', { class: 'fact-val ' + (row.change_7d >= 0 ? 'positive' : 'negative'), text: fmtPct(row.change_7d) })),
      el('div', { class: 'fact-row' }, el('span', { class: 'fact-label', text: 'Maturity Multiplier' }), el('span', { class: 'fact-val', text: row.maturity_multiplier + 'x' })),
      el('div', { class: 'fact-row' }, el('span', { class: 'fact-label', text: 'Growth Multiplier' }), el('span', { class: 'fact-val', text: row.growth_multiplier + 'x' })),
      el('div', { class: 'fact-row', style: 'border-top: 1px solid var(--border); padding-top: 8px;' },
        el('span', { class: 'fact-label', style: 'color: var(--accent); font-weight: 700;', text: 'Implied Valuation (FDV)' }),
        el('span', { class: 'fact-val', style: 'color: var(--accent); font-size: 16px; font-weight: 700;', text: fmtUsd(row.implied_value_usd) })
      )
    );
    drawer.appendChild(valCard);

    // Farming Plan Steps
    var stepsCard = el('div', { style: 'display: flex; flex-direction: column; gap: var(--step-3);' },
      el('h3', { text: 'Actionable Airdrop Strategy' })
    );

    var steps = farmPlan(row);
    steps.forEach(function (s, idx) {
      var stepEl = el('div', { class: 'step-card' },
        el('div', { class: 'step-num', text: 'STEP ' + (idx + 1) }, el('span', { style: 'float: right; color: var(--muted); font-size: 11px;', text: s.time })),
        el('p', { text: s.text, style: 'font-size: 14px; color: var(--ink);' }),
        el('div', { class: 'step-meta' }, el('span', { text: 'Est. Cost: ' + s.cost }))
      );
      stepsCard.appendChild(stepEl);
    });

    drawer.appendChild(stepsCard);
    backdrop.appendChild(drawer);
    document.body.appendChild(backdrop);
  }

  function closeDrawer() {
    var existing = document.getElementById('drawer-root');
    if (existing) existing.remove();
    state.selected = null;
    var rows = document.querySelectorAll('tr.protocol-row.selected');
    rows.forEach(function (r) { r.classList.remove('selected'); });
  }

  render();
})();
