/* 낱장을 그리는 공통 도구: 종이 목록, 글 앉히기, 사진 읽기, 내 손글씨 폰트. 한 장 써보기와 엽서 쓰기가 같이 쓴다.
   치수는 앱의 SheetView와 같다(낱장 폭 354pt 기준, 2:3). */
window.NotjangKit = (function () {
  'use strict';
  const PAPERS = [
    ['white', 'Plain White', 100], ['grey_torn', 'Blue-Grey Torn', 60], ['kraft', 'Kraft', 70], ['ash', 'Ash Recycled', 80],
    ['crumpled', 'Crumpled Wove', 80], ['pink_torn', 'Pink Torn', 80], ['cream', 'Ivory', 100], ['grid', 'Grid', 70],
    ['blue', 'Sky Blue', 80], ['white_torn', 'Torn White', 80], ['ivory_torn', 'Torn Ivory', 80], ['folded', 'Folded Ivory', 90],
    ['grey', 'Grey Board', 120], ['spiral', 'Spiral Torn', 80]
  ];
  const W = 1080, H = 1620, S = W / 354;           // 낱장 그림 크기와 앱 기준 배율
  const INK = '#1C1B19';
  const loadImg = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
  const paperImgs = {};
  const paperImg = (id) => paperImgs[id] || (paperImgs[id] = loadImg('assets/papers/' + id + '.webp'));

  /* ── 글 앉히기: 글자 단위로 줄을 나누고 양끝을 맞춘다 ─────────────────── */
  const NO_START = new Set([...'.,!?)]}»”’、。…:;%']);
  function wrap(ctx, text, width) {
    const lines = [];
    text.split('\n').forEach((para) => {
      const chars = [...para]; let line = [], w = 0;
      if (!chars.length) { lines.push({ chars: [], last: true }); return; }
      chars.forEach((ch) => {
        const cw = ctx.measureText(ch).width;
        if (w + cw > width && line.length && !NO_START.has(ch)) {
          // 줄 끝 공백은 버리고, 낱말 중간이 아니면 그대로 끊는다
          while (line.length && line[line.length - 1].ch === ' ') w -= line.pop().w;
          lines.push({ chars: line, w, last: false }); line = []; w = 0;
          if (ch === ' ') return;
        }
        line.push({ ch, w: cw }); w += cw;
      });
      lines.push({ chars: line, w, last: true });
    });
    return lines;
  }
  /* 줄들을 그린다. upto = 찍을 글자 수(타자기). 돌려주는 값: 그린 글자 수와 마지막 글자 자리 */
  function drawLines(ctx, lines, x, y, width, lineH, upto) {
    let n = 0, caret = null;
    for (const ln of lines) {
      const gaps = ln.chars.length - 1;
      const extra = !ln.last && gaps > 0 ? Math.min((width - ln.w) / gaps, lineH * 0.25) : 0;
      let cx = x;
      for (const c of ln.chars) {
        if (n >= upto) return { n, caret };
        ctx.fillText(c.ch, cx, y); cx += c.w + extra; n++; caret = [cx, y];
      }
      y += lineH;
    }
    return { n, caret };
  }

  /* 고른 사진 파일을 캔버스로 읽는다(방향 바로잡고, 너무 크면 줄인다) */
  async function readPhoto(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await loadImg(URL.createObjectURL(file)); }
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return cv;
  }

  /* 내 손글씨 폰트: 폰트 메이커가 이 브라우저에 만들어 둔 게 있으면 쓴다 */
  function loadMine() {
    return new Promise((ok) => {
      let rq; try { rq = indexedDB.open('notjang-font', 1); } catch (e) { return ok(false); }
      rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
      rq.onerror = () => ok(false);
      rq.onsuccess = () => {
        try {
          const g = rq.result.transaction('kv').objectStore('kv').get('ttf');
          g.onsuccess = async () => {
            if (!g.result) return ok(false);
            try { const f = new FontFace('NotjangHandUser', g.result); await f.load(); document.fonts.add(f); ok(true); } catch (e) { ok(false); }
          };
          g.onerror = () => ok(false);
        } catch (e) { ok(false); }
      };
    });
  }

  /* 서버 주소(좋아요·엽서). 이 컴퓨터에서 볼 때는 localStorage 'nb-api'로 바꿔 볼 수 있다 */
  function api() {
    let u = (window.NOTJANG_CONFIG && window.NOTJANG_CONFIG.likesURL) || '';
    if (/^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)) {
      try { const q = new URLSearchParams(location.search).get('api'); if (q) localStorage.setItem('nb-api', q); u = localStorage.getItem('nb-api') || u; } catch (e) { /* 그대로 */ }
    }
    return u.replace(/\/$/, '');
  }

  return { PAPERS, W, H, S, INK, loadImg, paperImg, wrap, drawLines, readPhoto, loadMine, api };
})();
