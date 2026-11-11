/* 리소 인쇄 엔진 (앱의 RisoEngine.swift를 그대로 옮긴 것).
   도수에 맞춰 사진을 판으로 분해하고, 판마다 잉크색으로 흰 바탕 위에 곱해서 찍는다.
   결과는 순백 바탕이라 낱장에서 multiply로 얹으면 종이가 바탕이 된다. */
window.NotjangRiso = (function () {
  'use strict';
  const INKS = {
    pink: '#FF48B0', brightRed: '#F15060', orange: '#FF6C2F', yellow: '#FFE800', green: '#00A95C',
    teal: '#00838A', blue: '#0078BF', mediumBlue: '#3255A4', purple: '#765BA7', black: '#231F20'
  };
  const rgbOf = (id) => { const h = parseInt(INKS[id].slice(1), 16); return [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255]; };
  const UCR = 0.62, INK_ALPHA = 0.92;
  const ANGLES = [15, 75, 0, 45].map((d) => [Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)]);
  const OFFSETS = [[-1.0, 0.7], [0.9, -0.8], [0.3, 1.1], [0.6, 0.5]];
  const LOOK = { cellPoints: 1.05, dotMix: 0.16, speckStart: 0.72, speckAmount: 0.4, mottle: 0.22 };   // 고운 질감
  const MISREG = [0, 0.7, 1.4, 2.4];

  /* 잉크의 CMYK 역할: 검정은 K, 나머지는 색 방향이 가장 가까운 M / C / Y */
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function roleOf(id) {
    if (id === 'black') return 3;
    const [r, g, b] = rgbOf(id), m = (r + g + b) / 3, v = [r - m, g - m, b - m];
    const targets = [[0.5, -0.6, 0.1], [-0.6, 0.1, 0.5], [0.3, 0.3, -0.6]];
    let best = 0; for (let i = 1; i < 3; i++) if (dot3(v, targets[i]) > dot3(v, targets[best])) best = i;
    return best;
  }
  /* [M, C, Y, K] 자리 순서로 세운다. 역할이 겹치면 고른 순서대로 빈 자리를 채운다 */
  function roleOrdered(inks) {
    const slots = [null, null, null, null], left = [];
    inks.forEach((id) => { const s = roleOf(id); if (slots[s] === null) slots[s] = id; else left.push(id); });
    left.forEach((id) => { const e = slots.indexOf(null); if (e >= 0) slots[e] = id; });
    return slots.filter((v) => v !== null);
  }
  const chroma = (c) => { const m = (c[0] + c[1] + c[2]) / 3, v = [c[0] - m, c[1] - m, c[2] - m], l = Math.max(Math.hypot(v[0], v[1], v[2]), 0.0001); return [v[0] / l, v[1] / l, v[2] / l]; };

  /* plates[i * count + pixel] = i번째 잉크의 양 (0~1) */
  function separate(px, count, inks) {
    const n = inks.length, plates = new Float32Array(count * n);
    if (n === 1) {
      for (let j = 0; j < count; j++) { const i = j * 4; const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255; plates[j] = Math.pow(1 - lum, 1.08); }
    } else if (n === 2) {
      const bs = inks.indexOf('black');
      if (bs >= 0 && inks[1 - bs] !== 'black') {
        // 검정 + 색: 색 판이 중간 톤을 다 맡고, 검정은 짙은 그림자에만
        const cs = 1 - bs, dir = chroma(rgbOf(inks[cs]));
        for (let j = 0; j < count; j++) {
          const i = j * 4, r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b, mean = (r + g + b) / 3;
          const aff = Math.min(1, Math.max(0, dot3([r - mean, g - mean, b - mean], dir)) * 3.2), dark = 1 - lum;
          plates[cs * count + j] = Math.min(1, Math.pow(dark, 1.05) * 0.85 + aff * 0.6);
          plates[bs * count + j] = Math.min(1, Math.pow(Math.max(0, (dark - 0.38) / 0.62), 1.35) * (1 - aff * 0.6));
        }
      } else {
        // 두 판 모두 명도를 깔고, 픽셀 색이 가까운 잉크 쪽으로 비중을 나눈다
        const cA = chroma(rgbOf(inks[0])), cB = chroma(rgbOf(inks[1]));
        for (let j = 0; j < count; j++) {
          const i = j * 4, r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b, mean = (r + g + b) / 3, pc = [r - mean, g - mean, b - mean];
          const wA = Math.max(0, dot3(pc, cA)) * 3.2, wB = Math.max(0, dot3(pc, cB)) * 3.2;
          const split = (wA + 0.06) / (wA + wB + 0.12), dark = Math.pow(1 - lum, 0.95);
          plates[j] = Math.min(Math.max(dark * (0.25 + 1.25 * split) + wA * 0.7, 0), 1);
          plates[count + j] = Math.min(Math.max(dark * (0.25 + 1.25 * (1 - split)) + wB * 0.7, 0), 1);
        }
      }
    } else {
      // 3도·4도 = CMYK 분해(UCR). 3도는 빠진 역할의 잉크량을 남은 판에 나눠 얹는다
      const roles = inks.map(roleOf);
      const missing = n === 3 ? [0, 1, 2, 3].find((r) => !roles.includes(r)) : -1;
      const share = missing === 3 ? 0.9 : 0.45;
      const amt = [0, 0, 0, 0];
      for (let j = 0; j < count; j++) {
        const i = j * 4, c = 1 - px[i] / 255, m = 1 - px[i + 1] / 255, y = 1 - px[i + 2] / 255;
        const k = Math.min(c, m, y) * UCR, d = (1 - k) === 0 ? 1 : (1 - k);
        amt[0] = Math.pow(Math.max(0, (m - k) / d), 1.1) * 0.95;
        amt[1] = Math.pow(Math.max(0, (c - k) / d), 1.1);
        amt[2] = Math.pow(Math.max(0, (y - k) / d), 1.1) * 0.85;
        amt[3] = Math.min(1, k * 1.2);
        if (n === 3) {
          const spill = amt[missing];
          for (let r = 0; r < 4; r++) if (r !== missing) amt[r] = Math.min(1, amt[r] + spill * share);
          for (let s = 0; s < 3; s++) plates[s * count + j] = amt[roles[s]];
        } else for (let s = 0; s < 4; s++) plates[s * count + j] = amt[s];
      }
    }
    return plates;
  }

  /* 촬영한 인쇄 그레인. 평균 0.5로 펴고 거울 타일링으로 읽는다 */
  let grain = null;
  function loadGrain(url) {
    return grain || (grain = new Promise((ok) => {
      const im = new Image();
      im.onload = () => {
        const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
        const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(im, 0, 0, S, S);
        const d = ctx.getImageData(0, 0, S, S).data, v = new Float32Array(S * S);
        let mean = 0; for (let i = 0; i < S * S; i++) mean += d[i * 4]; mean /= S * S;
        let vr = 0; for (let i = 0; i < S * S; i++) vr += (d[i * 4] - mean) ** 2; const sd = Math.max(Math.sqrt(vr / (S * S)), 1);
        for (let i = 0; i < S * S; i++) v[i] = Math.min(Math.max((d[i * 4] - mean) / (sd * 4) + 0.5, 0), 1);
        ok({ v, S });
      };
      im.onerror = () => ok({ v: new Float32Array(4).fill(0.5), S: 2 });
      im.src = url;
    }));
  }

  /* source: 사진이 그려진 캔버스(찍힐 크기 그대로). inks: 잉크 이름 1~4개. displayWidth: 화면에서의 폭(pt, 앱 기준 354).
     결과: 같은 크기의 새 캔버스(흰 바탕 위 인쇄) */
  async function print(source, inks, opts) {
    opts = Object.assign({ displayWidth: 354, misregistration: 1, grainUrl: 'assets/papers/grain_fine.jpg' }, opts);
    inks = inks.slice(0, 4); if (inks.length >= 3) inks = roleOrdered(inks);
    const W = source.width, H = source.height, count = W * H;
    const px = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const plates = separate(px, count, inks);
    const g = await loadGrain(opts.grainUrl), GS = g.S, GV = g.v, period = GS * 2;
    const mirror = (v) => { let m = v % period; if (m < 0) m += period; return m < GS ? m : period - 1 - m; };
    const ppp = W / Math.max(opts.displayWidth, 1);
    const cell = Math.max(2.5, LOOK.cellPoints * ppp), shift = MISREG[Math.min(Math.max(opts.misregistration, 0), 3)] * ppp;
    const grainStep = Math.max(1, 2.2 / ppp * 1.6) * (GS / 1024);   // 텍스처를 512로 줄였으니 걸음도 절반
    const out = new ImageData(W, H), o = out.data, n = inks.length, rgb = inks.map(rgbOf);
    const ox = OFFSETS.map((q) => Math.round(q[0] * shift)), oy = OFFSETS.map((q) => Math.round(q[1] * shift));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let r = 1, gg = 1, b = 1;
      for (let i = 0; i < n; i++) {
        const sx = Math.min(W - 1, Math.max(0, x - ox[i])), sy = Math.min(H - 1, Math.max(0, y - oy[i]));
        let a = plates[i * count + sy * W + sx];
        if (a <= 0.004) continue;
        // 아주 고운 망점을 연속 톤에 살짝 섞는다
        const ca = ANGLES[i][0], sa = ANGLES[i][1];
        const u = (x * ca + y * sa) / cell, v = (-x * sa + y * ca) / cell;
        const fu = u - Math.round(u), fv = v - Math.round(v);
        const d = Math.min(Math.max((0.74 * Math.sqrt(a) - Math.sqrt(fu * fu + fv * fv)) / 0.16 + 0.5, 0), 1);
        a = a * (1 - LOOK.dotMix) + d * LOOK.dotMix;
        // 인쇄 그레인: 밝은 점 = 잉크가 덜 묻은 자리, 전체적으로는 농도 얼룩
        const nz = GV[mirror(Math.floor(y * grainStep + i * 91)) * GS + mirror(Math.floor(x * grainStep + i * 37))];
        const speck = Math.min(Math.max((nz - LOOK.speckStart) / 0.22, 0), 1);
        a *= (1 - LOOK.speckAmount * speck) * (1 + LOOK.mottle * (0.5 - nz));
        a = Math.min(Math.max(a, 0), 1) * INK_ALPHA;
        r *= 1 - a * (1 - rgb[i][0]); gg *= 1 - a * (1 - rgb[i][1]); b *= 1 - a * (1 - rgb[i][2]);
      }
      const k = (y * W + x) * 4;
      o[k] = r * 255; o[k + 1] = gg * 255; o[k + 2] = b * 255; o[k + 3] = 255;
    }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').putImageData(out, 0, 0);
    return cv;
  }

  // 한 장 써보기에 내놓는 조합(앱의 추천 조합에서 고름)
  const PRESETS = [
    ['brightRed', 'green'], ['pink', 'blue'], ['orange', 'teal'], ['yellow', 'mediumBlue'], ['brightRed', 'black'],
    ['black'], ['purple'], ['teal'], ['pink', 'blue', 'yellow', 'black']
  ];
  return { INKS, PRESETS, print };
})();
