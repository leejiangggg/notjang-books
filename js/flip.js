/* 엽서 뒤집기. host 안의 [data-face="front"], [data-face="back"] 둘 중 하나만 보인다.
   옆으로 반 바퀴 돌려 세운 순간에 면을 바꾸고 마저 돌린다(3D 뒷면 숨기기에 기대지 않아 어느 브라우저에서나 같다). */
window.NotjangFlip = function (host, onTurn) {
  'use strict';
  const face = (n) => host.querySelector('[data-face="' + n + '"]');
  let side = 'front', busy = false;
  const P = 'perspective(1600px) ';
  function show(n) { side = n; face('front').hidden = n !== 'front'; face('back').hidden = n !== 'back'; }
  async function turn() {
    if (busy) return; busy = true;
    const next = side === 'front' ? 'back' : 'front';
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !host.animate) show(next);
    else {
      try {
        await host.animate([{ transform: P + 'rotateY(0deg)' }, { transform: P + 'rotateY(90deg) scale(.96)' }], { duration: 210, easing: 'cubic-bezier(.5,0,.9,.5)' }).finished;
        show(next);
        await host.animate([{ transform: P + 'rotateY(-90deg) scale(.96)' }, { transform: P + 'rotateY(0deg)' }], { duration: 300, easing: 'cubic-bezier(.1,.6,.3,1)' }).finished;
      } catch (e) { show(next); }
    }
    busy = false;
    if (onTurn) onTurn(side);
  }
  host.addEventListener('click', turn);
  host.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(); } });
  show('front');
  return { turn, show, get side() { return side; } };
};
