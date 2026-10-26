// ---------- detail
(function () {
  const box = document.getElementById('detail');
  const wrap = document.getElementById('types-wrap');
  const tbody = document.querySelector('#types-table tbody');
  dash.onData(() => {
    const F = window.sxF;
    const p = dash.params();
    const d = dash.data('complexes');
    if (d.status !== 'ok') { box.replaceChildren(); wrap.hidden = true; if (d.status === 'error') { const f = document.createElement('div'); f.className = 'fail'; f.textContent = 'Failed to load'; box.appendChild(f); } return; }
    const r = d.data.find((x) => x.id === p.sel);
    if (!r) { box.innerHTML = '<p class="note">지도나 표에서 단지를 누르세요.</p>'; wrap.hidden = true; return; }
    const where = 'id=' + encodeURIComponent(r.id);
    const cell = (field, text) => { const s = document.createElement('span'); s.dataset.source = 'complexes'; s.dataset.field = field; s.dataset.where = where; s.textContent = text; return s; };
    box.replaceChildren();
    const nm = document.createElement('p'); nm.className = 'dname'; nm.appendChild(cell('name', r.name)); box.appendChild(nm);
    const sub = document.createElement('p'); sub.className = 'note'; sub.append(cell('gu', r.gu), ' ', cell('dong', r.dong), ' ', cell('jibun', r.jibun)); box.appendChild(sub);
    const dl = document.createElement('dl'); dl.className = 'dl';
    const row = (label, field, text, cls) => { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); const c = cell(field, text); if (cls) c.className = cls; dd.appendChild(c); dl.append(dt, dd); };
    const pn = (v) => (v == null ? '' : v >= 0 ? 'pos' : 'neg');
    row('가까운 역', 'st_name', r.st_name == null ? '—' : r.st_name);
    if (r.st_m != null) row('역까지 직선거리', 'st_m', F.fmtInt(r.st_m) + 'm');
    row('준공', 'year', r.year == null ? '—' : r.year + '년');
    row('경과연수', 'age', r.age == null ? '—' : r.age + '년');
    row('세대수 (대장)', 'units', r.units == null ? '—' : F.fmtInt(r.units) + (r.shared > 1 ? ` (단지 ${r.shared}개 합계)` : ''));
    row('용도지역', 'zone', r.zone || '—');
    row('용적률', 'far', r.far != null ? r.far + '%' + (r.far_src && r.far_src !== '대장 기재' ? ` (${r.far_note || r.far_src})` : '') : (r.far_note || '—'));
    if (r.site_m2 != null) row('대지면적', 'site_m2', `${F.fmtInt(Math.round(r.site_m2))}㎡ (${F.fmtInt(Math.round(r.site_m2 / 3.3058))}평)` + (r.site_src ? ` · ${r.site_src}` : ''));
    row('세대당 대지 (평균)', 'site_py_per_unit', r.site_py_per_unit == null ? '—' : r.site_py_per_unit + '평');
    row('최근 12개월 거래', 'trades_12m', F.fmtInt(r.trades_12m) + '건');
    row('평당가 (전용)', 'ppy_12m', F.fmtPpy(r.ppy_12m));
    row('1년 변화율', 'chg_1y', F.fmtPct(r.chg_1y), pn(r.chg_1y));
    row('21~22년 대비', 'vs_2122', F.fmtPct(r.vs_2122), pn(r.vs_2122));
    const px = window.sxPx(r);
    row(px.band ? '시세 (정한 면적 구간)' : '최소 평형 중위가', 'min_price', px.price == null ? '—' : `${F.fmtEok(px.price)} (전용 ${px.area}㎡)` + (px.n != null ? ` · 12개월 ${px.n}건` : '') + (px.thin ? ' · 표본 적음' : ''));
    const tr0 = window.sxTrades(r); if (tr0.last) row('마지막 거래', 'last_date', tr0.last);
    box.appendChild(dl);
    if (r.suspect) { const w = document.createElement('p'); w.className = 'note'; w.textContent = '이 단지는 건축물대장 연결이 의심됩니다(거래 수가 대장 세대수에 비해 너무 많음). 세대수·용적률을 믿지 마세요.'; box.appendChild(w); }
    if (r.register_match === '없음') { const w = document.createElement('p'); w.className = 'note'; w.textContent = '건축물대장과 연결되지 않아 세대수·용적률·위치가 없습니다.'; box.appendChild(w); }
    const t = dash.data('types');
    if (t.status !== 'ok') { wrap.hidden = true; return; }
    const rows = t.data.filter((x) => x.id === r.id).sort((a, b) => a.area - b.area);
    wrap.hidden = !rows.length;
    tbody.replaceChildren(...rows.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(x.id) + ',' + x.area;
      [x.area, x.n_12m, F.fmtEok(x.med_12m), F.fmtEok(x.min_12m), F.fmtEok(x.max_12m), F.fmtEok(x.med_prev), F.fmtEok(x.med_2122), x.last_date, F.fmtEok(x.last_price)].forEach((v, i) => {
        const td = document.createElement('td'); td.textContent = v == null ? '—' : v; if (i === 3 || i === 4) td.className = 'hide-narrow'; tr.appendChild(td);
      });
      return tr;
    }));
  });
})();
