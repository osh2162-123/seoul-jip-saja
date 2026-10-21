// ---------- source list for rules and rates (standalone page only)
(function () {
  const link = (url) => {
    const td = document.createElement('td');
    if (typeof url === 'string' && /^https:\/\//.test(url)) {
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      try { a.textContent = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { a.textContent = '링크'; }
      td.appendChild(a);
    } else td.textContent = '—';
    return td;
  };
  const fmt = (r) => {
    const v = Number(r.value), l = r.label || '';
    if (/\(만원\)/.test(l)) return d3.format(',')(v) + '만원';
    if (/\(%p\)/.test(l)) return v + '%p';
    if (/\(%\)/.test(l)) return v + '%';
    if (/\(년\)/.test(l)) return v + '년';
    if (v > 0 && v <= 1 && /LTV|DTI|DSR|비율/.test(l)) return Math.round(v * 100) + '%';
    return String(v);
  };
  const cell = (t) => { const td = document.createElement('td'); td.textContent = t; return td; };
  dash.onData(() => {
    const rs = dash.data('loan_rules'), rt = dash.data('rates');
    const b1 = document.querySelector('#src-rules tbody'), b2 = document.querySelector('#src-rates tbody');
    b1.replaceChildren(); b2.replaceChildren();
    if (rs.status === 'ok') {
      document.getElementById('src-n-rules').textContent = rs.data.length;
      rs.data.forEach((r) => { const tr = document.createElement('tr'); tr.append(cell(r.label.replace(/\((만원|%p|%|년)\)/, '').trim()), cell(fmt(r)), cell(r.basis || ''), link(r.source)); b1.appendChild(tr); });
    }
    if (rt.status === 'ok') {
      document.getElementById('src-n-rates').textContent = rt.data.length;
      rt.data.forEach((r) => { const tr = document.createElement('tr'); tr.append(cell(r.label), cell(Number(r.rate).toFixed(2) + (/\(%p/.test(r.label) ? '%p' : '%')), cell(r.as_of || ''), link(r.source)); b2.appendChild(tr); });
    }
  });
})();
