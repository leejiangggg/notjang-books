/* 메인 페이지: 사방 보기(무한 평면) · 세로 보기 · 크게 보기. */
(function () {
  const $ = (s, el) => (el || document).querySelector(s);
  const isMobile = () => matchMedia('(max-width: 767px)').matches;

  const plane = $('#plane');
  const vertical = $('#vertical');
  const viewer = $('#viewer');
  const status = $('#status');
  const btnCanvas = $('#btnCanvas');
  const btnVertical = $('#btnVertical');
  const pill = $('#pill');

  const T = {
    KR: { date: (d) => '이 낱장은 ' + d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + '에 출판되었습니다.', two: (n, m) => n + '장짜리 낫장이에요 · 뒷장을 눌러 넘겨보세요 (' + m + ')', empty: '아직 서점에 걸린 낱장이 없어요.<br>앱에서 낱장을 내놓으면 여기에 걸려요.', sample: '예시 낱장 · 토큰이 없어 서점에 연결하지 않았어요', err: '서점을 읽지 못했어요: ' },
    EN: { date: (d) => 'This sheet was published on ' + d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '.', two: (n, m) => n + '-sheet work · tap the back sheet to turn (' + m + ')', empty: 'Nothing in the shop yet.<br>Put a sheet out from the app and it shows up here.', sample: 'Sample sheets · no token, not connected to the shop', err: 'Couldn\'t read the shop: ' },
    JP: { date: (d) => 'この一枚は' + d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) + 'に出版されました。', two: (n, m) => n + '枚つづりです · 後ろの一枚を押してめくる (' + m + ')', empty: 'まだ店に並んだ一枚はありません。<br>アプリから出すとここに並びます。', sample: 'サンプル · トークンがないため店に接続していません', err: '店を読めませんでした: ' },
    DE: { date: (d) => 'Dieses Blatt wurde am ' + d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }) + ' veröffentlicht.', two: (n, m) => n + ' Blätter · hinteres Blatt antippen zum Umblättern (' + m + ')', empty: 'Noch nichts im Laden.<br>Lege ein Blatt aus der App aus, dann erscheint es hier.', sample: 'Beispielblätter · kein Token, nicht mit dem Laden verbunden', err: 'Laden konnte nicht gelesen werden: ' }
  };
  const tx = () => T[window.NotjangLang ? NotjangLang.get() : 'KR'];

  let works = [];
  let view = 'canvas';
  let liked = {};
  try { liked = JSON.parse(localStorage.getItem('nb-liked') || '{}'); } catch (e) {}

  // ── 사방 보기 ────────────────────────────────────────────
  const cv = { ox: 0, oy: 0, vx: 0, vy: 0, drag: null, moved: 0, tiles: [], cols: 7, rows: 1, cw: 300, ch: 420, W: 0, H: 0, vw: 0, vh: 0 };

  function buildCanvas() {
    plane.innerHTML = '';
    cv.tiles = [];
    if (!works.length) return;
    const m = isMobile();
    cv.cw = m ? 190 : 300; cv.ch = m ? 290 : 420;
    // 작품은 한 번씩만. 몇 장이면 몇 장만 흩어 놓고, 많아지면 끌어서 둘러본다.
    cv.cols = Math.min(m ? 3 : 7, works.length);
    cv.rows = Math.ceil(works.length / cv.cols);
    const vw = plane.clientWidth || innerWidth, vh = plane.clientHeight || innerHeight;
    cv.W = cv.cols * cv.cw + (m ? 24 : 40); cv.H = cv.rows * cv.ch + (m ? 150 : 210);
    cv.vw = vw; cv.vh = vh;
    works.forEach((w, k) => {
      const c = k % cv.cols, r = Math.floor(k / cv.cols);
      const bx = c * cv.cw + (m ? 24 : 40), by = r * cv.ch + (c % 2 ? (m ? 150 : 210) : (m ? 30 : 40));
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile';
      b.setAttribute('aria-label', '낫장 ' + w.no + '번 크게 보기');
      b.style.animationDelay = (k * 0.03).toFixed(2) + 's';
      b.innerHTML = (w.sheets.length > 1 ? '<img class="under" src="' + w.sheets[1].src + '" alt="" aria-hidden="true" draggable="false">' : '') +
        '<img class="sheet-img" src="' + w.sheets[0].src + '" alt="' + esc(w.sheets[0].alt || '') + '" draggable="false">';
      b.addEventListener('click', () => { if (cv.moved > 6) { cv.moved = 0; return; } openViewer(k); });
      plane.appendChild(b);
      cv.tiles.push({ el: b, bx, by });
    });
    // 처음에는 묶음을 화면 가운데에.
    cv.ox = Math.round((vw - cv.W) / 2); cv.oy = Math.round((vh - cv.H) / 2);
    layoutCanvas();
  }
  // 묶음이 화면 밖으로 다 나가지 않게 붙잡는다.
  function clampOffset() {
    const pad = 120;
    const minX = Math.min(pad, cv.vw - cv.W - pad), maxX = Math.max(cv.vw - cv.W - pad, pad);
    const minY = Math.min(pad, cv.vh - cv.H - pad), maxY = Math.max(cv.vh - cv.H - pad, pad);
    if (cv.W <= cv.vw) cv.ox = Math.round((cv.vw - cv.W) / 2); else cv.ox = Math.min(maxX, Math.max(minX, cv.ox));
    if (cv.H <= cv.vh) cv.oy = Math.round((cv.vh - cv.H) / 2); else cv.oy = Math.min(maxY, Math.max(minY, cv.oy));
  }
  function layoutCanvas() {
    clampOffset();
    for (const t of cv.tiles) {
      t.el.style.transform = 'translate3d(' + (t.bx + cv.ox).toFixed(1) + 'px,' + (t.by + cv.oy).toFixed(1) + 'px,0)';
    }
  }
  plane.addEventListener('pointerdown', (e) => {
    cv.drag = { x: e.clientX, y: e.clientY, ox: cv.ox, oy: cv.oy, px: e.clientX, py: e.clientY };
    cv.moved = 0; cv.vx = 0; cv.vy = 0;
    plane.classList.add('dragging');
  });
  plane.addEventListener('pointermove', (e) => {
    const d = cv.drag; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    cv.moved = Math.max(cv.moved, Math.abs(dx) + Math.abs(dy));
    cv.vx = e.clientX - d.px; cv.vy = e.clientY - d.py;
    d.px = e.clientX; d.py = e.clientY;
    cv.ox = d.ox + dx; cv.oy = d.oy + dy;
    layoutCanvas();
  });
  const endDrag = () => { if (!cv.drag) return; cv.drag = null; plane.classList.remove('dragging'); };
  plane.addEventListener('pointerup', endDrag);
  plane.addEventListener('pointerleave', endDrag);
  plane.addEventListener('pointercancel', endDrag);
  (function tick() {
    requestAnimationFrame(tick);
    if (view !== 'canvas' || cv.drag) return;
    if (cv.vx === 0 && cv.vy === 0) return;
    cv.vx *= 0.94; cv.vy *= 0.94;
    if (Math.abs(cv.vx) < 0.05) cv.vx = 0;
    if (Math.abs(cv.vy) < 0.05) cv.vy = 0;
    cv.ox += cv.vx; cv.oy += cv.vy;
    layoutCanvas();
  })();

  // ── 세로 보기 ────────────────────────────────────────────
  function buildVertical() {
    vertical.innerHTML = '';
    if (!works.length) {
      vertical.innerHTML = '<p class="empty">' + tx().empty + '</p>';
      return;
    }
    works.forEach((w, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'vsheet';
      b.setAttribute('aria-label', '낫장 ' + w.no + '번 크게 보기');
      b.innerHTML = (w.sheets.length > 1 ? '<img class="under" src="' + w.sheets[1].src + '" alt="" aria-hidden="true" draggable="false">' : '') +
        '<img class="sheet-img" src="' + w.sheets[0].src + '" alt="' + esc(w.sheets[0].alt || '') + '" loading="lazy">';
      b.addEventListener('click', () => openViewer(i));
      vertical.appendChild(b);
    });
  }

  function setView(v) {
    view = v;
    const canvas = v === 'canvas';
    plane.hidden = !canvas;
    vertical.hidden = canvas;
    document.body.classList.toggle('vertical-mode', !canvas);
    btnCanvas.classList.toggle('on', canvas);
    btnVertical.classList.toggle('on', !canvas);
    btnCanvas.setAttribute('aria-pressed', canvas);
    btnVertical.setAttribute('aria-pressed', !canvas);
    pill.style.transform = 'translateX(' + (canvas ? 68 : 0) + 'px)';
    if (!canvas) { cv.vx = 0; cv.vy = 0; }
    else if (!cv.tiles.length) buildCanvas();
  }
  btnCanvas.addEventListener('click', () => setView('canvas'));
  btnVertical.addEventListener('click', () => setView('vertical'));

  // ── 크게 보기 ────────────────────────────────────────────
  const vw = {
    front: $('#front'), back: $('#backpg'), backImg: $('#backpg img'), hint: $('#hint'), date: $('#date'), pos: $('#pos'),
    dl: $('#dl'), like: $('#like'), heart: $('#heart'), likeN: $('#likeN'), close: $('#close')
  };
  let cur = -1, pg = 0, anim = 0;

  function openViewer(i, dir) {
    cur = i; pg = 0;
    const w = works[i];
    viewer.hidden = false;
    vw.front.className = 'front' + (dir ? ' in' + dir + (anim++ % 2 ? 'b' : 'a') : '');
    vw.front.style.transform = ''; vw.front.style.transition = '';
    renderPage();
    vw.date.textContent = tx().date(w.date);
    vw.pos.hidden = !isMobile();
    vw.pos.textContent = (i + 1) + ' / ' + works.length;
    renderLike();
    vw.close.focus({ preventScroll: true });
  }
  function renderPage() {
    const w = works[cur];
    const n = w.sheets.length;
    vw.front.src = w.sheets[pg].src;
    vw.front.alt = w.sheets[pg].alt || '';
    if (n > 1) {
      vw.back.hidden = false;
      vw.backImg.src = w.sheets[(pg + 1) % n].src;
      vw.hint.hidden = false;
      vw.hint.textContent = tx().two(n, (pg + 1) + ' / ' + n);
    } else {
      vw.back.hidden = true;
      vw.hint.hidden = true;
    }
    vw.dl.href = w.sheets[pg].src;
    vw.dl.download = 'notjang-' + w.no + (n > 1 ? '-' + (pg + 1) : '') + '.png';
  }
  function flip(e) {
    e.stopPropagation();
    const n = works[cur].sheets.length;
    pg = (pg + 1) % n;
    vw.front.className = 'front ' + (anim++ % 2 ? 'swapB' : 'swapA');
    renderPage();
  }
  function closeViewer() { viewer.hidden = true; cur = -1; }
  vw.back.addEventListener('click', flip);
  vw.close.addEventListener('click', (e) => { e.stopPropagation(); closeViewer(); });
  viewer.addEventListener('click', closeViewer);
  $('#stack').addEventListener('click', (e) => e.stopPropagation());
  $('#actions').addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight' && cur < works.length - 1) openViewer(cur + 1, 'N');
    if (e.key === 'ArrowLeft' && cur > 0) openViewer(cur - 1, 'P');
  });

  // 폰에서는 좌우로 밀어 다음·이전 작품
  let sw = null;
  vw.front.addEventListener('pointerdown', (e) => { if (!isMobile()) return; sw = { x: e.clientX }; vw.front.classList.add('dragging'); vw.front.setPointerCapture(e.pointerId); });
  vw.front.addEventListener('pointermove', (e) => {
    if (!sw) return;
    let dx = e.clientX - sw.x;
    if ((dx > 0 && cur === 0) || (dx < 0 && cur === works.length - 1)) dx /= 4;
    sw.dx = dx;
    vw.front.style.transition = 'none';
    vw.front.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 40).toFixed(2) + 'deg)';
  });
  const swEnd = () => {
    if (!sw) return;
    const dx = sw.dx || 0; sw = null;
    vw.front.classList.remove('dragging');
    if (dx < -60 && cur < works.length - 1) return openViewer(cur + 1, 'N');
    if (dx > 60 && cur > 0) return openViewer(cur - 1, 'P');
    vw.front.style.transition = 'transform .3s cubic-bezier(.2,.7,.2,1)';
    vw.front.style.transform = '';
  };
  vw.front.addEventListener('pointerup', swEnd);
  vw.front.addEventListener('pointercancel', swEnd);

  // 좋아요: 아직 서버가 없어 이 브라우저에만 남는다.
  function renderLike() {
    const w = works[cur];
    const on = !!liked[w.id];
    vw.heart.setAttribute('fill', on ? '#e0483e' : 'none');
    vw.heart.setAttribute('stroke', on ? '#e0483e' : 'currentColor');
    vw.like.setAttribute('aria-pressed', on);
    vw.likeN.textContent = '';
  }
  vw.like.addEventListener('click', (e) => {
    e.stopPropagation();
    const w = works[cur];
    liked[w.id] = !liked[w.id];
    try { localStorage.setItem('nb-liked', JSON.stringify(liked)); } catch (err) {}
    renderLike();
    vw.heart.classList.remove('beat'); void vw.heart.offsetWidth; vw.heart.classList.add('beat');
  });

  // 다운로드: 다른 출처의 PNG는 download 속성이 안 먹어서 받아서 저장한다. 안 되면 새 탭.
  vw.dl.addEventListener('click', async (e) => {
    const href = vw.dl.href, name = vw.dl.download;
    if (href.startsWith(location.origin)) return;
    e.preventDefault();
    try {
      const blob = await (await fetch(href)).blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 2000);
    } catch (err) {
      window.open(href, '_blank', 'noopener');
    }
  });

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // ── 시작 ────────────────────────────────────────────────
  async function start() {
    const r = await NotjangShop.load();
    works = r.works;
    status.className = 'status';
    if (r.error) { status.classList.add('err'); status.textContent = tx().err + r.error; }
    else if (r.source === 'sample') status.textContent = tx().sample;
    else status.textContent = '';
    buildVertical();
    buildCanvas();
    if (!works.length) setView('vertical'); else setView('canvas');
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (view === 'canvas') buildCanvas(); }, 200); });
  start();
})();
