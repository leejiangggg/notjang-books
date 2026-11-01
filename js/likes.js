/* 좋아요: Cloudflare Worker(likes-worker/)에 센다. 주소가 없으면 이 브라우저에만 남는다.
 * uid는 이 브라우저가 한 번 만든 무작위 문자열. 서버는 (작품, uid) 한 쌍을 한 번만 센다. */
window.NotjangLikes = (function () {
  const url = (window.NOTJANG_CONFIG && NOTJANG_CONFIG.likesURL || '').replace(/\/$/, '');
  let uid = '';
  try {
    uid = localStorage.getItem('nb-uid') || '';
    if (!uid) {
      uid = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('nb-uid', uid);
    }
  } catch (e) { uid = 'anon'; }

  const enabled = () => !!url;

  /** 여러 작품의 좋아요 수. { id: n } */
  async function counts(ids) {
    if (!url || !ids.length) return {};
    const out = {};
    for (let i = 0; i < ids.length; i += 100) {
      const r = await fetch(url + '/likes?ids=' + encodeURIComponent(ids.slice(i, i + 100).join(',')));
      if (!r.ok) throw new Error('likes ' + r.status);
      Object.assign(out, await r.json());
    }
    return out;
  }

  /** 좋아요 켜기/끄기. 돌아오는 n이 새 수. */
  async function set(id, on) {
    if (!url) return null;
    const r = await fetch(url + '/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, uid, on }) });
    if (!r.ok) throw new Error('like ' + r.status);
    return (await r.json()).n;
  }

  return { enabled, counts, set };
})();
