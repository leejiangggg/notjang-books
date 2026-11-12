/* 한 장 써보기: 종이 → 사진(리소) → 글 → 낱장 한 장. 설치 없이 브라우저에서 끝난다.
   아무것도 저장하지 않는다(창을 닫으면 사라진다). 사진도 글도 이 브라우저 밖으로 나가지 않는다.
   치수와 글자 크기는 앱의 SheetView와 같다(낱장 폭 354pt 기준, 2:3). */
(function () {
  'use strict';
  const APP_URL = 'https://apps.apple.com/kr/app/id6829389762';
  const { PAPERS, W, H, S, INK, loadImg, paperImg, wrap, drawLines, loadMine, readPhoto } = window.NotjangKit;
  const MAXLEN = 400;
  const ASPECTS = [['3:2', 1.5], ['1:1', 1], ['9:10', 0.9]];
  const T = {
    KR: {
      title: '한 장 써보기', lead: '사진 한 장, 몇 줄의 글, 낱장 한 장. 설치 없이 지금 써 보세요.',
      s1: '종이 고르기', s2: '사진', s3: '글쓰기', s4: '낱장 한 장',
      next: '다음', back: '뒤로', addPhoto: '사진 넣기', change: '사진 바꾸기', noPhoto: '글만 쓰기', drag: '사진을 끌어서 자리를 맞추세요.',
      original: '원본', titlePh: '제목 (선택)', bodyPh: '오늘 눈에 들어온 것 하나와 그 옆에 둘 몇 줄.', left: (n) => `${n}자 남음`,
      over: '글이 종이를 넘쳤어요. 넘친 부분은 찍히지 않아요.', fontSerif: '명조', fontMine: '내 손글씨', publish: '출판',
      printing: '인쇄 중…', save: '이미지 저장', share: '공유', again: '한 장 더 쓰기', hold: '그림을 길게 눌러 저장할 수도 있어요.',
      more: '쓴 낱장을 모아 두고, 타자기 영상으로 만들고, 서점에 내놓으려면', app: '앱에서 계속 쓰기', post: '친구에게 엽서 쓰기', font: '내 손글씨로 폰트 만들기',
      keep: '이 낱장은 어디에도 저장되지 않아요. 창을 닫기 전에 이미지를 저장하세요.'
    },
    EN: {
      title: 'Write one sheet', lead: 'One photo, a few lines, one sheet. Try it now, nothing to install.',
      s1: 'Choose a paper', s2: 'Photo', s3: 'Write', s4: 'One sheet',
      next: 'Next', back: 'Back', addPhoto: 'Add a photo', change: 'Change photo', noPhoto: 'Text only', drag: 'Drag the photo to position it.',
      original: 'Original', titlePh: 'Title (optional)', bodyPh: 'One thing that caught your eye today, and a few lines beside it.', left: (n) => `${n} left`,
      over: 'The text runs past the paper. The overflow will not be printed.', fontSerif: 'Serif', fontMine: 'My handwriting', publish: 'Publish',
      printing: 'Printing…', save: 'Save image', share: 'Share', again: 'Write another', hold: 'You can also long-press the image to save it.',
      more: 'To keep your sheets, turn them into typewriter videos and put them in the shop', app: 'Continue in the app', post: 'Write a postcard to a friend', font: 'Make a font from my handwriting',
      keep: 'This sheet is not stored anywhere. Save the image before closing the window.'
    }
  };
  T.JP = T.EN; T.DE = T.EN;
  let L = T.KR;
  const $ = (id) => document.getElementById(id);

  const state = { step: 1, paper: 'white', photo: null, ratio: 1.5, posX: 0.5, posY: 0.5, inks: ['brightRed', 'green'], printed: null, title: '', body: '', font: 'serif', mine: false };
  const fontOf = (px, bold) => `${bold ? 700 : 400} ${px}px ${state.font === 'mine' ? "'NotjangHandUser', " : ''}'Nanum Myeongjo', 'Noto Serif KR', serif`;

  /* 낱장을 그린다. upto = 타자기로 찍힌 글자 수(없으면 전부). 돌려주는 값: {total, overflow} */
  async function renderSheet(cv, upto) {
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const paper = await paperImg(state.paper);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(paper, 0, 0, W, H);
    let top = 0;
    if (state.photo) {
      const ph = Math.round(W / state.ratio);
      const src = state.printed || photoBox();
      ctx.globalCompositeOperation = state.inks ? 'multiply' : 'source-over';
      ctx.drawImage(src, 0, 0, W, ph);
      ctx.globalCompositeOperation = 'source-over';
      top = ph;
    }
    const mine = state.font === 'mine', k = mine ? 1.2 : 1;
    const side = 24 * S, width = W - side * 2;
    let y = top + (state.photo ? 18 : 34) * S;
    ctx.fillStyle = INK; ctx.textBaseline = 'top';
    let total = 0, drawn = 0, overflow = false; const limit = upto === undefined ? Infinity : upto;
    const bottom = H - 22 * S;
    if (state.title.trim()) {
      const px = 16 * S * k, lh = px * 1.7;
      ctx.font = fontOf(px, true);
      const lines = wrap(ctx, state.title.trim(), width);
      total += lines.reduce((s, l) => s + l.chars.length, 0);
      const r = drawLines(ctx, lines, side, y + (lh - px) / 2, width, lh, limit); drawn += r.n;
      y += lines.length * lh + 14 * S - px * 0.4;
    }
    if (state.body.trim()) {
      const px = 13 * S * k, lh = px * 2.05;
      ctx.font = fontOf(px, false);
      let lines = wrap(ctx, state.body.replace(/\s+$/, ''), width);
      const fit = Math.max(0, Math.floor((bottom - y) / lh));
      if (lines.length > fit) { overflow = true; lines = lines.slice(0, fit); }
      total += lines.reduce((s, l) => s + l.chars.length, 0);
      const r = drawLines(ctx, lines, side, y + (lh - px) / 2, width, lh, Math.max(0, limit - drawn)); drawn += r.n;
      if (upto !== undefined && drawn < total && r.caret && Math.floor(performance.now() / 400) % 2 === 0) ctx.fillRect(r.caret[0] + 2, r.caret[1], 2 * S / 3, px * 1.1);
    }
    // 찢긴 종이: 종이의 투명 가장자리를 따라 사진·글도 잘린다
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(paper, 0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    return { total, overflow };
  }

  /* 사진 칸 크기의 캔버스에 사진을 채워 그린다(자리 = posX, posY) */
  function photoBox() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Math.round(W / state.ratio);
    const im = state.photo, fit = Math.max(cv.width / im.width, cv.height / im.height);
    const dw = im.width * fit, dh = im.height * fit;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(im, (cv.width - dw) * state.posX, (cv.height - dh) * state.posY, dw, dh);
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
    await renderSheet($('preview'));
  }

  /* ── 화면 ──────────────────────────────────────────────────────────────── */
  function go(step) {
    state.step = step;
    document.querySelectorAll('.wstep').forEach((el) => { el.hidden = +el.dataset.step !== step; });
    document.body.classList.toggle('stage', step !== 3);
    window.scrollTo(0, 0);
    if (step === 2) renderSheet($('preview'));
    if (step === 4) publish();
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
  function buildChips() {
    const a = $('aspects'); a.innerHTML = '';
    ASPECTS.forEach(([label, ratio]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (state.ratio === ratio ? ' on' : ''); b.textContent = label;
      b.onclick = () => { state.ratio = ratio; buildChips(); reprint(); }; a.appendChild(b);
    });
    const k = $('inks'); k.innerHTML = '';
    const same = (x, y) => (x && y && x.join() === y.join()) || (!x && !y);
    [...window.NotjangRiso.PRESETS, null].forEach((set) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ink' + (same(state.inks, set) ? ' on' : '');
      b.innerHTML = set ? set.map((id) => `<i style="background:${window.NotjangRiso.INKS[id]}"></i>`).join('') : `<em>${L.original}</em>`;
      b.onclick = () => { state.inks = set; buildChips(); reprint(); }; k.appendChild(b);
    });
    $('photoTools').hidden = !state.photo;
    $('addlabel').textContent = state.photo ? L.change : L.addPhoto;
    $('skip').hidden = !!state.photo;
  }

  async function pickPhoto(file) {
    state.photo = await readPhoto(file); state.posX = state.posY = 0.5;
    buildChips(); await reprint();
  }

  /* 미리보기에서 사진을 끌어 자리 맞추기 */
  function bindPan() {
    const cv = $('preview'); let start = null;
    cv.addEventListener('pointerdown', (e) => {
      if (!state.photo) return;
      const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H;
      if (y > W / state.ratio) return;
      start = { x: e.clientX, y: e.clientY, px: state.posX, py: state.posY, k: W / r.width }; cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!start) return;
      const im = state.photo, bw = W, bh = W / state.ratio, fit = Math.max(bw / im.width, bh / im.height);
      const overX = im.width * fit - bw, overY = im.height * fit - bh;
      if (overX > 1) state.posX = Math.min(1, Math.max(0, start.px - (e.clientX - start.x) * start.k / overX));
      if (overY > 1) state.posY = Math.min(1, Math.max(0, start.py - (e.clientY - start.y) * start.k / overY));
      state.printed = null; renderSheet(cv);
    });
    const end = () => { if (start) { start = null; reprint(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }

  async function checkText() {
    state.title = $('titleIn').value; state.body = $('bodyIn').value;
    $('left').textContent = L.left(MAXLEN - [...state.body].length);
    const r = await renderSheet($('probe'));
    $('over').hidden = !r.overflow;
    $('publish').disabled = !(state.title.trim() || state.body.trim() || state.photo);
  }

  /* 출판: 타자기처럼 한 자씩 찍고, 끝나면 그림으로 내놓는다 */
  let pubJob = 0;
  async function publish() {
    const job = ++pubJob, cv = $('final');
    $('done').hidden = true; $('finalImg').hidden = true; cv.hidden = false;
    if (state.photo && !state.printed) await reprint();
    const { total } = await renderSheet(cv, 0);
    const t0 = performance.now(), per = total > 160 ? 22 : 38;
    await new Promise((ok) => {
      const tick = async () => {
        if (job !== pubJob) return ok();
        const n = Math.floor((performance.now() - t0 - 500) / per);
        await renderSheet(cv, Math.max(0, Math.min(total, n)));
        if (n >= total) return ok();
        requestAnimationFrame(tick);
      };
      cv.onclick = () => { pubJob++; ok(); };   // 누르면 건너뛴다
      tick();
    });
    if (job !== pubJob && state.step !== 4) return;
    await renderSheet(cv);
    cv.toBlob((blob) => {
      state.blob = blob;
      const url = URL.createObjectURL(blob);
      $('finalImg').src = url; $('finalImg').hidden = false; cv.hidden = true;
      $('save').href = url;
      $('share').hidden = !(navigator.canShare && navigator.canShare({ files: [new File([blob], 'notjang.png', { type: 'image/png' })] }));
      $('done').hidden = false;
    }, 'image/png');
  }

  function text() {
    L = T[window.NotjangLang.get()] || T.EN;
    document.title = '낱장북스 · ' + L.title;
    $('h1').textContent = L.title; $('lead').textContent = L.lead;
    $('s1').textContent = '1. ' + L.s1; $('s2').textContent = '2. ' + L.s2; $('s3').textContent = '3. ' + L.s3;
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = L[el.dataset.t]; });
    $('titleIn').placeholder = L.titlePh; $('bodyIn').placeholder = L.bodyPh;
    $('fontSerif').textContent = L.fontSerif; $('fontMine').textContent = L.fontMine;
    buildPapers(); buildChips(); checkText();
  }

  async function start() {
    window.NotjangLang.mount($('lang'), text);
    text();
    $('pick').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) pickPhoto(f); });
    $('skip').onclick = () => go(3);
    document.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(+b.dataset.go); });
    $('titleIn').addEventListener('input', checkText); $('bodyIn').addEventListener('input', checkText);
    $('bodyIn').maxLength = MAXLEN;
    $('fontSerif').onclick = () => { state.font = 'serif'; fontButtons(); checkText(); };
    $('fontMine').onclick = () => { state.font = 'mine'; fontButtons(); checkText(); };
    $('share').onclick = async () => { try { await navigator.share({ files: [new File([state.blob], 'notjang.png', { type: 'image/png' })] }); } catch (e) { /* 취소 */ } };
    $('again').onclick = () => { state.photo = null; state.printed = null; state.title = state.body = ''; $('titleIn').value = $('bodyIn').value = ''; buildChips(); checkText(); go(1); };
    $('app').href = APP_URL;
    bindPan();
    go(1);
    try { await document.fonts.load("400 20px 'Nanum Myeongjo'"); await document.fonts.load("700 20px 'Nanum Myeongjo'"); } catch (e) { /* 기본 글꼴로 */ }
    state.mine = await loadMine();
    if (state.mine && new URLSearchParams(location.search).get('hand')) { state.font = 'mine'; checkText(); }   // 폰트 만들기에서 넘어왔으면 내 손글씨로 시작
    fontButtons();
  }
  function fontButtons() {
    $('fonts').hidden = !state.mine;
    $('fontSerif').classList.toggle('on', state.font === 'serif'); $('fontMine').classList.toggle('on', state.font === 'mine');
  }
  document.addEventListener('DOMContentLoaded', start);
  window.NotjangWrite = { state, go, pickPhoto, renderSheet, checkText };
})();
