// service worker registration + "new version" notice
(function () {
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had || document.getElementById('sw-toast')) return;
    const t = document.createElement('div'); t.id = 'sw-toast'; t.setAttribute('role', 'status');
    t.textContent = '새 버전이 적용됐습니다. 새로고침하면 최신 데이터와 규정을 봅니다. ';
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '새로고침'; b.addEventListener('click', () => location.reload());
    t.appendChild(b); document.body.appendChild(t);
  });
})();
