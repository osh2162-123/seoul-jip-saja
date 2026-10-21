// ---------- back/forward history, section jumps and the compare list
(function () {
  const $ = (id) => document.getElementById(id);
  const F = () => window.sxF;
  // the element that actually scrolls (the dashboard may scroll a container instead of the window)
  let scroller = null;
  const getScroller = () => {
    if (scroller) return scroller;
    let el = document.getElementById('nav-back');
    while (el && el !== document.body) { const s = getComputedStyle(el); if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 4) { scroller = el; return el; } el = el.parentElement; }
    scroller = document.scrollingElement || document.documentElement; return scroller;
  };
  const getY = () => getScroller().scrollTop;
  const setY = (y) => { const s = getScroller(); s.scrollTop = y; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const entries = []; let idx = -1, restoring = false, lastParams = null, coalesce = null;
  function updateBtns() { $('nav-back').disabled = idx <= 0; $('nav-fwd').disabled = idx >= entries.length - 1; }
  function push() {
    entries.splice(idx + 1);
    entries.push({ params: clone(dash.params()), y: getY() });
    if (entries.length > 60) entries.shift();
    idx = entries.length - 1; updateBtns();
  }
  function restore(e) {
    restoring = true;
    const cur = dash.params(); const full = {};
    Object.keys(cur).forEach((k) => { full[k] = null; });
    Object.assign(full, clone(e.params));
    full.cmp = clone(cur.cmp || []); // the compare list is not part of history
    lastParams = clone(full);
    dash.setParams(full);
    setTimeout(() => { setY(e.y); restoring = false; }, 60);
    updateBtns();
  }
  $('nav-back').addEventListener('click', () => { if (idx <= 0) return; entries[idx].y = getY(); idx--; restore(entries[idx]); });
  $('nav-fwd').addEventListener('click', () => { if (idx >= entries.length - 1) return; entries[idx].y = getY(); idx++; restore(entries[idx]); });
  const track = () => { if (!restoring && idx >= 0) entries[idx].y = getY(); };
  setTimeout(() => { const s = getScroller(); (s === document.scrollingElement || s === document.documentElement ? window : s).addEventListener('scroll', track, { passive: true }); }, 0);

  // jump to a section and make it a history step
  function go(id, after) {
    const el = $(id); if (!el) return;
    if (idx >= 0) entries[idx].y = getY();
    if (el.scrollIntoView) el.scrollIntoView({ block: 'start' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    dash.setLink(id);
    setTimeout(() => { push(); if (after) after(); }, 80);
  }
  window.sxGo = go;
  document.querySelectorAll('.sxnav .navl').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

  // compare list lives in the cmp parameter (a list of complex ids)
  const cmpIds = () => { const c = dash.params().cmp; return Array.isArray(c) ? c.filter((x) => typeof x === 'string') : []; };
  const setCmp = (ids) => dash.setParams({ cmp: ids });
  $('d-add').addEventListener('click', () => {
    const sel = dash.params().sel; if (!sel) return;
    const ids = cmpIds(); setCmp(ids.includes(sel) ? ids.filter((x) => x !== sel) : ids.concat([sel]));
  });
  $('d-loan').addEventListener('click', () => {
    const btn = $('l-use-sel'); if (btn) btn.click();
    go('loan-card');
  });

  function drawCompare() {
    const f0 = F(); if (!f0) return;
    const f = Object.assign({}, f0, { fmtEok: (m) => (m == null || !isFinite(m) ? '—' : String(Number((m / 10000).toFixed(2))) + '억') });
    const tbody = document.querySelector('#cmp-table tbody'); tbody.replaceChildren();
    const ids = cmpIds(); $('nav-cmp-n').textContent = String(ids.length);
    const d = dash.data('complexes');
    const sel = dash.params().sel;
    const inCmp = sel && ids.includes(sel);
    $('d-add').textContent = inCmp ? '비교 목록에서 빼기' : '비교 목록에 담기';
    $('d-add').classList.toggle('on', !!inCmp);
    $('cmp-empty').hidden = ids.length > 0;
    if (d.status !== 'ok' || !ids.length) return;
    const byId = new Map(d.data.map((r) => [r.id, r]));
    ids.forEach((id) => {
      const r = byId.get(id); if (!r) return;
      const at = r.min_price != null && window.sxLoanAt ? window.sxLoanAt(r.min_price) : null;
      const tr = document.createElement('tr'); tr.dataset.key = id; if (id === sel) tr.className = 'on';
      const name = document.createElement('td');
      name.append(r.name); const sub = document.createElement('div'); sub.className = 'cmpsub'; sub.textContent = `${r.gu} ${r.dong}${r.zone_s ? ' · ' + r.zone_s : ''}`; name.appendChild(sub);
      tr.appendChild(name);
      const cells = [
        r.year ? `${r.year}년` : '—',
        r.far == null ? '—' : r.far + '%',
        r.st_m == null ? '—' : `${r.st_name} ${f.fmtInt(r.st_m)}m`,
        r.min_price == null ? '—' : `${f.fmtEok(r.min_price)} (${r.min_area}㎡)`,
        at && at.best ? `${f.fmtEok(at.best.lim)} ${at.best.name}` : '—',
        at ? (at.short > 0 ? `${f.fmtEok(at.need)} (부족 ${f.fmtEok(at.short)})` : `${f.fmtEok(at.need)}`) : '—',
        at && at.best ? `${f.fmtInt(Math.round(at.best.pay))}만원` : '—',
      ];
      cells.forEach((t, i) => { const td = document.createElement('td'); td.textContent = t; if (i === 1 || i === 2) td.className = 'hide-narrow'; if (i === 5 && at && at.short > 0) td.classList.add('neg'); tr.appendChild(td); });
      const act = document.createElement('td');
      const vb = document.createElement('button'); vb.type = 'button'; vb.textContent = '보기'; vb.addEventListener('click', () => { dash.setParams({ sel: id }); go('map-card'); });
      const lb = document.createElement('button'); lb.type = 'button'; lb.textContent = '대출'; lb.addEventListener('click', () => { dash.setParams({ sel: id }); setTimeout(() => { const btn = $('l-use-sel'); if (btn) btn.click(); go('loan-card'); }, 30); });
      const xb = document.createElement('button'); xb.type = 'button'; xb.textContent = '빼기'; xb.setAttribute('aria-label', `${r.name} 비교 목록에서 빼기`); xb.addEventListener('click', () => setCmp(cmpIds().filter((x) => x !== id)));
      act.append(vb, lb, xb); tr.appendChild(act);
      tbody.appendChild(tr);
    });
  }
  window.sxCompareDraw = drawCompare;

  dash.onData(() => {
    const p = clone(dash.params());
    if (idx < 0) { push(); lastParams = p; }
    else if (!restoring && lastParams && !same(p, lastParams)) {
      // a selection or filter change becomes one history step (rapid changes are merged)
      const onlyCmp = same(Object.assign({}, p, { cmp: null }), Object.assign({}, lastParams, { cmp: null }));
      if (!onlyCmp) {
        if (coalesce) { clearTimeout(coalesce); entries[idx].params = p; }
        else push();
        coalesce = setTimeout(() => { coalesce = null; }, 400);
      } else if (idx >= 0) entries[idx].params = p;
    }
    lastParams = p;
    drawCompare();
  });
})();
