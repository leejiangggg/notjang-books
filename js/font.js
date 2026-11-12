/* 손글씨 폰트 메이커 (통글자 방식).
   1) 격자판 인쇄(단어를 칸마다 한 글자씩) → 2) 펜으로 쓰고 찍거나 스캔해 올리기 → 3) 브라우저 안에서 TTF 조립 → 4) 마음에 안 드는 글자만 고치기 종이로 다시 쓰기.
   쓴 글자는 쓴 그대로 들어가고, 안 쓴 음절은 쓴 글자에서 자모를 꺼내 본인 비율로 조합한다.
   올린 글씨는 이 브라우저(IndexedDB)에만 저장된다. 사진은 어디에도 올라가지 않는다. */
(function () {
  'use strict';

  /* ── 종이 치수(mm). 인쇄 CSS와 사진 처리가 같은 숫자를 쓴다. ─────────── */
  const PAPER = { W: 210, H: 297, MARK: 8, MARKS: [[15, 15], [195, 15], [15, 282], [195, 282]],
    ID: [[30, 15], [36, 15], [42, 15], [48, 15]],   // 쪽 번호(이진수 4자리, 1부터. 15 = 고치기 종이)
    VER: [54, 15], IDSIZE: 4,                        // 다섯째 네모가 있으면 작은 칸(2판)
    ROW_W: 162, X0: 24, Y0: 28 };
  // 격자 두 판. 1판(큰 칸 15mm, A4 11장)으로 이미 쓴 종이도 계속 읽는다. 지금 인쇄되는 건 2판(작은 칸 10mm, 5장).
  const GRID1 = { ver: 1, px: 18, py: 18, box: 15, rows: 13, gap: 3, inset: 1.2 };
  const GRID2 = { ver: 2, px: 11, py: 13, box: 10, rows: 18, gap: 2, inset: 1.0 };
  const U_PER_MM = 1000 / 12.6;   // 글자 좌표 단위/mm (판이 달라도 같은 단위. 원점은 칸 한가운데, y는 위로)
  const FIX_MAX = 150;

  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  const JONG = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  const isHangul = (ch) => { const o = ch.codePointAt(0); return o >= 0xAC00 && o <= 0xD7A3; };
  const decompose = (ch) => { const n = ch.codePointAt(0) - 0xAC00; return [Math.floor(n / 588), Math.floor((n % 588) / 28), n % 28]; };
  const VTYPE = (j) => [8, 12, 13, 17, 18].includes(j) ? 'H' : [9, 10, 11, 14, 15, 16, 19].includes(j) ? 'M' : 'V';
  const classOf = (j, k) => VTYPE(j) + (k ? 'j' : '');

  /* ── 칸 목록: 글(fontset.js)을 단어 단위로 흘려 넣는다 ──────────────── */
  const SET = window.NotjangFontSet;
  const kindOf = (ch) => isHangul(ch) ? 'syl' : /[A-Z]/.test(ch) ? 'upper' : /[a-z]/.test(ch) ? 'lower' : /[0-9]/.test(ch) ? 'digit' : 'punct';
  const WORDS = [];
  SET.intro.forEach((s) => s.split(' ').forEach((w) => WORDS.push(w)));
  SET.words.forEach((w) => WORDS.push(w));
  SET.lower.forEach((w) => WORDS.push(w)); SET.upper.forEach((w) => WORDS.push(w)); SET.digits.forEach((w) => WORDS.push(w));
  SET.punct.forEach((w) => WORDS.push(w));
  const SUPPORTED = new Set([...SET.punct, ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789']);

  function makeLayout(g, words, extra) {
    const cells = []; let page = 0, row = 0, x = 0;
    const newRow = () => { x = 0; row++; if (row >= g.rows) { row = 0; page++; } };
    words.forEach((w) => {
      // 단어 사이는 작은 틈. 줄 끝에 걸친 단어는 잘라서 다음 줄에 이어 쓴다(줄을 꽉 채워 장수를 줄인다)
      if (x > 0 && x + g.gap + g.px > PAPER.ROW_W + 0.01) newRow();
      else if (x > 0) x += g.gap;
      [...w].forEach((ch) => {
        if (x + g.px > PAPER.ROW_W + 0.01) newRow();
        cells.push({ ch, kind: kindOf(ch), page, x: PAPER.X0 + x + (g.px - g.box) / 2, y: PAPER.Y0 + row * g.py + (g.py - g.box) / 2 });
        x += g.px;
      });
    });
    const inner = g.box - 2 * g.inset;
    return Object.assign({ cells, pages: cells.length ? cells[cells.length - 1].page + 1 : 0, inner, span: inner * U_PER_MM }, g, extra);
  }
  const LAY = { 1: makeLayout(GRID1, WORDS), 2: makeLayout(GRID2, WORDS) };
  const fixLayout = (chars) => makeLayout(GRID2, chars, { fix: true });

  /* ── 글 ───────────────────────────────────────────────────────────────── */
  const T = {
    KR: {
      title: '내 손글씨 폰트', lead: '격자판에 펜으로 쓰고, 찍어서 올리면, 내 글씨가 폰트가 됩니다. 쓴 글자는 쓴 그대로 들어가고, 안 쓴 글자는 쓴 글자에서 자모를 꺼내 조합해요. 사진은 이 브라우저 밖으로 나가지 않아요.',
      s1: '1. 격자판 인쇄', s1p: (n) => `A4 ${n}장. 칸 위의 글자를 칸 안에 검은 펜으로 쓰세요. 평소 쓰는 크기와 속도로, 예쁘게 쓰려고 하지 마세요.`, print: '인쇄하기',
      s2: '2. 찍어서 올리기', s2p: '밝은 데서 종이 전체가 들어오게, 네 귀퉁이 검은 네모가 다 보이게 찍으세요. 스캐너로 스캔한 PDF도 됩니다. 여러 장을 한꺼번에 올려도 쪽을 알아서 찾아요. 예전 큰 칸 종이도 그대로 읽어요.',
      pick: '사진이나 스캔 PDF 올리기 (여러 장 가능)', reading: (i, n) => `읽는 중… ${i} / ${n}`, restoring: '저장된 글씨 불러오는 중…',
      page: (n, of) => `${n}쪽 / ${of}`, big: '큰 칸', small: '작은 칸', count: (n) => `${n}자`, fixed: '고친 글자', retake: '이 쪽 지우기',
      found: '귀퉁이를 찾았어요. 점이 틀리면 끌어서 맞추세요.', notfound: '귀퉁이 네모를 못 찾았어요. 점을 네 귀퉁이 네모 가운데로 끌어 주세요.',
      bank: (s, o, f) => `저장된 글씨: 한글 ${s}자, 영문·숫자·부호 ${o}자` + (f ? `, 고친 글자 ${f}자` : '') + '. 이 브라우저에만 저장돼요.', nobank: '아직 올린 글씨가 없어요.', reset: '처음부터 다시', resetask: '올린 글씨를 모두 지울까요?',
      s3: '3. 폰트 만들기', s3p: '올린 만큼으로 만들 수 있어요. 빈 칸과 안 쓴 글자는 조합으로 채워요.', even: '글자 크기 고르게 (끄면 쓴 크기 그대로)', align: '위아래 줄 맞추기 (끄면 쓴 위치 그대로)', make: '폰트 만들기', making: '글자 조립 중… 20초쯤 걸려요.',
      made: (w, c) => `완성. 직접 쓴 글자 ${w}개, 조합한 글자 ${c}개.`,
      sample: '이 글씨로 쓰면 이렇게 보여요', placeholder: '아무 말이나 써 보세요', download: 'TTF 내려받기', after: '내려받은 TTF 파일은 컴퓨터에 설치하면 다른 프로그램에서도 쓸 수 있어요.',
      useh: '이 글씨로 바로 쓰기', usep: '이 브라우저에서는 방금 만든 글씨로 낱장과 엽서를 쓸 수 있어요.', usewrite: '한 장 써보기', usepost: '엽서 쓰기',
      kept: '지난번에 만든 폰트예요. 글씨를 더 올렸으면 폰트 만들기를 다시 눌러 주세요.',
      fixh: '몇 글자만 고치기', fixp: '위 견본에서 마음에 안 드는 글자를 누르거나, 아래 칸에 직접 적으세요. 그 글자만 담은 종이를 인쇄해서 쓰고 올리면 그 글자만 바뀝니다. 안 썼던 글자도 여기에 넣으면 직접 쓴 글자가 돼요.',
      fixph: '고칠 글자', fixprint: '고치기 종이 인쇄', fixnone: '고칠 글자를 먼저 골라 주세요.', fixwait: (n) => `고치기 종이를 만들었어요(${n}자). 쓰고 나서 2번에서 올리면 돼요.`, fixdone: (n) => `고친 글자 ${n}개를 넣었어요. 폰트를 다시 만들어요.`, fixlost: '이 고치기 종이에 어떤 글자가 있었는지 이 브라우저가 기억하지 못해요. 고치기 종이를 다시 만들어 주세요.', fixsheet: '고치기',
      empty: (n) => '빈 칸 ' + n + '개', legal: '개인정보 처리방침'
    },
    EN: {
      title: 'My handwriting font', lead: 'Write on the printed grid, take photos, and your handwriting becomes a font. Written characters go in exactly as written; the rest are composed from the parts you wrote. Photos never leave this browser.',
      s1: '1. Print the grid', s1p: (n) => `${n} A4 sheets. Write the character shown above each box inside it, with a black pen, at your usual size and speed. Don't try to be neat.`, print: 'Print',
      s2: '2. Photograph and upload', s2p: 'In good light, with the whole page and all four corner squares in the frame. A scanned PDF works too. Upload several at once; pages are detected. Older large-box sheets still work.',
      pick: 'Upload photos or a scanned PDF', reading: (i, n) => `Reading… ${i} / ${n}`, restoring: 'Loading saved handwriting…',
      page: (n, of) => `Page ${n} / ${of}`, big: 'large boxes', small: 'small boxes', count: (n) => `${n} glyphs`, fixed: 'Fixed glyphs', retake: 'Remove this page',
      found: 'Corners found. Drag the dots if they are off.', notfound: 'Could not find the corner squares. Drag each dot to the centre of a corner square.',
      bank: (s, o, f) => `Saved handwriting: ${s} Hangul, ${o} letters, digits and marks` + (f ? `, ${f} fixed` : '') + '. Stored in this browser only.', nobank: 'Nothing uploaded yet.', reset: 'Start over', resetask: 'Delete all uploaded handwriting?',
      s3: '3. Build the font', s3p: 'Works with whatever you have uploaded. Blank boxes and unwritten characters are filled by composition.', even: 'Even out glyph size (off = as written)', align: 'Align vertically (off = as written)', make: 'Build font', making: 'Assembling glyphs… about 20 seconds.',
      made: (w, c) => `Done. ${w} written glyphs, ${c} composed.`,
      sample: 'This is how it looks', placeholder: 'Type anything', download: 'Download TTF', after: 'Install the TTF file on a computer to use it in other programs.',
      useh: 'Write with it now', usep: 'In this browser you can write a sheet or a postcard in the handwriting you just made.', usewrite: 'Write one sheet', usepost: 'Write a postcard',
      kept: 'This is the font you made last time. If you uploaded more handwriting, press Make font again.',
      fixh: 'Fix a few glyphs', fixp: 'Tap the glyphs you dislike in the sample above, or type them below. Print a sheet with only those, write, upload, and only those change. Characters you never wrote become written ones this way too.',
      fixph: 'Glyphs to fix', fixprint: 'Print fix sheet', fixnone: 'Pick the glyphs to fix first.', fixwait: (n) => `Fix sheet ready (${n} glyphs). Write it, then upload in step 2.`, fixdone: (n) => `${n} fixed glyphs added. Rebuilding the font.`, fixlost: 'This browser does not remember which glyphs were on that fix sheet. Please make a new fix sheet.', fixsheet: 'fix',
      empty: (n) => n + ' blank boxes', legal: 'Privacy policy'
    }
  };
  T.JP = T.EN; T.DE = T.EN;
  let L = T.KR;

  /* ── 격자판 그리기(화면 미리보기 + 인쇄) ─────────────────────────────── */
  const esc = (ch) => (ch === '<' ? '&lt;' : ch === '&' ? '&amp;' : ch);
  function buildSheets(host, lay) {
    host.innerHTML = '';
    for (let p = 0; p < lay.pages; p++) {
      const sheet = document.createElement('div');
      sheet.className = 'sheet';
      const id = lay.fix ? 15 : p + 1;
      let html = '';
      PAPER.MARKS.forEach(([x, y]) => { html += `<i class="mark" style="left:${x - PAPER.MARK / 2}mm;top:${y - PAPER.MARK / 2}mm;width:${PAPER.MARK}mm;height:${PAPER.MARK}mm"></i>`; });
      const sq = ([x, y]) => `<i class="mark" style="left:${x - PAPER.IDSIZE / 2}mm;top:${y - PAPER.IDSIZE / 2}mm;width:${PAPER.IDSIZE}mm;height:${PAPER.IDSIZE}mm"></i>`;
      PAPER.ID.forEach((pos, bit) => { if (id >> bit & 1) html += sq(pos); });
      if (lay.ver === 2) html += sq(PAPER.VER);
      html += `<p class="shead">NOTJANG BOOOKS · ${L.title} · ${lay.fix ? L.fixsheet : (p + 1) + ' / ' + lay.pages}</p>`;
      lay.cells.forEach((c) => {
        if (c.page !== p) return;
        html += `<div class="cell v${lay.ver}" style="left:${c.x}mm;top:${c.y}mm;width:${lay.box}mm;height:${lay.box}mm"><span class="lab">${esc(c.ch)}</span></div>`;
      });
      html += `<p class="sfoot">${L.s1p(lay.pages)}</p>`;
      sheet.innerHTML = html;
      host.appendChild(sheet);
    }
  }
  function fitSheets() {
    const host = document.getElementById('sheets');
    const w = host.clientWidth;
    host.querySelectorAll('.sheet').forEach((s) => { s.style.zoom = ''; const sw = s.offsetWidth; s.style.zoom = Math.min(1, (w - 2) / sw); });
  }

  /* ── 사진 처리 ─────────────────────────────────────────────────────────── */
  async function loadPhoto(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); }); }
    const MAX = 3600;
    const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const gray = new Uint8ClampedArray(cv.width * cv.height);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) gray[j] = (d[i] * 77 + d[i + 1] * 151 + d[i + 2] * 28) >> 8;
    return { canvas: cv, gray, w: cv.width, h: cv.height };
  }

  /* 네 귀퉁이 검은 네모 찾기: 줄인 그림에서 어두운 덩어리를 모으고, 네모꼴이고 둘레가 밝은 것 중 각 귀퉁이에 가장 가까운 것 */
  function findMarkers(gray, w, h) {
    const s = Math.max(1, Math.round(Math.max(w, h) / 700));
    const sw = Math.floor(w / s), sh = Math.floor(h / s);
    const g = new Float32Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      let sum = 0;
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) sum += gray[(y * s + yy) * w + x * s + xx];
      g[y * sw + x] = sum / (s * s);
    }
    const r = Math.round(Math.max(sw, sh) / 24);
    const integ = new Float64Array((sw + 1) * (sh + 1));
    for (let y = 1; y <= sh; y++) { let row = 0; for (let x = 1; x <= sw; x++) { row += g[(y - 1) * sw + x - 1]; integ[y * (sw + 1) + x] = integ[(y - 1) * (sw + 1) + x] + row; } }
    const mean = (x, y) => {
      const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(sw, x + r + 1), y1 = Math.min(sh, y + r + 1);
      return (integ[y1 * (sw + 1) + x1] - integ[y0 * (sw + 1) + x1] - integ[y1 * (sw + 1) + x0] + integ[y0 * (sw + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    };
    const dark = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) dark[y * sw + x] = g[y * sw + x] < mean(x, y) * 0.6 ? 1 : 0;
    const seen = new Uint8Array(sw * sh); const comps = []; const stack = [];
    for (let i = 0; i < sw * sh; i++) {
      if (!dark[i] || seen[i]) continue;
      let n = 0, x0 = sw, y0 = sh, x1 = 0, y1 = 0, sx = 0, sy = 0;
      stack.push(i); seen[i] = 1;
      while (stack.length) {
        const k = stack.pop(); const x = k % sw, y = (k - x) / sw;
        n++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && dark[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; stack.push(k - 1); }
        if (x < sw - 1 && dark[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; stack.push(k + 1); }
        if (y > 0 && dark[k - sw] && !seen[k - sw]) { seen[k - sw] = 1; stack.push(k - sw); }
        if (y < sh - 1 && dark[k + sw] && !seen[k + sw]) { seen[k + sw] = 1; stack.push(k + sw); }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh);
      if (side < sw * 0.012 || side > sw * 0.09) continue;
      // 그림 가장자리에 닿아 잘린 마커는 납작해도 받아 준다(스캐너가 종이 끝을 자른 경우)
      const cutY = (y0 <= 1 || y1 >= sh - 2) && bw > bh, cutX = (x0 <= 1 || x1 >= sw - 2) && bh > bw;
      const asp = bw / bh;
      if (n / (bw * bh) < 0.55) continue;
      if (cutY ? (asp > 5) : cutX ? (asp < 0.2) : (asp < 0.6 || asp > 1.6)) continue;
      // 진짜 마커는 안이 아주 검고 둘레(종이)가 밝다. 카펫·책상 같은 어두운 바탕 조각을 거른다
      let inside = 0, ic = 0, ring = 0, rc = 0;
      const m = Math.max(2, Math.round(side * 0.7));
      for (let y = Math.max(0, y0 - m); y <= Math.min(sh - 1, y1 + m); y++) for (let x = Math.max(0, x0 - m); x <= Math.min(sw - 1, x1 + m); x++) {
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { inside += g[y * sw + x]; ic++; } else { ring += g[y * sw + x]; rc++; }
      }
      inside /= ic; ring /= Math.max(1, rc);
      if (inside > 110 || ring - inside < 70) continue;
      // 스캐너·사진이 종이 끝을 잘라 마커가 잘렸으면(그림 가장자리에 닿음) 남은 변에서 중심을 되살린다
      let mcx = sx / n, mcy = sy / n;
      if (y0 <= 1 && bw > bh) mcy = y1 + 1 - bw / 2; else if (y1 >= sh - 2 && bw > bh) mcy = y0 + bw / 2;
      if (x0 <= 1 && bh > bw) mcx = x1 + 1 - bh / 2; else if (x1 >= sw - 2 && bh > bw) mcx = x0 + bh / 2;
      comps.push({ cx: mcx, cy: mcy, side, n });
    }
    const corners = [[0, 0], [sw, 0], [0, sh], [sw, sh]];
    const out = []; let ok = true;
    corners.forEach(([cx, cy]) => {
      let best = null, bd = Infinity;
      comps.forEach((c) => {
        if ((cx ? c.cx < sw / 2 : c.cx > sw / 2) || (cy ? c.cy < sh / 2 : c.cy > sh / 2)) return;
        const d = Math.hypot(c.cx - cx, c.cy - cy) - c.side * 2;
        if (d < bd) { bd = d; best = c; }
      });
      if (!best) { ok = false; out.push([cx ? w * 0.9 : w * 0.1, cy ? h * 0.93 : h * 0.07]); }
      else out.push([best.cx * s + s / 2, best.cy * s + s / 2]);
    });
    if (ok) {
      const len = (a, b) => Math.hypot(out[a][0] - out[b][0], out[a][1] - out[b][1]);
      const top = len(0, 1), bottom = len(2, 3), left = len(0, 2), right = len(1, 3);
      const ratio = (left + right) / (top + bottom);
      if (Math.min(top, bottom) / Math.max(top, bottom) < 0.65 || Math.min(left, right) / Math.max(left, right) < 0.65 || ratio < 1.1 || ratio > 2.0) ok = false;
    }
    return { corners: out, ok };
  }

  /* 4점 호모그래피: mm → px */
  function homography(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const n = 8;
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const h = b.map((v, i) => v / A[i][i]);
    return (x, y) => { const d = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d]; };
  }

  function sampleAt(gray, w, h, x, y) {
    if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return 255;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return (gray[i] * (1 - fx) + gray[i + 1] * fx) * (1 - fy) + (gray[i + w] * (1 - fx) + gray[i + w + 1] * fx) * fy;
  }

  const N = 256;      // 칸 하나를 N×N으로 오린다

  /* 칸 하나 → 잉크 비트맵(Uint8 N×N). 비어 있으면 null. 테두리 선과 라벨을 피해 안쪽(inset)만 본다 */
  function cutCell(page, lay, cell) {
    const H = page.H;
    const v = new Float32Array(N * N);
    const mm = lay.inner / N;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const [px, py] = H(cell.x + lay.inset + (i + 0.5) * mm, cell.y + lay.inset + (j + 0.5) * mm);
      v[j * N + i] = sampleAt(page.gray, page.w, page.h, px, py);
    }
    const sorted = Float32Array.from(v).sort();
    const paper = sorted[Math.floor(N * N * 0.8)], darkest = sorted[Math.floor(N * N * 0.001)];
    if (paper - darkest < 55) return null;
    const thr = paper - (paper - darkest) * 0.55;
    const ink = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) ink[i] = v[i] < thr ? 1 : 0;
    // 티끌 제거(칸이 작을수록 같은 티끌이 더 많은 픽셀을 차지한다)
    const speck = Math.round(20 * (12.6 / lay.inner) * (12.6 / lay.inner));
    const lab = components(ink);
    lab.comps.forEach((c) => { if (c.n < speck) c.pixels.forEach((k) => { ink[k] = 0; }); });
    let any = 0; for (let i = 0; i < N * N; i++) any += ink[i];
    return any < speck * 1.2 ? null : ink;
  }

  /* 8방향 연결 덩어리 */
  function components(ink) {
    const seen = new Uint8Array(N * N); const comps = []; const stack = [];
    for (let i = 0; i < N * N; i++) {
      if (!ink[i] || seen[i]) continue;
      const c = { n: 0, x0: N, y0: N, x1: 0, y1: 0, pixels: [] };
      stack.push(i); seen[i] = 1;
      while (stack.length) {
        const k = stack.pop(); const x = k % N, y = (k - x) / N;
        c.n++; c.pixels.push(k); if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
          const kk = yy * N + xx; if (ink[kk] && !seen[kk]) { seen[kk] = 1; stack.push(kk); }
        }
      }
      comps.push(c);
    }
    return { comps };
  }

  /* 획 굵기(픽셀): 굵기 t, 길이 L인 획은 넓이 tL, 가장자리 픽셀 2L → t = 2·넓이/가장자리 */
  function strokeOf(ink) {
    let area = 0, edge = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x; if (!ink[i]) continue; area++;
      if (x === 0 || y === 0 || x === N - 1 || y === N - 1 || !ink[i - 1] || !ink[i + 1] || !ink[i - N] || !ink[i + N]) edge++;
    }
    return edge ? 2 * area / edge : 0;
  }
  /* 가장 가까운 (target 값) 픽셀까지의 거리. 두 번 훑는 근사(가로세로 1, 대각선 1.414) */
  function distanceTo(mask, target) {
    const d = new Float32Array(N * N), BIG = 1e6;
    for (let i = 0; i < N * N; i++) d[i] = mask[i] === target ? 0 : BIG;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x; let v = d[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - N] + 1); if (x > 0) v = Math.min(v, d[i - N - 1] + 1.414); if (x < N - 1) v = Math.min(v, d[i - N + 1] + 1.414); }
      d[i] = v;
    }
    for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
      const i = y * N + x; let v = d[i]; if (!v) continue;
      if (x < N - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < N - 1) { v = Math.min(v, d[i + N] + 1); if (x < N - 1) v = Math.min(v, d[i + N + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + N - 1] + 1.414); }
      d[i] = v;
    }
    return d;
  }
  /* 획을 delta 픽셀만큼 살찌우거나(+) 깎는다(−) */
  function reweight(ink, delta) {
    const out = new Uint8Array(N * N);
    if (delta > 0) { const d = distanceTo(ink, 1); for (let i = 0; i < N * N; i++) out[i] = d[i] <= delta + 0.2 ? 1 : 0; }
    else { const d = distanceTo(ink, 0); for (let i = 0; i < N * N; i++) out[i] = ink[i] && d[i] > -delta + 0.5 ? 1 : 0; }
    return out;
  }

  /* 비트맵 → 외곽선(원점 = 칸 한가운데, y 위로, span = 비트맵 한 변의 길이). 픽셀 변을 이어 닫힌 고리로 만들고 다듬는다. */
  function trace(ink, span) {
    const key = (x, y) => y * (N + 1) + x;
    const edges = new Map();
    const add = (x0, y0, x1, y1) => { const k = key(x0, y0); (edges.get(k) || edges.set(k, []).get(k)).push(key(x1, y1)); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!ink[y * N + x]) continue;
      if (y === 0 || !ink[(y - 1) * N + x]) add(x, y, x + 1, y);
      if (x === N - 1 || !ink[y * N + x + 1]) add(x + 1, y, x + 1, y + 1);
      if (y === N - 1 || !ink[(y + 1) * N + x]) add(x + 1, y + 1, x, y + 1);
      if (x === 0 || !ink[y * N + x - 1]) add(x, y + 1, x, y);
    }
    const loops = [];
    for (const [start] of edges) {
      const first = edges.get(start); if (!first || !first.length) continue;
      const loop = [start]; let cur = start, prev = -1;
      while (true) {
        const outs = edges.get(cur); if (!outs || !outs.length) break;
        let pick = 0;
        if (outs.length > 1 && prev >= 0) {
          const px = prev % (N + 1), py = (prev - px) / (N + 1), cx = cur % (N + 1), cy = (cur - cx) / (N + 1);
          const dx = cx - px, dy = cy - py;
          outs.forEach((o, i) => { const ox = o % (N + 1), oy = (o - ox) / (N + 1); if (dx * (oy - cy) - dy * (ox - cx) > 0) pick = i; });
        }
        const next = outs.splice(pick, 1)[0];
        if (next === start) break;
        loop.push(next); prev = cur; cur = next;
      }
      if (loop.length >= 4) loops.push(loop.map((k) => { const x = k % (N + 1); return [x, (k - x) / (N + 1)]; }));
    }
    const out = [];
    loops.forEach((pts) => {
      const n = pts.length;
      let sm = pts.map((p, i) => { const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n]; return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4]; });
      sm = rdpClosed(sm, 1.5);
      if (sm.length < 3) return;
      out.push(sm.map(([x, y]) => [(x / N - 0.5) * span, (0.5 - y / N) * span]).reverse());
    });
    return out;
  }
  function rdpClosed(pts, eps) {
    let b = 0, best = -1;
    for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > best) { best = d; b = i; } }
    const seg1 = rdp(pts.slice(0, b + 1), eps), seg2 = rdp(pts.slice(b).concat([pts[0]]), eps);
    return seg1.slice(0, -1).concat(seg2.slice(0, -1));
  }
  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1e-9;
    let idx = 0, dmax = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((y1 - y0) * pts[i][0] - (x1 - x0) * pts[i][1] + x1 * y0 - y1 * x0) / len;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax <= eps) return [pts[0], pts[pts.length - 1]];
    return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
  }
  function bboxOf(polys) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    polys.forEach((p) => p.forEach(([x, y]) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }));
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  /* ── 쪽 읽기와 글씨 창고 ───────────────────────────────────────────────── */
  // 창고(bank): 열쇠 → 쓴 글자 하나 {key, ch, kind, ink, span, polys, bbox, fix}
  //   격자판 칸: '판:칸번호' (같은 쪽을 다시 올리면 덮어쓴다), 고친 글자: 'fix:글자' (글자마다 마지막 것 하나)
  const bank = new Map();
  const photos = new Map();   // '판-쪽' 또는 'fix' → 이번에 올린 사진(귀퉁이를 끌어 고칠 수 있게)
  let pendingFix = null;      // 인쇄해 둔 고치기 종이의 글자들(문자열)

  /* 쪽 번호와 판 읽기. {ver, id} */
  function readPageId(page) {
    const dark = ([mx, my]) => {
      let d = 0, tot = 0;
      // 종이 끝이 잘려 네모 일부만 보여도 읽도록, 그림 안에 들어온 점만 센다
      for (let dy = -1.5; dy <= 1.5; dy += 0.25) for (let dx = -1; dx <= 1; dx += 0.5) {
        const [px, py] = page.H(mx + dx, my + dy);
        if (px < 1 || py < 1 || px >= page.w - 2 || py >= page.h - 2) continue;
        tot++; if (sampleAt(page.gray, page.w, page.h, px, py) < 110) d++;
      }
      return tot >= 6 && d / tot > 0.6;
    };
    let id = 0;
    PAPER.ID.forEach((pos, bit) => { if (dark(pos)) id |= 1 << bit; });
    return { ver: dark(PAPER.VER) ? 2 : 1, id };
  }

  const makeSample = (key, cell, ink, span, fix) => {
    const polys = trace(ink, span);
    return polys.length ? { key, ch: cell.ch, kind: cell.kind, ink, span, polys, bbox: bboxOf(polys), fix: !!fix } : null;
  };

  /* 쪽 하나 처리: 호모그래피 → 칸마다 오려 창고에 넣는다. 고치기 종이는 쓴 칸만 바꾼다 */
  function processPage(pg) {
    pg.H = homography(PAPER.MARKS, pg.corners);
    const lay = pg.lay;
    pg.found = 0; pg.keys = [];
    lay.cells.forEach((cell, n) => {
      if (!lay.fix && cell.page !== pg.index) return;
      const key = lay.fix ? 'fix:' + cell.ch : lay.ver + ':' + n;
      const ink = cutCell(pg, lay, cell);
      const s = ink && makeSample(key, cell, ink, lay.span, lay.fix);
      if (s) { bank.set(key, s); pg.found++; pg.keys.push(key); }
      else if (!lay.fix) bank.delete(key);
    });
  }

  /* 창고를 IndexedDB에 저장(잉크 비트맵을 비트로 눌러서). 외곽선은 불러올 때 다시 딴다 */
  const DB = {
    open() {
      return this.p || (this.p = new Promise((ok, no) => {
        const rq = indexedDB.open('notjang-font', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
        rq.onsuccess = () => ok(rq.result); rq.onerror = () => no(rq.error);
      }));
    },
    async get(k) { const db = await this.open(); return new Promise((ok, no) => { const rq = db.transaction('kv').objectStore('kv').get(k); rq.onsuccess = () => ok(rq.result); rq.onerror = () => no(rq.error); }); },
    async set(k, v) { const db = await this.open(); return new Promise((ok, no) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error); }); }
  };
  const pack = (ink) => { const b = new Uint8Array(N * N / 8); for (let i = 0; i < N * N; i++) if (ink[i]) b[i >> 3] |= 1 << (i & 7); return b; };
  const unpack = (b) => { const ink = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) ink[i] = (b[i >> 3] >> (i & 7)) & 1; return ink; };
  let saveTimer = 0;
  function saveBank() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const rows = [...bank.values()].map((s) => ({ key: s.key, ch: s.ch, kind: s.kind, span: s.span, fix: s.fix, bits: s.bits || (s.bits = pack(s.ink)) }));
      DB.set('bank', { n: N, rows }).catch((e) => console.warn('save failed', e));
    }, 400);
  }
  async function restoreBank(onProgress) {
    let saved = null;
    try { saved = await DB.get('bank'); pendingFix = (await DB.get('fix')) || null; } catch (e) { return 0; }
    if (!saved || saved.n !== N || !saved.rows || !saved.rows.length) return 0;
    for (let i = 0; i < saved.rows.length; i++) {
      const r = saved.rows[i];
      const s = makeSample(r.key, r, unpack(r.bits), r.span, r.fix);
      if (s) { s.bits = r.bits; bank.set(r.key, s); }
      if (i % 40 === 39) { onProgress && onProgress(i + 1, saved.rows.length); await new Promise((ok) => setTimeout(ok, 0)); }
    }
    return bank.size;
  }

  /* ── 자모 꺼내기 ───────────────────────────────────────────────────────── */
  // 복합모음은 가로 획 모음 + 세로 획 모음으로 나눠 다룬다(ㅘ = ㅗ + ㅏ). 초성과 얽혀 있어서 통째로는 못 가른다.
  const COMPOUND = { 9: [8, 0], 10: [8, 1], 11: [8, 20], 14: [13, 4], 15: [13, 5], 16: [13, 20], 19: [18, 20] };
  // 음절의 조각 목록: [[조각 이름, 자모 번호]…]. 조각 이름: cho, jung, jh(복합모음의 가로 쪽), jv(세로 쪽), jong
  const partsOf = (c, j, k) => {
    const out = [['cho', c]];
    if (COMPOUND[j]) out.push(['jh', COMPOUND[j][0]], ['jv', COMPOUND[j][1]]); else out.push(['jung', j]);
    if (k) out.push(['jong', k - 1]);
    return out;
  };
  // 기본 자리(글자 잉크 상자 안 비율, y는 위에서부터). 쓴 글자가 모이면 본인 비율로 바뀐다.
  const LAYOUT0 = {
    V: { cho: [0, 0.08, 0.5, 0.92], jung: [0.52, 0, 1, 1] },
    H: { cho: [0.1, 0, 0.9, 0.5], jung: [0, 0.5, 1, 1] },
    M: { cho: [0, 0, 0.55, 0.55], jh: [0, 0.52, 0.7, 1], jv: [0.64, 0, 1, 1] },
    Vj: { cho: [0, 0.02, 0.5, 0.58], jung: [0.52, 0, 1, 0.62], jong: [0.1, 0.64, 0.9, 1] },
    Hj: { cho: [0.14, 0, 0.86, 0.36], jung: [0, 0.34, 1, 0.62], jong: [0.12, 0.64, 0.88, 1] },
    Mj: { cho: [0, 0, 0.54, 0.42], jh: [0, 0.4, 0.7, 0.66], jv: [0.64, 0, 1, 0.68], jong: [0.08, 0.68, 0.92, 1] }
  };
  // 자모 가르기용 영역(가르기에만 쓴다. 자리보다 조금 넉넉하게)
  const SPLIT_ZONES = {
    V: { cho: [0, 0.04, 0.5, 0.96], jung: [0.5, 0, 1, 1] },
    H: { cho: [0.08, 0, 0.92, 0.52], jung: [0, 0.5, 1, 1] },
    M: { cho: [0, 0, 0.58, 0.55], jh: [0, 0.5, 0.72, 1], jv: [0.62, 0, 1, 1] },
    Vj: { cho: [0, 0, 0.5, 0.6], jung: [0.5, 0, 1, 0.64], jong: [0.08, 0.64, 0.92, 1] },
    Hj: { cho: [0.1, 0, 0.9, 0.36], jung: [0, 0.34, 1, 0.64], jong: [0.1, 0.64, 0.9, 1] },
    Mj: { cho: [0, 0, 0.56, 0.42], jh: [0, 0.38, 0.72, 0.66], jv: [0.62, 0, 1, 0.68], jong: [0.08, 0.66, 0.92, 1] }
  };

  /* 쓴 음절 하나를 조각으로 가른다. 실패하면 null. 결과: {조각: {polys,bbox,clean,sig}…, rel: {조각: [fx0,fy0,fx1,fy1]}}
     세로모음 글자(가 각)는 자리(영역)로 가르고, 가로모음·복합모음 글자(고 곡 과 관)는 모음의 긴 획을 찾아 그 위아래로 가른다.
     ㅎ ㅊ처럼 키 큰 초성은 자리만으로는 모음 쪽에 잘려 들어가기 때문이다. */
  function splitSyllable(glyph, c, j, k) {
    const cls = classOf(j, k), parts = partsOf(c, j, k).map((q) => q[0]);
    const { comps } = components(glyph.ink);
    if (!comps.length) return null;
    const total = comps.reduce((s, q) => s + q.n, 0);
    // 글자 잉크 상자(그림 좌표, y 아래)
    const X0 = Math.min(...comps.map((q) => q.x0)), X1 = Math.max(...comps.map((q) => q.x1)) + 1;
    const Y0 = Math.min(...comps.map((q) => q.y0)), Y1 = Math.max(...comps.map((q) => q.y1)) + 1;
    const W = X1 - X0, Hh = Y1 - Y0;
    const masks = Object.fromEntries(parts.map((p) => [p, new Uint8Array(N * N)]));
    const give = (part, pixels) => { const m = masks[part]; for (let i = 0; i < pixels.length; i++) m[pixels[i]] = 1; };
    const wOf = (q) => q.x1 - q.x0 + 1, hOf = (q) => q.y1 - q.y0 + 1;
    const relX = (q) => ((q.x0 + q.x1) / 2 - X0) / W, relY = (q) => ((q.y0 + q.y1) / 2 - Y0) / Hh;
    const fromPixels = (pixels) => { const q = { n: pixels.length, x0: N, y0: N, x1: 0, y1: 0, pixels }; pixels.forEach((px) => { const x = px % N, y = (px - x) / N; if (x < q.x0) q.x0 = x; if (x > q.x1) q.x1 = x; if (y < q.y0) q.y0 = y; if (y > q.y1) q.y1 = y; }); return q; };
    let clean = true;

    /* 가로 획이 든 덩어리를 그 획의 위(초성이 붙었을 때)와 아래(받침이 붙었을 때)에서 자른다.
       tick = 위로 솟는 꼭지가 있는 모음(ㅗ ㅛ), stem = 아래로 기둥이 있는 모음(ㅜ ㅠ). 결과 {upper, lower, under, barY} */
    const splitBar = (q, tick, stem) => {
      const rows = new Int32Array(hOf(q));
      q.pixels.forEach((px) => { rows[((px - px % N) / N) - q.y0]++; });
      // 받침이 있으면 모음의 가로 획은 글자 가운데 띠에 있다(받침의 긴 획과 헷갈리지 않게)
      const lo = k ? Math.max(0, Math.round(Y0 + 0.26 * Hh) - q.y0) : 0, hi = k ? Math.min(rows.length - 1, Math.round(Y0 + 0.74 * Hh) - q.y0) : rows.length - 1;
      let maxc = 0; for (let r = lo; r <= hi; r++) if (rows[r] > maxc) maxc = rows[r];
      let bar = hi; while (bar > lo && rows[bar] < 0.7 * maxc) bar--;                      // 띠 안에서 가장 아래쪽의 긴 줄 = 모음의 가로 획
      let top = bar; while (top > 0 && rows[top - 1] >= 0.5 * maxc) top--;                // 획의 윗줄
      let bottom = bar; while (bottom < rows.length - 1 && rows[bottom + 1] >= 0.5 * maxc) bottom++;
      let cutRow = -1, cutLow = -1;
      if (!tick) { if (top > 0.08 * Hh) cutRow = top - 1; }
      else if (top > 0) {
        let narrow = Infinity; for (let r = top - 1; r >= Math.max(0, top - 4); r--) if (rows[r] > 0) narrow = Math.min(narrow, rows[r]);
        for (let r = top - 1; r >= 0; r--) if (rows[r] > narrow * 1.7 + 3) { cutRow = r; break; }   // 꼭지 위에서 넓어지는 곳 = 초성이 붙은 곳
        if (cutRow >= 0 && cutRow < 0.1 * Hh) cutRow = -1;
      }
      if (k && rows.length - 1 - bottom > 0.15 * Hh) {
        if (!stem) cutLow = bottom + 1;
        else {
          let narrow = Infinity; for (let r = bottom + 1; r <= Math.min(rows.length - 1, bottom + 4); r++) if (rows[r] > 0) narrow = Math.min(narrow, rows[r]);
          for (let r = bottom + 3; r < rows.length; r++) if (rows[r] > narrow * 1.7 + 3) { cutLow = r; break; }   // 기둥 아래에서 넓어지는 곳 = 받침이 붙은 곳
        }
      }
      const barY = q.y0 + bar;
      const upper = [], lower = [], under = [];
      q.pixels.forEach((px) => { const r = ((px - px % N) / N) - q.y0; (cutRow >= 0 && r <= cutRow ? upper : cutLow >= 0 && r >= cutLow ? under : lower).push(px); });
      return { upper, lower, under, barY };
    };

    const vt = cls[0];
    let planned = false;
    if (vt === 'H') {
      const band = k ? [0.26, 0.8] : [0.4, 1.01];
      const cand = comps.filter((q) => wOf(q) >= 0.5 * W && relY(q) >= band[0] && relY(q) <= band[1] && (q.y0 - Y0) / Hh < 0.66);
      if (cand.length) {
        const a = cand.reduce((m, q) => (wOf(q) > wOf(m) ? q : m));
        const sp = splitBar(a, j === 8 || j === 12, j === 13 || j === 17);
        if (sp.upper.length) { clean = false; give('cho', sp.upper); }
        if (sp.under.length) { clean = false; give('jong', sp.under); }
        give('jung', sp.lower);
        for (const q of comps) {
          if (q === a) continue;
          const cy = (q.y0 + q.y1) / 2;
          if (cy < sp.barY) give('cho', q.pixels);
          else if (!k) give('jung', q.pixels);
          else give((j === 13 || j === 17) && wOf(q) < 0.22 * W && q.y0 - sp.barY < 0.1 * Hh ? 'jung' : 'jong', q.pixels);   // ㅜ ㅠ의 떨어진 기둥
        }
        planned = true;
      }
    } else if (vt === 'M') {
      const up = k ? 0.7 : 1;
      let rest = comps.slice();
      const tall = rest.filter((q) => relX(q) > 0.5 && hOf(q) >= 0.42 * Hh * up && (q.y0 - Y0) / Hh < 0.45 && relY(q) < (k ? 0.5 : 0.75));
      if (tall.length) {
        rest = rest.filter((q) => !tall.includes(q));
        for (const q of tall) {
          if (wOf(q) > 0.6 * W) {
            // 가로 획과 세로 획이 이어 쓰인 덩어리: 세로 획의 왼쪽 끝에서 세로로 자른다
            clean = false;
            const cols = new Int32Array(wOf(q)); q.pixels.forEach((px) => { cols[px % N - q.x0]++; });
            let maxc = 0, at = cols.length - 1;
            for (let x = Math.floor(cols.length / 2); x < cols.length; x++) if (cols[x] > maxc) { maxc = cols[x]; at = x; }
            let xs = at; while (xs > 0 && cols[xs - 1] >= 0.6 * maxc) xs--;
            const right = [], left = [];
            q.pixels.forEach((px) => { ((px % N - q.x0) >= xs - 1 ? right : left).push(px); });
            give('jv', right);
            if (left.length) rest.push(fromPixels(left));
          } else give('jv', q.pixels);
        }
        const band = k ? [0.3, 0.72] : [0.38, 1.01];
        const cand = rest.filter((q) => wOf(q) >= 0.3 * W && relX(q) < 0.62 && relY(q) >= band[0] && relY(q) <= band[1]);
        if (cand.length) {
          const a = cand.reduce((m, q) => (relY(q) > relY(m) ? q : m));   // 가장 아래쪽의 넓은 덩어리 = 가로 획 모음
          const sp = splitBar(a, COMPOUND[j][0] === 8, COMPOUND[j][0] === 13);
          if (sp.upper.length) { clean = false; give('cho', sp.upper); }
          if (sp.under.length) { clean = false; give('jong', sp.under); }
          give('jh', sp.lower);
          for (const q of rest) {
            if (q === a) continue;
            const cy = (q.y0 + q.y1) / 2;
            if (cy < sp.barY) give(relX(q) > 0.72 ? 'jv' : 'cho', q.pixels);
            else if (k) give('jong', q.pixels);
            else give(relX(q) > 0.5 ? 'jv' : 'jh', q.pixels);
          }
          planned = true;
        }
      }
    }
    if (!planned) {
      // 자리(영역)로 가르기: 세로모음 글자, 그리고 긴 획을 못 찾은 글자
      if (vt !== 'V') { clean = false; parts.forEach((p) => masks[p].fill(0)); }
      const lay = SPLIT_ZONES[cls];
      const zones = Object.fromEntries(parts.map((p) => { const [x0, y0, x1, y1] = lay[p]; return [p, { x0: X0 + x0 * W, y0: Y0 + y0 * Hh, x1: X0 + x1 * W, y1: Y0 + y1 * Hh }]; }));
      const overlap = (q, z) => {
        const w = Math.max(0, Math.min(q.x1 + 1, z.x1) - Math.max(q.x0, z.x0)), h = Math.max(0, Math.min(q.y1 + 1, z.y1) - Math.max(q.y0, z.y0));
        return w * h / (wOf(q) * hOf(q));
      };
      const dist = (q, z) => Math.hypot((q.x0 + q.x1) / 2 - (z.x0 + z.x1) / 2, (q.y0 + q.y1) / 2 - (z.y0 + z.y1) / 2) / Math.max(W, Hh);
      for (const q of comps) {
        const ov = parts.map((p) => [p, overlap(q, zones[p]) - 0.05 * dist(q, zones[p])]).sort((x, y) => y[1] - x[1]);
        const [p1, o1] = ov[0], [p2, o2] = ov[1] || [null, 0];
        if (p2 && o2 > 0.28 && o1 < 0.85 && q.n > total * 0.12) {
          clean = false;
          // 두 자리에 걸친 큰 덩어리: 두 자리 사이 경계선으로 가른다(옆이면 세로선, 위아래면 가로선)
          const za = zones[p1], zb = zones[p2];
          const side = Math.abs((za.x0 + za.x1) - (zb.x0 + zb.x1)) > Math.abs((za.y0 + za.y1) - (zb.y0 + zb.y1));
          const first = side ? (za.x0 < zb.x0 ? p1 : p2) : (za.y0 < zb.y0 ? p1 : p2), second = first === p1 ? p2 : p1;
          const cut = side ? (zones[first].x1 + zones[second].x0) / 2 : (zones[first].y1 + zones[second].y0) / 2;
          let na = 0, nb = 0;
          q.pixels.forEach((px) => { const x = px % N, y = (px - x) / N; if ((side ? x : y) < cut) { masks[first][px] = 1; na++; } else { masks[second][px] = 1; nb++; } });
          if (na < q.n * 0.08 || nb < q.n * 0.08) return null;   // 한쪽이 거의 없으면 애매한 글자. 배우지 않는다
        } else give(p1, q.pixels);
      }
    }
    const out = { rel: {} };
    for (const p of parts) {
      let n = 0; for (let i = 0; i < N * N; i++) n += masks[p][i];
      if (n < total * 0.04) return null;
      const polys = trace(masks[p], glyph.span);
      if (!polys.length) return null;
      const bb = bboxOf(polys);
      out[p] = { polys, bbox: bb, clean, sig: signature(masks[p]) };
      // 글자 상자 안 비율(칸 단위, y 위로 → 위에서부터 비율로)
      const sp = glyph.span, gx0 = (X0 / N - 0.5) * sp, gx1 = (X1 / N - 0.5) * sp, gy1 = (0.5 - Y0 / N) * sp, gy0 = (0.5 - Y1 / N) * sp;
      out.rel[p] = [(bb.x0 - gx0) / (gx1 - gx0), (gy1 - bb.y1) / (gy1 - gy0), (bb.x1 - gx0) / (gx1 - gx0), (gy1 - bb.y0) / (gy1 - gy0)];
    }
    return out;
  }

  /* 자모 조각의 모양 지문: 잉크 상자를 12×12로 나눈 칸별 잉크 비율 + 가로세로비. 표본끼리 닮았는지 볼 때 쓴다 */
  const SG = 12;
  function signature(mask) {
    let x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (mask[y * N + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, grid = new Float32Array(SG * SG), cnt = new Float32Array(SG * SG);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const g = Math.min(SG - 1, Math.floor((y - y0) / h * SG)) * SG + Math.min(SG - 1, Math.floor((x - x0) / w * SG));
      cnt[g]++; if (mask[y * N + x]) grid[g]++;
    }
    for (let i = 0; i < SG * SG; i++) grid[i] = cnt[i] ? grid[i] / cnt[i] : 0;
    return { grid, aspect: Math.log(w / h) };
  }
  const sigDist = (a, b) => { let d = 0; for (let i = 0; i < SG * SG; i++) d += Math.abs(a.grid[i] - b.grid[i]); return d / (SG * SG) + 0.25 * Math.abs(a.aspect - b.aspect); };
  /* 표본 중 가장 '보통'인 것(다른 표본들과 거리 합이 가장 작은 것). 잘못 갈린 표본은 저절로 밀려난다 */
  function medoid(list) {
    if (list.length <= 2) return list.find((s) => s.clean) || list[0];
    const pool = list.filter((s) => s.clean).length >= 3 ? list.filter((s) => s.clean) : list;
    let best = pool[0], bd = Infinity;
    pool.forEach((a) => { let d = 0; pool.forEach((b) => { d += sigDist(a.sig, b.sig); }); if (d < bd) { bd = d; best = a; } });
    return best;
  }

  const median = (arr) => { if (!arr.length) return NaN; const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

  /* 쓴 음절 전부(list = 창고의 글자들)에서 조각 표본과 본인 비율을 모은다 */
  function learn(list) {
    const samples = { cho: {}, jung: {}, jh: {}, jv: {}, jong: {} };   // samples[조각][번호][자리] = [{polys,bbox,clean,sig}]
    const rels = {};                                                    // rels[자리][조각] = [[fx0,fy0,fx1,fy1]…]
    const bodies = [];                                                  // 쓴 음절 잉크 상자(칸 단위)
    let learned = 0;
    list.forEach((gl) => {
      const cell = gl; if (cell.kind !== 'syl') return;
      bodies.push(gl.bbox);
      const [c, j, k] = decompose(cell.ch);
      const sp = splitSyllable(gl, c, j, k); if (!sp) return;
      const cls = classOf(j, k);
      rels[cls] = rels[cls] || {};
      partsOf(c, j, k).forEach(([part, idx]) => {
        ((samples[part][idx] = samples[part][idx] || {})[cls] = samples[part][idx][cls] || []).push(sp[part]);
        (rels[cls][part] = rels[cls][part] || []).push(sp.rel[part]);
      });
      learned++;
    });
    const layout = {};
    Object.keys(LAYOUT0).forEach((cls) => {
      layout[cls] = {};
      Object.keys(LAYOUT0[cls]).forEach((p) => {
        const list = (rels[cls] || {})[p] || [];
        layout[cls][p] = list.length >= 3 ? [0, 1, 2, 3].map((i) => median(list.map((r) => r[i]))) : LAYOUT0[cls][p];
      });
    });
    const num = (v, d) => (Number.isFinite(v) ? v : d);
    const body = { w: num(median(bodies.map((b) => b.w)), 400), h: num(median(bodies.map((b) => b.h)), 420), cx: num(median(bodies.map((b) => b.cx)), 0), cy: num(median(bodies.map((b) => b.cy)), 0) };
    return { samples, layout, body, picks: {}, learned };
  }

  /* 조각 목록을 본인 비율 자리에 놓는다(거의 안 늘인다). 조각이 하나라도 없으면 null */
  function composeParts(model, cls, parts) {
    const lay = model.layout[cls], B = model.body;
    const pick = (part, idx) => {
      // 복합모음 조각이 없으면 홑모음 표본에서 빌린다(ㅘ의 ㅗ ← '고'의 ㅗ)
      const byCls = model.samples[part][idx] || ((part === 'jh' || part === 'jv') ? model.samples.jung[idx] : null);
      if (!byCls) return null;
      let list = byCls[cls];
      if (!list) { const vt = cls[0]; list = Object.keys(byCls).filter((q) => q[0] === vt).flatMap((q) => byCls[q]); }
      if (!list.length) list = Object.values(byCls).flat();
      if (!list.length) return null;
      const key = part + idx + cls;
      return model.picks[key] || (model.picks[key] = medoid(list));
    };
    const polys = [];
    for (const [part, idx] of parts) {
      const s = pick(part, idx); if (!s) return null;
      const [fx0, fy0, fx1, fy1] = lay[part];
      const gx0 = B.cx - B.w / 2, gy1 = B.cy + B.h / 2;
      const zx0 = gx0 + fx0 * B.w, zx1 = gx0 + fx1 * B.w, zy1 = gy1 - fy0 * B.h, zy0 = gy1 - fy1 * B.h;
      const sc = Math.max(0.75, Math.min(1.3, Math.min((zx1 - zx0) / Math.max(1, s.bbox.w), (zy1 - zy0) / Math.max(1, s.bbox.h))));
      const ox = (zx0 + zx1) / 2 - s.bbox.cx * sc, oy = (zy0 + zy1) / 2 - s.bbox.cy * sc;
      s.polys.forEach((p) => polys.push(p.map(([x, y]) => [x * sc + ox, y * sc + oy])));
    }
    return polys;
  }
  /* 안 쓴 음절 조합 */
  const compose = (model, c, j, k) => composeParts(model, classOf(j, k), partsOf(c, j, k));

  /* ── 폰트 조립 ─────────────────────────────────────────────────────────── */
  const ASC = 880, DESC = -120, MID = (ASC + DESC) / 2;
  const r = (v) => Math.round(v);
  function toPath(polys) {
    const path = new opentype.Path();
    polys.forEach((p) => {
      const n = p.length; if (n < 3) return;
      const mid = (i) => [(p[i % n][0] + p[(i + 1) % n][0]) / 2, (p[i % n][1] + p[(i + 1) % n][1]) / 2];
      const m = mid(0); path.moveTo(r(m[0]), r(m[1]));
      for (let i = 1; i <= n; i++) { const cc = p[i % n], mm = mid(i); path.quadraticCurveTo(r(cc[0]), r(cc[1]), r(mm[0]), r(mm[1])); }
      path.close();
    });
    return path;
  }
  const uni = (code) => 'uni' + code.toString(16).toUpperCase().padStart(4, '0');

  /* opts.even: 글자 크기 고르게(같은 꼴의 글자끼리 본인 중앙값 크기로), opts.align: 위아래 흔들림 없애기 */
  function buildFont(list, opts) {
    opts = Object.assign({ even: true, align: false }, opts);
    const model = learn(list);
    // 크기 고르게: 인쇄 글꼴처럼 모든 음절을 같은 네모(본인 글씨의 넉넉한 폭 × 키)에 맞춘다.
    // 키 큰 글자(이 를)는 키가, 납작한 글자(으 그)는 폭이 상자에 닿는다. 한 글자를 0.7~1.5배 넘게는 안 바꾼다.
    const pct = (arr, q) => { const t = [...arr].sort((x, y) => x - y); return t.length ? t[Math.min(t.length - 1, Math.floor(t.length * q))] : NaN; };
    const sylBoxes = [], offLists = {};
    list.forEach((gl) => {
      const cell = gl; if (cell.kind !== 'syl') return;
      const [, j, k] = decompose(cell.ch); const cls = classOf(j, k);
      sylBoxes.push(gl.bbox);
      (offLists[cls] = offLists[cls] || []).push(gl.bbox.cy - model.body.cy);
    });
    const BOXW = pct(sylBoxes.map((bb) => bb.w), 0.7) || model.body.w, BOXH = pct(sylBoxes.map((bb) => bb.h), 0.7) || model.body.h;
    const clamp = (v) => Math.max(0.7, Math.min(1.5, v));
    // 글자를 e배 하면 획도 e배 굵어진다. 그래서 키울 글자는 먼저 획을 깎고 줄일 글자는 살찌워서, 다 같은 펜으로 쓴 것처럼 맞춘다.
    const penOf = (gl) => gl.stroke || (gl.stroke = strokeOf(gl.ink) * gl.span / N);   // 획 굵기(글자 좌표 단위)
    const PEN = median(list.filter((gl) => gl.kind === 'syl').map(penOf)) || 30;
    const sameWeight = (gl, e) => {
      const t = penOf(gl); if (!t) return null;
      const delta = Math.max(-t / 3, Math.min(t * 0.6, (PEN / e - t) / 2)) * N / gl.span;   // 픽셀로
      if (Math.abs(delta) < 0.6) return null;
      const polys = trace(reweight(gl.ink, delta), gl.span);
      return polys.length ? { polys, bbox: bboxOf(polys) } : null;
    };
    const evenPolys = (ch, polys, bb, gl) => {   // 음절 하나를 크기·위치 보정한 {polys, bbox}로. gl(쓴 글자)이 있으면 획 굵기도 맞춘다
      if (opts.even) {
        const e = clamp(Math.min(BOXW / Math.max(1, bb.w), BOXH / Math.max(1, bb.h)));
        const w = gl && sameWeight(gl, e); if (w) { polys = w.polys; bb = w.bbox; }
        polys = polys.map((p) => p.map(([x, y]) => [(x - bb.cx) * e + bb.cx, (y - bb.cy) * e + bb.cy])); bb = bboxOf(polys);
      }
      if (opts.align) {
        const [, j, k] = decompose(ch); const off = offLists[classOf(j, k)] || [];
        const dy = model.body.cy + (off.length >= 5 ? median(off) : 0) - bb.cy;
        polys = polys.map((p) => p.map(([x, y]) => [x, y + dy])); bb = bboxOf(polys);
      }
      return { polys, bbox: bb };
    };
    const S = opts.even ? 800 / BOXH : 780 / model.body.h;
    // 영문·숫자도 같은 종류끼리(대문자, 숫자, 소문자 몸통, 올라가는 글자, 내려가는 글자)
    const lineGroup = (cell) => cell.kind === 'upper' ? 'U' : cell.kind === 'digit' ? 'D' : cell.kind !== 'lower' ? null : 'acemnorsuvwxz'.includes(cell.ch) ? 'x' : 'bdfhklti'.includes(cell.ch) ? 'a' : 'gpqy'.includes(cell.ch) ? 'd' : null;
    const lineLists = {};
    list.forEach((gl) => { const g = lineGroup(gl); if (g) (lineLists[g] = lineLists[g] || []).push(gl.bbox.h); });
    const evenLine = (cell, gl) => { const g = lineGroup(cell); return opts.even && g && lineLists[g].length >= 3 ? clamp(median(lineLists[g]) / Math.max(1, gl.bbox.h)) : 1; };
    // 종이 → 글꼴 배율: 쓴 음절 키의 중앙값이 780이 되게. 모든 글자에 같은 배율(상대 크기는 쓴 대로)

    const LB = 34;
    const placeBody = (polys, bb, cy0) => {   // 한글: 세로는 쓴 위치 그대로(본인 글자 중심이 글꼴 중앙), 가로는 잉크 왼쪽부터
      const ox = LB - bb.x0 * S, oy = MID - cy0 * S;
      return { path: toPath(polys.map((p) => p.map(([x, y]) => [x * S + ox, y * S + oy]))), adv: r(bb.w * S + 2 * LB) };
    };
    // 영문·숫자·부호: 크기는 쓴 그대로(같은 배율), 세로 자리는 글자 종류로 정한다.
    // (칸의 점선에 맞춰 쓰는 사람이 드물어서 쓴 높이는 믿지 않는다)
    const inkH = (kind, chars) => median(list.map((c) => (c.kind === kind && (!chars || chars.includes(c.ch))) ? c.bbox.h * S : null).filter((v) => v !== null));
    const capH = inkH('upper') || 620, xH = inkH('lower', 'acemnorsuvwxz') || capH * 0.68;
    const lineBottom = (cell, h) => {
      const ch = cell.ch;
      if (cell.kind === 'lower') { if ('gpqy'.includes(ch)) return xH - h; if (ch === 'j') return Math.min(0, xH * 1.35 - h); return 0; }
      if (cell.kind !== 'punct') return 0;
      if (',;'.includes(ch)) return ch === ',' ? -h * 0.45 : -capH * 0.12;
      if ('\'"*'.includes(ch)) return capH - h;
      if ('-~+=<>'.includes(ch)) return capH * 0.45 - h / 2;
      if ('()[]{}/'.includes(ch)) return capH * 0.42 - h / 2;
      return 0;   // . ! ? : & @ # % _ …
    };
    const placeLine = (cell, polys, bb, e) => {
      const Z = S * (e || 1), h = bb.h * Z, ox = 40 - bb.x0 * Z, oy = lineBottom(cell, h) - bb.y0 * Z;
      return { path: toPath(polys.map((p) => p.map(([x, y]) => [x * Z + ox, y * Z + oy]))), adv: r(bb.w * Z + 80) };
    };
    const glyphs = [
      new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 500, path: new opentype.Path() }),
      new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: r(Math.max(260, model.body.w * S * 0.5)), path: new opentype.Path() })
    ];
    const done = new Set([0, 32]);
    let written = 0, composed = 0;
    // 1) 쓴 글자 그대로. 고친 글자가 있으면 그것, 없으면 여러 번 쓴 것 중 크기가 중간인 것
    const byChar = {};
    list.forEach((gl) => (byChar[gl.ch] = byChar[gl.ch] || []).push(gl));
    Object.keys(byChar).forEach((ch) => {
      const same = byChar[ch], fixed = same.filter((g) => g.fix);
      const areas = same.map((g) => g.bbox.w * g.bbox.h), m = median(areas);
      const gl = fixed.length ? fixed[fixed.length - 1] : same[areas.indexOf(areas.reduce((a, b) => Math.abs(a - m) < Math.abs(b - m) ? a : b))], cell = gl;
      const code = ch.codePointAt(0); if (done.has(code)) return;
      let pl;
      if (cell.kind === 'syl') { const ev = evenPolys(ch, gl.polys, gl.bbox, gl); pl = placeBody(ev.polys, ev.bbox, model.body.cy); }
      else { const e = evenLine(cell, gl); const w = (opts.even && e !== 1 && sameWeight(gl, e)) || gl; pl = placeLine(cell, w.polys, w.bbox, e); }
      glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: pl.adv, path: pl.path }));
      done.add(code); written++;
    });
    // 2) 격자판에 있었지만 비어 있는 영문·부호: 빈 글자
    LAY[2].cells.forEach((cell) => { const code = cell.ch.codePointAt(0); if (!done.has(code) && cell.kind !== 'syl') { glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: 400, path: new opentype.Path() })); done.add(code); } });
    // 3) 낱자 자모(ㄱ, ㅏ …): 표본을 가운데에
    const jamoList = [...CHO].map((ch, i) => [ch, 'cho', i]).concat([...JUNG].map((ch, i) => [ch, 'jung', i]), [...JONG].map((ch, i) => [ch, 'jong', i]));
    jamoList.forEach(([ch, part, idx]) => {
      const code = ch.codePointAt(0); if (done.has(code)) return;
      const B = model.body;
      let polys = null;
      if (part === 'jung' && COMPOUND[idx]) polys = composeParts(model, 'M', [['jh', COMPOUND[idx][0]], ['jv', COMPOUND[idx][1]]]);
      else {
        const byCls = model.samples[part][idx]; const list = byCls ? Object.values(byCls).flat() : [];
        if (list.length) { const s = medoid(list); polys = s.polys.map((p) => p.map(([x, y]) => [x - s.bbox.cx + B.cx, y - s.bbox.cy + B.cy])); }
      }
      if (!polys) { glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: 600, path: new opentype.Path() })); done.add(code); return; }
      const pl = placeBody(polys, bboxOf(polys), B.cy);
      glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: pl.adv, path: pl.path })); done.add(code);
    });
    // 4) 나머지 음절 전부 조합
    for (let c = 0; c < 19; c++) for (let j = 0; j < 21; j++) for (let k = 0; k < 28; k++) {
      const code = 0xAC00 + (c * 21 + j) * 28 + k; if (done.has(code)) continue;
      const polys = compose(model, c, j, k);
      if (!polys) { glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: r(model.body.w * S + 2 * LB), path: new opentype.Path() })); continue; }
      const ev = evenPolys(String.fromCharCode(code), polys, bboxOf(polys));
      const pl = placeBody(ev.polys, ev.bbox, model.body.cy);
      glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: pl.adv, path: pl.path }));
      composed++;
    }
    const font = new opentype.Font({ familyName: opts.family || 'NotjangHand', styleName: 'Regular', unitsPerEm: 1000, ascender: ASC, descender: DESC, glyphs });
    return { font, glyphs, written, composed, model };
  }

  /* opentype.js는 cmap(4형식)을 글자마다 한 구간씩 써서 한글 11,172자면 64KB 한계를 넘는다(브라우저가 거부).
     구간을 합쳐 cmap만 다시 쓰고 파일을 재조립한다. glyphs 순서 = 글리프 번호. */
  function fixCmap(buffer, glyphs) {
    const src = new DataView(buffer);
    const numTables = src.getUint16(4);
    const tables = [];
    for (let i = 0; i < numTables; i++) {
      const o = 12 + i * 16;
      const tag = String.fromCharCode(src.getUint8(o), src.getUint8(o + 1), src.getUint8(o + 2), src.getUint8(o + 3));
      tables.push({ tag, data: new Uint8Array(buffer, src.getUint32(o + 8), src.getUint32(o + 12)) });
    }
    const pairs = [];
    glyphs.forEach((g, i) => { if (g.unicode && g.unicode < 0xFFFF) pairs.push([g.unicode, i]); });
    pairs.sort((a, b) => a[0] - b[0]);
    const segs = [];
    pairs.forEach(([c, i]) => {
      const last = segs[segs.length - 1];
      if (last && c === last.end + 1 && i === last.gid + (c - last.start)) last.end = c; else segs.push({ start: c, end: c, gid: i });
    });
    segs.push({ start: 0xFFFF, end: 0xFFFF, gid: 0, delta: 1 });
    const n = segs.length, segX2 = n * 2;
    const sub = new DataView(new ArrayBuffer(16 + n * 8));
    sub.setUint16(0, 4); sub.setUint16(2, 16 + n * 8); sub.setUint16(4, 0); sub.setUint16(6, segX2);
    let sr = 1, es = 0; while (sr * 2 <= n) { sr *= 2; es++; }
    sub.setUint16(8, sr * 2); sub.setUint16(10, es); sub.setUint16(12, segX2 - sr * 2);
    segs.forEach((sg, k) => {
      sub.setUint16(14 + k * 2, sg.end);
      sub.setUint16(16 + segX2 + k * 2, sg.start);
      sub.setUint16(16 + segX2 * 2 + k * 2, sg.delta !== undefined ? sg.delta : (sg.gid - sg.start) & 0xFFFF);
      sub.setUint16(16 + segX2 * 3 + k * 2, 0);
    });
    const cmap = new Uint8Array(4 + 8 * 2 + sub.byteLength);
    const cv = new DataView(cmap.buffer);
    cv.setUint16(0, 0); cv.setUint16(2, 2);
    cv.setUint16(4, 0); cv.setUint16(6, 3); cv.setUint32(8, 20);
    cv.setUint16(12, 3); cv.setUint16(14, 1); cv.setUint32(16, 20);
    cmap.set(new Uint8Array(sub.buffer), 20);
    tables.find((t) => t.tag === 'cmap').data = cmap;
    const pad = (v) => (v + 3) & ~3;
    let total = 12 + numTables * 16;
    tables.forEach((t) => { t.offset = total; total += pad(t.data.length); });
    const out = new Uint8Array(total); const dv = new DataView(out.buffer);
    out.set(new Uint8Array(buffer, 0, 12), 0);
    const sum = (u8) => { let s = 0; for (let i = 0; i < u8.length; i += 4) s = (s + ((u8[i] << 24) | (u8[i + 1] << 16) | (u8[i + 2] << 8) | (u8[i + 3] || 0))) >>> 0; return s; };
    tables.forEach((t, i) => {
      const o = 12 + i * 16;
      for (let k = 0; k < 4; k++) dv.setUint8(o + k, t.tag.charCodeAt(k));
      out.set(t.data, t.offset);
      dv.setUint32(o + 4, sum(out.subarray(t.offset, t.offset + pad(t.data.length))));
      dv.setUint32(o + 8, t.offset); dv.setUint32(o + 12, t.data.length);
    });
    return out.buffer;
  }

  /* ── 화면 ──────────────────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  let fontBuffer = null, previewFace = null;

  function text() {
    L = T[window.NotjangLang.get()] || T.KR;
    document.title = '낱장북스 · ' + L.title;
    $('h1').textContent = L.title; $('lead').textContent = L.lead;
    $('s1').textContent = L.s1; $('s1p').textContent = L.s1p(LAY[2].pages); $('print').textContent = L.print;
    $('s2').textContent = L.s2; $('s2p').textContent = L.s2p; $('picklabel').textContent = L.pick; $('reset').textContent = L.reset;
    $('s3').textContent = L.s3; $('s3p').textContent = L.s3p; $('make').textContent = L.make;
    $('evenl').textContent = L.even; $('alignl').textContent = L.align;
    $('sampleh').textContent = L.sample; $('sampletext').placeholder = L.placeholder; $('download').textContent = L.download; $('after').textContent = L.after;
    $('useh').textContent = L.useh; $('usep').textContent = L.usep; $('usewrite').textContent = L.usewrite; $('usepost').textContent = L.usepost;
    if (keptShown) $('made').textContent = L.kept;
    $('fixh').textContent = L.fixh; $('fixp').textContent = L.fixp; $('fixchars').placeholder = L.fixph; $('fixprint').textContent = L.fixprint;
    $('legal').textContent = L.legal;
    buildSheets($('sheets'), LAY[2]); fitSheets();
    renderUploads();
  }

  /* 스캐너가 만든 PDF도 받는다: pdf.js로 쪽마다 그림으로 풀어서 사진처럼 처리(역시 브라우저 안에서만) */
  let pdfjsReady = null;
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  function loadPdfjs() {
    return pdfjsReady || (pdfjsReady = new Promise((ok, no) => {
      const sc = document.createElement('script'); sc.src = PDFJS + 'pdf.min.js';
      sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); };
      sc.onerror = no; document.head.appendChild(sc);
    }));
  }
  async function pdfPages(file, each) {
    const lib = await loadPdfjs();
    const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const v0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 3500 / Math.max(v0.width, v0.height) });
      const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      await each(await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.92)), i, doc.numPages);
    }
  }

  /* 쪽마다 창고에 든 글자 수: 판 → Map(쪽 → 개수) */
  function pagesHave(ver) {
    const have = new Map();
    bank.forEach((s, key) => { if (!key.startsWith(ver + ':')) return; const c = LAY[ver].cells[+key.slice(2)]; if (c) have.set(c.page, (have.get(c.page) || 0) + 1); });
    return have;
  }
  /* 읽은 쪽 번호 → 어느 격자의 몇 쪽인지. 못 읽었으면 null, 고치기 종이인데 글자 목록을 모르면 {lost} */
  function targetOf(info) {
    if (info.ver === 2 && info.id === 15) return pendingFix ? { lay: fixLayout([...pendingFix]), index: 0, fix: true } : { lost: true };
    const lay = LAY[info.ver];
    return info.id >= 1 && info.id <= lay.pages ? { lay, index: info.id - 1 } : null;
  }
  function placePage(pg, t) {
    pg.lay = t.lay; pg.index = t.index; pg.fix = !!t.fix;
    processPage(pg);
    photos.set(pg.fix ? 'fix' : t.lay.ver + '-' + t.index, pg);
  }
  /* 사진·PDF 묶음 올리기. 쪽 번호를 못 읽은 사진은 다 읽은 뒤 남은 빈 쪽에 차례로 넣는다 */
  async function addFiles(files) {
    const unknown = [], label = $('picklabel'); let fixedNow = 0;
    const one = async (blob) => {
      const pg = await loadPhoto(blob);
      const m = findMarkers(pg.gray, pg.w, pg.h);
      pg.corners = m.corners; pg.markersOK = m.ok;
      pg.H = homography(PAPER.MARKS, pg.corners);
      const t = targetOf(readPageId(pg));
      if (t && t.lost) { $('fixnote').textContent = L.fixlost; return; }
      if (!t) { unknown.push(pg); return; }
      placePage(pg, t); if (pg.fix) fixedNow += pg.found;
    };
    try {
      for (const f of files) {
        if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '')) await pdfPages(f, async (blob, i, n) => { label.textContent = L.reading(i, n); await one(blob); });
        else { label.textContent = L.reading(files.indexOf(f) + 1, files.length); await one(f); }
      }
    } catch (err) { console.error(err); }
    if (unknown.length) {
      const ver = pagesHave(1).size > pagesHave(2).size ? 1 : 2;
      unknown.forEach((pg) => { const have = pagesHave(ver); let idx = 0; while (idx < LAY[ver].pages - 1 && have.has(idx)) idx++; placePage(pg, { lay: LAY[ver], index: idx }); });
    }
    label.textContent = L.pick;
    renderUploads(); updateMake(); saveBank();
    if (fixedNow) { $('fixnote').textContent = L.fixdone(fixedNow); $('fixchars').value = ''; await make(); }
  }

  function thumb(s, label) {
    const d = document.createElement('div'); d.className = 'th' + (s ? '' : ' none'); d.title = label;
    const c = document.createElement('canvas'); c.width = 40; c.height = 40;
    if (s) {
      const ctx = c.getContext('2d'); const img = ctx.createImageData(40, 40);
      for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { const k = (y * 40 + x) * 4; const on = s.ink[Math.floor(y * N / 40) * N + Math.floor(x * N / 40)]; img.data[k] = img.data[k + 1] = img.data[k + 2] = on ? 17 : 255; img.data[k + 3] = 255; }
      ctx.putImageData(img, 0, 0);
    }
    d.appendChild(c);
    const sp = document.createElement('span'); sp.textContent = label; d.appendChild(sp);
    return d;
  }

  function photoView(pg, box) {
    const cv = document.createElement('canvas'); cv.className = 'photo';
    const scale = Math.min(1, 520 / pg.w);
    cv.width = Math.round(pg.w * scale); cv.height = Math.round(pg.h * scale);
    const ctx = cv.getContext('2d');
    const draw = () => {
      ctx.drawImage(pg.canvas, 0, 0, cv.width, cv.height);
      ctx.strokeStyle = '#e8708f'; ctx.lineWidth = 2;
      ctx.beginPath();
      [0, 1, 3, 2].forEach((i, k) => { const [x, y] = pg.corners[i]; k ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale); });
      ctx.closePath(); ctx.stroke();
      pg.corners.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * scale, y * scale, 9, 0, Math.PI * 2); ctx.fillStyle = '#e8708f'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); });
    };
    draw();
    let drag = -1;
    const at = (e) => { const rct = cv.getBoundingClientRect(); return [(e.clientX - rct.left) * (cv.width / rct.width) / scale, (e.clientY - rct.top) * (cv.height / rct.height) / scale]; };
    cv.onpointerdown = (e) => { const [x, y] = at(e); pg.corners.forEach(([cx, cy], i) => { if (Math.hypot(cx - x, cy - y) < 40 / scale) drag = i; }); if (drag >= 0) cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = (e) => { if (drag < 0) return; pg.corners[drag] = at(e); draw(); };
    cv.onpointerup = () => { if (drag >= 0) { drag = -1; processPage(pg); renderUploads(); updateMake(); saveBank(); } };
    box.appendChild(cv);
    const msg = document.createElement('p'); msg.className = 'msg'; msg.textContent = pg.markersOK ? L.found : L.notfound; box.appendChild(msg);
  }

  function renderUploads() {
    const host = $('uploads'); host.innerHTML = '';
    let syl = 0, other = 0, fx = 0;
    bank.forEach((s) => { if (s.fix) fx++; if (s.kind === 'syl') syl++; else other++; });
    $('bankinfo').textContent = bank.size ? L.bank(syl, other, fx) : L.nobank;
    $('reset').hidden = !bank.size;
    [1, 2].forEach((ver) => {
      const have = pagesHave(ver); if (!have.size) return;
      const lay = LAY[ver];
      for (let p = 0; p < lay.pages; p++) {
        const n = have.get(p) || 0, pg = photos.get(ver + '-' + p);
        const box = document.createElement('div'); box.className = 'up';
        const head = document.createElement('div'); head.className = 'uphead';
        head.innerHTML = `<strong>${L.page(p + 1, lay.pages)}</strong> <span class="pwait">${ver === 1 ? L.big : L.small} · ${L.count(n)}</span>`;
        box.appendChild(head);
        if (pg) photoView(pg, box);
        if (n) {
          const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'lnk'; rm.textContent = L.retake;
          rm.onclick = () => { lay.cells.forEach((c, i) => { if (c.page === p) bank.delete(ver + ':' + i); }); photos.delete(ver + '-' + p); renderUploads(); updateMake(); saveBank(); };
          head.appendChild(rm);
          const th = document.createElement('div'); th.className = 'thumbs'; let empty = 0;
          lay.cells.forEach((c, i) => { if (c.page !== p) return; const s = bank.get(ver + ':' + i); if (!s) empty++; th.appendChild(thumb(s, c.ch)); });
          if (empty) { const e = document.createElement('p'); e.className = 'emptyn'; e.textContent = L.empty(empty); th.appendChild(e); }
          box.appendChild(th);
        }
        host.appendChild(box);
      }
    });
    const fixes = [...bank.values()].filter((s) => s.fix);
    if (fixes.length) {
      const box = document.createElement('div'); box.className = 'up';
      box.innerHTML = `<div class="uphead"><strong>${L.fixed}</strong> <span class="pwait">${L.count(fixes.length)}</span></div>`;
      const pg = photos.get('fix'); if (pg) photoView(pg, box);
      const th = document.createElement('div'); th.className = 'thumbs';
      fixes.forEach((s) => th.appendChild(thumb(s, s.ch)));
      box.appendChild(th); host.appendChild(box);
    }
  }

  function updateMake() {
    let syl = 0; bank.forEach((s) => { if (s.kind === 'syl') syl++; });
    $('make').disabled = syl < 30;
  }

  /* 견본: 글자마다 누를 수 있게. 누르면 '고칠 글자'에 들어간다 */
  const fixSet = () => [...new Set([...$('fixchars').value].filter((ch) => isHangul(ch) || SUPPORTED.has(ch)))];
  function renderSample() {
    const out = $('sampleout'), picked = new Set(fixSet());
    out.innerHTML = '';
    [...($('sampletext').value || out.dataset.def)].forEach((ch) => {
      if (!(isHangul(ch) || SUPPORTED.has(ch))) { out.appendChild(document.createTextNode(ch)); return; }
      const sp = document.createElement('span'); sp.className = 'g' + (picked.has(ch) ? ' pick' : ''); sp.textContent = ch; out.appendChild(sp);
    });
  }
  function toggleFix(ch) {
    const cur = fixSet(), i = cur.indexOf(ch);
    if (i >= 0) cur.splice(i, 1); else cur.push(ch);
    $('fixchars').value = cur.join('');
    renderSample();
  }

  /* 만든 폰트를 견본에 건다 */
  async function showFont() {
    if (previewFace) document.fonts.delete(previewFace);
    previewFace = new FontFace('NotjangHandPreview', fontBuffer);
    await previewFace.load(); document.fonts.add(previewFace);
    $('result').hidden = false;
    renderSample();
  }
  /* 지난번에 만든 폰트가 이 브라우저에 남아 있으면 다시 만들지 않고 바로 보여 준다 */
  let keptShown = false;
  async function restoreFont() {
    if (!bank.size) return;
    try {
      const saved = await DB.get('ttf');
      if (!saved || !saved.byteLength) return;
      fontBuffer = saved; await showFont();
      keptShown = true; $('made').textContent = L.kept;
    } catch (e) { fontBuffer = null; $('result').hidden = true; }
  }

  async function make() {
    keptShown = false;
    $('make').disabled = true; $('made').textContent = L.making;
    await new Promise((ok) => setTimeout(ok, 30));
    const { font, glyphs, written, composed } = buildFont([...bank.values()], { even: $('even').checked, align: $('align').checked });
    fontBuffer = fixCmap(font.toArrayBuffer(), glyphs);
    DB.set('ttf', fontBuffer).catch(() => {});   // '한 장 써보기'가 이 글씨로 쓸 수 있게 이 브라우저에 남겨 둔다
    $('made').textContent = L.made(written, composed);
    await showFont();
    $('make').disabled = false;
  }

  function download() {
    if (!fontBuffer) return;
    const blob = new Blob([fontBuffer], { type: 'font/ttf' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'notjang-handwriting.ttf';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  /* 인쇄: 인쇄할 격자판만 따로 그려서 그것만 종이에 나가게 한다 */
  function printLayout(lay) { buildSheets($('printroot'), lay); window.print(); }

  async function start() {
    window.NotjangLang.mount($('lang'), text);
    text();
    $('pick').addEventListener('change', async (e) => { const files = [...e.target.files]; e.target.value = ''; await addFiles(files); });
    $('print').onclick = () => printLayout(LAY[2]);
    window.addEventListener('beforeprint', () => { if (!$('printroot').children.length) buildSheets($('printroot'), LAY[2]); });
    window.addEventListener('afterprint', () => { $('printroot').innerHTML = ''; });
    $('make').onclick = make;
    $('download').onclick = download;
    $('sampletext').addEventListener('input', renderSample);
    $('fixchars').addEventListener('input', renderSample);
    $('sampleout').addEventListener('click', (e) => { const g = e.target.closest('.g'); if (g) toggleFix(g.textContent); });
    $('fixprint').onclick = () => {
      const chars = fixSet().slice(0, FIX_MAX);
      if (!chars.length) { $('fixnote').textContent = L.fixnone; return; }
      pendingFix = chars.join('');
      DB.set('fix', pendingFix).catch(() => {});
      $('fixnote').textContent = L.fixwait(chars.length);
      printLayout(fixLayout(chars));
    };
    $('reset').onclick = () => {
      if (!window.confirm(L.resetask)) return;
      bank.clear(); photos.clear(); pendingFix = null; fontBuffer = null; keptShown = false;
      DB.set('bank', { n: N, rows: [] }).catch(() => {}); DB.set('fix', null).catch(() => {});
      DB.set('ttf', null).catch(() => {});   // 써보기와 엽서에서도 이 글씨가 사라진다
      $('result').hidden = true; $('made').textContent = '';
      renderUploads(); updateMake();
    };
    window.addEventListener('resize', fitSheets);
    updateMake();
    // 저장해 둔 글씨 불러오기
    $('bankinfo').textContent = L.restoring;
    await restoreBank();
    renderUploads(); updateMake();
    await restoreFont();
    window.NotjangFont.ready = true;
  }
  document.addEventListener('DOMContentLoaded', start);

  // 개발용
  window.NotjangFont = { addFiles, addURL: async (url) => addFiles([await (await fetch(url)).blob()]), LAY, PAPER, bank, list: () => [...bank.values()], fixLayout, setFix: (s) => { pendingFix = s; },
    buildFont, fixCmap, learn, compose, splitSyllable, decompose, buffer: () => fontBuffer };
})();
