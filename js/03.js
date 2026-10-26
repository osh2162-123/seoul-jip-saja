// ---------- 입력 게이트: 필수 항목이 다 채워졌을 때만 결과를 보여준다
(function () {
  const filled = (id) => { const el = document.getElementById(id); if (!el) return false; if (el.tagName === 'SELECT') return el.value !== ''; return el.value !== '' && isFinite(Number(el.value)); };
  // box: .gate 요소(.ph 안내 + .rs 결과). missing: 빠진 항목 이름 목록. 모두 채워졌으면 true
  const gate = (id, missing) => {
    const box = document.getElementById(id); if (!box) return false;
    const ph = box.querySelector(':scope > .ph'), rs = box.querySelector(':scope > .rs'), ok = missing.length === 0;
    if (rs) rs.hidden = !ok;
    if (ph) { ph.hidden = ok; ph.textContent = ok ? '' : `필수 항목을 모두 입력하면 결과가 여기에 표시됩니다. 남은 항목: ${missing.join(', ')}`; }
    return ok;
  };
  const missing = (pairs) => pairs.filter(([id]) => !filled(id)).map(([, label]) => label);
  window.sxFilled = filled; window.sxGate = gate; window.sxMissing = missing;
  window.sxStatus = window.sxStatus || {};
})();
