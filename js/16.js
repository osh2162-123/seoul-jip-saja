// ---------- 홈 화면: 각 단계의 진행 상태를 한 줄로 보여준다
dash.onData(() => {
  const S = window.sxStatus || {};
  const set = (k, text, done) => {
    const el = document.getElementById('hs-' + k); if (!el) return;
    el.textContent = text;
    const btn = el.closest('.step'); if (btn) btn.classList.toggle('done', !!done);
  };
  const F = window.sxF;
  const d = dash.data('complexes');
  const p = dash.params();
  set('plan', S.plan || '아직 입력 전', S.plan && S.plan !== '아직 입력 전');
  if (d.status === 'ok') {
    const n = d.data.filter((r) => r.lat != null && r.lon != null).filter(window.sxFilter).length;
    const all = d.data.filter(window.sxFilter).length;
    set('explore', `조건에 맞는 단지 ${F.fmtInt(all)}개 (지도에는 ${F.fmtInt(n)}개)` + (p.afford && window.sxBudget != null ? ' · 예산 밖 숨김' : ''), false);
  }
  const k = Array.isArray(p.cmp) ? p.cmp.length : 0;
  set('cmp', k ? `${k}/3개 담음` : '아직 담은 단지 없음', k > 0);
  set('loan', S.loan || '아직 입력 전', S.loan && S.loan !== '아직 입력 전');
  set('pay', S.pay || '아직 입력 전', S.pay && S.pay !== '아직 입력 전');
});
