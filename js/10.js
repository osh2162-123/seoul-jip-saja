// ---------- loan calculator (rules from loan_rules, policy rate tables from rates; income and bank rates are the viewer's inputs)
(function () {
  const $ = (id) => document.getElementById(id);
  const ids = ['l-price', 'l-inc1', 'l-inc2', 'l-hh', 'l-kids', 'l-first', 'l-newborn', 'l-did-one', 'l-debt-pi', 'l-debt-int', 'l-rate', 'l-type', 'l-rate-bog', 'l-rate-did', 'l-term', 'b-cash', 'b-fee', 'r-bal', 'r-rate', 'r-left', 'r-after'];
  let seeded = false, priceTouched = false;
  const annual = (rate, years) => { const r = rate / 100 / 12, n = years * 12; return r === 0 ? 12 / n : 12 * r / (1 - Math.pow(1 + r, -n)); };
  const eok = (man) => (man == null || !isFinite(man) ? '—' : String(Number((man / 10000).toFixed(2))) + '억');
  const won = (man) => (man == null || !isFinite(man) ? '—' : d3.format(',')(Math.round(man)) + '만');
  const v = (id) => { const el = $(id); return el.type === 'checkbox' ? el.checked : el.value; };
  const n = (id) => { const x = Number(v(id)); return isFinite(x) ? x : 0; };

  function selPrice() {
    const d = dash.data('complexes'); if (d.status !== 'ok') return null;
    const r = d.data.find((x) => x.id === dash.params().sel); if (!r || r.min_price == null) return null;
    return { price: r.min_price, label: `${r.name} 전용 ${r.min_area}㎡ 최근 12개월 중위가` };
  }
  function nbRate(rates, inc, term) {
    const rows = rates.filter((x) => x.group === '신생아 특례');
    const terms = [10, 15, 20, 30];
    const t = terms.reduce((a, b) => (Math.abs(b - term) < Math.abs(a - term) ? b : a), 30);
    const band = rows.filter((x) => x.term === t && inc <= x.income_max).sort((a, b) => a.income_max - b.income_max)[0];
    return band ? { rate: band.rate, term: t, band: band.income_max } : null;
  }
  $('l-use-sel').addEventListener('click', () => { const s = selPrice(); if (s) { $('l-price').value = (s.price / 10000).toFixed(2); priceTouched = true; draw(); } });
  $('l-price').addEventListener('input', () => { priceTouched = true; });
  ids.forEach((id) => $(id).addEventListener($(id).type === 'checkbox' || $(id).tagName === 'SELECT' ? 'change' : 'input', draw));

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

  function draw() {
    const rs = dash.data('loan_rules'), rt = dash.data('rates');
    const tbody = document.querySelector('#loan-table tbody'); tbody.replaceChildren();
    const notes = $('loan-notes'); notes.replaceChildren();
    if (rs.status !== 'ok' || rt.status !== 'ok') { $('loan-sum').textContent = rs.status === 'error' || rt.status === 'error' ? '대출 규정이나 금리를 불러오지 못했습니다.' : ''; return; }
    const R = Object.fromEntries(rs.data.map((x) => [x.id, Number(x.value)]));
    if (!seeded) { $('l-rate-bog').value = R.bog_rate; $('l-rate-did').value = R.did_rate; if (isFinite(R.bank_rate)) $('l-rate').value = R.bank_rate; seeded = true; }
    const I = { inc1: n('l-inc1'), inc2: n('l-inc2'), hh: v('l-hh'), kids: Number(v('l-kids')), first: v('l-first'), newborn: v('l-newborn'), didOne: v('l-did-one'),
      debtPI: n('l-debt-pi'), debtInt: n('l-debt-int'), rate: n('l-rate'), type: v('l-type'), rateBog: n('l-rate-bog'), rateDid: n('l-rate-did'), term: Math.min(n('l-term') || 30, R.gen_term_max) };
    I.inc = I.inc1 + I.inc2;
    const price = n('l-price') * 10000;
    const feeNow = n('b-fee') / 100, cashNow = n('b-cash') * 10000;
    window.sxLoanAt = (p) => { const br = bestOf(compute(R, rt.data, p, I)); const need = p * (1 + feeNow) - (br ? br.lim : 0); return { best: br, need, short: need - cashNow }; };
    const rows = compute(R, rt.data, price, I);
    const okRows = rows.filter((r) => r.ok).sort((a, b) => b.lim - a.lim);
    const best = okRows[0];
    const tied = best ? okRows.filter((r) => Math.abs(r.lim - best.lim) < 1).map((r) => r.name) : [];
    window.sxLoanBest = best ? { amount: best.lim, name: best.name } : null;
    rows.forEach((r) => {
      const tr = document.createElement('tr'); if (!r.ok) tr.className = 'no';
      [r.name, r.elig, eok(r.ltv), `${eok(r.inc)} (${r.incLabel})`, eok(r.cap), r.ok ? eok(r.lim) : '—', r.pay == null ? '—' : won(r.pay) + '원', r.why].forEach((t, i) => {
        const td = document.createElement('td'); td.textContent = t; if (i === 5 && r === best) td.className = 'best'; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    const sum = $('loan-sum'); sum.replaceChildren();
    if (best && price > 0) {
      const b = document.createElement('b'); b.textContent = eok(best.lim);
      sum.append(`주택가격 ${eok(price)} 기준 가장 많이 나오는 건 ${tied.join('·')} `, b, `입니다. 필요한 자기자금은 약 ${eok(Math.max(0, price - best.lim))}(부대비용 제외), 월 상환은 ${won(best.pay)}원(${best.name}, 원리금균등, ${I.term}년)입니다.`);
    }
    const add = (ul, t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); };
    add(notes, `은행 DSR은 스트레스 금리 하한 ${R.stress_floor}%p에 금리 유형 비율(변동 ${R.stress_ratio_var * 100}%·혼합 ${R.stress_ratio_mixed * 100}%·주기 ${R.stress_ratio_cycle * 100}%)을 곱해 가산합니다. 월 상환은 가산 전 실제 금리로 계산합니다.`);
    add(notes, '보금자리론: 신혼가구는 합산 소득이 기준(무자녀 8,500만·1자녀 9,000만·2자녀 이상 1억)을 넘어도 부부 중 1인이 7천만 이하면 그 사람을 차주로 신청할 수 있고, DTI도 그 1인 소득으로 봅니다(주금공, 2026.10.19 신청분부터).');
    add(notes, '디딤돌 1인 소득 기준(1인 6천만)은 8·13 대책에서 발표됐지만 시행일을 확인하지 못해 체크했을 때만 반영합니다.');
    add(notes, '신생아 특례 금리는 소득 구간·만기별 표에서 찾고, 특례 기간 이후엔 금리가 바뀝니다. 디딤돌·신생아 특례는 전용 85㎡ 이하, 순자산 기준(신생아 5.11억) 등 조건이 더 있습니다.');
    add(notes, '소득은 본인·배우자 합산입니다. 은행 주담대는 배우자가 공동차주일 때만 배우자 소득이 DSR에 들어갑니다. 수도권 주담대는 6개월 내 전입(디딤돌 1개월) 의무가 있습니다.');
    const s = selPrice();
    if (s && !priceTouched) add(notes, `'선택 단지 최소 평형 시세 넣기'를 누르면 ${s.label}(${eok(s.price)})가 들어갑니다.`);

    // ---- budget: highest price affordable with cash
    const cash = n('b-cash') * 10000, fee = n('b-fee') / 100;
    let bestP = null, bestRow = null;
    for (let p = 10000; p <= 400000; p += 100) {
      const br = bestOf(compute(R, rt.data, p, I));
      const loan = br ? br.lim : 0;
      if (p * (1 + fee) - loan <= cash) { bestP = p; bestRow = br; }
    }
    window.sxBudget = bestP;
    const bs = $('budget-sum'), bn = $('budget-notes'); bs.replaceChildren(); bn.replaceChildren();
    if (bestP == null) { bs.textContent = '이 현금으로는 1억 이상 주택을 살 수 없습니다.'; }
    else {
      const b = document.createElement('b'); b.textContent = eok(bestP);
      bs.append('살 수 있는 최고 가격은 약 ', b, bestRow ? `입니다. ${bestRow.name} ${eok(bestRow.lim)} + 현금 ${eok(cash)}(부대비용 ${Math.round(fee * 1000) / 10}% 포함)로 맞춰집니다.` : '입니다. 대출 없이 현금으로만 계산됐습니다.');
      const cd = dash.data('complexes');
      if (cd.status === 'ok') {
        const fit = cd.data.filter((r) => r.min_price != null && r.min_price <= bestP && r.trades_12m >= 1);
        const byGu = d3.rollups(fit, (x) => x.length, (r) => r.gu).sort((a, b) => b[1] - a[1]).slice(0, 6);
        add(bn, `최근 12개월 거래가 있는 단지 중 최소 평형 중위가가 ${eok(bestP)} 이하인 곳은 ${d3.format(',')(fit.length)}개입니다.` + (byGu.length ? ` 많은 구: ${byGu.map(([g, c]) => `${g} ${c}`).join(', ')}.` : ''));
      }
      add(bn, "'이 예산으로 단지 보기'를 누르면 범위 조건의 최소 평형 중위가 최대값에 이 가격이 들어가고 지도로 이동합니다. 맨 위 '← 뒤로'로 돌아올 수 있습니다. 다른 범위 조건(역 거리·용적률 등)과 함께 쓸 수 있습니다.");
      add(bn, '가격은 실거래 중위가 기준이라, 실제 매물 호가와 대출 심사 가격(KB시세·감정가)은 다를 수 있습니다.');
    }

    // ---- newborn refinance
    const rsum = $('refi-sum'), rtiles = $('refi-tiles'), rnotes = $('refi-notes'); rsum.replaceChildren(); rtiles.replaceChildren(); rnotes.replaceChildren();
    const bal = n('r-bal') * 10000, oldRate = n('r-rate'), left = Math.max(1, n('r-left')), after = n('r-after');
    const reasons = [];
    if (I.inc > R.nb_refi_income) reasons.push(`대환은 부부합산 소득 ${won(R.nb_refi_income)} 이하만 가능(맞벌이 2억 기준 미적용) — 현재 ${won(I.inc)}`);
    if (price > R.nb_price) reasons.push(`주택가격 ${eok(price)} > ${eok(R.nb_price)}`);
    const nr = nbRate(rt.data, I.inc, Math.min(left, 30));
    if (!nr) reasons.push('금리표 구간 없음');
    if (reasons.length) { rsum.textContent = '갈아타기 불가: ' + reasons.join(', '); }
    else {
      const tTerm = Math.min(left, 30);
      const byInc = Math.max(0, (R.nb_dti * I.inc - Math.max(0, I.debtInt)) / annual(nr.rate, tTerm));
      const amt = Math.min(bal, R.nb_cap, price * R.nb_ltv, byInc);
      const rest = Math.max(0, bal - amt);
      const oldPay = bal * annual(oldRate, left) / 12;
      const newPay = amt * annual(nr.rate, tTerm) / 12 + rest * annual(oldRate, left) / 12;
      const save = oldPay - newPay;
      const per = Math.min(R.nb_period, tTerm);
      // balance after the special period, then re-amortize at the post-period rate
      const r1 = nr.rate / 100 / 12, N = tTerm * 12, k = per * 12, m1 = amt * annual(nr.rate, tTerm) / 12;
      const balAfter = r1 === 0 ? amt - m1 * k : amt * Math.pow(1 + r1, k) - m1 * (Math.pow(1 + r1, k) - 1) / r1;
      const afterPay = (tTerm - per) > 0 ? balAfter * annual(after, tTerm - per) / 12 + rest * annual(oldRate, left) / 12 : 0;
      const b = document.createElement('b'); b.textContent = `월 ${won(save)}원`;
      rsum.append(`${eok(amt)}을 신생아 특례 ${nr.rate.toFixed(2)}%(소득 ${won(nr.band)} 이하 구간, ${nr.term}년 표)로 바꾸면 특례 기간 ${per}년 동안 `, b, ' 줄어듭니다.');
      const tile = (lab, num, sub) => { const d = document.createElement('div'); d.className = 'ptile'; const a = document.createElement('div'); a.className = 'lab'; a.textContent = lab; const c = document.createElement('div'); c.className = 'pnum'; c.textContent = num; const e = document.createElement('div'); e.className = 'sub'; e.textContent = sub; d.append(a, c, e); rtiles.appendChild(d); };
      tile('지금 월 상환', won(oldPay) + '원', `${eok(bal)} · ${oldRate}% · ${left}년`);
      tile('갈아탄 뒤 월 상환', won(newPay) + '원', rest > 0 ? `특례 ${eok(amt)} + 기존 ${eok(rest)}` : `특례 ${eok(amt)}`);
      tile(`특례 ${per}년 뒤 월 상환`, afterPay ? won(afterPay) + '원' : '—', `특례 후 금리 ${after}% 가정`);
      add(rnotes, `특례 기간 ${per}년 동안 줄어드는 이자는 약 ${won(save * per * 12)}원입니다(원리금 차이 합계 기준). 추가 출산 1명마다 특례 기간이 5년씩 늘어납니다(최장 15년).`);
      add(rnotes, '대환은 기존 주택구입 목적 대출 잔액 이내에서만 되고, 갈아탈 때 중도상환수수료가 생길 수 있습니다. 특례 기간 후 금리는 공식 수치를 확인하지 못해 직접 넣는 값입니다.');
      if (rest > 0) add(rnotes, `한도(4억·LTV 70%·DTI 60%) 때문에 ${eok(rest)}은 기존 대출로 남는다고 보고 계산했습니다.`);
    }
  }
  $('b-apply').addEventListener('click', () => {
    if (window.sxBudget == null) return;
    dash.setParams({ pmax: Number((window.sxBudget / 10000).toFixed(2)), pmin: null });
    if (window.sxGo) window.sxGo('map-card'); else { const m = document.getElementById('map-card'); if (m && m.scrollIntoView) m.scrollIntoView({ block: 'start' }); }
  });
  ids.forEach((id) => $(id).addEventListener($(id).type === 'checkbox' || $(id).tagName === 'SELECT' ? 'change' : 'input', () => { if (window.sxCompareDraw) window.sxCompareDraw(); }));
  dash.onData(draw);
})();
