// ---------- list table
(function () {
  const tbody = document.querySelector('#list-table tbody');
  const search = document.querySelector('.sx .search');
  const note = document.getElementById('list-note');
  const LIMIT = 400;
  let sortK = 'trades_12m', sortDir = -1;
  const draw = () => {
    const F = window.sxF;
    const d = dash.data('complexes');
    if (d.status !== 'ok') { tbody.replaceChildren(); return; }
    const p = dash.params();
    const q = search.value.trim();
    let rows = d.data.filter(window.sxFilter);
    if (q) rows = rows.filter((r) => (r.name + ' ' + r.dong + ' ' + r.gu).includes(q));
    rows.sort((a, b) => {
      const va = a[sortK], vb = b[sortK];
      if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
      return (typeof va === 'string' ? va.localeCompare(vb, 'ko') : va - vb) * sortDir;
    });
    const total = rows.length;
    rows = rows.slice(0, LIMIT);
    note.textContent = `위 필터가 그대로 적용됩니다. ${F.fmtInt(total)}개 단지 중 ${F.fmtInt(rows.length)}개 표시${total > LIMIT ? ' (검색이나 필터로 좁히세요)' : ''}. 머리글을 눌러 정렬하세요.`;
    tbody.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.id; if (r.id === p.sel) tr.className = 'on';
      const cells = [r.name, r.gu, r.dong, r.year ?? '—', r.units == null ? '—' : F.fmtInt(r.units), r.far == null ? '—' : r.far + '%', r.zone_s || '—', F.fmtInt(r.trades_12m), F.fmtPpy(r.ppy_12m), F.fmtPct(r.chg_1y), F.fmtPct(r.vs_2122), F.fmtEok(r.min_price), r.st_m == null ? '—' : F.fmtInt(r.st_m) + 'm'];
      cells.forEach((v, i) => {
        const td = document.createElement('td'); td.textContent = v;
        if ([2, 4, 5, 6, 7, 10, 12].includes(i)) td.classList.add('hide-narrow');
        if (i === 9 || i === 10) { const val = i === 9 ? r.chg_1y : r.vs_2122; if (val != null) td.classList.add(val >= 0 ? 'pos' : 'neg'); }
        tr.appendChild(td);
      });
      return tr;
    }));
    document.querySelectorAll('#list-table th').forEach((th) => th.setAttribute('aria-sort', th.dataset.field === sortK ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'));
  };
  document.querySelectorAll('#list-table th button').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k; if (sortK === k) sortDir = -sortDir; else { sortK = k; sortDir = ['name', 'gu', 'dong', 'st_m', 'zone_s'].includes(k) ? 1 : -1; } draw();
  }));
  search.addEventListener('input', draw);
  tbody.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-key]'); if (tr) { dash.setParams({ sel: tr.dataset.key }); if (window.sxGo) window.sxGo('map-card'); } });
  dash.onData(draw);
})();
