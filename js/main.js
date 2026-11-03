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
    KR: { date: (d) => '이 낱장은 ' + d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + '에 출판되었습니다.', empty: '아직 서점에 걸린 낱장이 없어요.<br>앱에서 낱장을 내놓으면 여기에 걸려요.', sample: '예시 낱장 · 토큰이 없어 서점에 연결하지 않았어요', err: '서점을 읽지 못했어요: ', dl: '다운로드', like: '좋아요', report: '신고하기', block: '이 글쓴이 가리기', rq: '왜 신고하나요?', reasons: { spam: '스팸·광고', abuse: '욕설·혐오·괴롭힘', privacy: '개인정보·사생활', other: '그 밖의 이유' }, cancel: '취소', reported: '신고했어요. 이 낱장은 더 보이지 않아요.', blockQ: '이 글쓴이의 낱장을 모두 가릴까요? 이 브라우저에서만 가려져요.', blocked: '가렸어요.', admHide: '서점에서 내리기 (관리자)', admShow: '다시 걸기 (관리자)', admHidden: '모두에게서 내렸어요.', admShown: '다시 걸었어요.', admOn: '관리자 모드', admOff: '관리자 모드 꺼짐', admBad: '관리자 키가 맞지 않아요.' },
    EN: { date: (d) => 'This sheet was published on ' + d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '.', empty: 'Nothing in the shop yet.<br>Put a sheet out from the app and it shows up here.', sample: 'Sample sheets · no token, not connected to the shop', err: 'Couldn\'t read the shop: ', dl: 'Download', like: 'Like', report: 'Report', block: 'Hide this author', rq: 'Why are you reporting this sheet?', reasons: { spam: 'Spam or ads', abuse: 'Abuse, hate or harassment', privacy: 'Private information', other: 'Something else' }, cancel: 'Cancel', reported: 'Reported. This sheet won’t show here anymore.', blockQ: 'Hide every sheet by this author? Only in this browser.', blocked: 'Hidden.', admHide: 'Take down (admin)', admShow: 'Put back (admin)', admHidden: 'Taken down for everyone.', admShown: 'Put back.', admOn: 'Admin mode', admOff: 'Admin mode off', admBad: 'Wrong admin key.' },
    JP: { date: (d) => 'この一枚は' + d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) + 'に出版されました。', empty: 'まだ店に並んだ一枚はありません。<br>アプリから出すとここに並びます。', sample: 'サンプル · トークンがないため店に接続していません', err: '店を読めませんでした: ', dl: 'ダウンロード', like: 'いいね', report: '通報する', block: 'この書き手を隠す', rq: 'なぜ通報しますか？', reasons: { spam: 'スパム・広告', abuse: '暴言・差別・嫌がらせ', privacy: '個人情報', other: 'その他' }, cancel: 'キャンセル', reported: '通報しました。この一枚はもう表示されません。', blockQ: 'この書き手の一枚をすべて隠しますか？このブラウザだけです。', blocked: '隠しました。', admHide: '店から下げる（管理者）', admShow: 'もう一度並べる（管理者）', admHidden: '全員から下げました。', admShown: 'もう一度並べました。', admOn: '管理者モード', admOff: '管理者モード終了', admBad: '管理者キーが違います。' },
    DE: { date: (d) => 'Dieses Blatt wurde am ' + d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }) + ' veröffentlicht.', empty: 'Noch nichts im Laden.<br>Lege ein Blatt aus der App aus, dann erscheint es hier.', sample: 'Beispielblätter · kein Token, nicht mit dem Laden verbunden', err: 'Laden konnte nicht gelesen werden: ', dl: 'Herunterladen', like: 'Gefällt mir', report: 'Melden', block: 'Diese Person ausblenden', rq: 'Warum meldest du dieses Blatt?', reasons: { spam: 'Spam oder Werbung', abuse: 'Beleidigung, Hass oder Belästigung', privacy: 'Private Daten', other: 'Anderer Grund' }, cancel: 'Abbrechen', reported: 'Gemeldet. Dieses Blatt wird hier nicht mehr gezeigt.', blockQ: 'Alle Blätter dieser Person ausblenden? Nur in diesem Browser.', blocked: 'Ausgeblendet.', admHide: 'Aus dem Laden nehmen (Admin)', admShow: 'Wieder auslegen (Admin)', admHidden: 'Für alle entfernt.', admShown: 'Wieder ausgelegt.', admOn: 'Admin-Modus', admOff: 'Admin-Modus aus', admBad: 'Falscher Admin-Schlüssel.' }
  };
  const tx = () => T[window.NotjangLang ? NotjangLang.get() : 'KR'];

  let allWorks = [], works = [];
  let view = 'canvas';
  let liked = {}, likeCounts = {};
  // 가리기: 내가 신고한 것(nb-hidden), 내가 가린 글쓴이(nb-blocked), 신고가 쌓여 서버가 가린 것(flagged)
  let hiddenIDs = {}, blocked = {}, flagged = {};
  const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } };
  const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  liked = readLS('nb-liked'); hiddenIDs = readLS('nb-hidden'); blocked = readLS('nb-blocked');
  // 관리자: ?admin=키 로 한 번 열면 이 브라우저에 남는다(nb-admin). 관리자는 가려진 작품도 흐리게 보고, 메뉴에서 바로 내리거나 다시 건다.
  let adminKey = '';
  try { adminKey = localStorage.getItem('nb-admin') || ''; } catch (e) {}
  const isAdmin = () => !!adminKey;
  const visible = () => allWorks.filter((w) => isAdmin() || (!hiddenIDs[w.id] && !flagged[w.id] && !(w.authorKey && blocked[w.authorKey])));
  const isHid = (w) => !!(flagged[w.id] || hiddenIDs[w.id] || (w.authorKey && blocked[w.authorKey]));

  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

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
      b.type = 'button'; b.className = 'tile' + (isAdmin() && isHid(w) ? ' hid' : '');
      b.setAttribute('aria-label', '낱장 ' + w.no + '번 크게 보기');
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
      b.type = 'button'; b.className = 'vsheet' + (isAdmin() && isHid(w) ? ' hid' : '');
      b.setAttribute('aria-label', '낱장 ' + w.no + '번 크게 보기');
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
    else { scrollTo(0, 0); if (!cv.tiles.length) buildCanvas(); }
  }
  btnCanvas.addEventListener('click', () => setView('canvas'));
  btnVertical.addEventListener('click', () => setView('vertical'));

  // ── 크게 보기 ────────────────────────────────────────────
  const vw = {
    front: $('#front'), back: $('#backpg'), backImg: $('#backpg img'), date: $('#date'), pos: $('#pos'),
    dl: $('#dl'), dlL: $('#dlL'), like: $('#like'), likeL: $('#likeL'), heart: $('#heart'), likeN: $('#likeN'), more: $('#more'), menu: $('#menu'),
    report: $('#report'), reportL: $('#reportL'), block: $('#block'), blockL: $('#blockL'), rbox: $('#rbox'), rq: $('#rq'), rlist: $('#rlist'),
    adm: $('#adm'), admL: $('#admL')
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
    vw.dlL.textContent = tx().dl; vw.likeL.textContent = tx().like; vw.reportL.textContent = tx().report; vw.blockL.textContent = tx().block;
    vw.block.hidden = !w.authorKey;
    vw.adm.hidden = !isAdmin();
    vw.admL.textContent = flagged[w.id] ? tx().admShow : tx().admHide;
    showMenu(false); vw.rbox.hidden = true;
    vw.pos.hidden = !isMobile();
    vw.pos.textContent = (i + 1) + ' / ' + works.length;
    renderLike();
    wheelSum = 0;
    viewer.style.backgroundColor = '';
    viewer.focus({ preventScroll: true });
  }
  function renderPage() {
    const w = works[cur];
    const n = w.sheets.length;
    vw.front.src = w.sheets[pg].src;
    vw.front.alt = w.sheets[pg].alt || '';
    if (n > 1) {
      vw.back.hidden = false;
      vw.backImg.src = w.sheets[(pg + 1) % n].src;
    } else {
      vw.back.hidden = true;
    }
    vw.dl.href = w.sheets[pg].src;
    vw.dl.download = 'notjang-' + w.no + (n > 1 ? '-' + (pg + 1) : '') + '.png';
  }
  // 앞장을 누르거나 뒷장을 누르면 다음 장
  function flipPage() {
    const n = works[cur].sheets.length;
    if (n < 2) return;
    pg = (pg + 1) % n;
    vw.front.className = 'front ' + (anim++ % 2 ? 'swapB' : 'swapA');
    renderPage();
  }
  function closeViewer() { viewer.hidden = true; cur = -1; showMenu(false); vw.rbox.hidden = true; vw.front.style.transform = ''; viewer.style.backgroundColor = ''; }
  vw.back.addEventListener('click', (e) => { e.stopPropagation(); flipPage(); });
  viewer.addEventListener('click', closeViewer);
  $('#stack').addEventListener('click', (e) => e.stopPropagation());
  $('#actions').addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight' && cur < works.length - 1) openViewer(cur + 1, 'N');
    if (e.key === 'ArrowLeft' && cur > 0) openViewer(cur - 1, 'P');
  });

  // 닫기: 종이를 아래로 끌어내리면(폰), 휠을 내리면(데스크톱), 바깥을 누르면, Esc.
  let wheelSum = 0;
  viewer.addEventListener('wheel', (e) => {
    if (viewer.hidden) return;
    wheelSum = Math.max(0, wheelSum + e.deltaY);
    if (wheelSum > 120) closeViewer();
  }, { passive: true });

  // 종이 끌기: 폰에서는 좌우로 다음·이전 작품, 아래로는 닫기. 데스크톱은 아래로만.
  let sw = null;
  vw.front.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    sw = { x: e.clientX, y: e.clientY, axis: '', dx: 0, dy: 0 };
    vw.front.classList.add('dragging');
    vw.front.setPointerCapture(e.pointerId);
  });
  vw.front.addEventListener('pointermove', (e) => {
    if (!sw) return;
    let dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.axis) {
      if (Math.abs(dx) + Math.abs(dy) < 8) return;
      sw.axis = (isMobile() && Math.abs(dx) > Math.abs(dy)) ? 'x' : 'y';
    }
    vw.front.style.transition = 'none';
    if (sw.axis === 'x') {
      if ((dx > 0 && cur === 0) || (dx < 0 && cur === works.length - 1)) dx /= 4;
      sw.dx = dx;
      vw.front.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 40).toFixed(2) + 'deg)';
    } else {
      if (dy < 0) dy /= 4;
      sw.dy = dy;
      const k = Math.min(Math.max(dy, 0) / 360, 1);
      vw.front.style.transform = 'translateY(' + dy + 'px) scale(' + (1 - k * 0.12).toFixed(3) + ')';
      viewer.style.backgroundColor = 'rgba(8,8,8,' + (0.82 - k * 0.5).toFixed(2) + ')';
    }
  });
  const swEnd = () => {
    if (!sw) return;
    const { axis, dx, dy } = sw; sw = null;
    vw.front.classList.remove('dragging');
    if (axis === 'x' && dx < -60 && cur < works.length - 1) return openViewer(cur + 1, 'N');
    if (axis === 'x' && dx > 60 && cur > 0) return openViewer(cur - 1, 'P');
    if (axis === 'y' && dy > 90) return closeViewer();
    if (!axis) return flipPage();
    vw.front.style.transition = 'transform .3s cubic-bezier(.2,.7,.2,1)';
    vw.front.style.transform = '';
    viewer.style.backgroundColor = '';
  };
  vw.front.addEventListener('pointerup', swEnd);
  vw.front.addEventListener('pointercancel', swEnd);

  // 오른쪽 위 더 보기 → 다운로드 · 좋아요
  function showMenu(on) {
    vw.menu.hidden = !on;
    vw.more.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  vw.more.addEventListener('click', (e) => { e.stopPropagation(); showMenu(vw.menu.hidden); });

  // 신고 · 가리기. 신고하면 이 브라우저에서 바로 사라지고, 서버에 쌓이면(3명) 모두에게서 사라진다.
  function applyFilter() {
    works = visible();
    buildVertical();
    cv.tiles = []; buildCanvas();
    if (!works.length) setView('vertical');
  }
  vw.rbox.addEventListener('click', (e) => e.stopPropagation());
  vw.report.addEventListener('click', (e) => {
    e.stopPropagation();
    showMenu(false);
    const t = tx();
    vw.rq.textContent = t.rq;
    vw.rlist.innerHTML = Object.keys(t.reasons).map((k) => '<button type="button" data-reason="' + k + '">' + esc(t.reasons[k]) + '</button>').join('') +
      '<button type="button" class="cancel">' + esc(t.cancel) + '</button>';
    vw.rbox.hidden = false;
  });
  vw.rlist.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('cancel')) { vw.rbox.hidden = true; return; }
    const w = works[cur];
    NotjangLikes.report(w.id, b.dataset.reason, w.authorKey).catch(() => {});
    hiddenIDs[w.id] = true; writeLS('nb-hidden', hiddenIDs);
    closeViewer(); applyFilter(); toast(tx().reported);
  });
  vw.block.addEventListener('click', (e) => {
    e.stopPropagation();
    const w = works[cur];
    if (!confirm(tx().blockQ)) return;
    if (w.authorKey) blocked[w.authorKey] = true; else hiddenIDs[w.id] = true;
    writeLS('nb-blocked', blocked); writeLS('nb-hidden', hiddenIDs);
    closeViewer(); applyFilter(); toast(tx().blocked);
  });
  // 관리자: 모두에게서 내리기 / 다시 걸기. 서버의 숨김 목록을 바꾼다.
  vw.adm.addEventListener('click', async (e) => {
    e.stopPropagation();
    const w = works[cur]; const on = !flagged[w.id];
    try {
      await NotjangLikes.adminHide(w.id, on, adminKey);
      if (on) flagged[w.id] = true; else delete flagged[w.id];
      closeViewer(); applyFilter(); toast(on ? tx().admHidden : tx().admShown);
    } catch (err) { toast(tx().admBad); }
  });
  function showAdminBar() {
    let el = $('#adminbar');
    if (!isAdmin()) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('p'); el.id = 'adminbar'; el.className = 'adminbar'; document.body.appendChild(el); }
    el.textContent = 'ADMIN';
  }
  async function adminLogin() {
    const q = new URLSearchParams(location.search);
    if (!q.has('admin')) return;
    const k = q.get('admin') || '';
    q.delete('admin');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    if (k === 'off' || !k) {
      adminKey = ''; try { localStorage.removeItem('nb-admin'); } catch (e) {}
      toast(tx().admOff); return;
    }
    if (await NotjangLikes.adminCheck(k).catch(() => false)) {
      adminKey = k; try { localStorage.setItem('nb-admin', k); } catch (e) {}
      toast(tx().admOn);
    } else toast(tx().admBad);
  }

  // 좋아요: 아직 서버가 없어 이 브라우저에만 남는다.
  function renderLike() {
    const w = works[cur];
    const on = !!liked[w.id];
    vw.heart.setAttribute('fill', on ? '#e0483e' : 'none');
    vw.heart.setAttribute('stroke', on ? '#e0483e' : 'currentColor');
    vw.like.setAttribute('aria-checked', on);
    const n = likeCounts[w.id] || 0;
    vw.likeN.textContent = n > 0 ? String(n) : '';
  }
  vw.like.addEventListener('click', (e) => {
    e.stopPropagation();
    const w = works[cur];
    const on = !liked[w.id];
    liked[w.id] = on;
    try { localStorage.setItem('nb-liked', JSON.stringify(liked)); } catch (err) {}
    likeCounts[w.id] = Math.max(0, (likeCounts[w.id] || 0) + (on ? 1 : -1));
    renderLike();
    NotjangLikes.set(w.id, on).then((n) => { if (n != null) { likeCounts[w.id] = n; if (cur >= 0 && works[cur].id === w.id) renderLike(); } }).catch(() => {});
    vw.heart.classList.remove('beat'); void vw.heart.offsetWidth; vw.heart.classList.add('beat');
  });

  // 다운로드: 다른 출처의 PNG는 download 속성이 안 먹어서 받아서 저장한다. 안 되면 새 탭.
  vw.dl.addEventListener('click', async (e) => {
    const href = vw.dl.href, name = vw.dl.download;
    showMenu(false);
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
    await adminLogin();
    showAdminBar();
    const r = await NotjangShop.load();
    allWorks = r.works;
    works = visible();
    status.className = 'status';
    if (r.error) { status.classList.add('err'); status.textContent = tx().err + r.error; }
    else if (r.source === 'sample') status.textContent = tx().sample;
    else status.textContent = '';
    buildVertical();
    buildCanvas();
    const ids = allWorks.map((w) => w.id);
    NotjangLikes.counts(ids).then((c) => { likeCounts = c; if (cur >= 0) renderLike(); }).catch(() => {});
    NotjangLikes.hidden(ids).then((list) => { if (!list.length) return; list.forEach((id) => { flagged[id] = true; }); applyFilter(); }).catch(() => {});
    if (!works.length) setView('vertical'); else setView('canvas');
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (view === 'canvas') buildCanvas(); }, 200); });
  start();
})();
