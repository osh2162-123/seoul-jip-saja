// ---------- helpers & controls
const root = document.querySelector('.sx');
const fmtInt = d3.format(',');
const fmtPct = (v) => (v == null ? '—' : (v > 0 ? '+' : '') + d3.format('.1%')(v));
const fmtEok = (v) => (v == null ? '—' : (v / 10000).toFixed(1) + '억');
const fmtPpy = (v) => (v == null ? '—' : fmtInt(Math.round(v)) + '만원');
const resolve = (c) => { const el = document.createElement('span'); el.style.color = c; root.appendChild(el); const v = getComputedStyle(el).color; el.remove(); return v; };
window.sxF = { fmtInt, fmtPct, fmtEok, fmtPpy, resolve };


const cColor = root.querySelector('.c-color'), cGu = root.querySelector('.c-gu'), cOld = root.querySelector('.c-old');
const rins = [...root.querySelectorAll('.rin')], cFarNull = root.querySelector('.c-farnull'), chips = [...root.querySelectorAll('.chip[data-pmax]')], achips = [...root.querySelectorAll('.chip[data-a]')];
const num = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Number(v));
rins.forEach((el) => {
  el.addEventListener('change', () => dash.setParams({ [el.dataset.p]: num(el.value) }));
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
});
cFarNull.addEventListener('change', () => dash.setParams({ far_null: cFarNull.checked }));
chips.forEach((b) => b.addEventListener('click', () => { const v = Number(b.dataset.pmax); dash.setParams({ pmax: dash.params().pmax === v ? null : v }); }));
const aRange = (b) => { const [lo, hi] = b.dataset.a.split(',').map(Number); return [lo > 0 ? lo : null, hi]; };
achips.forEach((b) => b.addEventListener('click', () => {
  const [lo, hi] = aRange(b), p = dash.params();
  dash.setParams(p.a_min === lo && p.a_max === hi ? { a_min: null, a_max: null } : { a_min: lo, a_max: hi });
}));
cColor.addEventListener('change', () => dash.setParams({ color: cColor.value }));
cGu.addEventListener('change', () => dash.setParams({ gu: cGu.value || null }));
const cZone = root.querySelector('.c-zone');
cZone.addEventListener('change', () => dash.setParams({ zone: cZone.value || null }));
cOld.addEventListener('change', () => dash.setParams({ old: cOld.checked }));
root.querySelector('.c-reset').addEventListener('click', () => {
  const o = {}; ['gu', 'zone', 'old', 'units_min', 'units_max', 'far_min', 'far_max', 'far_null', 'pmin', 'pmax', 'st_min', 'st_max', 'a_min', 'a_max', 'afford', 'color'].forEach((k) => { o[k] = null; });
  dash.setParams(o); // 선택 단지·비교함·현재 화면은 그대로 둔다
});

window.sxFilter = (r) => {
  const p = dash.params();
  if (p.gu && r.gu !== p.gu) return false;
  if (p.zone && r.zone_s !== p.zone) return false;
  if (p.old && !(r.age != null && r.age >= 30)) return false;
  const inR = (v, lo, hi) => (lo == null || (v != null && v >= lo)) && (hi == null || (v != null && v <= hi));
  if (!inR(r.units, p.units_min, p.units_max)) return false;
  if ((p.far_min != null || p.far_max != null) && !(r.far == null && p.far_null) && !inR(r.far, p.far_min, p.far_max)) return false;
  const px = window.sxPx(r);
  if (px.band && px.price == null) return false;
  if (p.afford && window.sxBudget != null && px.price != null && px.price > window.sxBudget) return false; // 예산 밖 단지 숨기기(선택)
  const eok = px.price == null ? null : px.price / 10000;
  if (!inR(eok, p.pmin, p.pmax)) return false;
  if (!inR(r.st_m, p.st_min, p.st_max)) return false;
  return true;
};

dash.onData(() => {
  const p = dash.params();
  cColor.value = p.color || 'ppy_12m';
  cOld.checked = !!p.old;
  rins.forEach((el) => { const v = p[el.dataset.p]; if (el !== document.activeElement) el.value = v == null ? '' : String(v); el.classList.toggle('on', v != null); });
  cFarNull.checked = !!p.far_null;
  chips.forEach((b) => b.classList.toggle('on', p.pmax === Number(b.dataset.pmax)));
  achips.forEach((b) => { const [lo, hi] = aRange(b); b.classList.toggle('on', p.a_min === lo && p.a_max === hi); });
  const nAct = ['units_min', 'units_max', 'far_min', 'far_max', 'st_min', 'st_max'].filter((k) => p[k] != null).length + (p.far_null ? 1 : 0);
  document.getElementById('more-sum').textContent = '상세 조건 (세대수·용적률·역 거리)' + (nAct ? ` · ${nAct}개 적용 중` : '');
  const g = dash.data('gu_stats');
  const gus = g.status === 'ok' ? g.data.map((r) => r.gu) : [];
  cGu.replaceChildren(new Option('서울 전체', ''), ...gus.map((x) => new Option(x, x)));
  cGu.value = p.gu || '';
  const cd = dash.data('complexes');
  const zc = cd.status === 'ok' ? d3.rollups(cd.data.filter((r) => r.zone_s), (v) => v.length, (r) => r.zone_s).sort((a, b) => b[1] - a[1]) : [];
  cZone.replaceChildren(new Option('전체', ''), ...zc.map(([z, n]) => new Option(`${z} (${n})`, z)));
  cZone.value = p.zone || '';
});
