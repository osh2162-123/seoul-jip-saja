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

  // ---- 화면(페이지) 전환: 현재 화면은 pg 파라미터에 들어 있어 뒤로·앞으로 이동에도 따라온다
  const rootEl = document.querySelector('.sx');
  const ORDER = ['home', 'plan', 'explore', 'cmp', 'loan', 'pay'];
  const LABEL = { home: '홈', plan: '1 예산·면적', explore: '2 단지 탐색', cmp: '3 비교', loan: '4 대출', pay: '5 월 상환', info: '통계·출처' };
  const PAGE = { home: 'home', plan: 'plan', 'plan-card': 'plan', explore: 'explore', map: 'explore', 'map-card': 'explore', 'detail-card': 'explore', list: 'explore', 'list-card': 'explore', cmp: 'cmp', 'cmp-card': 'cmp', loan: 'loan', 'loan-card': 'loan', pay: 'pay', 'pay-card': 'pay', info: 'info', 'src-card': 'info', 'gu-card': 'info' };
  function drawFoot(pg) {
    const f = $('pgfoot'); f.replaceChildren();
    const mk = (txt, to, cls) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.go = to; b.textContent = txt; if (cls) b.className = cls; f.appendChild(b); };
    if (pg === 'info') { mk('← 홈으로', 'home'); return; }
    const i = ORDER.indexOf(pg);
    if (i > 0) mk('← ' + LABEL[ORDER[i - 1]], ORDER[i - 1]);
    if (i >= 0 && i < ORDER.length - 1) mk(LABEL[ORDER[i + 1]] + ' →', ORDER[i + 1], 'fnext');
  }
  function applyPage() {
    const p = dash.params(); let pg = p.pg || 'home'; if (!LABEL[pg]) pg = 'home';
    const changed = rootEl.dataset.page !== pg;
    rootEl.dataset.page = pg;
    document.querySelectorAll('.sx [data-pg]').forEach((el) => { el.hidden = !el.dataset.pg.split(' ').includes(pg); });
    document.querySelectorAll('.sxnav .navl').forEach((b) => { if (b.dataset.go === pg) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    drawFoot(pg);
    // 숨겨져 있던 동안 폭을 못 재서 그려진 지도·차트를 다시 그린다
    if (changed && (pg === 'explore' || pg === 'info')) setTimeout(() => dash.setParams({}), 0);
  }
  function go(id, after) {
    const pg = PAGE[id]; if (!pg) return;
    if (idx >= 0) entries[idx].y = getY();
    setY(0);
    dash.setParams({ pg });
    if (dash.setLink) dash.setLink(pg);
    // 지도·선택 단지로 가라는 요청이면 같은 화면 안에서 그 칸으로 내려간다
    const target = (id === 'map-card' || id === 'detail-card') ? $(id) : null;
    setTimeout(() => { if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' }); else setY(0); if (after) after(); }, 80);
  }
  window.sxGo = go;
  rootEl.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });

  // compare list lives in the cmp parameter (a list of complex ids)
  const cmpIds = () => { const c = dash.params().cmp; return Array.isArray(c) ? c.filter((x) => typeof x === 'string') : []; };
  const MAXC = 3;
  const setCmp = (ids) => dash.setParams({ cmp: ids });
  const trayMsg = (t) => { $('tray-msg').textContent = t; clearTimeout(trayMsg.t); if (t) trayMsg.t = setTimeout(() => { $('tray-msg').textContent = ''; }, 4000); };
  window.sxCmpToggle = (id) => {
    if (!id) return;
    const ids = cmpIds();
    if (ids.includes(id)) { trayMsg(''); setCmp(ids.filter((x) => x !== id)); return; }
    if (ids.length >= MAXC) { $('tray').classList.remove('empty'); trayMsg(`최대 ${MAXC}개까지 비교할 수 있습니다. 하나를 빼고 담아 주세요.`); return; }
    setCmp(ids.concat([id]));
  };
  $('d-add').addEventListener('click', () => window.sxCmpToggle(dash.params().sel));
  $('tray-go').addEventListener('click', () => go('cmp'));
  $('tray-clear').addEventListener('click', () => { trayMsg(''); setCmp([]); });
  $('d-loan').addEventListener('click', () => {
    const btn = $('l-use-sel'); if (btn) btn.click();
    go('loan-card');
  });

  function drawCompare() {
    const f0 = F(); if (!f0) return;
    const f = Object.assign({}, f0, { fmtEok: (m) => (m == null || !isFinite(m) ? '—' : String(Number((m / 10000).toFixed(2))) + '억') });
    const thead = document.querySelector('#cmp-table thead'), tbody = document.querySelector('#cmp-table tbody');
    thead.replaceChildren(); tbody.replaceChildren();
    const d = dash.data('complexes');
    const byId = d.status === 'ok' ? new Map(d.data.map((r) => [r.id, r])) : new Map();
    const ids = cmpIds().filter((id) => byId.size === 0 || byId.has(id)).slice(0, MAXC);
    const sel = dash.params().sel;
    const inCmp = sel && ids.includes(sel);
    $('nav-cmp-n').textContent = String(ids.length); $('cmp-count').textContent = String(ids.length);
    $('d-add').textContent = inCmp ? '비교함에서 빼기' : '비교함에 담기';
    $('d-add').classList.toggle('on', !!inCmp);
    $('cmp-empty').hidden = ids.length > 0;
    drawTray(ids, byId);
    if (d.status !== 'ok' || !ids.length) return;
    const rs = ids.map((id) => byId.get(id));
    // 머리: 단지 이름과 동작
    const hr = document.createElement('tr'); hr.appendChild(document.createElement('th'));
    rs.forEach((r) => {
      const th = document.createElement('th'); th.scope = 'col'; if (r.id === sel) th.className = 'on';
      const nm = document.createElement('div'); nm.className = 'cname'; nm.textContent = r.name;
      const sub = document.createElement('div'); sub.className = 'cmpsub'; sub.textContent = `${r.gu} ${r.dong}${r.zone_s ? ' · ' + r.zone_s : ''}`;
      const act = document.createElement('div'); act.className = 'cact';
      const mk = (t, fn, label) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.setAttribute('aria-label', `${r.name} ${label}`); b.addEventListener('click', fn); return b; };
      act.append(
        mk('보기', () => { dash.setParams({ sel: r.id }); go('map-card'); }, '지도에서 보기'),
        mk('대출', () => { dash.setParams({ sel: r.id }); setTimeout(() => { const btn = $('l-use-sel'); if (btn) btn.click(); go('loan-card'); }, 30); }, '대출 확인'),
        mk('빼기', () => setCmp(cmpIds().filter((x) => x !== r.id)), '비교함에서 빼기'));
      th.append(nm, sub, act); hr.appendChild(th);
    });
    thead.appendChild(hr);
    const ncol = rs.length + 1;
    const grp = (t) => { const tr = document.createElement('tr'); tr.className = 'grp'; const th = document.createElement('th'); th.colSpan = ncol; th.textContent = t; tr.appendChild(th); tbody.appendChild(tr); };
    // fn(r) -> 문자열 또는 { t, sub, cls, thin }
    const line = (label, fn) => {
      const tr = document.createElement('tr'); const th = document.createElement('th'); th.scope = 'row'; th.textContent = label; tr.appendChild(th);
      rs.forEach((r) => {
        const v = fn(r), o = typeof v === 'string' ? { t: v } : v; const td = document.createElement('td'); if (o.cls) td.className = o.cls;
        td.append(o.t);
        if (o.sub) { const sd = document.createElement('div'); sd.className = 'cmpsub'; sd.textContent = o.sub; td.appendChild(sd); }
        if (o.thin) { const t = document.createElement('div'); t.className = 'thinnote'; t.textContent = o.thin; td.appendChild(t); }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    };
    const pn = (v) => (v == null ? '' : v >= 0 ? 'pos' : 'neg');
    grp('가격');
    line(window.sxBandOn() ? '시세 (정한 면적)' : '시세 (최소 평형)', (r) => {
      const px = window.sxPx(r); if (px.price == null) return '—';
      const bits = []; if (px.last) bits.push(`최근 거래 ${px.last}`); if (px.n != null) bits.push(`12개월 ${px.n}건`);
      return { t: `${f.fmtEok(px.price)} (${px.area}㎡)`, sub: bits.join(' · '), thin: px.thin ? '표본 적음 — 대표 가격으로 보기엔 거래가 적습니다' : '' };
    });
    line('평당가 (전용)', (r) => { const t = window.sxTrades(r); return { t: f.fmtPpy(r.ppy_12m), sub: `단지 전체 12개월 ${f.fmtInt(r.trades_12m)}건` + (t.last ? ` · 최근 ${t.last}` : '') }; });
    line('1년 변화율', (r) => {
      const t = window.sxTrades(r); const sub = `비교 기간 거래: 최근 ${f.fmtInt(r.trades_12m)}건 · 직전 ${t.nPrev == null ? '—' : f.fmtInt(t.nPrev) + '건'}`;
      const few = r.chg_1y != null && (r.trades_12m < window.sxThin || (t.nPrev != null && t.nPrev < window.sxThin));
      return { t: f.fmtPct(r.chg_1y), cls: pn(r.chg_1y), sub, thin: few ? '표본 적음 — 변화율이 우연히 클 수 있습니다' : '' };
    });
    line('21~22년 대비', (r) => ({ t: f.fmtPct(r.vs_2122), cls: pn(r.vs_2122) }));
    grp('입지와 단지');
    line('가까운 역', (r) => (r.st_m == null ? '—' : `${r.st_name} ${f.fmtInt(r.st_m)}m`));
    line('용적률', (r) => (r.far == null ? { t: '—', sub: r.far_note ? '값 없음' : '' } : { t: r.far + '%', sub: r.far_src && r.far_src !== '대장 기재' ? (r.far_note || r.far_src) : '' }));
    line('준공', (r) => (r.year ? { t: `${r.year}년`, sub: r.age != null ? `${r.age}년 경과` : '' } : '—'));
    line('세대수', (r) => (r.units == null ? '—' : f.fmtInt(r.units) + '세대'));
    grp('대출 추정 (현재 조건)');
    const atOf = (r) => { const px = window.sxPx(r); return px.price != null && window.sxLoanAt ? window.sxLoanAt(px.price) : null; };
    line('최대 대출', (r) => { const at = atOf(r); return at && at.best ? { t: f.fmtEok(at.best.lim), sub: at.best.name + (at.best.cut ? ' · 월 상환 한도 적용' : '') } : '—'; });
    line('필요 현금', (r) => { const at = atOf(r); return at ? (at.short > 0 ? { t: f.fmtEok(at.need), cls: 'neg', sub: `부족 ${f.fmtEok(at.short)}` } : f.fmtEok(at.need)) : '—'; });
    line('월 상환', (r) => { const at = atOf(r); return at && at.best ? `${f.fmtInt(Math.round(at.best.pay))}만원` : '—'; });
  }
  function drawTray(ids, byId) {
    const tray = $('tray'), chips = $('tray-chips'); chips.replaceChildren();
    $('tray-n').textContent = String(ids.length);
    ids.forEach((id) => {
      const r = byId.get(id); if (!r) return;
      const c = document.createElement('span'); c.className = 'tchip'; c.append(r.name);
      const x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', `${r.name} 비교함에서 빼기`);
      x.addEventListener('click', () => setCmp(cmpIds().filter((y) => y !== id))); c.appendChild(x); chips.appendChild(c);
    });
    tray.classList.toggle('empty', ids.length === 0 && !$('tray-msg').textContent);
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
    applyPage();
    drawCompare();
  });
})();
