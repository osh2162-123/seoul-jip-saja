// ---------- 단지별 기준 시세: 면적 구간(a_min~a_max)을 정하면 그 안에서 가장 싼 평형, 아니면 단지의 최소 평형
(function () {
  const THIN = 3; // 최근 12개월 거래가 이보다 적으면 '표본 적음' (평형별 거래 수의 절반 이상이 3건 미만)
  let idx = null, idxN = -1;
  const index = () => {
    const t = dash.data('types');
    if (t.status !== 'ok') return null;
    if (!idx || idxN !== t.data.length) {
      idx = new Map();
      t.data.forEach((x) => { let a = idx.get(x.id); if (!a) idx.set(x.id, (a = [])); a.push(x); });
      idxN = t.data.length;
    }
    return idx;
  };
  const rowsOf = (r) => { const m = index(); return (m && m.get(r.id)) || []; };
  window.sxThin = THIN;
  window.sxBandOn = () => { const p = dash.params(); return p.a_min != null || p.a_max != null; };
  // 반환: { band, price(만원), area(㎡), n(그 평형 12개월 거래 수), last(그 평형 마지막 거래일), thin }
  window.sxPx = (r) => {
    const p = dash.params(), a0 = p.a_min, a1 = p.a_max, rows = rowsOf(r);
    if ((a0 != null || a1 != null) && index()) {
      let pick = null;
      rows.forEach((x) => {
        if (x.med_12m == null || !(x.n_12m >= 1)) return;
        if (a0 != null && x.area < a0) return;
        if (a1 != null && x.area > a1) return;
        if (!pick || x.med_12m < pick.med_12m) pick = x;
      });
      return pick ? { band: true, price: pick.med_12m, area: pick.area, n: pick.n_12m, last: pick.last_date, thin: pick.n_12m < THIN }
        : { band: true, price: null, area: null, n: null, last: null, thin: false };
    }
    if (r.min_price == null) return { band: false, price: null, area: null, n: null, last: null, thin: false };
    const x = rows.find((y) => y.area === r.min_area);
    const n = x ? x.n_12m : null;
    return { band: false, price: r.min_price, area: r.min_area, n, last: x ? x.last_date : null, thin: n != null && n < THIN };
  };
  // 단지 전체: 최근 12개월·직전 12개월 거래 수, 마지막 거래일
  window.sxTrades = (r) => {
    const rows = rowsOf(r);
    let last = null, prev = 0;
    rows.forEach((x) => { prev += x.n_prev || 0; if (x.last_date && (!last || x.last_date > last)) last = x.last_date; });
    return { n12: r.trades_12m, nPrev: rows.some((x) => x.n_prev != null) ? prev : null, last };
  };
})();
