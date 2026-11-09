/* 손글씨 폰트 메이커 (통글자 방식).
   1) 격자판 인쇄(단어·문장을 칸마다 한 글자씩, A4 여러 장) → 2) 펜으로 쓰고 찍어 올리기 → 3) 브라우저 안에서 TTF 조립.
   쓴 글자는 쓴 그대로 들어간다(크기 보정 없이 종이→글꼴 한 배율, 위아래 위치도 그대로, 폭은 글자마다).
   안 쓴 음절은 쓴 글자 안에서 자모를 꺼내(자리별로 모아) 본인 비율로 조합한다.
   사진은 어디에도 올라가지 않는다. 전부 이 페이지의 JS로 끝난다. */
(function () {
  'use strict';

  /* ── 격자판 치수(mm). 인쇄 CSS와 사진 처리가 같은 숫자를 쓴다. ───────── */
  const MM = { W: 210, H: 297, MARK: 8, MARKS: [[15, 15], [195, 15], [15, 282], [195, 282]],
    ID: [[30, 15], [36, 15], [42, 15], [48, 15]], IDSIZE: 4,      // 쪽 번호(이진수 4자리, 1부터)
    PITCH: 18, BOX: 15, COLS: 9, ROWS: 13, X0: 24, Y0: 28, GAP: 3 }; // GAP = 단어 사이 여백
  const ROW_W = MM.COLS * MM.PITCH;   // 162mm
  const BASELINE = 0.68;              // 영문·숫자·부호 칸의 기준선(칸 위에서부터 비율)

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
  const CELLS = [];
  (function layout() {
    let page = 0, row = 0, x = 0;
    const newRow = () => { x = 0; row++; if (row >= MM.ROWS) { row = 0; page++; } };
    WORDS.forEach((w) => {
      const chars = [...w];
      // 단어 사이는 작은 틈. 줄 끝에 걸친 단어는 잘라서 다음 줄에 이어 쓴다(줄을 꽉 채워 장수를 줄인다)
      if (x > 0 && x + MM.GAP + MM.PITCH > ROW_W + 0.01) newRow();
      else if (x > 0) x += MM.GAP;
      chars.forEach((ch) => {
        if (x + MM.PITCH > ROW_W + 0.01) newRow();
        CELLS.push({ ch, kind: kindOf(ch), page, x: MM.X0 + x + (MM.PITCH - MM.BOX) / 2, y: MM.Y0 + row * MM.PITCH + (MM.PITCH - MM.BOX) / 2 });
        x += MM.PITCH;
      });
    });
  })();
  const PAGES = CELLS[CELLS.length - 1].page + 1;
  const boxOf = (cell) => ({ x: cell.x, y: cell.y, s: MM.BOX });

  /* ── 글 ───────────────────────────────────────────────────────────────── */
  const T = {
    KR: {
      title: '내 손글씨 폰트', lead: '격자판에 펜으로 쓰고, 찍어서 올리면, 내 글씨가 폰트가 됩니다. 쓴 글자는 쓴 그대로 들어가고, 안 쓴 글자는 쓴 글자에서 자모를 꺼내 조합해요. 사진은 이 브라우저 밖으로 나가지 않아요.',
      s1: '1. 격자판 인쇄', s1p: (n) => `A4 ${n}장. 칸 위의 글자를 칸 안에 검은 펜으로 쓰세요. 평소 쓰는 크기와 속도로, 예쁘게 쓰려고 하지 마세요. 영문·숫자는 칸의 연한 줄 위에 쓰세요.`, print: '인쇄하기',
      s2: '2. 찍어서 올리기', s2p: '밝은 데서 종이 전체가 들어오게, 네 귀퉁이 검은 네모가 다 보이게 찍으세요. 여러 장을 한꺼번에 올려도 쪽을 알아서 찾아요.', pick: '사진 올리기 (여러 장 가능)', page: (n) => n + '쪽', waiting: '아직 안 올라왔어요', retake: '다시 올리기',
      found: '귀퉁이를 찾았어요. 점이 틀리면 끌어서 맞추세요.', notfound: '귀퉁이 네모를 못 찾았어요. 점을 네 귀퉁이 네모 가운데로 끌어 주세요.',
      s3: '3. 폰트 만들기', s3p: '모든 쪽이 올라오면 만들 수 있어요. 빈 칸은 조합으로 채워요.', make: '폰트 만들기', making: '글자 조립 중… 20초쯤 걸려요.',
      made: (w, c) => `완성. 직접 쓴 글자 ${w}개, 조합한 글자 ${c}개.`,
      sample: '이 글씨로 쓰면 이렇게 보여요', placeholder: '아무 말이나 써 보세요', download: 'TTF 내려받기', after: '내려받은 파일을 낱장북스 앱에서 열면 낱장에 쓸 수 있어요.',
      empty: (n) => '빈 칸 ' + n + '개', legal: '개인정보 처리방침'
    },
    EN: {
      title: 'My handwriting font', lead: 'Write on the printed grid, take photos, and your handwriting becomes a font. Written characters go in exactly as written; the rest are composed from the parts you wrote. Photos never leave this browser.',
      s1: '1. Print the grid', s1p: (n) => `${n} A4 sheets. Write the character shown above each box inside it, with a black pen, at your usual size and speed. Don't try to be neat. Put letters and digits on the faint line.`, print: 'Print',
      s2: '2. Photograph and upload', s2p: 'In good light, with the whole page and all four corner squares in the frame. Upload several at once; pages are detected.', pick: 'Upload photos', page: (n) => 'Page ' + n, waiting: 'Not uploaded yet', retake: 'Upload again',
      found: 'Corners found. Drag the dots if they are off.', notfound: 'Could not find the corner squares. Drag each dot to the centre of a corner square.',
      s3: '3. Build the font', s3p: 'Available once every page is in. Blank boxes are filled by composition.', make: 'Build font', making: 'Assembling glyphs… about 20 seconds.',
      made: (w, c) => `Done. ${w} written glyphs, ${c} composed.`,
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
      MM.ID.forEach(([x, y], bit) => { if ((p + 1) >> bit & 1) html += `<i class="mark" style="left:${x - MM.IDSIZE / 2}mm;top:${y - MM.IDSIZE / 2}mm;width:${MM.IDSIZE}mm;height:${MM.IDSIZE}mm"></i>`; });
      html += `<p class="shead">NOTJANG BOOOKS · ${L.title} · ${p + 1} / ${PAGES}</p>`;
      CELLS.forEach((c) => {
        if (c.page !== p) return;
        html += `<div class="cell${c.kind === 'syl' ? '' : ' ln'}" style="left:${c.x}mm;top:${c.y}mm;width:${MM.BOX}mm;height:${MM.BOX}mm"><span class="lab">${c.ch === '<' ? '&lt;' : c.ch === '&' ? '&amp;' : c.ch}</span></div>`;
      });
      html += `<p class="sfoot">${L.s1p(PAGES)}</p>`;
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
  const pages = [];   // index → {gray, w, h, canvas, corners, H, glyphs:{cellIndex: glyph}}

  async function loadPhoto(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); }); }
    const MAX = 2600;
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

  const N = 224;      // 칸 하나를 N×N으로 오린다
  const INSET = 1.2;  // mm. 테두리 선과 라벨을 피한다
  const INNER = MM.BOX - 2 * INSET;   // 12.6mm = 칸 단위 1000
  const CU = 1000 / INNER;            // 칸 단위 / mm
  // 영문 기준선의 칸 단위 높이(y 위로): 칸 위에서 68% → 아래에서 32%, 인셋 보정
  const BASE_CU = (MM.BOX * (1 - BASELINE) - INSET) * CU;

  /* 칸 하나 → 잉크 비트맵(Uint8 N×N). 비어 있으면 null */
  function cutCell(page, cell) {
    const b = boxOf(cell), H = page.H;
    const v = new Float32Array(N * N);
    const mm = INNER / N;
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
    // 티끌 제거
    const lab = components(ink);
    lab.comps.forEach((c) => { if (c.n < 20) c.pixels.forEach((k) => { ink[k] = 0; }); });
    let any = 0; for (let i = 0; i < N * N; i++) any += ink[i];
    return any < 24 ? null : ink;
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

  /* 비트맵 → 외곽선(칸 단위 0..1000, y 위로). 픽셀 변을 이어 닫힌 고리로 만들고 다듬는다. */
  function trace(ink) {
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
      out.push(sm.map(([x, y]) => [x / N * 1000, (1 - y / N) * 1000]).reverse());
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

  /* 쪽 하나 처리: 귀퉁이 → 호모그래피 → 쪽 번호 → 칸마다 오려 외곽선 */
  function readPageId(page) {
    let id = 0;
    MM.ID.forEach(([mx, my], bit) => {
      let dark = 0, tot = 0;
      for (let dy = -1; dy <= 1; dy += 0.5) for (let dx = -1; dx <= 1; dx += 0.5) { const [px, py] = page.H(mx + dx, my + dy); tot++; if (sampleAt(page.gray, page.w, page.h, px, py) < 100) dark++; }
      if (dark / tot > 0.6) id |= 1 << bit;
    });
    return id >= 1 && id <= PAGES ? id - 1 : null;
  }
  function processPage(page) {
    page.H = homography(MM.MARKS, page.corners);
    page.detectedPage = readPageId(page);
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

  /* ── 자모 꺼내기 ───────────────────────────────────────────────────────── */
  // 기본 자리(글자 잉크 상자 안 비율, y는 위에서부터). 쓴 글자가 모이면 본인 비율로 바뀐다.
  const LAYOUT0 = {
    V: { cho: [0, 0.08, 0.5, 0.92], jung: [0.52, 0, 1, 1] },
    H: { cho: [0.1, 0, 0.9, 0.5], jung: [0, 0.5, 1, 1] },
    M: { cho: [0, 0.02, 0.5, 0.56], jung: [0, 0, 1, 1] },
    Vj: { cho: [0, 0.02, 0.5, 0.58], jung: [0.52, 0, 1, 0.62], jong: [0.1, 0.64, 0.9, 1] },
    Hj: { cho: [0.14, 0, 0.86, 0.36], jung: [0, 0.34, 1, 0.62], jong: [0.12, 0.64, 0.88, 1] },
    Mj: { cho: [0, 0.02, 0.48, 0.42], jung: [0, 0, 1, 0.64], jong: [0.1, 0.66, 0.9, 1] }
  };
  // 자모 가르기용 영역(가르기에만 쓴다). 복합모음(ㅘ ㅝ ㅢ…)은 ㄱ자 꼴이라 두 네모로.
  const SPLIT_ZONES = {
    V: { cho: [[0, 0.04, 0.5, 0.96]], jung: [[0.5, 0, 1, 1]] },
    H: { cho: [[0.08, 0, 0.92, 0.52]], jung: [[0, 0.5, 1, 1]] },
    M: { cho: [[0, 0, 0.5, 0.56]], jung: [[0.52, 0, 1, 1], [0, 0.52, 0.72, 1]] },
    Vj: { cho: [[0, 0, 0.5, 0.6]], jung: [[0.5, 0, 1, 0.64]], jong: [[0.08, 0.64, 0.92, 1]] },
    Hj: { cho: [[0.1, 0, 0.9, 0.36]], jung: [[0, 0.34, 1, 0.64]], jong: [[0.1, 0.64, 0.9, 1]] },
    Mj: { cho: [[0, 0, 0.48, 0.42]], jung: [[0.52, 0, 1, 0.66], [0, 0.4, 0.72, 0.66]], jong: [[0.08, 0.66, 0.92, 1]] }
  };
  const PARTS = (k) => k ? ['cho', 'jung', 'jong'] : ['cho', 'jung'];

  /* 쓴 음절 하나를 자모로 가른다. 실패하면 null. 결과: {cho:{polys,bbox}, jung:…, jong:…, rel:{cho:[fx0,fy0,fx1,fy1]…}} */
  function splitSyllable(glyph, c, j, k) {
    const cls = classOf(j, k), lay = SPLIT_ZONES[cls], parts = PARTS(k);
    const { comps } = components(glyph.ink);
    if (!comps.length) return null;
    const total = comps.reduce((s, q) => s + q.n, 0);
    // 글자 잉크 상자(그림 좌표, y 아래)
    const X0 = Math.min(...comps.map((q) => q.x0)), X1 = Math.max(...comps.map((q) => q.x1)) + 1;
    const Y0 = Math.min(...comps.map((q) => q.y0)), Y1 = Math.max(...comps.map((q) => q.y1)) + 1;
    const W = X1 - X0, Hh = Y1 - Y0;
    const rects = (p) => lay[p].map(([a, b, cc, d]) => ({ x0: X0 + a * W, y0: Y0 + b * Hh, x1: X0 + cc * W, y1: Y0 + d * Hh }));
    const zonesAll = Object.fromEntries(parts.map((p) => [p, rects(p)]));
    const masks = Object.fromEntries(parts.map((p) => [p, new Uint8Array(N * N)]));
    const overlap1 = (q, z) => {
      const w = Math.max(0, Math.min(q.x1 + 1, z.x1) - Math.max(q.x0, z.x0)), h = Math.max(0, Math.min(q.y1 + 1, z.y1) - Math.max(q.y0, z.y0));
      return w * h / ((q.x1 - q.x0 + 1) * (q.y1 - q.y0 + 1));
    };
    // 영역이 여러 네모면 가장 많이 겹치는 네모 기준. 비기면 중심이 가까운 쪽
    const best = (q, p) => zonesAll[p].reduce((acc, z) => { const o = overlap1(q, z); return o > acc.o ? { o, z } : acc; }, { o: -1, z: zonesAll[p][0] });
    const dist = (q, z) => Math.hypot((q.x0 + q.x1) / 2 - (z.x0 + z.x1) / 2, (q.y0 + q.y1) / 2 - (z.y0 + z.y1) / 2) / Math.max(W, Hh);
    for (const q of comps) {
      const ov = parts.map((p) => { const b = best(q, p); return [p, b.o - 0.05 * dist(q, b.z), b.z]; }).sort((a, b) => b[1] - a[1]);
      const [p1, o1] = ov[0], [p2, o2] = ov[1] || [null, 0];
      if (p2 && o2 > 0.28 && o1 < 0.85 && q.n > total * 0.12) {
        // 두 자리에 걸친 큰 덩어리: 두 자리 사이 경계선으로 가른다(옆이면 세로선, 위아래면 가로선)
        const za = ov[0][2], zb = ov[1][2];
        const zones = { [p1]: za, [p2]: zb };
        const side = Math.abs((za.x0 + za.x1) - (zb.x0 + zb.x1)) > Math.abs((za.y0 + za.y1) - (zb.y0 + zb.y1));
        const left = side ? (za.x0 < zb.x0 ? p1 : p2) : (za.y0 < zb.y0 ? p1 : p2), right = left === p1 ? p2 : p1;
        const cut = side ? (Math.max(zones[left].x1, zones[right].x0) + Math.min(zones[left].x1, zones[right].x0)) / 2
                         : (Math.max(zones[left].y1, zones[right].y0) + Math.min(zones[left].y1, zones[right].y0)) / 2;
        let na = 0, nb = 0;
        q.pixels.forEach((px) => { const x = px % N, y = (px - x) / N; if ((side ? x : y) < cut) { masks[left][px] = 1; na++; } else { masks[right][px] = 1; nb++; } });
        if (na < q.n * 0.08 || nb < q.n * 0.08) return null;   // 한쪽이 거의 없으면 애매한 글자. 배우지 않는다
      } else {
        q.pixels.forEach((px) => { masks[p1][px] = 1; });
      }
    }
    const out = { rel: {} };
    for (const p of parts) {
      let n = 0; for (let i = 0; i < N * N; i++) n += masks[p][i];
      if (n < total * 0.04) return null;
      const polys = trace(masks[p]);
      if (!polys.length) return null;
      const bb = bboxOf(polys);
      out[p] = { polys, bbox: bb };
      // 글자 상자 안 비율(칸 단위, y 위로 → 위에서부터 비율로)
      const gx0 = X0 / N * 1000, gx1 = X1 / N * 1000, gy1 = (1 - Y0 / N) * 1000, gy0 = (1 - Y1 / N) * 1000;
      out.rel[p] = [(bb.x0 - gx0) / (gx1 - gx0), (gy1 - bb.y1) / (gy1 - gy0), (bb.x1 - gx0) / (gx1 - gx0), (gy1 - bb.y0) / (gy1 - gy0)];
    }
    return out;
  }

  const median = (arr) => { if (!arr.length) return NaN; const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

  /* 쓴 음절 전부에서 자모 표본과 본인 비율을 모은다 */
  function learn(glyphMap) {
    const samples = { cho: {}, jung: {}, jong: {} };   // samples.cho[c][cls] = [{polys,bbox}]
    const rels = {};                                    // rels[cls][part] = [[fx0,fy0,fx1,fy1]…]
    const bodies = [];                                  // 쓴 음절 잉크 상자(칸 단위)
    CELLS.forEach((cell, n) => {
      const gl = glyphMap[n]; if (!gl || cell.kind !== 'syl') return;
      bodies.push(gl.bbox);
      const [c, j, k] = decompose(cell.ch);
      const sp = splitSyllable(gl, c, j, k); if (!sp) return;
      const cls = classOf(j, k);
      const put = (part, idx) => { ((samples[part][idx] = samples[part][idx] || {})[cls] = samples[part][idx][cls] || []).push(sp[part]); };
      put('cho', c); put('jung', j); if (k) put('jong', k - 1);
      rels[cls] = rels[cls] || {};
      PARTS(k).forEach((p) => (rels[cls][p] = rels[cls][p] || []).push(sp.rel[p]));
    });
    const layout = {};
    Object.keys(LAYOUT0).forEach((cls) => {
      layout[cls] = {};
      Object.keys(LAYOUT0[cls]).forEach((p) => {
        const list = (rels[cls] || {})[p] || [];
        layout[cls][p] = list.length >= 3 ? [0, 1, 2, 3].map((i) => median(list.map((r) => r[i]))) : LAYOUT0[cls][p];
      });
    });
    const body = { w: median(bodies.map((b) => b.w)) || 700, h: median(bodies.map((b) => b.h)) || 750, cx: median(bodies.map((b) => b.cx)) || 500, cy: median(bodies.map((b) => b.cy)) || 500 };
    return { samples, layout, body, learned: Object.values(rels).reduce((s, r) => s + (r.cho || []).length, 0) };
  }

  /* 안 쓴 음절 조합: 같은 자리에서 나온 자모 표본을 본인 비율 자리에 놓는다(거의 안 늘인다) */
  function compose(model, c, j, k) {
    const cls = classOf(j, k), lay = model.layout[cls], B = model.body;
    const pick = (part, idx) => {
      const byCls = model.samples[part][idx]; if (!byCls) return null;
      let list = byCls[cls];
      if (!list) { const vt = cls[0]; list = Object.keys(byCls).filter((q) => q[0] === vt).flatMap((q) => byCls[q]); }
      if (!list.length) list = Object.values(byCls).flat();
      if (!list.length) return null;
      // 크기가 중간쯤인 표본
      const areas = list.map((s) => s.bbox.w * s.bbox.h); const m = median(areas);
      return list[areas.indexOf(areas.reduce((a, b) => Math.abs(a - m) < Math.abs(b - m) ? a : b))];
    };
    const polys = [];
    const place = (part, s) => {
      const [fx0, fy0, fx1, fy1] = lay[part];
      const gx0 = B.cx - B.w / 2, gy1 = B.cy + B.h / 2;
      const zx0 = gx0 + fx0 * B.w, zx1 = gx0 + fx1 * B.w, zy1 = gy1 - fy0 * B.h, zy0 = gy1 - fy1 * B.h;
      const sc = Math.max(0.75, Math.min(1.3, Math.min((zx1 - zx0) / Math.max(1, s.bbox.w), (zy1 - zy0) / Math.max(1, s.bbox.h))));
      const ox = (zx0 + zx1) / 2 - s.bbox.cx * sc, oy = (zy0 + zy1) / 2 - s.bbox.cy * sc;
      s.polys.forEach((p) => polys.push(p.map(([x, y]) => [x * sc + ox, y * sc + oy])));
    };
    const sc_ = pick('cho', c), sj = pick('jung', j), sk = k ? pick('jong', k - 1) : null;
    if (!sc_ || !sj || (k && !sk)) return null;
    place('cho', sc_); place('jung', sj); if (k) place('jong', sk);
    return polys;
  }

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

  function buildFont(glyphMap) {
    const model = learn(glyphMap);
    // 종이 → 글꼴 배율: 쓴 음절 키의 중앙값이 780이 되게. 모든 글자에 같은 배율(상대 크기는 쓴 대로)
    const S = 780 / model.body.h;
    const LB = 60;
    const placeBody = (polys, bb, cy0) => {   // 한글: 세로는 쓴 위치 그대로(본인 글자 중심이 글꼴 중앙), 가로는 잉크 왼쪽부터
      const ox = LB - bb.x0 * S, oy = MID - cy0 * S;
      return { path: toPath(polys.map((p) => p.map(([x, y]) => [x * S + ox, y * S + oy]))), adv: r(bb.w * S + 2 * LB) };
    };
    const placeLine = (polys, bb) => {        // 영문·숫자·부호: 칸의 기준선이 글꼴 기준선
      const ox = 50 - bb.x0 * S, oy = -BASE_CU * S;
      return { path: toPath(polys.map((p) => p.map(([x, y]) => [x * S + ox, y * S + oy]))), adv: r(bb.w * S + 100) };
    };
    const glyphs = [
      new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 500, path: new opentype.Path() }),
      new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: r(Math.max(240, model.body.w * S * 0.42)), path: new opentype.Path() })
    ];
    const done = new Set([0, 32]);
    let written = 0, composed = 0;
    // 1) 쓴 글자 그대로. 같은 글자를 여러 번 썼으면 크기가 중간인 것
    const byChar = {};
    CELLS.forEach((cell, n) => { const gl = glyphMap[n]; if (gl) (byChar[cell.ch] = byChar[cell.ch] || []).push({ cell, gl }); });
    Object.keys(byChar).forEach((ch) => {
      const list = byChar[ch]; const areas = list.map((e) => e.gl.bbox.w * e.gl.bbox.h); const m = median(areas);
      const { cell, gl } = list[areas.indexOf(areas.reduce((a, b) => Math.abs(a - m) < Math.abs(b - m) ? a : b))];
      const code = ch.codePointAt(0); if (done.has(code)) return;
      const pl = cell.kind === 'syl' ? placeBody(gl.polys, gl.bbox, model.body.cy) : placeLine(gl.polys, gl.bbox);
      glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: pl.adv, path: pl.path }));
      done.add(code); written++;
    });
    // 2) 격자판에 있었지만 비어 있는 영문·부호: 빈 글자
    CELLS.forEach((cell) => { const code = cell.ch.codePointAt(0); if (!done.has(code) && cell.kind !== 'syl') { glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: 400, path: new opentype.Path() })); done.add(code); } });
    // 3) 낱자 자모(ㄱ, ㅏ …): 표본을 가운데에
    const jamoList = [...CHO].map((ch, i) => [ch, 'cho', i]).concat([...JUNG].map((ch, i) => [ch, 'jung', i]), [...JONG].map((ch, i) => [ch, 'jong', i]));
    jamoList.forEach(([ch, part, idx]) => {
      const code = ch.codePointAt(0); if (done.has(code)) return;
      const byCls = model.samples[part][idx]; const list = byCls ? Object.values(byCls).flat() : [];
      if (!list.length) { glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: 600, path: new opentype.Path() })); done.add(code); return; }
      const s = list[0]; const B = model.body;
      const polys = s.polys.map((p) => p.map(([x, y]) => [x - s.bbox.cx + B.cx, y - s.bbox.cy + B.cy]));
      const pl = placeBody(polys, bboxOf(polys), B.cy);
      glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: pl.adv, path: pl.path })); done.add(code);
    });
    // 4) 나머지 음절 전부 조합
    for (let c = 0; c < 19; c++) for (let j = 0; j < 21; j++) for (let k = 0; k < 28; k++) {
      const code = 0xAC00 + (c * 21 + j) * 28 + k; if (done.has(code)) continue;
      const polys = compose(model, c, j, k);
      if (!polys) { glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: r(model.body.w * S + 2 * LB), path: new opentype.Path() })); continue; }
      const pl = placeBody(polys, bboxOf(polys), model.body.cy);
      glyphs.push(new opentype.Glyph({ name: uni(code), unicode: code, advanceWidth: pl.adv, path: pl.path }));
      composed++;
    }
    const font = new opentype.Font({ familyName: 'NotjangHand', styleName: 'Regular', unitsPerEm: 1000, ascender: ASC, descender: DESC, glyphs });
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
    $('s1').textContent = L.s1; $('s1p').textContent = L.s1p(PAGES); $('print').textContent = L.print;
    $('s2').textContent = L.s2; $('s2p').textContent = L.s2p; $('picklabel').textContent = L.pick;
    $('s3').textContent = L.s3; $('s3p').textContent = L.s3p; $('make').textContent = L.make;
    $('sampleh').textContent = L.sample; $('sampletext').placeholder = L.placeholder; $('download').textContent = L.download; $('after').textContent = L.after;
    $('legal').textContent = L.legal;
    for (let p = 0; p < PAGES; p++) { const l = $('plabel' + p); if (l) l.textContent = L.page(p + 1); const wt = $('pwait' + p); if (wt) wt.textContent = L.waiting; }
    buildSheets();
    pages.forEach((pg) => pg && renderPage(pg));
  }

  function buildUploads() {
    const host = $('uploads'); host.innerHTML = '';
    for (let p = 0; p < PAGES; p++) {
      const box = document.createElement('div'); box.className = 'up'; box.id = 'up' + p;
      box.innerHTML = `<div class="uphead"><strong id="plabel${p}"></strong> <span class="pwait" id="pwait${p}"></span></div>
        <div class="view" hidden><canvas class="photo"></canvas><p class="msg"></p><div class="thumbs"></div></div>`;
      host.appendChild(box);
    }
    $('pick').addEventListener('change', async (e) => {
      const files = [...e.target.files]; e.target.value = '';
      for (const f of files) await addPhoto(f);
    });
  }

  async function addPhoto(file, hint) {
    const pg = await loadPhoto(file);
    const m = findMarkers(pg.gray, pg.w, pg.h);
    pg.corners = m.corners; pg.markersOK = m.ok;
    pg.H = homography(MM.MARKS, pg.corners);
    const det = readPageId(pg);
    // 쪽 번호를 못 읽으면 힌트, 그것도 없으면 첫 빈 칸
    let idx = det !== null ? det : (hint !== undefined ? hint : 0);
    if (det === null && hint === undefined) { while (idx < PAGES - 1 && pages[idx]) idx++; }
    pg.index = idx;
    processPage(pg);
    pages[pg.index] = pg;
    renderPage(pg);
    updateMake();
  }

  function renderPage(pg) {
    const box = $('up' + pg.index); if (!box) return;
    box.querySelector('.pwait').hidden = true;
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
    msg.querySelector('.retake').onclick = () => { box.querySelector('.pwait').hidden = false; view.hidden = true; pages[pg.index] = null; updateMake(); };
    renderThumbs(pg);
  }

  function renderThumbs(pg) {
    const host = $('up' + pg.index).querySelector('.thumbs'); host.innerHTML = '';
    let empty = 0;
    CELLS.forEach((cell, n) => {
      if (cell.page !== pg.index) return;
      const gl = pg.glyphs[n];
      const d = document.createElement('div'); d.className = 'th' + (gl ? '' : ' none'); d.title = cell.ch;
      const c = document.createElement('canvas'); c.width = 40; c.height = 40;
      if (gl) {
        const ctx = c.getContext('2d'); const img = ctx.createImageData(40, 40);
        for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { const k = (y * 40 + x) * 4; const on = gl.ink[Math.floor(y * N / 40) * N + Math.floor(x * N / 40)]; img.data[k] = img.data[k + 1] = img.data[k + 2] = on ? 17 : 255; img.data[k + 3] = 255; }
        ctx.putImageData(img, 0, 0);
      } else empty++;
      d.appendChild(c);
      const s = document.createElement('span'); s.textContent = cell.ch; d.appendChild(s);
      host.appendChild(d);
    });
    const p = document.createElement('p'); p.className = 'emptyn'; p.textContent = L.empty(empty); host.appendChild(p);
  }

  function updateMake() {
    let have = 0; for (let p = 0; p < PAGES; p++) if (pages[p]) have++;
    $('make').disabled = have < PAGES;
    $('made').textContent = have && have < PAGES ? `${have} / ${PAGES}` : '';
  }

  async function make() {
    $('make').disabled = true; $('made').textContent = L.making;
    await new Promise((ok) => setTimeout(ok, 30));
    const map = {};
    pages.forEach((pg) => { if (pg) Object.assign(map, pg.glyphs); });
    const { font, glyphs, written, composed } = buildFont(map);
    fontBuffer = fixCmap(font.toArrayBuffer(), glyphs);
    $('made').textContent = L.made(written, composed);
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
  window.NotjangFont = { addURL: async (url, p) => addPhoto(await (await fetch(url)).blob(), p), CELLS, MM, PAGES, pages, buildFont, fixCmap, learn, buffer: () => fontBuffer };
})();
