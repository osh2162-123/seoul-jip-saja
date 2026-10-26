// ---------- list table
(function () {
  const tbody = document.querySelector('#list-table tbody');
  const search = document.querySelector('.sx .search');
  const note = document.getElementById('list-note');
  const sortSel = document.getElementById('sort-sel');
  const LIMIT = 400;
  let sortK = 'px', sortDir = 1;
  const syncSel = () => { const v = `${sortK}:${sortDir}`; sortSel.value = [...sortSel.options].some((o) => o.value === v) ? v : ''; };
  const draw = () => {
    const F = window.sxF;
    const d = dash.data('complexes');
    if (d.status !== 'ok') { tbody.replaceChildren(); return; }
    const p = dash.params();
    const q = search.value.trim();
    let rows = d.data.filter(window.sxFilter);
    if (q) rows = rows.filter((r) => (r.name + ' ' + r.dong + ' ' + r.gu).includes(q));
    const PX = new Map(rows.map((r) => [r, window.sxPx(r)]));
    const val = (r, k) => (k === 'px' ? PX.get(r).price : r[k]);
    rows.sort((a, b) => {
      if (sortK === 'px') { const ta = PX.get(a).thin, tb = PX.get(b).thin; if (ta !== tb) return ta ? 1 : -1; } // 표본 적은 단지는 뒤로
      const va = val(a, sortK), vb = val(b, sortK);
      if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
      return (typeof va === 'string' ? va.localeCompare(vb, 'ko') : va - vb) * sortDir;
    });
    const total = rows.length;
    rows = rows.slice(0, LIMIT);
    const band = (window.sxBandOn() ? ' 시세는 정한 면적 구간 기준입니다.' : '') + (p.afford && window.sxBudget != null ? ' 예산 밖 단지는 숨겨져 있습니다(1단계에서 끌 수 있음).' : '');
    note.textContent = `위 조건이 그대로 적용됩니다. ${F.fmtInt(total)}개 단지 중 ${F.fmtInt(rows.length)}개 표시${total > LIMIT ? ' (검색이나 조건으로 좁히세요)' : ''}.${band} 시세 정렬에서는 최근 12개월 거래가 ${window.sxThin}건 미만인 단지를 뒤로 보냅니다.`;
    const inCmp = Array.isArray(p.cmp) ? p.cmp : [];
    tbody.replaceChildren(...rows.map((r) => {
      const px = PX.get(r);
      const tr = document.createElement('tr'); tr.dataset.key = r.id; if (r.id === p.sel) tr.className = 'on';
      const cells = [r.name, r.gu, r.dong, r.year ?? '—', r.units == null ? '—' : F.fmtInt(r.units), r.far == null ? '—' : r.far + '%', r.zone_s || '—', F.fmtInt(r.trades_12m), F.fmtPpy(r.ppy_12m), F.fmtPct(r.chg_1y), F.fmtPct(r.vs_2122), px.price == null ? '—' : `${F.fmtEok(px.price)} (${px.area}㎡)`, r.st_m == null ? '—' : F.fmtInt(r.st_m) + 'm'];
      cells.forEach((v, i) => {
        const td = document.createElement('td'); td.textContent = v;
        if ([2, 3, 4, 5, 6, 7, 8, 9, 10, 12].includes(i)) td.classList.add('hide-narrow');
        if (i === 9 || i === 10) { const val2 = i === 9 ? r.chg_1y : r.vs_2122; if (val2 != null) td.classList.add(val2 >= 0 ? 'pos' : 'neg'); }
        if (i === 11 && px.thin) { const t = document.createElement('span'); t.className = 'thin'; t.textContent = `${px.n}건`; t.title = `이 평형의 최근 12개월 거래가 ${px.n}건뿐이라 대표 가격으로 보기엔 표본이 적습니다`; td.append(' ', t); }
        tr.appendChild(td);
      });
      const act = document.createElement('td');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'addb'; b.dataset.add = r.id;
      const on = inCmp.includes(r.id); b.textContent = on ? '담김' : '담기'; b.setAttribute('aria-pressed', String(on)); if (on) b.classList.add('on');
      b.setAttribute('aria-label', `${r.name} 비교함에 ${on ? '서 빼기' : ' 담기'}`);
      act.appendChild(b); tr.appendChild(act);
      return tr;
    }));
    document.querySelectorAll('#list-table th[data-field]').forEach((th) => { const k = th.querySelector('button').dataset.k; th.setAttribute('aria-sort', k === sortK ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'); });
    syncSel();
  };
  document.querySelectorAll('#list-table th button').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k; if (sortK === k) sortDir = -sortDir; else { sortK = k; sortDir = ['name', 'gu', 'dong', 'st_m', 'zone_s', 'px'].includes(k) ? 1 : -1; } draw();
  }));
  sortSel.addEventListener('change', () => { if (!sortSel.value) return; const [k, dir] = sortSel.value.split(':'); sortK = k; sortDir = Number(dir); draw(); });
  search.addEventListener('input', draw);
  tbody.addEventListener('click', (e) => {
    const ab = e.target.closest('button[data-add]');
    if (ab) { e.stopPropagation(); if (window.sxCmpToggle) window.sxCmpToggle(ab.dataset.add); return; }
    const tr = e.target.closest('tr[data-key]'); if (tr) { dash.setParams({ sel: tr.dataset.key }); if (window.sxGo) window.sxGo('map-card'); } // 같은 화면 아래 지도·상세로 내려감
  });
  dash.onData(draw);
})();
