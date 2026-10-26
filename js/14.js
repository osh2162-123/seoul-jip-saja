// ---------- loan calculator (rules from loan_rules, policy rate tables from rates; income and bank rates are the viewer's inputs)
(function () {
  const $ = (id) => document.getElementById(id);
  const { annual, eok, won, nbRate, compute, bestOf } = window.sxLoan;
  const ids = ['l-price', 'l-inc1', 'l-inc2', 'l-hh', 'l-kids', 'l-first', 'l-newborn', 'l-did-one', 'l-debt-pi', 'l-debt-int', 'l-rate', 'l-type', 'l-rate-bog', 'l-rate-did', 'l-term', 'b-cash', 'b-fee', 'b-month', 'r-bal', 'r-rate', 'r-left', 'r-after'];
  let seeded = false, priceTouched = false;
  const v = (id) => { const el = $(id); return el.type === 'checkbox' ? el.checked : el.value; };
  const n = (id) => { const x = Number(v(id)); return isFinite(x) ? x : 0; };

  function selPrice() {
    const d = dash.data('complexes'); if (d.status !== 'ok') return null;
    const r = d.data.find((x) => x.id === dash.params().sel); if (!r) return null;
    const px = window.sxPx(r); if (px.price == null) return null;
    return { price: px.price, name: r.name, label: `${r.name} 전용 ${px.area}㎡ 최근 12개월 중위가` };
  }
  let targetName = null;
  $('l-use-sel').addEventListener('click', () => { const s = selPrice(); if (s) { $('l-price').value = (s.price / 10000).toFixed(2); priceTouched = true; targetName = s.label; draw(); } });
  $('l-price').addEventListener('input', () => { priceTouched = true; targetName = null; });
  ids.forEach((id) => $(id).addEventListener($(id).type === 'checkbox' || $(id).tagName === 'SELECT' ? 'change' : 'input', draw));

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
    const missProfile = window.sxMissing([['l-inc1', '본인 연소득'], ['l-hh', '가구']]);
    const missPlan = window.sxMissing([['b-cash', '보유 현금'], ['b-fee', '부대비용']]).concat(missProfile);
    const missLoan = window.sxMissing([['l-price', '주택가격']]).concat(missProfile);
    const profileOk = missProfile.length === 0;
    $('loan-profile').textContent = profileOk ? `내 조건: 본인 연소득 ${won(I.inc1)}${I.inc2 ? ` + 배우자 ${won(I.inc2)}` : ''} · ${{ single: '미혼', newlywed: '신혼', married: '기혼' }[I.hh]}${I.first ? ' · 생애최초' : ''}. 바꾸려면 1단계 '예산·면적'으로 가세요.` : "소득·가구는 1단계 '예산·면적'에서 입력합니다.";
    // 월 상환 가능액을 넣었으면, 상품별 대출을 그 월 상환액으로 감당되는 금액까지만 인정한다
    const mcap = $('b-month').value === '' ? null : n('b-month');
    const eff = (rs2) => {
      let b = null;
      rs2.filter((r) => r.ok).forEach((r) => {
        let lim = r.lim, cut = false;
        if (mcap != null && r.rate != null) { const maxL = mcap / (annual(r.rate, I.term) / 12); if (maxL < lim) { lim = maxL; cut = true; } }
        if (!b || lim > b.lim) b = Object.assign({}, r, { lim, cut, pay: lim * annual(r.rate, I.term) / 12 });
      });
      return b;
    };
    const cashOk = window.sxFilled('b-cash');
    window.sxLoanAt = !profileOk ? null : (p) => { const br = eff(compute(R, rt.data, p, I)); const need = p * (1 + feeNow) - (br ? br.lim : 0); return { best: br, need, short: cashOk ? need - cashNow : null }; };
    const add = (ul, t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); };
    const loanOk = window.sxGate('loan-out', missLoan);
    window.sxLoanBest = null; window.sxStatus.loan = '아직 입력 전';
    if (loanOk) {
    const rows = compute(R, rt.data, price, I);
    const okRows = rows.filter((r) => r.ok).sort((a, b) => b.lim - a.lim);
    const best = okRows[0];
    const tied = best ? okRows.filter((r) => Math.abs(r.lim - best.lim) < 1).map((r) => r.name) : [];
    window.sxLoanBest = best ? { amount: best.lim, name: best.name } : null;
    window.sxStatus.loan = best ? `${best.name} ${eok(best.lim)} · 월 ${won(best.pay)}원` : '받을 수 있는 정책대출 없음';
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
    // ---- 결과 3단: 정책대출 적용 여부 → 가능액 → 월 상환
    $('loan-target').textContent = (targetName ? `${targetName}(${eok(price)})로 계산했습니다. ` : `직접 넣은 주택가격 ${eok(price)} 기준입니다. 단지를 고른 뒤 '이 단지로 대출 계산'을 누르면 그 단지 시세가 들어갑니다. `) + '서울 전역이 규제지역(10·15 대책)인 무주택자를 전제로 합니다.';
    const pol = $('lr-elig'); pol.replaceChildren();
    rows.filter((r) => r.name !== '일반 주담대').forEach((r) => {
      if (r.name === '신생아 특례' && !I.newborn) return;
      const li = document.createElement('li'); li.className = r.ok ? 'yes' : 'no';
      const b = document.createElement('b'); b.textContent = r.ok ? '가능' : '불가';
      li.append(b, ` ${r.name} `);
      const sp = document.createElement('span'); sp.className = 'why'; sp.textContent = r.ok ? `최대 ${eok(r.lim)} · ${r.why}` : r.why; li.appendChild(sp);
      pol.appendChild(li);
    });
    if (!pol.children.length) { const li = document.createElement('li'); li.textContent = '—'; pol.appendChild(li); }
    $('lr-amt').textContent = best && price > 0 ? eok(best.lim) : '—';
    $('lr-amt-sub').textContent = best && price > 0 ? `${tied.join('·')}${tied.length < 2 && best.name !== '일반 주담대' ? ' (정책대출)' : ''} · 필요한 자기자금 약 ${eok(Math.max(0, price - best.lim))}(부대비용 제외)` : '';
    $('lr-pay').textContent = best && price > 0 ? won(best.pay) + '원' : '—';
    $('lr-pay-sub').textContent = best && price > 0 ? `${best.name} · 원리금균등 · ${I.term}년` : '';
    const add = (ul, t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); };
    add(notes, `은행 DSR은 스트레스 금리 하한 ${R.stress_floor}%p에 금리 유형 비율(변동 ${R.stress_ratio_var * 100}%·혼합 ${R.stress_ratio_mixed * 100}%·주기 ${R.stress_ratio_cycle * 100}%)을 곱해 가산합니다. 월 상환은 가산 전 실제 금리로 계산합니다.`);
    add(notes, '보금자리론: 신혼가구는 합산 소득이 기준(무자녀 8,500만·1자녀 9,000만·2자녀 이상 1억)을 넘어도 부부 중 1인이 7천만 이하면 그 사람을 차주로 신청할 수 있고, DTI도 그 1인 소득으로 봅니다(주금공, 2026.10.19 신청분부터).');
    add(notes, '디딤돌 1인 소득 기준(1인 6천만)은 8·13 대책에서 발표됐지만 시행일을 확인하지 못해 체크했을 때만 반영합니다.');
    add(notes, '신생아 특례 금리는 소득 구간·만기별 표에서 찾고, 특례 기간 이후엔 금리가 바뀝니다. 디딤돌·신생아 특례는 전용 85㎡ 이하, 순자산 기준(신생아 5.11억) 등 조건이 더 있습니다.');
    add(notes, '소득은 본인·배우자 합산입니다. 은행 주담대는 배우자가 공동차주일 때만 배우자 소득이 DSR에 들어갑니다. 수도권 주담대는 6개월 내 전입(디딤돌 1개월) 의무가 있습니다.');
    const s = selPrice();
    if (s && !priceTouched) add(notes, `'선택 단지 최소 평형 시세 넣기'를 누르면 ${s.label}(${eok(s.price)})가 들어갑니다.`);
    }

    // ---- budget: 현금 기준 최고 가격과, 월 상환 가능액까지 반영한 최고 가격
    const planOk = window.sxGate('plan-out', missPlan);
    const prevBudget = window.sxBudget;
    $('b-apply').disabled = !planOk; $('b-hide').disabled = !planOk; $('b-hide').checked = !!dash.params().afford; window.sxBudget = null; window.sxStatus.plan = '아직 입력 전';
    const bs = $('budget-sum'), bn = $('budget-notes'); bs.replaceChildren(); bn.replaceChildren();
    if (planOk) {
      const cash = n('b-cash') * 10000, fee = n('b-fee') / 100;
      let pCash = null, pBoth = null, rowBoth = null;
      for (let p = 10000; p <= 400000; p += 100) {
        const rs3 = compute(R, rt.data, p, I), free = bestOf(rs3), capd = eff(rs3);
        if (p * (1 + fee) - (free ? free.lim : 0) <= cash) pCash = p;
        if (p * (1 + fee) - (capd ? capd.lim : 0) <= cash) { pBoth = p; rowBoth = capd; }
      }
      window.sxBudget = pBoth;
      $('plan-assume').textContent = `대출 조건: 본인 연소득 ${won(I.inc1)}${I.inc2 ? ` + 배우자 ${won(I.inc2)}` : ''} · ${{ single: '미혼', newlywed: '신혼', married: '기혼' }[I.hh]}${I.first ? ' · 생애최초' : ''} · ${I.term}년.`;
      if (pBoth == null) { bs.textContent = pCash == null ? '이 현금으로는 1억 이상 주택을 살 수 없습니다.' : '월 상환 가능액 안에서는 1억 이상 주택을 살 수 없습니다.'; window.sxStatus.plan = '살 수 있는 가격 없음'; }
      else {
        const b = document.createElement('b'); b.textContent = eok(pBoth);
        bs.append('살 수 있는 최고 가격은 약 ', b, rowBoth ? `입니다. ${rowBoth.name} ${eok(rowBoth.lim)} + 현금 ${eok(cash)}(부대비용 ${Math.round(fee * 1000) / 10}% 포함)로 맞춰지고, 월 상환은 약 ${won(rowBoth.pay)}원입니다.` : '입니다. 대출 없이 현금으로만 계산됐습니다.');
        window.sxStatus.plan = `최고 ${eok(pBoth)}` + (window.sxBandOn() ? ' · 면적 설정됨' : '');
        if (mcap != null && pCash != null) add(bn, pBoth < pCash ? `월 상환을 ${won(mcap)}원 이하로 두면 대출이 줄어, 월 상환 한도가 없을 때(${eok(pCash)})보다 가격이 낮아집니다.` : `월 ${won(mcap)}원은 이 가격에서 한도가 되지 않습니다. 현금이 먼저 한계입니다.`);
        const cd = dash.data('complexes');
        if (cd.status === 'ok') {
          const over = cd.data.filter((r) => { const x = window.sxPx(r); return x.price != null && x.price > pBoth; }).length;
          $('b-hide-note').textContent = `예산 밖 단지 ${d3.format(',')(over)}개가 숨겨집니다. 끄면 모든 단지가 보입니다. 시세를 알 수 없는 단지는 숨기지 않습니다.`;
          const fit = cd.data.filter((r) => { const x = window.sxPx(r); return x.price != null && x.price <= pBoth && r.trades_12m >= 1; });
          const byGu = d3.rollups(fit, (x) => x.length, (r) => r.gu).sort((a, b) => b[1] - a[1]).slice(0, 6);
          add(bn, `최근 12개월 거래가 있는 단지 중 시세가 ${eok(pBoth)} 이하인 곳은 ${d3.format(',')(fit.length)}개입니다.` + (byGu.length ? ` 많은 구: ${byGu.map(([g, c]) => `${g} ${c}`).join(', ')}.` : ''));
        }
        add(bn, "'예산 밖 단지는 숨기기'를 켜면 이 가격보다 비싼 단지가 목록과 지도에서 빠집니다. 끄면 모든 단지가 보입니다.");
        add(bn, '가격은 실거래 중위가 기준이라, 실제 매물 호가와 대출 심사 가격(KB시세·감정가)은 다를 수 있습니다.');
      }
    }

    if (dash.params().afford && prevBudget !== window.sxBudget) setTimeout(() => dash.setParams({}), 0);

    // ---- newborn refinance (켜 둔 경우에만)
    const refiOn = $('refi-on').checked; $('refi-body').hidden = !refiOn;
    if (refiOn) {
      const rsum = $('refi-sum'), rtiles = $('refi-tiles'), rnotes = $('refi-notes'); rsum.replaceChildren(); rtiles.replaceChildren(); rnotes.replaceChildren();
      const missRefi = window.sxMissing([['r-bal', '기존 대출 잔액'], ['r-rate', '기존 대출 금리'], ['r-left', '남은 기간'], ['l-price', '주택가격']]).concat(missProfile);
      if (window.sxGate('refi-out', missRefi)) {
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
    }
  }
  $('b-apply').addEventListener('click', () => {
    if (window.sxBudget == null) return;
    dash.setParams({ afford: true });
    if (window.sxGo) window.sxGo('list-card');
  });
  $('b-hide').addEventListener('change', () => dash.setParams({ afford: $('b-hide').checked }));
  let refiTouched = false;
  $('refi-on').addEventListener('change', () => { refiTouched = true; draw(); });
  $('l-newborn').addEventListener('change', () => { if (!refiTouched) { $('refi-on').checked = $('l-newborn').checked; draw(); } });
  ids.forEach((id) => $(id).addEventListener($(id).type === 'checkbox' || $(id).tagName === 'SELECT' ? 'change' : 'input', () => { if (window.sxCompareDraw) window.sxCompareDraw(); }));
  dash.onData(draw);
})();
