// ---------- loan engine: 상품별 대출 한도 계산 (화면과 분리된 순수 계산. 규정값 R·금리표 rates·입력 I 를 받아 행 목록을 돌려준다)
(function () {
  const annual = (rate, years) => { const r = rate / 100 / 12, n = years * 12; return r === 0 ? 12 / n : 12 * r / (1 - Math.pow(1 + r, -n)); };
  const eok = (man) => (man == null || !isFinite(man) ? '—' : String(Number((man / 10000).toFixed(2))) + '억');
  const won = (man) => (man == null || !isFinite(man) ? '—' : d3.format(',')(Math.round(man)) + '만');

  function nbRate(rates, inc, term) {
    const rows = rates.filter((x) => x.group === '신생아 특례');
    const terms = [10, 15, 20, 30];
    const t = terms.reduce((a, b) => (Math.abs(b - term) < Math.abs(a - term) ? b : a), 30);
    const band = rows.filter((x) => x.term === t && inc <= x.income_max).sort((a, b) => a.income_max - b.income_max)[0];
    return band ? { rate: band.rate, term: t, band: band.income_max } : null;
  }

  // all products at one price -> rows
  function compute(R, rates, price, I) {
    const rows = [];
    const ratio = { var: R.stress_ratio_var, mixed: R.stress_ratio_mixed, cycle: R.stress_ratio_cycle }[I.type];
    const stress = R.stress_floor * ratio;
    const pick = (lim, byInc, byLtv, labels) => (lim === byInc ? labels[0] : lim === byLtv ? labels[1] : labels[2]);
    { // 일반 주담대
      const ltv = I.first ? R.gen_ltv_first : R.gen_ltv;
      const cap = price <= 150000 ? R.gen_cap_15 : price <= 250000 ? R.gen_cap_25 : R.gen_cap_over;
      const byInc = Math.max(0, (R.dsr_cap * I.inc - I.debtPI) / annual(I.rate + stress, I.term));
      const byLtv = price * ltv, lim = Math.min(byLtv, byInc, cap);
      rows.push({ name: '일반 주담대', ok: true, elig: `가능 · LTV ${Math.round(ltv * 100)}%`, ltv: byLtv, inc: byInc, incLabel: 'DSR', cap, lim, rate: I.rate, pay: lim * annual(I.rate, I.term) / 12,
        why: pick(lim, byInc, byLtv, [`DSR 40% (스트레스 +${stress.toFixed(1)}%p 적용 금리 ${(I.rate + stress).toFixed(2)}%)`, `LTV ${Math.round(ltv * 100)}%`, `주담대 상한 ${eok(cap)}`]) });
    }
    { // 보금자리론
      const capInc = I.hh === 'newlywed' ? [R.bog_income_nw, R.bog_income_nw1, R.bog_income_nw2][I.kids] : R.bog_income;
      const reasons = []; let dtiInc = I.inc, viaOne = false;
      if (I.inc > capInc && I.hh === 'newlywed') {
        const one = [I.inc1, I.inc2].filter((x) => x > 0 && x <= R.bog_one_income).sort((a, b) => b - a)[0];
        if (one != null) { dtiInc = one; viaOne = true; }
      }
      if (I.inc > capInc && !viaOne) reasons.push(`소득 ${won(I.inc)} > ${won(capInc)}`);
      if (price > R.bog_price) reasons.push(`주택가격 ${eok(price)} > ${eok(R.bog_price)}`);
      const ltv = I.first ? R.bog_ltv_first : R.bog_ltv_reg, cap = I.first ? R.bog_cap_first : R.bog_cap;
      const byInc = Math.max(0, (R.bog_dti_reg * dtiInc - I.debtInt) / annual(I.rateBog, I.term));
      const byLtv = price * ltv, ok = !reasons.length, lim = ok ? Math.min(byLtv, byInc, cap) : null;
      rows.push({ name: '보금자리론', ok, elig: ok ? `가능 · LTV ${Math.round(ltv * 100)}%` + (viaOne ? ` · 차주 1인 소득(${won(dtiInc)}) 기준` : '') : '불가', ltv: byLtv, inc: byInc, incLabel: 'DTI', cap, lim, rate: I.rateBog,
        pay: ok ? lim * annual(I.rateBog, I.term) / 12 : null, why: ok ? pick(lim, byInc, byLtv, [`DTI ${Math.round(R.bog_dti_reg * 100)}%`, `LTV ${Math.round(ltv * 100)}%`, `상품 한도 ${eok(cap)}`]) : reasons.join(', ') });
    }
    { // 디딤돌
      const reasons = []; let incCap, priceCap, cap, dtiInc = I.inc, viaOne = false;
      if (I.hh === 'single') reasons.push('미혼은 만 30세 이상 단독세대주만 신청 가능(주택·한도 조건 별도)');
      if (I.hh === 'newlywed' || I.kids >= 2) { incCap = I.hh === 'newlywed' ? R.did_income_nw : R.did_income_first; priceCap = R.did_price_nw; cap = R.did_cap_nw; }
      else { incCap = I.first ? R.did_income_first : R.did_income; priceCap = R.did_price; cap = I.first ? R.did_cap_first : R.did_cap; }
      if (I.hh !== 'single') {
        if (I.inc > incCap && I.hh === 'newlywed' && I.didOne) {
          const one = [I.inc1, I.inc2].filter((x) => x > 0 && x <= R.did_one_income).sort((a, b) => b - a)[0];
          if (one != null) { dtiInc = one; viaOne = true; }
        }
        if (I.inc > incCap && !viaOne) reasons.push(`소득 ${won(I.inc)} > ${won(incCap)}`);
        if (price > priceCap) reasons.push(`주택가격 ${eok(price)} > ${eok(priceCap)}`);
      }
      const byInc = Math.max(0, (R.did_dti * dtiInc - I.debtInt) / annual(I.rateDid, I.term));
      const byLtv = price * R.did_ltv, ok = !reasons.length, lim = ok ? Math.min(byLtv, byInc, cap) : null;
      rows.push({ name: '디딤돌', ok, elig: ok ? `가능 · LTV ${Math.round(R.did_ltv * 100)}%` + (viaOne ? ` · 1인 소득(${won(dtiInc)}) 기준, 시행 전일 수 있음` : '') : '불가', ltv: byLtv, inc: byInc, incLabel: 'DTI', cap: I.hh === 'single' ? null : cap, lim, rate: I.rateDid,
        pay: ok ? lim * annual(I.rateDid, I.term) / 12 : null, why: ok ? pick(lim, byInc, byLtv, [`DTI ${Math.round(R.did_dti * 100)}%`, `LTV ${Math.round(R.did_ltv * 100)}%`, `상품 한도 ${eok(cap)}`]) : reasons.join(', ') });
    }
    { // 신생아 특례 (구입)
      const reasons = [];
      if (!I.newborn) reasons.push('2년 내 출산·입양 가구만 가능');
      const dual = I.inc1 > 0 && I.inc2 > 0;
      const incOk = I.inc <= R.nb_income || (dual && I.inc <= R.nb_income_dual && I.inc1 <= R.nb_income && I.inc2 <= R.nb_income);
      if (!incOk) reasons.push(`소득 ${won(I.inc)} 기준 초과`);
      if (price > R.nb_price) reasons.push(`주택가격 ${eok(price)} > ${eok(R.nb_price)}`);
      const nr = nbRate(rates, I.inc, I.term);
      if (!nr) reasons.push('금리표 구간 없음');
      const rate = nr ? nr.rate : null;
      const byInc = nr ? Math.max(0, (R.nb_dti * I.inc - I.debtInt) / annual(rate, I.term)) : 0;
      const byLtv = price * R.nb_ltv, ok = !reasons.length, lim = ok ? Math.min(byLtv, byInc, R.nb_cap) : null;
      rows.push({ name: '신생아 특례', ok, elig: ok ? `가능 · 금리 ${rate.toFixed(2)}%(${R.nb_period}년 특례)` : '불가', ltv: byLtv, inc: byInc, incLabel: 'DTI', cap: R.nb_cap, lim, rate,
        pay: ok ? lim * annual(rate, I.term) / 12 : null, why: ok ? pick(lim, byInc, byLtv, [`DTI ${Math.round(R.nb_dti * 100)}%`, `LTV ${Math.round(R.nb_ltv * 100)}%`, `상품 한도 ${eok(R.nb_cap)}`]) : reasons.join(', ') });
    }
    return rows;
  }
  const bestOf = (rows) => rows.filter((r) => r.ok).sort((a, b) => b.lim - a.lim)[0];

  window.sxLoan = { annual, eok, won, nbRate, compute, bestOf };
})();
