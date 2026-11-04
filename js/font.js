/* 손글씨 폰트 메이커.
   1) 격자판(A4 두 장) 인쇄 → 2) 펜으로 쓰고 찍어 올리기 → 3) 브라우저 안에서 자모를 오려 TTF로 조립.
   사진은 어디에도 올라가지 않는다. 전부 이 페이지의 JS로 끝난다. */
(function () {
  'use strict';

  /* ── 격자판 치수(mm). 인쇄 CSS와 사진 처리가 같은 숫자를 쓴다. ───────── */
  const MM = { W: 210, H: 297, MARK: 8, MARKS: [[15, 15], [195, 15], [15, 282], [195, 282]], ID: [[30, 15], [38, 15]], IDSIZE: 4,
    PITCH: 20, BOX: 17, COLS: 8, ROWS: 11, X0: 25, Y0: 32 };
  const PER_PAGE = MM.COLS * MM.ROWS;   // 88

  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  const JONG = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  const syl = (c, j, g) => String.fromCharCode(0xAC00 + (c * 21 + j) * 28 + (g || 0));
  const PUNCT = '.,!?\'"()-:;/&@#%+=*[]{}<>_';

  /* 칸 목록: 1쪽 = 초성 2벌 + 중성 + 종성 (86) + … ~, 2쪽 = 영문 대소문자 + 숫자 + 부호 (88) */
  const CELLS = [];
  [...CHO].forEach((ch, i) => CELLS.push({ kind: 'cho1', ch, i, label: ch, hint: syl(i, 0) }));
  [...CHO].forEach((ch, i) => CELLS.push({ kind: 'cho2', ch, i, label: ch, hint: syl(i, 0, 1) }));
  [...JUNG].forEach((ch, i) => CELLS.push({ kind: 'jung', ch, i, label: ch, hint: syl(11, i) }));
  [...JONG].forEach((ch, i) => CELLS.push({ kind: 'jong', ch, i, label: ch, hint: syl(11, 0, i + 1) }));
  CELLS.push({ kind: 'punct', ch: '…', label: '…' }, { kind: 'punct', ch: '~', label: '~' });
  for (let c = 65; c <= 90; c++) CELLS.push({ kind: 'upper', ch: String.fromCharCode(c), label: String.fromCharCode(c) });
  for (let c = 97; c <= 122; c++) CELLS.push({ kind: 'lower', ch: String.fromCharCode(c), label: String.fromCharCode(c) });
  for (let c = 48; c <= 57; c++) CELLS.push({ kind: 'digit', ch: String.fromCharCode(c), label: String.fromCharCode(c) });
  [...PUNCT].forEach((ch) => CELLS.push({ kind: 'punct', ch, label: ch }));
  CELLS.forEach((cell, n) => { cell.page = Math.floor(n / PER_PAGE); const k = n % PER_PAGE; cell.row = Math.floor(k / MM.COLS); cell.col = k % MM.COLS; });
  const PAGES = Math.ceil(CELLS.length / PER_PAGE);
  const boxOf = (cell) => ({ x: MM.X0 + cell.col * MM.PITCH + (MM.PITCH - MM.BOX) / 2, y: MM.Y0 + cell.row * MM.PITCH + (MM.PITCH - MM.BOX) / 2, s: MM.BOX });

  /* ── 글 ───────────────────────────────────────────────────────────────── */
  const T = {
    KR: {
      title: '내 손글씨 폰트', lead: '격자판에 펜으로 쓰고, 찍어서 올리면, 내 글씨가 폰트가 됩니다. 사진은 이 브라우저 밖으로 나가지 않아요.',
      s1: '1. 격자판 인쇄', s1p: 'A4 두 장. 칸 안에 검은 펜으로 크게 쓰세요. 자음·모음은 옆의 작은 글자처럼 생긴 모양으로.', print: '인쇄하기',
      s2: '2. 찍어서 올리기', s2p: '밝은 데서 종이 전체가 들어오게, 네 귀퉁이 검은 네모가 다 보이게 찍으세요.', page: (n) => n + '쪽 사진', retake: '다시 올리기',
      found: '귀퉁이를 찾았어요. 점이 틀리면 끌어서 맞추세요.', notfound: '귀퉁이 네모를 못 찾았어요. 점을 네 귀퉁이 네모 가운데로 끌어 주세요.', recalc: '다시 자르기',
      s3: '3. 폰트 만들기', s3p: '두 쪽이 다 올라오면 만들 수 있어요. 빈 칸은 빈 글자로 남아요.', make: '폰트 만들기', making: '글자 조립 중…', made: (n) => '완성. 글자 ' + n + '개.',
      sample: '이 글씨로 쓰면 이렇게 보여요', placeholder: '아무 말이나 써 보세요', download: 'TTF 내려받기', after: '내려받은 파일을 낱장북스 앱에서 열면 낱장에 쓸 수 있어요.',
      empty: (n) => '빈 칸 ' + n + '개', legal: '개인정보 처리방침'
    },
    EN: {
      title: 'My handwriting font', lead: 'Write on the printed grid, take a photo, and your handwriting becomes a font. Photos never leave this browser.',
      s1: '1. Print the grid', s1p: 'Two A4 sheets. Write large, with a black pen, inside each box. Shape consonants and vowels like the small example beside them.', print: 'Print',
      s2: '2. Photograph and upload', s2p: 'In good light, with the whole page and all four corner squares in the frame.', page: (n) => 'Page ' + n + ' photo', retake: 'Upload again',
      found: 'Corners found. Drag the dots if they are off.', notfound: 'Could not find the corner squares. Drag each dot to the centre of a corner square.', recalc: 'Cut again',
      s3: '3. Build the font', s3p: 'Available once both pages are in. Blank boxes stay blank.', make: 'Build font', making: 'Assembling glyphs…', made: (n) => 'Done. ' + n + ' glyphs.',
      sample: 'This is how it looks', placeholder: 'Type anything', download: 'Download TTF', after: 'Open the file in the NOTJANG BOOOKS app to write sheets with it.',
      empty: (n) => n + ' blank boxes', legal: 'Privacy policy'
    }
  };
  T.JP = T.EN; T.DE = T.EN;
  let L = T.KR;

  /* ── 격자판 그리기(화면 미리보기 + 인쇄) ─────────────────────────────── */
  function buildSheets() {
    const host = document.getElementById('sheets');
    host.innerHTML = '';
    for (let p = 0; p < PAGES; p++) {
      const sheet = document.createElement('div');
      sheet.className = 'sheet';
      let html = '';
      MM.MARKS.forEach(([x, y]) => { html += `<i class="mark" style="left:${x - MM.MARK / 2}mm;top:${y - MM.MARK / 2}mm;width:${MM.MARK}mm;height:${MM.MARK}mm"></i>`; });
      for (let i = 0; i <= p; i++) { const [x, y] = MM.ID[i]; html += `<i class="mark" style="left:${x - MM.IDSIZE / 2}mm;top:${y - MM.IDSIZE / 2}mm;width:${MM.IDSIZE}mm;height:${MM.IDSIZE}mm"></i>`; }
      html += `<p class="shead">NOTJANG BOOOKS · ${L.title} · ${p + 1} / ${PAGES}</p>`;
      CELLS.filter((c) => c.page === p).forEach((c) => {
        const b = boxOf(c);
        html += `<div class="cell" style="left:${b.x}mm;top:${b.y}mm;width:${b.s}mm;height:${b.s}mm"><span class="lab">${c.label}${c.hint ? '<small>' + c.hint + '</small>' : ''}</span></div>`;
      });
      html += `<p class="sfoot">${L.s1p}</p>`;
      sheet.innerHTML = html;
      host.appendChild(sheet);
    }
    fitSheets();
  }
  function fitSheets() {
    const host = document.getElementById('sheets');
    const w = host.clientWidth;
    host.querySelectorAll('.sheet').forEach((s) => { s.style.zoom = ''; const sw = s.offsetWidth; s.style.zoom = Math.min(1, (w - 2) / sw); });
  }

  /* ── 사진 처리 ─────────────────────────────────────────────────────────── */
  const pages = [];   // [{gray, w, h, canvas, corners:[[x,y]×4], cells:{index: glyph}}]

  async function loadPhoto(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); }); }
    const MAX = 2400;
    const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const gray = new Uint8ClampedArray(cv.width * cv.height);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) gray[j] = (d[i] * 77 + d[i + 1] * 151 + d[i + 2] * 28) >> 8;
    return { canvas: cv, gray, w: cv.width, h: cv.height };
  }

  /* 네 귀퉁이 검은 네모 찾기: 1/4로 줄여 어두운 덩어리를 모으고, 네모꼴이면서 각 귀퉁이에 가장 가까운 것 */
  function findMarkers(gray, w, h) {
    const s = Math.max(1, Math.round(Math.max(w, h) / 700));
    const sw = Math.floor(w / s), sh = Math.floor(h / s);
    const g = new Float32Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      let sum = 0;
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) sum += gray[(y * s + yy) * w + x * s + xx];
      g[y * sw + x] = sum / (s * s);
    }
    // 국소 평균(상자 흐림, 반지름 r)으로 그늘을 걷어낸 뒤 60% 아래면 '검정'
    const r = Math.round(Math.max(sw, sh) / 24);
    const integ = new Float64Array((sw + 1) * (sh + 1));
    for (let y = 1; y <= sh; y++) { let row = 0; for (let x = 1; x <= sw; x++) { row += g[(y - 1) * sw + x - 1]; integ[y * (sw + 1) + x] = integ[(y - 1) * (sw + 1) + x] + row; } }
    const mean = (x, y) => {
      const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(sw, x + r + 1), y1 = Math.min(sh, y + r + 1);
      return (integ[y1 * (sw + 1) + x1] - integ[y0 * (sw + 1) + x1] - integ[y1 * (sw + 1) + x0] + integ[y0 * (sw + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    };
    const dark = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) dark[y * sw + x] = g[y * sw + x] < mean(x, y) * 0.6 ? 1 : 0;
    // 덩어리 모으기
    const seen = new Uint8Array(sw * sh); const comps = [];
    const stack = [];
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
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const side = Math.max(bw, bh);
      if (side < sw * 0.012 || side > sw * 0.09) continue;
      if (n / (bw * bh) < 0.55 || bw / bh < 0.6 || bw / bh > 1.6) continue;
      // 진짜 마커는 안이 아주 검고 둘레(종이)가 밝다. 카펫·책상 같은 어두운 바탕 조각을 거른다
      let inside = 0, ic = 0, ring = 0, rc = 0;
      const m = Math.max(2, Math.round(side * 0.7));
      for (let y = Math.max(0, y0 - m); y <= Math.min(sh - 1, y1 + m); y++) for (let x = Math.max(0, x0 - m); x <= Math.min(sw - 1, x1 + m); x++) {
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { inside += g[y * sw + x]; ic++; } else { ring += g[y * sw + x]; rc++; }
      }
      inside /= ic; ring /= Math.max(1, rc);
      if (inside > 110 || ring - inside < 70) continue;
      comps.push({ cx: sx / n, cy: sy / n, side, n });
    }
    const corners = [[0, 0], [sw, 0], [0, sh], [sw, sh]];
    const out = []; let ok = true;
    corners.forEach(([cx, cy]) => {
      let best = null, bd = Infinity;
      comps.forEach((c) => {
        // 그 귀퉁이 쪽 절반에 있는 것만
        if ((cx ? c.cx < sw / 2 : c.cx > sw / 2) || (cy ? c.cy < sh / 2 : c.cy > sh / 2)) return;
        const d = Math.hypot(c.cx - cx, c.cy - cy) - c.side * 2;   // 큰 네모(진짜 마커)를 쪽 번호 네모보다 우선
        if (d < bd) { bd = d; best = c; }
      });
      if (!best) { ok = false; out.push([cx ? w * 0.9 : w * 0.1, cy ? h * 0.93 : h * 0.07]); }
      else out.push([best.cx * s + s / 2, best.cy * s + s / 2]);
    });
    // 네 점이 종이 꼴(마커 사각형 180×267mm)인지: 마주보는 변 길이가 비슷하고 세로가 가로보다 길어야
    if (ok) {
      const len = (a, b) => Math.hypot(out[a][0] - out[b][0], out[a][1] - out[b][1]);
      const top = len(0, 1), bottom = len(2, 3), left = len(0, 2), right = len(1, 3);
      const ratio = (left + right) / (top + bottom);
      if (Math.min(top, bottom) / Math.max(top, bottom) < 0.65 || Math.min(left, right) / Math.max(left, right) < 0.65 || ratio < 1.1 || ratio > 2.0) ok = false;
    }
    return { corners: out, ok };
  }

  /* 4점 호모그래피: mm → px. H·[x,y,1] ∝ [u,v,1] */
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

  const N = 160;   // 칸 하나를 160×160으로 오린다
  const INSET = 1.3; // mm. 테두리 선과 라벨을 피한다

  /* 칸 하나 → 잉크 비트맵(Uint8 N×N). 비어 있으면 null */
  function cutCell(page, cell) {
    const b = boxOf(cell), H = page.H;
    const v = new Float32Array(N * N);
    const mm = (b.s - 2 * INSET) / N;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const [px, py] = H(b.x + INSET + (i + 0.5) * mm, b.y + INSET + (j + 0.5) * mm);
      v[j * N + i] = sampleAt(page.gray, page.w, page.h, px, py);
    }
    const sorted = Float32Array.from(v).sort();
    const paper = sorted[Math.floor(N * N * 0.8)], darkest = sorted[Math.floor(N * N * 0.001)];
    if (paper - darkest < 55) return null;
    const thr = paper - (paper - darkest) * 0.55;
    const ink = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) ink[i] = v[i] < thr ? 1 : 0;
    // 티끌 제거: 아주 작은 덩어리는 지운다
    const seen = new Uint8Array(N * N); const stack = [];
    for (let i = 0; i < N * N; i++) {
      if (!ink[i] || seen[i]) continue;
      const members = []; stack.push(i); seen[i] = 1;
      while (stack.length) {
        const k = stack.pop(); members.push(k); const x = k % N;
        if (x > 0 && ink[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; stack.push(k - 1); }
        if (x < N - 1 && ink[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; stack.push(k + 1); }
        if (k >= N && ink[k - N] && !seen[k - N]) { seen[k - N] = 1; stack.push(k - N); }
        if (k < N * N - N && ink[k + N] && !seen[k + N]) { seen[k + N] = 1; stack.push(k + N); }
      }
      if (members.length < 12) members.forEach((k) => { ink[k] = 0; });
    }
    let any = 0; for (let i = 0; i < N * N; i++) any += ink[i];
    return any < 16 ? null : ink;
  }

  /* 비트맵 → 외곽선. 픽셀 변을 이어 닫힌 고리로 만들고(바깥·구멍 방향이 저절로 반대), 다듬는다.
     결과 좌표는 칸 단위(0..1000, y 위로). */
  function trace(ink) {
    const key = (x, y) => y * (N + 1) + x;
    const edges = new Map();   // 시작점 → [끝점…]
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
        if (outs.length > 1 && prev >= 0) {  // 갈림길(대각선으로 닿은 곳)에서는 오른쪽으로 꺾는 쪽
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
      // 계단을 고르게: 이웃 평균 한 번
      const n = pts.length;
      let sm = pts.map((p, i) => { const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n]; return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4]; });
      sm = rdpClosed(sm, 1.6);
      if (sm.length < 3) return;
      // 화면 좌표(y 아래) → 글꼴 좌표(y 위). 뒤집히므로 바깥 고리가 시계 방향(TrueType 규칙)이 된다
      out.push(sm.map(([x, y]) => [x / N * 1000, (1 - y / N) * 1000]).reverse());
    });
    return out;
  }

  function rdpClosed(pts, eps) {
    // 닫힌 다각형: 가장 먼 두 점으로 갈라 두 번 돌린다
    let a = 0, b = 0, best = -1;
    for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > best) { best = d; b = i; } }
    const seg1 = rdp(pts.slice(a, b + 1), eps), seg2 = rdp(pts.slice(b).concat([pts[0]]), eps);
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
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }

  /* 쪽 하나 처리: 귀퉁이 → 호모그래피 → 쪽 번호 → 칸마다 오려 외곽선 */
  function processPage(page) {
    page.H = homography(MM.MARKS, page.corners);
    // 쪽 번호: 왼쪽 위 마커 옆 작은 네모 개수
    let id = 0;
    MM.ID.forEach(([mx, my]) => {
      let dark = 0, tot = 0;
      for (let dy = -1; dy <= 1; dy += 0.5) for (let dx = -1; dx <= 1; dx += 0.5) { const [px, py] = page.H(mx + dx, my + dy); tot++; if (sampleAt(page.gray, page.w, page.h, px, py) < 100) dark++; }
      if (dark / tot > 0.6) id++;
    });
    page.detectedPage = id >= 1 && id <= PAGES ? id - 1 : null;
    page.glyphs = {};
    CELLS.forEach((cell, n) => {
      if (cell.page !== page.index) return;
      const ink = cutCell(page, cell);
      if (!ink) return;
      const polys = trace(ink);
      if (!polys.length) return;
      page.glyphs[n] = { polys, bbox: bboxOf(polys), ink };
    });
  }

  /* ── 폰트 조립 ─────────────────────────────────────────────────────────── */
  const ASC = 880, DESC = -120;
  const BODY = { x0: 60, y0: -70, x1: 940, y1: 850 };   // 한글 몸통 상자
  // 자모 자리(몸통 안 비율, y는 위에서부터)
  const LAYOUT = {
    V: { cho: [0.04, 0.1, 0.5, 0.9], jung: [0.56, 0, 1, 1] },
    H: { cho: [0.12, 0, 0.88, 0.5], jung: [0.02, 0.46, 0.98, 1] },
    M: { cho: [0.04, 0.04, 0.5, 0.52], jung: [0, 0, 1, 1] },
    Vj: { cho: [0.04, 0.04, 0.5, 0.54], jung: [0.54, 0, 1, 0.6], jong: [0.18, 0.66, 0.82, 1] },
    Hj: { cho: [0.18, 0, 0.82, 0.36], jung: [0.02, 0.34, 0.98, 0.6], jong: [0.18, 0.66, 0.82, 1] },
    Mj: { cho: [0.04, 0.02, 0.46, 0.42], jung: [0, 0, 1, 0.62], jong: [0.18, 0.66, 0.82, 1] }
  };
  const VTYPE = (j) => [8, 12, 13, 17, 18].includes(j) ? 'H' : [9, 10, 11, 14, 15, 16, 19].includes(j) ? 'M' : 'V';

  function fitInto(glyph, rect, maxStretch) {
    const [fx0, fy0, fx1, fy1] = rect;
    const bw = BODY.x1 - BODY.x0, bh = BODY.y1 - BODY.y0;
    const X0 = BODY.x0 + fx0 * bw, X1 = BODY.x0 + fx1 * bw;
    const Y1 = BODY.y1 - fy0 * bh, Y0 = BODY.y1 - fy1 * bh;   // y 위로
    const b = glyph.bbox;
    let sx = (X1 - X0) / Math.max(b.w, 1), sy = (Y1 - Y0) / Math.max(b.h, 1);
    if (sx / sy > maxStretch) sx = sy * maxStretch;
    if (sy / sx > maxStretch) sy = sx * maxStretch;
    const ox = (X0 + X1) / 2 - (b.x0 + b.x1) / 2 * sx, oy = (Y0 + Y1) / 2 - (b.y0 + b.y1) / 2 * sy;
    return glyph.polys.map((p) => p.map(([x, y]) => [x * sx + ox, y * sy + oy]));
  }
  function placeLatin(glyph, bottom, scale) {
    const b = glyph.bbox, s = scale;
    const ox = 55 - b.x0 * s, oy = bottom - b.y0 * s;
    return { polys: glyph.polys.map((p) => p.map(([x, y]) => [x * s + ox, y * s + oy])), adv: Math.round(b.w * s + 110) };
  }

  function toPath(polys) {
    const path = new opentype.Path();
    polys.forEach((p) => {
      const n = p.length; if (n < 3) return;
      const mid = (i) => [(p[i % n][0] + p[(i + 1) % n][0]) / 2, (p[i % n][1] + p[(i + 1) % n][1]) / 2];
      let m = mid(0); path.moveTo(r(m[0]), r(m[1]));
      for (let i = 1; i <= n; i++) { const c = p[i % n], mm = mid(i); path.quadraticCurveTo(r(c[0]), r(c[1]), r(mm[0]), r(mm[1])); }
      path.close();
    });
    return path;
  }
  const r = (v) => Math.round(v);

  const DESCENDERS = 'gjpqy';
  function latinBottom(cell) {
    if (cell.kind === 'lower' && DESCENDERS.includes(cell.ch)) return -220;
    if (cell.kind !== 'punct') return 0;
    switch (cell.ch) {
      case ',': case ';': return -110;
      case '\'': case '"': return 480;
      case '-': case '~': return 300;
      case '+': case '=': case '<': case '>': return 150;
      case '*': return 400;
      case '(': case ')': case '[': case ']': case '{': case '}': case '/': return -130;
      case '_': return -120;
      default: return 0;
    }
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
    // 코드 → 글리프 번호, 연속 구간으로 합치기
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
    // 재조립
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

  function buildFont(glyphMap) {
    const notdef = new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 500, path: new opentype.Path() });
    const space = new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: 330, path: new opentype.Path() });
    const glyphs = [notdef, space];
    const cellIndex = {};
    CELLS.forEach((c, n) => { cellIndex[c.kind + ':' + c.ch] = glyphMap[n] || null; });
    const g = (kind, ch) => cellIndex[kind + ':' + ch];
    let count = 0;
    // 영문·숫자·부호: 사람마다 쓰는 크기가 달라서 종류별 높이로 맞춘다(대문자 640, 소문자 460, 올라가는 글자 660, 내려가는 글자 680).
    // 부호는 대문자 평균 크기 기준으로 같이 줄인다.
    const capHeights = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((ch) => g('upper', ch)).filter(Boolean).map((gl) => gl.bbox.h).sort((a, b) => a - b);
    const capScale = capHeights.length ? 640 / capHeights[Math.floor(capHeights.length / 2)] : 1;
    const latinScale = (c, gl) => {
      const h = Math.max(gl.bbox.h, 1);
      if (c.kind === 'upper' || c.kind === 'digit') return 640 / h;
      if (c.kind === 'lower') {
        if (c.ch === 'j') return 760 / h;
        if (DESCENDERS.includes(c.ch)) return 680 / h;
        if ('bdfhklti'.includes(c.ch)) return 660 / h;
        return 460 / h;
      }
      return capScale;
    };
    CELLS.forEach((c) => {
      if (['cho1', 'cho2', 'jung', 'jong'].includes(c.kind)) return;
      const gl = g(c.kind, c.ch);
      const code = c.ch.codePointAt(0);
      if (!gl) { glyphs.push(new opentype.Glyph({ name: 'uni' + code.toString(16).toUpperCase().padStart(4, '0'), unicode: code, advanceWidth: 450, path: new opentype.Path() })); return; }
      const placed = placeLatin(gl, latinBottom(c), Math.min(latinScale(c, gl), capScale * 2.5));
      glyphs.push(new opentype.Glyph({ name: 'uni' + code.toString(16).toUpperCase().padStart(4, '0'), unicode: code, advanceWidth: placed.adv, path: toPath(placed.polys) }));
      count++;
    });
    // 낱자 자모(ㄱ, ㅏ …): 몸통 가운데
    const jamoChars = new Map();
    [...CHO].forEach((ch) => jamoChars.set(ch, g('cho1', ch)));
    [...JUNG].forEach((ch) => jamoChars.set(ch, g('jung', ch)));
    [...JONG].forEach((ch) => { if (!jamoChars.has(ch)) jamoChars.set(ch, g('jong', ch)); });
    jamoChars.forEach((gl, ch) => {
      const code = ch.codePointAt(0);
      const path = gl ? toPath(fitInto(gl, [0.15, 0.15, 0.85, 0.85], 1.6)) : new opentype.Path();
      glyphs.push(new opentype.Glyph({ name: 'uni' + code.toString(16).toUpperCase(), unicode: code, advanceWidth: 1000, path }));
    });
    // 음절 11,172자
    const cho1 = [...CHO].map((ch) => g('cho1', ch)), cho2 = [...CHO].map((ch) => g('cho2', ch));
    const jung = [...JUNG].map((ch) => g('jung', ch)), jong = [...JONG].map((ch) => g('jong', ch));
    for (let c = 0; c < 19; c++) for (let j = 0; j < 21; j++) for (let k = 0; k < 28; k++) {
      const code = 0xAC00 + (c * 21 + j) * 28 + k;
      const lay = LAYOUT[VTYPE(j) + (k ? 'j' : '')];
      const polys = [];
      const cg = (k ? cho2[c] : cho1[c]) || cho1[c] || cho2[c];
      if (cg) polys.push(...fitInto(cg, lay.cho, 1.3));
      if (jung[j]) polys.push(...fitInto(jung[j], lay.jung, 1.5));
      if (k && jong[k - 1]) polys.push(...fitInto(jong[k - 1], lay.jong, 1.5));
      glyphs.push(new opentype.Glyph({ name: 'uni' + code.toString(16).toUpperCase(), unicode: code, advanceWidth: 1000, path: toPath(polys) }));
      if (polys.length) count++;
    }
    const font = new opentype.Font({ familyName: 'NotjangHand', styleName: 'Regular', unitsPerEm: 1000, ascender: ASC, descender: DESC, glyphs });
    return { font, count, glyphs };
  }

  /* ── 화면 ──────────────────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  let fontBuffer = null, previewFace = null;

  function text() {
    L = T[window.NotjangLang.get()] || T.KR;
    document.title = '낱장북스 · ' + L.title;
    $('h1').textContent = L.title; $('lead').textContent = L.lead;
    $('s1').textContent = L.s1; $('s1p').textContent = L.s1p; $('print').textContent = L.print;
    $('s2').textContent = L.s2; $('s2p').textContent = L.s2p;
    $('s3').textContent = L.s3; $('s3p').textContent = L.s3p; $('make').textContent = L.make;
    $('sampleh').textContent = L.sample; $('sampletext').placeholder = L.placeholder; $('download').textContent = L.download; $('after').textContent = L.after;
    $('legal').textContent = L.legal;
    for (let p = 0; p < PAGES; p++) { const l = $('plabel' + p); if (l) l.textContent = L.page(p + 1); }
    buildSheets();
    pages.forEach((pg) => pg && renderPage(pg));
  }

  function buildUploads() {
    const host = $('uploads'); host.innerHTML = '';
    for (let p = 0; p < PAGES; p++) {
      const box = document.createElement('div'); box.className = 'up'; box.id = 'up' + p;
      box.innerHTML = `<label class="drop"><input type="file" accept="image/*" capture="environment" id="file${p}"><span id="plabel${p}"></span></label>
        <div class="view" hidden><canvas class="photo"></canvas><p class="msg"></p><div class="thumbs"></div></div>`;
      host.appendChild(box);
      box.querySelector('input').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) await addPhoto(f, p); e.target.value = ''; });
    }
  }

  async function addPhoto(file, p) {
    const pg = await loadPhoto(file);
    pg.index = p;
    const m = findMarkers(pg.gray, pg.w, pg.h);
    pg.corners = m.corners; pg.markersOK = m.ok;
    processPage(pg);
    // 쪽 번호가 읽혔고 다른 쪽이면 그쪽으로 옮긴다
    if (pg.detectedPage !== null && pg.detectedPage !== p) { pg.index = pg.detectedPage; processPage(pg); }
    pages[pg.index] = pg;
    renderPage(pg);
    updateMake();
  }

  function renderPage(pg) {
    const box = $('up' + pg.index); if (!box) return;
    box.querySelector('.drop').hidden = true;
    const view = box.querySelector('.view'); view.hidden = false;
    const cv = box.querySelector('.photo');
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
    // 점 끌기
    let drag = -1;
    cv.onpointerdown = (e) => {
      const rct = cv.getBoundingClientRect(); const x = (e.clientX - rct.left) * (cv.width / rct.width) / scale, y = (e.clientY - rct.top) * (cv.height / rct.height) / scale;
      pg.corners.forEach(([cx, cy], i) => { if (Math.hypot(cx - x, cy - y) < 40 / scale) drag = i; });
      if (drag >= 0) cv.setPointerCapture(e.pointerId);
    };
    cv.onpointermove = (e) => {
      if (drag < 0) return;
      const rct = cv.getBoundingClientRect();
      pg.corners[drag] = [(e.clientX - rct.left) * (cv.width / rct.width) / scale, (e.clientY - rct.top) * (cv.height / rct.height) / scale];
      draw();
    };
    cv.onpointerup = () => { if (drag >= 0) { drag = -1; processPage(pg); renderThumbs(pg); updateMake(); } };
    const msg = box.querySelector('.msg');
    msg.innerHTML = (pg.markersOK ? L.found : L.notfound) + ' <button type="button" class="lnk retake">' + L.retake + '</button>';
    msg.querySelector('.retake').onclick = () => { box.querySelector('.drop').hidden = false; view.hidden = true; pages[pg.index] = null; updateMake(); };
    renderThumbs(pg);
  }

  function renderThumbs(pg) {
    const host = $('up' + pg.index).querySelector('.thumbs'); host.innerHTML = '';
    let empty = 0;
    CELLS.forEach((cell, n) => {
      if (cell.page !== pg.index) return;
      const gl = pg.glyphs[n];
      const d = document.createElement('div'); d.className = 'th' + (gl ? '' : ' none'); d.title = cell.label;
      const c = document.createElement('canvas'); c.width = 40; c.height = 40;
      if (gl) {
        const ctx = c.getContext('2d'); const img = ctx.createImageData(40, 40);
        for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { const k = (y * 40 + x) * 4; const on = gl.ink[Math.floor(y * N / 40) * N + Math.floor(x * N / 40)]; img.data[k] = img.data[k + 1] = img.data[k + 2] = on ? 17 : 255; img.data[k + 3] = 255; }
        ctx.putImageData(img, 0, 0);
      } else empty++;
      d.appendChild(c);
      const s = document.createElement('span'); s.textContent = cell.label; d.appendChild(s);
      host.appendChild(d);
    });
    const p = document.createElement('p'); p.className = 'emptyn'; p.textContent = L.empty(empty); host.appendChild(p);
  }

  function updateMake() {
    const ready = pages.length >= PAGES && pages.slice(0, PAGES).every((p) => p);
    $('make').disabled = !ready;
  }

  async function make() {
    $('make').disabled = true; $('made').textContent = L.making;
    await new Promise((ok) => setTimeout(ok, 30));
    const map = {};
    pages.forEach((pg) => { if (pg) Object.assign(map, pg.glyphs); });
    const { font, count, glyphs } = buildFont(map);
    fontBuffer = fixCmap(font.toArrayBuffer(), glyphs);
    $('made').textContent = L.made(count);
    if (previewFace) document.fonts.delete(previewFace);
    previewFace = new FontFace('NotjangHandPreview', fontBuffer);
    await previewFace.load(); document.fonts.add(previewFace);
    $('result').hidden = false;
    $('make').disabled = false;
  }

  function download() {
    if (!fontBuffer) return;
    const blob = new Blob([fontBuffer], { type: 'font/ttf' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'notjang-handwriting.ttf';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  function start() {
    buildUploads();
    window.NotjangLang.mount($('lang'), text);
    text();
    $('print').onclick = () => window.print();
    $('make').onclick = make;
    $('download').onclick = download;
    $('sampletext').addEventListener('input', () => { $('sampleout').textContent = $('sampletext').value || $('sampleout').dataset.def; });
    window.addEventListener('resize', fitSheets);
    updateMake();
  }
  document.addEventListener('DOMContentLoaded', start);

  // 개발용: 사진 파일 대신 URL로 넣기
  window.NotjangFont = { addURL: async (url, p) => addPhoto(await (await fetch(url)).blob(), p), CELLS, MM, pages, buildFont, fixCmap, buffer: () => fontBuffer };
})();
