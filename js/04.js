// ---------- header tiles & takeaway
dash.onData(() => {
  const F = window.sxF;
  const s = dash.data('seoul');
  const fields = { n_active: (v) => F.fmtInt(v), med_ppy: F.fmtPpy, med_chg: F.fmtPct, n_old: (v) => F.fmtInt(v) };
  document.querySelectorAll('.sx .tile .num').forEach((el) => {
    if (s.status === 'ok') { el.classList.remove('dash-skeleton'); el.textContent = fields[el.dataset.field](s.data[0][el.dataset.field]); }
    else if (s.status === 'error') { el.classList.remove('dash-skeleton'); el.textContent = '—'; }
    else el.textContent = '—';
  });
  const t = document.getElementById('takeaway');
  const g = dash.data('gu_stats');
  if (g.status !== 'ok') { t.innerHTML = '<span class="dash-skeleton">—</span>'; if (g.status === 'error') t.textContent = '—'; return; }
  const rows = g.data.filter((r) => r.med_chg != null).slice().sort((a, b) => b.med_chg - a.med_chg);
  const span = (r) => { const b = document.createElement('b'); b.dataset.source = 'gu_stats'; b.dataset.field = 'med_chg'; b.dataset.where = 'gu=' + encodeURIComponent(r.gu); b.textContent = F.fmtPct(r.med_chg); return b; };
  t.replaceChildren();
  t.append('최근 1년 평당가 상승은 ');
  rows.slice(0, 3).forEach((r, i) => { t.append((i ? ', ' : '') + r.gu + ' '); t.append(span(r)); });
  t.append(' 순으로 높았습니다. ');
  t.append('가장 낮은 곳은 ');
  rows.slice(-3).reverse().forEach((r, i) => { t.append((i ? ', ' : '') + r.gu + ' '); t.append(span(r)); });
  t.append('입니다.');
});
