// ---------- theme: 색은 css/00-tokens.css 에서만 정하고, 차트는 여기서 읽어 쓴다
(function () {
  const F = window.sxF;
  const tok = (n) => F.resolve('var(--' + n + ')');
  window.sxTheme = () => ({
    text: tok('text'), textSub: tok('text-sub'), surface: tok('surface'), accent: tok('accent'), up: tok('up'), down: tok('down'),
    water: tok('water'), edge: tok('edge'), rail: tok('rail'), dot: tok('dot'), grid: tok('grid'), axis: tok('axis'), ref: tok('ref'),
    ramp: [1, 2, 3, 4, 5].map((i) => tok('ramp-' + i)), series: [1, 2, 3].map((i) => tok('series-' + i)),
  });
  // 여러 단계 색을 이어 만든 연속 색띠. 입력은 0~1
  window.sxRamp = (stops) => d3.scaleLinear().domain(stops.map((_, i) => i / (stops.length - 1))).range(stops).interpolate(d3.interpolateRgb).clamp(true);
})();
