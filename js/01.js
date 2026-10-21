// Standalone stand-in for the dashboard runtime: same page code, embedded data.
(function () {
  const raw = JSON.parse(document.getElementById('sx-data').textContent);
  const unpack = (t) => t.rows.map((r) => Object.fromEntries(t.cols.map((c, i) => [c, r[i]])));
  const T = { complexes: unpack(raw.complexes), trend: unpack(raw.trend), types: unpack(raw.types), basemap: raw.basemap, stations: raw.stations, loan_rules: raw.loan_rules, rates: raw.rates };
  const DEFAULTS = { color: 'ppy_12m', gu: null, old: false, zone: null, units_min: null, units_max: null, far_min: null, far_max: null, far_null: false, pmin: null, pmax: null, st_min: null, st_max: null, cmp: [], sel: '11305-6' };
  let params = { ...DEFAULTS };
  const cbs = []; const calcs = [];
  const run = () => { calcs.forEach((c) => { T[c.id] = c.fn(...c.inputs.map((i) => T[i])); }); cbs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); };
  window.dash = {
    colors: ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)'],
    data: (id) => ({ status: T[id] ? 'ok' : 'missing', data: T[id] || [] }),
    params: () => params,
    setParams: (o) => { params = { ...params, ...o }; run(); },
    resetParams: () => { params = { ...DEFAULTS }; run(); },
    calc: (id, spec) => { calcs.push({ id, ...spec }); T[id] = spec.fn(...spec.inputs.map((i) => T[i])); },
    loader: () => {}, refresh: () => {}, setLink: () => {},
    onData: (fn) => { cbs.push(fn); try { fn(); } catch (e) { console.error(e); } },
  };
  let w = innerWidth, tm;
  window.addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => { if (innerWidth !== w) { w = innerWidth; run(); } }, 150); });
})();
