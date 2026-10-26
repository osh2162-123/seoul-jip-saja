// ---------- monthly payment calculator (rates from the rates dataset)
(function () {
  const $ = (id) => document.getElementById(id);
  const won = (man) => (man == null || !isFinite(man) ? '—' : d3.format(',')(Math.round(man)) + '만원');
  const eokTxt = (man) => String(Number((man / 10000).toFixed(2))) + '억';
  let seeded = false;
  const presetSel = $('p-preset');
  // returns {first, last, total, interest} in 만원
  function schedule(P, rate, years, method) {
    const r = rate / 100 / 12, n = years * 12;
    if (P <= 0 || n <= 0) return null;
    if (method === 'principal') {
      const pr = P / n;
      const first = pr + P * r, last = pr + pr * r;
      const interest = r * P * (n + 1) / 2;
      return { first, last, total: P + interest, interest };
    }
    const m = r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n));
    return { first: m, last: m, total: m * n, interest: m * n - P };
  }
  function presets(rows, term) {
    const by = Object.fromEntries(rows.map((x) => [x.id, x]));
    const bogTerms = [10, 15, 20, 30, 40, 50];
    const bt = bogTerms.reduce((a, b) => (Math.abs(b - term) < Math.abs(a - term) ? b : a), 30);
    const bog = by['bog_' + bt];
    const list = [];
    const add = (key, label, rate, basis, note) => { if (rate != null && isFinite(rate)) list.push({ key, label, rate: Number(rate), basis, note }); };
    if (by.bank_fixed_lo) add('bank_fixed_lo', '시중은행 고정형 하단', by.bank_fixed_lo.rate, `${by.bank_fixed_lo.label}, ${by.bank_fixed_lo.as_of}`);
    if (by.bank_fixed_hi) add('bank_fixed_hi', '시중은행 고정형 상단', by.bank_fixed_hi.rate, `${by.bank_fixed_hi.label}, ${by.bank_fixed_hi.as_of}`);
    if (by.bank_var_kb_lo) add('bank_var_kb_lo', 'KB국민 변동형 하단', by.bank_var_kb_lo.rate, `${by.bank_var_kb_lo.as_of}`);
    if (bog) add('bog', `보금자리론 아낌e ${bt}년`, bog.rate, `${bog.as_of}${bt !== term ? ` · ${bt}년 금리로 대신 계산` : ''}`);
    if (bog && by.bog_u_add) add('bog_u', `보금자리론 u·t ${bt}년`, bog.rate + by.bog_u_add.rate, '아낌e +0.1%p');
    if (bog && by.bog_pref_max) add('bog_pref', `보금자리론 우대 최대 적용`, bog.rate - by.bog_pref_max.rate, '저소득청년·신혼 등 우대 최대 1.0%p');
    const didOk = term <= 30;
    if (didOk && by.did_4_7_30) add('did_4_7', '디딤돌 소득 4~7천만', by.did_4_7_30.rate, `30년 기준, ${by.did_4_7_30.as_of}`);
    if (didOk && by.did_4_7_30 && by.did_first_pref) add('did_4_7_first', '디딤돌 소득 4~7천만 + 생애최초', by.did_4_7_30.rate - by.did_first_pref.rate, '생애최초 우대 0.2%p(최대 5년)');
    if (didOk && by.did_7_85_30) add('did_7_85', '디딤돌 소득 7~8.5천만(신혼)', by.did_7_85_30.rate, `30년 기준, ${by.did_7_85_30.as_of}`);
    if (term === 10 && by.did_min) add('did_min', '디딤돌 기본금리 최저', by.did_min.rate, '최하위 소득 구간·10년');
    return list;
  }
  $('p-use-best').addEventListener('click', () => { const b = window.sxLoanBest; if (b && b.amount > 0) { $('p-amt').value = (b.amount / 10000).toFixed(2); draw(); } });
  presetSel.addEventListener('change', () => { const o = presetSel.selectedOptions[0]; if (o && o.dataset.rate) $('p-rate').value = o.dataset.rate; draw(); });
  ['p-amt', 'p-rate'].forEach((id) => $(id).addEventListener('input', draw));
  ['p-term', 'p-method'].forEach((id) => $(id).addEventListener('change', () => { refill(); draw(); }));

  function refill() {
    const d = dash.data('rates'); if (d.status !== 'ok') return;
    const term = Number($('p-term').value) || 30;
    const keep = presetSel.value;
    const list = presets(d.data, term);
    presetSel.replaceChildren(new Option('선택하세요', ''), ...list.map((p) => { const o = new Option(`${p.label} ${p.rate.toFixed(2)}%`, p.key); o.dataset.rate = p.rate.toFixed(2); return o; }), new Option('직접 입력', 'custom'));
    if ([...presetSel.options].some((o) => o.value === keep)) presetSel.value = keep;
    const o = presetSel.selectedOptions[0];
    if (o && o.dataset.rate && keep !== 'custom' && keep !== '') $('p-rate').value = o.dataset.rate;
  }

  function draw() {
    const d = dash.data('rates');
    const tbody = document.querySelector('#pay-table tbody'); tbody.replaceChildren();
    const notes = $('pay-notes'); notes.replaceChildren();
    if (d.status !== 'ok') { ['p-month', 'p-int', 'p-up'].forEach((id) => { $(id).textContent = '—'; }); return; }
    if (!seeded) { seeded = true; refill(); }
    if (presetSel.value === '' && $('p-rate').value !== '') presetSel.value = 'custom';
    if (presetSel.value !== 'custom' && presetSel.value !== '') { const o = presetSel.selectedOptions[0]; if (o && Math.abs(Number(o.dataset.rate) - Number($('p-rate').value)) > 1e-9) presetSel.value = 'custom'; }
    const ok = window.sxGate('pay-out', window.sxMissing([['p-amt', '대출금액'], ['p-rate', '금리(상품을 고르거나 직접 입력)'], ['p-term', '만기']]));
    window.sxStatus.pay = '아직 입력 전';
    if (!ok) return;
    const P = Number($('p-amt').value) * 10000, rate = Number($('p-rate').value), term = Number($('p-term').value), method = $('p-method').value;
    const s = schedule(P, rate, term, method), up = schedule(P, rate + 1, term, method);
    if (!s) { ['p-month', 'p-int', 'p-up'].forEach((id) => { $(id).textContent = '—'; }); return; }
    $('p-month').textContent = won(s.first); window.sxStatus.pay = `월 ${won(s.first)}`;
    $('p-month-sub').textContent = method === 'principal' ? `마지막 달 ${won(s.last)} · 매달 원금 ${won(P / term / 12)}` : `${term * 12}회 동일`;
    $('p-int').textContent = won(s.interest);
    $('p-int-sub').textContent = `총상환 ${won(s.total)} (원금의 ${Math.round(s.interest / P * 100)}%)`;
    $('p-up').textContent = won(up.first);
    $('p-up-sub').textContent = `+${won(up.first - s.first)} · 변동형·주기형 금리 재산정 대비`;
    const list = presets(d.data, term);
    list.forEach((p) => {
      const x = schedule(P, p.rate, term, method);
      const tr = document.createElement('tr'); if (presetSel.value === p.key) tr.className = 'on';
      [p.label, p.rate.toFixed(2) + '%', won(x.first), won(x.interest), p.basis].forEach((t) => { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    const add = (t) => { const li = document.createElement('li'); li.textContent = t; notes.appendChild(li); };
    const cofix = d.data.find((x) => x.id === 'cofix_new');
    add(`대출금액 ${eokTxt(P)}, ${term}년, ${method === 'principal' ? '원금균등' : '원리금균등'} 기준입니다. 시중은행 금리는 은행·신용도·우대조건에 따라 하단~상단 사이에서 정해집니다.`);
    if (cofix) add(`변동형은 신규취급액 코픽스(${cofix.rate}%, ${cofix.as_of})에 따라 6개월마다 바뀝니다. 코픽스는 최근 반년간 계속 올랐습니다.`);
    add('디딤돌은 최장 30년, 수도권 일반 주담대는 최장 30년입니다. 40·50년은 보금자리론에만 해당합니다. 디딤돌 금리는 소득 구간·만기마다 다르며 확인된 구간만 넣었습니다.');
  }
  dash.onData(() => { refill(); draw(); });
})();
