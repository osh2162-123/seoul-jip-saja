// ---------- map
(function () {
  const box = document.getElementById('map');
  const legend = document.getElementById('legend');
  let zt = d3.zoomIdentity;
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true;
  const META = {
    ppy_12m: { label: '평당가', fmt: (v) => window.sxF.fmtPpy(v) },
    chg_1y: { label: '1년 변화율', fmt: (v) => window.sxF.fmtPct(v) },
    vs_2122: { label: '21~22년 대비', fmt: (v) => window.sxF.fmtPct(v) },
    age: { label: '경과연수', fmt: (v) => (v == null ? '—' : v + '년') },
  };
  dash.onData(() => {
    const F = window.sxF;
    const d = dash.data('complexes');
    if (d.status !== 'ok') {
      box.replaceChildren(); legend.replaceChildren();
      if (d.status === 'error') { const f = document.createElement('div'); f.className = 'fail'; f.textContent = 'Failed to load'; box.appendChild(f); }
      return;
    }
    const bm = dash.data('basemap'), stn = dash.data('stations');
    const base = (bm.status === 'ok' ? bm.data : []).map((b) => ({ ...b, paths: typeof b.paths === 'string' ? JSON.parse(b.paths) : (b.paths || []) }));
    const stations = stn.status === 'ok' ? stn.data : [];
    const p = dash.params();
    const key = META[p.color] ? p.color : 'ppy_12m';
    const pts = d.data.filter((r) => r.lat != null && r.lon != null);
    const W = box.clientWidth || 600;
    const lat0 = 37.55, k = Math.cos(lat0 * Math.PI / 180);
    const gu = base.filter((b) => b.kind === 'gu');
    let ext = [];
    if (gu.length) gu.forEach((b) => b.paths.forEach((pa) => pa.forEach((c) => ext.push(c))));
    else ext = pts.map((r) => [r.lon, r.lat]);
    const [x0, x1] = d3.extent(ext, (c) => c[0] * k), [y0, y1] = d3.extent(ext, (c) => c[1]);
    const pad = 10;
    const H = Math.max(320, Math.min(680, Math.round((W - 2 * pad) * (y1 - y0) / (x1 - x0)) + 2 * pad));
    const s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
    const ox = (W - s * (x1 - x0)) / 2, oy = (H - s * (y1 - y0)) / 2;
    const px = (lon) => ox + (lon * k - x0) * s, py = (lat) => H - oy - (lat - y0) * s;
    const X = (r) => px(r.lon), Y = (r) => py(r.lat);
    const line = (pa) => 'M' + pa.map((c) => px(c[0]).toFixed(1) + ',' + py(c[1]).toFixed(1)).join('L');
    const R = d3.scaleSqrt([0, 5000], [1.6, 9]).clamp(true);
    const T = window.sxTheme(), muted = T.dot, bg = T.surface, fg = T.text, water = T.water;
    let color, lo, hi, diverging = false;
    const vals = pts.map((r) => r[key]).filter((v) => v != null).sort(d3.ascending);
    if (key === 'chg_1y' || key === 'vs_2122') {
      diverging = true; const m = key === 'chg_1y' ? 0.3 : 0.4; lo = -m; hi = m;
      const pos = d3.interpolateRgb(d3.interpolateRgb(bg, T.up)(0.15), T.up), neg = d3.interpolateRgb(d3.interpolateRgb(bg, T.down)(0.15), T.down);
      color = (v) => (v >= 0 ? pos(Math.min(1, v / m)) : neg(Math.min(1, -v / m)));
    } else {
      lo = key === 'age' ? 0 : d3.quantileSorted(vals, 0.05); hi = key === 'age' ? 45 : d3.quantileSorted(vals, 0.95);
      const ramp = window.sxRamp(T.ramp);
      color = (v) => ramp(Math.max(0, Math.min(1, (v - lo) / (hi - lo))));
    }
    box.replaceChildren(); box.style.minHeight = H + 'px';
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
    const g = svg.append('g');
    // basemap
    const gb = g.append('g').attr('class', 'base');
    gb.selectAll('path.w').data(base.filter((b) => b.kind === 'water')).join('path').attr('class', 'w')
      .attr('d', (b) => b.paths.map(line).join('') + 'Z').attr('fill', water).attr('fill-rule', 'evenodd').attr('stroke', 'none');
    gb.selectAll('path.gu').data(gu).join('path').attr('class', 'gu')
      .attr('d', (b) => b.paths.map((pa) => line(pa) + 'Z').join('')).attr('fill', 'none').attr('stroke', T.edge).attr('stroke-width', 0.7).attr('vector-effect', 'non-scaling-stroke');
    gb.selectAll('path.l').data(base.filter((b) => b.kind === 'line')).join('path').attr('class', 'l')
      .attr('d', (b) => b.paths.map(line).join('')).attr('fill', 'none').attr('stroke', T.rail).attr('stroke-opacity', 0.7)
      .attr('stroke-width', 1.2).attr('stroke-linecap', 'round').attr('vector-effect', 'non-scaling-stroke');
    // complexes
    const on = pts.filter(window.sxFilter), off = pts.filter((r) => !window.sxFilter(r));
    g.append('g').selectAll('circle').data(off).join('circle').attr('cx', X).attr('cy', Y).attr('r', 1.4).attr('fill', muted).attr('opacity', 0.35).attr('class', 'cx');
    const dots = g.append('g').selectAll('circle').data(on.slice().sort((a, b) => (b.units || 0) - (a.units || 0))).join('circle')
      .attr('class', 'cx').attr('cx', X).attr('cy', Y).attr('r', (r) => R(r.units || 0))
      .attr('fill', (r) => (r[key] == null ? muted : color(r[key]))).attr('fill-opacity', 0.85)
      .attr('stroke', bg).attr('stroke-width', 0.5).style('cursor', 'pointer');
    const sel = pts.find((r) => r.id === p.sel);
    if (sel) g.append('circle').attr('class', 'cx').attr('cx', X(sel)).attr('cy', Y(sel)).attr('r', R(sel.units || 0) + 4).attr('fill', 'none').attr('stroke', fg).attr('stroke-width', 1.5);
    // stations (on top, small)
    const gs = g.append('g').attr('class', 'st');
    const sdots = gs.selectAll('rect').data(stations).join('rect').attr('fill', bg).attr('stroke', fg).attr('stroke-width', 0.8)
      .attr('vector-effect', 'non-scaling-stroke');
    const slabels = gs.selectAll('text').data(stations).join('text').attr('fill', fg).attr('font-size', 11)
      .attr('paint-order', 'stroke').attr('stroke', bg).attr('stroke-width', 3).attr('stroke-linejoin', 'round').text((r) => r.name);
    g.selectAll('circle.cx').attr('vector-effect', 'non-scaling-stroke').each(function () { this.__r = +this.getAttribute('r'); });
    const apply = (t) => {
      g.attr('transform', t);
      const rk = Math.sqrt(t.k);
      g.selectAll('circle.cx').attr('r', function () { return this.__r / rk; });
      const ss = (t.k >= 2.5 ? 4 : 2.6) / t.k;
      sdots.attr('x', (r) => px(r.lon) - ss).attr('y', (r) => py(r.lat) - ss).attr('width', 2 * ss).attr('height', 2 * ss).attr('rx', ss * 0.4)
        .attr('display', t.k >= 1.6 ? null : 'none');
      slabels.attr('x', (r) => px(r.lon) + 6 / t.k).attr('y', (r) => py(r.lat) - 5 / t.k).attr('font-size', 11 / t.k).attr('stroke-width', 3 / t.k)
        .attr('display', t.k >= 4 ? null : 'none');
    };
    const zoom = d3.zoom().scaleExtent([1, 16]).translateExtent([[0, 0], [W, H]]).on('zoom', (e) => { zt = e.transform; apply(zt); });
    svg.call(zoom).call(zoom.transform, zt);
    box.appendChild(tip);
    dots.on('mousemove', (e, r) => {
      tip.hidden = false;
      tip.replaceChildren();
      const a = document.createElement('div'); a.className = 't1'; a.textContent = `${r.gu} ${r.dong}`;
      const b = document.createElement('div'); b.textContent = r.name;
      const c = document.createElement('div'); c.textContent = `${META[key].label} ${META[key].fmt(r[key])} · 준공 ${r.year ?? '—'}`;
      tip.append(a, b, c);
      if (r.st_name) { const e2 = document.createElement('div'); e2.textContent = `${r.st_name} ${F.fmtInt(r.st_m)}m`; tip.appendChild(e2); }
      const [mx, my] = d3.pointer(e, box);
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(0, Math.min(box.clientWidth - tw, mx + 12)) + 'px';
      tip.style.top = Math.max(0, my - th - 10) + 'px';
    }).on('mouseleave', () => { tip.hidden = true; })
      .on('click', (e, r) => dash.setParams({ sel: r.id }));
    // legend
    legend.replaceChildren();
    const l = (t) => { const s2 = document.createElement('span'); s2.textContent = t; return s2; };
    const bar = document.createElement('span'); bar.className = 'ramp';
    const stops = d3.range(0, 1.01, 0.1).map((t) => color(lo + t * (hi - lo)));
    bar.style.background = `linear-gradient(90deg, ${stops.join(',')})`;
    legend.append(l(META[key].label), l(META[key].fmt(lo) + (diverging || key === 'age' ? '' : ' 이하')), bar, l(META[key].fmt(hi) + ' 이상'), l(`· 표시 ${F.fmtInt(on.length)}개 단지`));
  });
})();
