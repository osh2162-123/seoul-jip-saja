// ---------- price trend for the selected complex
(function () {
  const card = document.getElementById('trend-card');
  const box = document.getElementById('trend');
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true;
  const qDate = (q) => new Date(Date.UTC(+q.slice(0, 4), (+q.slice(-1) - 1) * 3 + 1, 15));
  dash.onData(() => {
    const F = window.sxF;
    const p = dash.params();
    const t = dash.data('trend'), ty = dash.data('types');
    box.replaceChildren();
    if (!p.sel) { card.hidden = true; return; }
    card.hidden = false;
    if (t.status !== 'ok') { if (t.status === 'error') { const f = document.createElement('div'); f.className = 'fail'; f.textContent = 'Failed to load'; box.appendChild(f); } return; }
    const mine = t.data.filter((r) => r.id === p.sel);
    if (!mine.length) { const n = document.createElement('p'); n.className = 'note'; n.textContent = '이 단지는 5년간 중개거래가 없습니다.'; box.appendChild(n); return; }
    const cnt = d3.rollup(mine, (v) => d3.sum(v, (r) => r.n), (r) => r.area);
    const areas = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]).sort((a, b) => a - b);
    const qs = [...new Set(t.data.map((r) => r.q))].sort();
    const series = areas.map((a, i) => ({ area: a, color: window.sxTheme().series[i], dash: [null, '6 3', '2 3'][i], pts: mine.filter((r) => r.area === a).map((r) => ({ ...r, date: qDate(r.q) })).sort((x, y) => x.date - y.date) }));
    const W = box.clientWidth || 400, H = 220;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
    const all = series.flatMap((s) => s.pts);
    const y = d3.scaleLinear([d3.min(all, (r) => r.med) * 0.92, d3.max(all, (r) => r.med) * 1.04], [H - 24, 8]).nice(4);
    const probe = svg.append('text').attr('font-size', 11).text(F.fmtEok(y.domain()[1]));
    const ml = probe.node().getComputedTextLength() + 8; probe.remove();
    const endW = 64;
    const x = d3.scaleUtc([qDate(qs[0]), qDate(qs[qs.length - 1])], [ml, W - endW]);
    const T = window.sxTheme(), muted = T.textSub, gridc = T.grid, axisc = T.axis;
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', ml).attr('x2', W - endW).attr('y1', y).attr('y2', y).attr('stroke', gridc);
    svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', ml - 6).attr('y', y).attr('dy', '0.35em').attr('text-anchor', 'end')
      .attr('font-size', 11).attr('fill', muted).style('font-variant-numeric', 'tabular-nums').text(F.fmtEok);
    const years = d3.utcYear.range(d3.utcYear.ceil(x.domain()[0]), x.domain()[1]);
    svg.append('line').attr('x1', ml).attr('x2', W - endW).attr('y1', H - 24).attr('y2', H - 24).attr('stroke', axisc);
    svg.append('g').selectAll('text').data(years).join('text').attr('x', x).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', muted).text(d3.utcFormat('%Y'));
    const gl = svg.append('g');
    series.forEach((s) => {
      // break the line where a quarter has no trade
      const qi = (r) => qs.indexOf(r.q);
      const ln = d3.line().defined((r, i, arr) => true).x((r) => x(r.date)).y((r) => y(r.med));
      let seg = [], segs = [];
      s.pts.forEach((r, i) => { if (i && qi(r) - qi(s.pts[i - 1]) > 1) { segs.push(seg); seg = []; } seg.push(r); });
      segs.push(seg);
      segs.forEach((sg) => gl.append('path').attr('d', ln(sg)).attr('fill', 'none').attr('stroke', s.color).attr('stroke-dasharray', s.dash).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round'));
      gl.append('g').selectAll('circle').data(s.pts).join('circle').attr('cx', (r) => x(r.date)).attr('cy', (r) => y(r.med)).attr('r', 2.2).attr('fill', s.color);
    });
    // end labels, nudged apart
    const ends = series.map((s) => { const last = s.pts[s.pts.length - 1]; return { s, last, yy: y(last.med) }; }).sort((a, b) => a.yy - b.yy);
    for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 13) ends[i].yy = ends[i - 1].yy + 13;
    svg.append('g').selectAll('text').data(ends).join('text').attr('x', (e) => x(e.last.date) + 6).attr('y', (e) => e.yy).attr('dy', '0.35em')
      .attr('font-size', 11).attr('fill', (e) => e.s.color).text((e) => `${e.s.area}㎡ ${F.fmtEok(e.last.med)}`);
    // hover
    const rule = svg.append('line').attr('y1', 8).attr('y2', H - 24).attr('stroke', T.ref).attr('display', 'none');
    box.appendChild(tip);
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', W - endW - ml).attr('height', H - 24).attr('fill', 'transparent')
      .on('mousemove', (e) => {
        const [mx] = d3.pointer(e);
        const dt = x.invert(mx);
        const q = qs.reduce((b, c) => (Math.abs(qDate(c) - dt) < Math.abs(qDate(b) - dt) ? c : b), qs[0]);
        rule.attr('display', null).attr('x1', x(qDate(q))).attr('x2', x(qDate(q)));
        tip.hidden = false; tip.replaceChildren();
        const h = document.createElement('div'); h.className = 't1'; h.textContent = q.replace('-Q', '년 ') + '분기'; tip.appendChild(h);
        series.forEach((s) => {
          const r = s.pts.find((v) => v.q === q);
          const row = document.createElement('div');
          const sw = document.createElement('span'); sw.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;background:${s.color}`;
          row.append(sw, `${s.area}㎡ ${r ? F.fmtEok(r.med) + ` (${r.n}건)` : '거래 없음'}`);
          tip.appendChild(row);
        });
        const [bx, by] = d3.pointer(e, box);
        tip.style.left = Math.max(0, Math.min(box.clientWidth - tip.offsetWidth, bx + 12)) + 'px';
        tip.style.top = Math.max(0, by - tip.offsetHeight - 8) + 'px';
      }).on('mouseleave', () => { tip.hidden = true; rule.attr('display', 'none'); });
  });
})();
