/* 받은 엽서: card.html?c=ID. 앞면이 먼저 보이고, 누르면 뒤집힌다.
   그림은 종이 모양(찢긴 가장자리)으로 가려서 보여 준다. 종이 그림의 투명한 곳이 그대로 가리개가 된다. */
(function () {
  'use strict';
  const { PAPERS, api, loadImg } = window.NotjangKit;
  const T = {
    KR: { title: '엽서가 왔어요', loading: '엽서를 펴는 중…', gone: '엽서를 찾을 수 없어요.<br>지워졌거나 주소가 잘못됐어요.', front: '눌러서 뒷면 보기', back: '눌러서 앞면 보기', write: '나도 엽서 쓰기', report: '신고하기', reportQ: '이 엽서를 신고할까요?', reported: '신고했어요. 이 엽서는 여기서 더 보이지 않아요.' },
    EN: { title: 'A postcard for you', loading: 'Opening the postcard…', gone: 'This postcard cannot be found.<br>It was deleted, or the address is wrong.', front: 'Tap to see the back', back: 'Tap to see the front', write: 'Write a postcard', report: 'Report', reportQ: 'Report this postcard?', reported: 'Reported. This postcard will not show here anymore.' }
  };
  // 처음 온 사람은 브라우저 언어를 따른다(한국어가 아니면 영어)
  let lang = 'KR';
  try { lang = localStorage.getItem('nb-lang') || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'KR' : 'EN'); } catch (e) { /* 한국어 */ }
  const L = T[lang] || T.EN;
  const $ = (id) => document.getElementById(id);
  const loaded = (img, src) => new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = src; });
  /* 가로 엽서의 가리개: 세로인 종이 그림을 시계 방향으로 눕힌 모양(postcard.js의 paperOn과 같은 방향). 모양만 쓰니 검게 칠한다. */
  async function wideMask(paper) {
    const im = await loadImg('assets/papers/' + paper + '.webp');
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 800;
    const ctx = cv.getContext('2d');
    ctx.translate(1200, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(im, 0, 0, 800, 1200);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillRect(0, 0, 1200, 800);
    return 'url(' + cv.toDataURL('image/png') + ')';
  }

  async function start() {
    document.documentElement.lang = lang === 'KR' ? 'ko' : 'en';
    document.title = '낱장북스 · ' + L.title;
    $('write').textContent = L.write; $('report').textContent = L.report;
    const gone = () => { $('state').innerHTML = L.gone; $('flipper').hidden = true; $('hint').hidden = true; $('foot').hidden = false; $('report').hidden = true; };
    const id = new URLSearchParams(location.search).get('c') || '', host = api();
    if (!/^[A-Za-z0-9]{16}$/.test(id) || !host) return gone();
    $('state').textContent = L.loading;
    try {
      const r = await fetch(host + '/card/' + id);
      if (!r.ok) return gone();
      const meta = await r.json();
      const paper = PAPERS.some((p) => p[0] === meta.paper) ? meta.paper : 'white';
      await Promise.all([loaded($('imgF'), host + '/card/' + id + '/front'), loaded($('imgB'), host + '/card/' + id + '/back')]);
      // 그림이 가로면 가로 엽서다(처음에 세로로 만든 엽서도 그대로 열린다)
      const wide = $('imgF').naturalWidth > $('imgF').naturalHeight;
      $('flipper').classList.toggle('wide', wide);
      const m = wide ? await wideMask(paper) : 'url(assets/papers/' + paper + '.webp)';
      document.querySelectorAll('.face .mask').forEach((el) => { el.style.webkitMaskImage = m; el.style.maskImage = m; });
    } catch (e) { return gone(); }
    $('state').textContent = '';
    $('hint').textContent = L.front;
    window.NotjangFlip($('flipper'), (side) => { $('hint').textContent = L[side]; });
    $('flipper').hidden = false; $('flipper').classList.add('in'); $('hint').hidden = false; $('foot').hidden = false;
    $('report').onclick = async () => {
      if (!confirm(L.reportQ)) return;
      let uid = 'anon';
      try { uid = localStorage.getItem('nb-uid') || Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('nb-uid', uid); } catch (e) { /* 이름 없이 */ }
      try { await fetch(host + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'card:' + id, uid, reason: 'card', author: '' }) }); } catch (e) { /* 그래도 가린다 */ }
      $('flipper').hidden = true; $('hint').hidden = true; $('report').hidden = true; $('state').textContent = L.reported;
    };
  }
  document.addEventListener('DOMContentLoaded', start);
})();
