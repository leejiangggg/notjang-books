/* 언어 선택(KR/EN/JP/DE). localStorage 'nb-lang'에 두고 모든 페이지가 같이 쓴다. */
window.NotjangLang = (function () {
  const KEYS = ['KR', 'EN', 'JP', 'DE'];
  const CODES = { KR: 'ko', EN: 'en', JP: 'ja', DE: 'de' };
  function get() {
    let v = 'KR';
    try { v = localStorage.getItem('nb-lang') || 'KR'; } catch (e) {}
    return KEYS.includes(v) ? v : 'KR';
  }
  function set(v) {
    try { localStorage.setItem('nb-lang', v); } catch (e) {}
  }
  /** 스위치 UI를 만들고, 바뀔 때 onChange(lang)를 부른다. */
  function mount(container, onChange) {
    if (!container) return;
    container.innerHTML = '<span class="lpill" aria-hidden="true"></span>' +
      KEYS.map((k) => '<button type="button" class="lb" data-lang="' + k + '">' + k + '</button>').join('') +
      '<select class="lsel" aria-label="Language">' + KEYS.map((k) => '<option value="' + k + '">' + k + '</option>').join('') + '</select>';
    const pill = container.querySelector('.lpill');
    const sel = container.querySelector('.lsel');
    const apply = (lang) => {
      pill.style.transform = 'translateX(' + (KEYS.indexOf(lang) * 46) + 'px)';
      container.querySelectorAll('.lb').forEach((b) => {
        const on = b.dataset.lang === lang;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      sel.value = lang;
      document.documentElement.lang = CODES[lang];
    };
    const choose = (lang) => { set(lang); apply(lang); onChange && onChange(lang); };
    sel.addEventListener('change', () => choose(sel.value));
    container.addEventListener('click', (e) => {
      const b = e.target.closest('.lb');
      if (b) choose(b.dataset.lang);
    });
    apply(get());
  }
  return { KEYS, CODES, get, set, mount };
})();
