// ---------- calculations
dash.calc('seoul', {
  inputs: ['complexes'],
  title: '서울 전체 요약',
  description: '최근 12개월 중개거래 5건 이상 단지의 수, 평당가 중위, 1년 변화율 중위, 그리고 준공 30년 이상 단지 수.',
  fn: (complexes) => {
    const median = (a) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const act = complexes.filter((r) => r.trades_12m >= 5);
    return [{
      n_active: act.length,
      med_ppy: Math.round(median(act.map((r) => r.ppy_12m))),
      med_chg: median(act.map((r) => r.chg_1y)),
      n_old: complexes.filter((r) => r.age != null && r.age >= 30).length,
    }];
  },
});
dash.calc('gu_stats', {
  inputs: ['complexes'],
  title: '자치구별 요약',
  description: '자치구별 거래 활발 단지(최근 12개월 5건 이상) 수, 평당가 중위, 1년 변화율 중위, 30년 이상 단지 수, 그중 최소 평형 최근 중위가 6억 미만·5억 미만 단지 수.',
  fn: (complexes) => {
    const median = (a) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const by = {};
    complexes.forEach((r) => { (by[r.gu] = by[r.gu] || []).push(r); });
    return Object.keys(by).sort().map((gu) => {
      const all = by[gu]; const act = all.filter((r) => r.trades_12m >= 5);
      const old = all.filter((r) => r.age != null && r.age >= 30);
      return {
        gu,
        n_active: act.length,
        med_ppy: Math.round(median(act.map((r) => r.ppy_12m))),
        med_chg: median(act.map((r) => r.chg_1y)),
        n_old: old.length,
        n_old_cheap: old.filter((r) => r.min_price != null && r.min_price < 60000).length,
        n_old_5: old.filter((r) => r.min_price != null && r.min_price < 50000).length,
      };
    });
  },
});
