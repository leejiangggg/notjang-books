/* 앱 다운로드 페이지: 차 두 대가 들어오고, 말풍선으로 고르면 그 가게 앞까지 달려가 QR(폰은 링크)을 보여준다. */
(function () {
  const $ = (s) => document.querySelector(s);
  const isMobile = () => matchMedia('(max-width: 767px)').matches;

  const TX = {
    KR: { askApple: '앱스토어 점으로 가시나요?', askGoogle: '구글플레이 점으로 가시나요?', back: '돌아가기', enterApple: '앱스토어 점으로 들어가기', enterGoogle: '구글플레이 점으로 들어가기' },
    EN: { askApple: 'Heading to the App Store shop?', askGoogle: 'Heading to the Google Play shop?', back: 'Go back', enterApple: 'Enter the App Store shop', enterGoogle: 'Enter the Google Play shop' },
    JP: { askApple: 'App Storeのお店へ行きますか？', askGoogle: 'Google Playのお店へ行きますか？', back: '戻る', enterApple: 'App Storeのお店に入る', enterGoogle: 'Google Playのお店に入る' },
    DE: { askApple: 'Zum App-Store-Laden?', askGoogle: 'Zum Google-Play-Laden?', back: 'Zurück', enterApple: 'App-Store-Laden betreten', enterGoogle: 'Google-Play-Laden betreten' }
  };

  const world = $('#world'), sports = $('#sports'), truck = $('#truck');
  const askApple = $('#askApple'), askGoogle = $('#askGoogle');
  const qrApple = $('#qrApple'), qrGoogle = $('#qrGoogle');
  let timers = [], choice = null;

  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }

  function applyText() {
    const t = TX[NotjangLang.get()];
    askApple.textContent = t.askApple;
    askGoogle.textContent = t.askGoogle;
    document.querySelectorAll('.back').forEach((b) => { b.textContent = t.back; });
    $('#enterApple').textContent = t.enterApple;
    $('#enterGoogle').textContent = t.enterGoogle;
  }

  // 자리값: 데스크톱과 폰이 다르다(디자인의 Download / DownloadApp).
  function geo() {
    return isMobile()
      ? { W: 200, sportsIn: 'calc(33.3333% - 260px)', sportsMid: 'calc(50% - 175px)', sportsApple: 'calc(83.3333% - 168px)', sportsBottom: '56%', sportsAppleBottom: 'calc(30% + 20px)',
          truckIn: 'calc(66.6667% + 60px)', truckMid: 'calc(50% - 25px)', truckGoogle: 'calc(16.6667% - 30px)', truckBottom: '34%', truckGoogleBottom: '30%' }
      : { W: 340, sportsIn: 'calc(33.3333% - 420px)', sportsMid: 'calc(50% - 320px)', sportsApple: 'calc(83.3333% - 276px)', sportsBottom: '47%', sportsAppleBottom: 'calc(26% + 34px)',
          truckIn: 'calc(66.6667% + 80px)', truckMid: 'calc(50% - 70px)', truckGoogle: 'calc(16.6667% - 48px)', truckBottom: '33%', truckGoogleBottom: '26%' };
  }

  function place(noTrans) {
    const g = geo();
    const goEase = 'cubic-bezier(.65,0,.35,1)';
    sports.style.width = g.W + 'px'; truck.style.width = g.W + 'px';
    sports.style.transition = noTrans ? 'none' : choice === 'apple' ? 'left 2.6s ' + goEase + ', bottom 2.6s ' + goEase : 'left 1.3s cubic-bezier(.12,.8,.3,1)';
    truck.style.transition = noTrans ? 'none' : choice === 'google' ? 'left 2.6s ' + goEase + ', bottom 2.6s ' + goEase : 'left 2.2s cubic-bezier(.12,.8,.3,1)';
    sports.style.left = noTrans ? g.sportsIn : choice === 'apple' ? g.sportsApple : g.sportsMid;
    sports.style.bottom = choice === 'apple' ? g.sportsAppleBottom : g.sportsBottom;
    truck.style.left = noTrans ? g.truckIn : choice === 'google' ? g.truckGoogle : g.truckMid;
    truck.style.bottom = choice === 'google' ? g.truckGoogleBottom : g.truckBottom;
    world.classList.toggle('go', !noTrans);
    world.style.transform = 'translateX(' + (choice === 'apple' ? '-66.6667%' : choice === 'google' ? '0%' : '-33.3333%') + ')';
  }

  function start() {
    clear();
    choice = null;
    sports.classList.remove('moving'); truck.classList.remove('moving');
    askApple.hidden = true; askGoogle.hidden = true;
    qrApple.classList.remove('show'); qrGoogle.classList.remove('show');
    place(true);
    void world.offsetWidth; // 자리 잡고 나서 움직이기
    later(60, () => { place(false); sports.classList.add('moving'); truck.classList.add('moving'); });
    later(60 + 1300, () => sports.classList.remove('moving'));
    later(60 + 2200, () => { truck.classList.remove('moving'); askApple.hidden = false; askGoogle.hidden = false; });
  }

  function pick(c) {
    if (choice) return;
    clear();
    choice = c;
    askApple.hidden = true; askGoogle.hidden = true;
    const car = c === 'apple' ? sports : truck;
    car.classList.add('moving');
    place(false);
    later(2600, () => car.classList.remove('moving'));
    later(2900, () => (c === 'apple' ? qrApple : qrGoogle).classList.add('show'));
  }

  askApple.addEventListener('click', () => pick('apple'));
  askGoogle.addEventListener('click', () => pick('google'));
  document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', start));
  $('#replay').addEventListener('click', (e) => { e.preventDefault(); start(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') start(); });
  addEventListener('pageshow', start);
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(start, 200); });

  NotjangLang.mount($('#lang'), applyText);
  applyText();
  start();
})();
