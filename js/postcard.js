/* 엽서 쓰기: 종이 → 앞면(사진이 종이 가득) → 뒷면(편지) → 링크.
   링크를 만들 때만 앞뒷면 그림(JPEG)과 종이 종류가 서버(likes-worker의 /card)로 올라간다. 그 전에는 아무것도 브라우저 밖으로 나가지 않는다.
   받는 사람은 card.html?c=ID 에서 눌러서 뒤집어 본다. 뒷면 디자인은 아직 임시(renderBack 한 곳만 바꾸면 된다). */
(function () {
  'use strict';
  const { PAPERS, W, H, S, INK, paperImg, wrap, drawLines, loadMine, readPhoto, api } = window.NotjangKit;
  const MAXLEN = 400, JPEG_MAX = 650 * 1024;
  const CW = H, CH = W;                            // 엽서는 낱장을 옆으로 눕힌 것(3:2)
  const T = {
    KR: {
      title: '엽서 쓰기', lead: '앞면에는 사진, 뒷면에는 편지. 링크로 보내면 받는 사람이 눌러서 뒤집어 봐요.',
      s1: '종이 고르기', s2: '앞면 · 사진', s3: '뒷면 · 편지', s4: '엽서 보내기',
      next: '다음', back: '뒤로', addPhoto: '사진 넣기', change: '사진 바꾸기', drag: '사진을 끌어서 자리를 맞추세요.', original: '원본', printing: '인쇄 중…',
      bodyPh: '받는 사람에게 몇 줄.', left: (n) => `${n}자 남음`, over: '글이 엽서를 넘쳤어요. 넘친 부분은 찍히지 않아요.', fontSerif: '명조', fontMine: '내 손글씨',
      flip: '엽서를 눌러서 뒤집어 보세요.',
      notice: '링크를 만들면 엽서 앞뒷면 그림이 낱장북스 서버에 저장돼요. 링크를 아는 사람은 누구나 볼 수 있어요.',
      make: '링크 만들기', making: '엽서를 부치는 중…',
      ready: '엽서가 준비됐어요. 이 링크를 보내세요.', copy: '링크 복사', copied: '복사했어요', share: '보내기', open: '받는 사람 화면 보기',
      again: '한 장 더 쓰기', del: '이 엽서 지우기', delQ: '이 엽서를 지울까요? 링크가 더는 열리지 않아요.', deleted: '엽서를 지웠어요. 링크는 더 열리지 않아요.', delErr: '지우지 못했어요. 잠시 뒤 다시 해 주세요.',
      keepNote: '이 브라우저에서 언제든 지울 수 있어요. 엽서 쓰기 첫 화면 아래에 보낸 엽서가 남아요.',
      errLimit: '오늘은 여기서 엽서를 더 만들 수 없어요. 내일 다시 해 주세요.', err: '엽서를 올리지 못했어요. 잠시 뒤 다시 해 주세요.', noServer: '엽서 서버가 아직 연결되지 않았어요.',
      sentTitle: '이 브라우저에서 보낸 엽서', view: '엽서 보기', remove: '지우기', shareTitle: '엽서가 왔어요'
    },
    EN: {
      title: 'Write a postcard', lead: 'A photo on the front, a letter on the back. Send the link and they tap to turn it over.',
      s1: 'Choose a paper', s2: 'Front · photo', s3: 'Back · letter', s4: 'Send the postcard',
      next: 'Next', back: 'Back', addPhoto: 'Add a photo', change: 'Change photo', drag: 'Drag the photo to position it.', original: 'Original', printing: 'Printing…',
      bodyPh: 'A few lines for them.', left: (n) => `${n} left`, over: 'The text runs past the card. The overflow will not be printed.', fontSerif: 'Serif', fontMine: 'My handwriting',
      flip: 'Tap the card to turn it over.',
      notice: 'Making a link stores the front and back images on the NOTJANG BOOOKS server. Anyone who has the link can see them.',
      make: 'Make a link', making: 'Posting the card…',
      ready: 'Your postcard is ready. Send this link.', copy: 'Copy link', copied: 'Copied', share: 'Send', open: 'See what they see',
      again: 'Write another', del: 'Delete this postcard', delQ: 'Delete this postcard? The link will stop working.', deleted: 'Postcard deleted. The link no longer opens.', delErr: 'Could not delete it. Try again in a moment.',
      keepNote: 'You can delete it from this browser at any time. Sent postcards are listed at the bottom of the first screen.',
      errLimit: 'No more postcards from here today. Please try again tomorrow.', err: 'Could not upload the postcard. Try again in a moment.', noServer: 'The postcard server is not connected yet.',
      sentTitle: 'Postcards sent from this browser', view: 'Open', remove: 'Delete', shareTitle: 'A postcard for you'
    }
  };
  T.JP = T.EN; T.DE = T.EN;
  let L = T.KR;
  const $ = (id) => document.getElementById(id);

  const state = { step: 1, paper: 'white', photo: null, posX: 0.5, posY: 0.5, inks: ['brightRed', 'green'], printed: null, body: '', font: 'serif', mine: false, sent: null };
  let flip;

  /* 종이의 찢긴 가장자리를 따라 자른다. flat = 올릴 그림(JPEG라 투명이 없다): 자르지 않고 흰 바탕에 그린다. 받는 쪽이 종이 모양으로 다시 가린다. */
  /* 뒷면(mirror)은 같은 종이를 뒤집은 것이라 좌우가 바뀐다: 앞에서 왼쪽이 찢겼으면 뒤에서는 오른쪽이 찢겨 있다. */
  /* 종이 그림은 세로라 시계 방향으로 눕혀 그린다(찢긴 왼쪽 가장자리가 위로 간다). 받은 엽서(card.js)의 가리개도 같은 방향이다. */
  function paperOn(ctx, paper, mirror) {
    ctx.save();
    if (mirror) { ctx.translate(CW, 0); ctx.scale(-1, 1); }
    ctx.translate(CW, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(paper, 0, 0, W, H);
    ctx.restore();
  }
  function base(cv, paper, flat, mirror) {
    cv.width = CW; cv.height = CH;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);
    if (flat) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CW, CH); }
    paperOn(ctx, paper, mirror);
    return ctx;
  }
  const trim = (ctx, paper, flat, mirror) => { if (flat) return; ctx.globalCompositeOperation = 'destination-in'; paperOn(ctx, paper, mirror); ctx.globalCompositeOperation = 'source-over'; };

  /* 앞면: 사진이 종이 가득 */
  async function renderFront(cv, flat) {
    const paper = await paperImg(state.paper), ctx = base(cv, paper, flat);
    if (state.photo) {
      ctx.globalCompositeOperation = state.inks ? 'multiply' : 'source-over';
      ctx.drawImage(state.printed || photoBox(), 0, 0, CW, CH);
      ctx.globalCompositeOperation = 'source-over';
    }
    trim(ctx, paper, flat);
  }
  /* 뒷면: 편지. 디자인은 나중에 붙인다(지금은 글만). 돌려주는 값: {overflow} */
  const fontOf = (px) => `400 ${px}px ${state.font === 'mine' ? "'NotjangHandUser', " : ''}'Nanum Myeongjo', 'Noto Serif KR', serif`;
  async function renderBack(cv, flat) {
    const paper = await paperImg(state.paper), ctx = base(cv, paper, flat, true);
    const k = state.font === 'mine' ? 1.2 : 1, px = 13 * S * k, lh = px * 1.9;
    const side = 30 * S, width = CW - side * 2, top = 30 * S, bottom = CH - 26 * S;
    let overflow = false;
    if (state.body.trim()) {
      ctx.fillStyle = INK; ctx.textBaseline = 'top'; ctx.font = fontOf(px);
      let lines = wrap(ctx, state.body.replace(/\s+$/, ''), width);
      const fit = Math.max(0, Math.floor((bottom - top) / lh));
      if (lines.length > fit) { overflow = true; lines = lines.slice(0, fit); }
      drawLines(ctx, lines, side, top + (lh - px) / 2, width, lh, Infinity);
    }
    trim(ctx, paper, flat, true);
    return { overflow };
  }

  /* 엽서 크기의 캔버스에 사진을 채워 그린다(자리 = posX, posY) */
  function photoBox() {
    const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    const im = state.photo, fit = Math.max(CW / im.width, CH / im.height), dw = im.width * fit, dh = im.height * fit;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CH);
    ctx.drawImage(im, (CW - dw) * state.posX, (CH - dh) * state.posY, dw, dh);
    return cv;
  }
  let printJob = 0;
  async function reprint() {
    if (!state.photo) { state.printed = null; return; }
    const job = ++printJob;
    $('busy').hidden = false;
    await new Promise((ok) => setTimeout(ok, 20));
    const box = photoBox();
    const out = state.inks ? await window.NotjangRiso.print(box, state.inks) : box;
    if (job !== printJob) return;
    state.printed = out; $('busy').hidden = true;
    await renderFront($('front'));
  }

  /* ── 화면 ── */
  async function go(step) {
    state.step = step;
    document.querySelectorAll('.wstep').forEach((el) => { el.hidden = +el.dataset.step !== step; });
    document.body.classList.toggle('stage', step !== 3);
    window.scrollTo(0, 0);
    if (step === 1) buildSent();
    if (step === 2) renderFront($('front'));
    if (step === 4) {
      if (state.photo && !state.printed) await reprint();
      await renderFront($('pf')); await renderBack($('pb'));
      flip.show('front');
      $('before').hidden = !!state.sent; $('after').hidden = !state.sent; $('err').hidden = true;
    }
  }

  function buildPapers() {
    const host = $('papers'); host.innerHTML = '';
    PAPERS.forEach(([id, name, grams], i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pp' + (state.paper === id ? ' on' : '');
      b.innerHTML = `<img src="assets/papers/${id}_s.webp" alt="" loading="lazy"><span>${i + 1}. ${name}<small>${grams}g/㎡</small></span>`;
      b.onclick = () => { if (state.paper === id) { go(2); return; } state.paper = id; buildPapers(); };
      host.appendChild(b);
    });
  }
  function buildInks() {
    const k = $('inks'); k.innerHTML = '';
    const same = (x, y) => (x && y && x.join() === y.join()) || (!x && !y);
    [...window.NotjangRiso.PRESETS, null].forEach((set) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ink' + (same(state.inks, set) ? ' on' : '');
      b.innerHTML = set ? set.map((id) => `<i style="background:${window.NotjangRiso.INKS[id]}"></i>`).join('') : `<em>${L.original}</em>`;
      b.onclick = () => { state.inks = set; buildInks(); reprint(); }; k.appendChild(b);
    });
    $('photoTools').hidden = !state.photo;
    $('addlabel').textContent = state.photo ? L.change : L.addPhoto;
    $('to3').disabled = !state.photo;
  }
  async function pickPhoto(file) {
    state.photo = await readPhoto(file); state.posX = state.posY = 0.5;
    buildInks(); await reprint();
  }
  /* 앞면에서 사진을 끌어 자리 맞추기 */
  function bindPan() {
    const cv = $('front'); let start = null;
    cv.addEventListener('pointerdown', (e) => {
      if (!state.photo) return;
      const r = cv.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, px: state.posX, py: state.posY, k: CW / r.width }; cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!start) return;
      const im = state.photo, fit = Math.max(CW / im.width, CH / im.height), overX = im.width * fit - CW, overY = im.height * fit - CH;
      if (overX > 1) state.posX = Math.min(1, Math.max(0, start.px - (e.clientX - start.x) * start.k / overX));
      if (overY > 1) state.posY = Math.min(1, Math.max(0, start.py - (e.clientY - start.y) * start.k / overY));
      state.printed = null; renderFront(cv);
    });
    const end = () => { if (start) { start = null; reprint(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  async function checkText() {
    state.body = $('bodyIn').value;
    $('left').textContent = L.left(MAXLEN - [...state.body].length);
    const r = await renderBack($('probe'));
    $('over').hidden = !r.overflow;
  }
  function fontButtons() {
    $('fonts').hidden = !state.mine;
    $('fontSerif').classList.toggle('on', state.font === 'serif'); $('fontMine').classList.toggle('on', state.font === 'mine');
  }

  /* ── 보내기 ── */
  const linkOf = (id) => new URL('card.html?c=' + id, location.href).href;
  const readSent = () => { try { return JSON.parse(localStorage.getItem('nb-cards') || '[]'); } catch (e) { return []; } };
  const writeSent = (list) => { try { localStorage.setItem('nb-cards', JSON.stringify(list.slice(0, 100))); } catch (e) { /* 못 남겨도 엽서는 간다 */ } };
  const blobOf = (cv, q) => new Promise((ok) => cv.toBlob(ok, 'image/jpeg', q));
  async function jpeg(cv) {
    let b = null;
    for (const q of [0.88, 0.8, 0.72, 0.62, 0.5, 0.4]) { b = await blobOf(cv, q); if (b && b.size <= JPEG_MAX) break; }
    return b;
  }
  const say = (msg) => { $('err').textContent = msg; $('err').hidden = false; };
  function showAfter() {
    const url = linkOf(state.sent.id);
    $('link').value = url; $('open').href = url;
    $('share').hidden = !navigator.share;
    $('copy').textContent = L.copy;
    $('before').hidden = true; $('after').hidden = false;
  }
  async function make() {
    const host = api();
    if (!host) { say(L.noServer); return; }
    $('make').disabled = true; $('make').textContent = L.making; $('err').hidden = true;
    try {
      const f = document.createElement('canvas'), b = document.createElement('canvas');
      await renderFront(f, true); await renderBack(b, true);
      const fd = new FormData();
      fd.append('front', await jpeg(f), 'front.jpg'); fd.append('back', await jpeg(b), 'back.jpg'); fd.append('paper', state.paper);
      const r = await fetch(host + '/card', { method: 'POST', body: fd });
      if (r.status === 429) throw new Error('limit');
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      state.sent = { id: j.id, key: j.key, at: Date.now() };
      writeSent([state.sent, ...readSent()]);
      showAfter();
    } catch (e) { say(e.message === 'limit' ? L.errLimit : L.err); }
    $('make').disabled = false; $('make').textContent = L.make;
  }
  async function remove(card) {
    if (!confirm(L.delQ)) return false;
    try {
      const r = await fetch(api() + '/card/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: card.id, key: card.key }) });
      if (!r.ok && r.status !== 404) throw new Error('http ' + r.status);   // 404 = 이미 없다
    } catch (e) { alert(L.delErr); return false; }
    writeSent(readSent().filter((c) => c.id !== card.id));
    return true;
  }
  function buildSent() {
    const list = readSent(), host = $('sentList');
    $('sent').hidden = !list.length; host.innerHTML = '';
    const code = window.NotjangLang.CODES[window.NotjangLang.get()] || 'ko';
    list.forEach((c) => {
      const li = document.createElement('li'), a = document.createElement('a'), b = document.createElement('button');
      a.href = linkOf(c.id); a.target = '_blank'; a.rel = 'noopener';
      a.textContent = new Date(c.at).toLocaleString(code, { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' · ' + L.view;
      b.type = 'button'; b.textContent = L.remove;
      b.onclick = async () => { if (await remove(c)) { if (state.sent && state.sent.id === c.id) state.sent = null; buildSent(); } };
      li.append(a, b); host.appendChild(li);
    });
  }

  function text() {
    L = T[window.NotjangLang.get()] || T.EN;
    document.title = '낱장북스 · ' + L.title;
    $('h1').textContent = L.title; $('lead').textContent = L.lead;
    $('s1').textContent = '1. ' + L.s1; $('s2').textContent = '2. ' + L.s2; $('s3').textContent = '3. ' + L.s3; $('s4').textContent = '4. ' + L.s4;
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = L[el.dataset.t]; });
    $('bodyIn').placeholder = L.bodyPh;
    $('fontSerif').textContent = L.fontSerif; $('fontMine').textContent = L.fontMine;
    buildPapers(); buildInks(); buildSent(); checkText();
  }

  async function start() {
    flip = window.NotjangFlip($('flipper'));
    window.NotjangLang.mount($('lang'), text);
    text();
    $('pick').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) pickPhoto(f); });
    document.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(+b.dataset.go); });
    $('bodyIn').addEventListener('input', checkText); $('bodyIn').maxLength = MAXLEN;
    $('fontSerif').onclick = () => { state.font = 'serif'; fontButtons(); checkText(); };
    $('fontMine').onclick = () => { state.font = 'mine'; fontButtons(); checkText(); };
    $('make').onclick = make;
    $('copy').onclick = async () => {
      try { await navigator.clipboard.writeText($('link').value); }
      catch (e) { $('link').select(); try { document.execCommand('copy'); } catch (e2) { return; } }
      $('copy').textContent = L.copied;
    };
    $('link').onfocus = () => $('link').select();
    $('share').onclick = async () => { try { await navigator.share({ title: L.shareTitle, url: $('link').value }); } catch (e) { /* 취소 */ } };
    $('del').onclick = async () => { if (state.sent && await remove(state.sent)) { state.sent = null; $('after').hidden = true; $('before').hidden = false; say(L.deleted); } };
    $('again').onclick = () => { state.photo = null; state.printed = null; state.body = ''; state.sent = null; $('bodyIn').value = ''; buildInks(); checkText(); go(1); };
    bindPan();
    go(1);
    try { await document.fonts.load("400 20px 'Nanum Myeongjo'"); } catch (e) { /* 기본 글꼴로 */ }
    state.mine = await loadMine();
    fontButtons();
  }
  document.addEventListener('DOMContentLoaded', start);
  window.NotjangPostcard = { state, go, pickPhoto, renderFront, renderBack, checkText, make };
})();
