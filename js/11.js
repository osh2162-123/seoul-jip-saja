// ---------- district bars
(function () {
  const box = document.getElementById('gu-bars');
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true;
  dash.onData(() => {
    const F = window.sxF;
    const g = dash.data('gu_stats');
    box.replaceChildren();
    if (g.status !== 'ok') { if (g.status === 'error') { const f = document.createElement('div'); f.className = 'fail'; f.textContent = 'Failed to load'; box.appendChild(f); } return; }
    const p = dash.params();
    const rows = g.data.filter((r) => r.med_chg != null).slice().sort((a, b) => b.med_chg - a.med_chg);
    const W = box.clientWidth || 600, rh = 21, top = 4;
    const H = top + rows.length * rh + 4;
    box.style.minHeight = H + 'px';
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
    const probe = svg.append('text').attr('font-size', 12).text('동대문구');
    const lw = probe.node().getComputedTextLength() + 10; probe.remove();
    const vw = 56;
    const mn = Math.min(0, d3.min(rows, (r) => r.med_chg)), mx = d3.max(rows, (r) => r.med_chg);
    const x = d3.scaleLinear([mn, mx], [lw, W - vw]);
    const y = (i) => top + i * rh;
    const T = window.sxTheme(), c0 = T.accent, muted = T.dot;
    svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', H).attr('stroke', T.axis);
    const gr = svg.selectAll('g.r').data(rows).join('g').attr('class', 'r').style('cursor', 'pointer')
      .on('click', (e, r) => dash.setParams({ gu: p.gu === r.gu ? null : r.gu }))
      .on('mousemove', (e, r) => {
        tip.hidden = false; tip.replaceChildren();
        const a = document.createElement('div'); a.className = 't1'; a.textContent = r.gu;
        const b = document.createElement('div'); b.textContent = `1년 ${F.fmtPct(r.med_chg)} · 평당 ${F.fmtPpy(r.med_ppy)}`;
        const c = document.createElement('div'); c.textContent = `거래 활발 ${r.n_active}개 · 30년+ ${r.n_old}개 (6억 미만 ${r.n_old_cheap} · 5억 미만 ${r.n_old_5})`;
        tip.append(a, b, c);
        const [mx2, my2] = d3.pointer(e, box);
        tip.style.left = Math.max(0, Math.min(box.clientWidth - tip.offsetWidth, mx2 + 12)) + 'px';
        tip.style.top = Math.max(0, my2 - tip.offsetHeight - 8) + 'px';
      }).on('mouseleave', () => { tip.hidden = true; });
    const hot = (r) => r.gu === p.gu;
    gr.append('rect').attr('x', (r) => Math.min(x(0), x(r.med_chg))).attr('y', (r, i) => y(i) + 3).attr('height', rh - 6)
      .attr('width', (r) => Math.max(1, Math.abs(x(r.med_chg) - x(0)))).attr('rx', 4).attr('fill', (r) => (hot(r) ? c0 : muted));
    gr.append('text').attr('x', lw - 8).attr('y', (r, i) => y(i) + rh / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 12)
      .attr('fill', (r) => (hot(r) ? T.text : T.textSub)).attr('font-weight', (r) => (hot(r) ? 600 : 400)).text((r) => r.gu);
    gr.append('text').attr('x', (r) => Math.max(x(0), x(r.med_chg)) + 6).attr('y', (r, i) => y(i) + rh / 2).attr('dy', '0.35em').attr('font-size', 12)
      .attr('fill', T.textSub).style('font-variant-numeric', 'tabular-nums').text((r) => F.fmtPct(r.med_chg));
    box.appendChild(tip);
  });
})();
