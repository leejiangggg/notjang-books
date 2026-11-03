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

  /** 신고. 서버가 없어도 호출은 되고(아무 일 없음), 가리는 건 호출한 쪽이 한다. */
  async function report(id, reason, author) {
    if (!url) return null;
    const r = await fetch(url + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, uid, reason, author }) });
    if (!r.ok) throw new Error('report ' + r.status);
    return r.json();
  }

  /** 신고가 쌓여 모두에게 가려진 작품 id 목록 */
  async function hidden(ids) {
    if (!url || !ids.length) return [];
    const out = [];
    for (let i = 0; i < ids.length; i += 100) {
      const r = await fetch(url + '/hidden?ids=' + encodeURIComponent(ids.slice(i, i + 100).join(',')));
      if (!r.ok) throw new Error('hidden ' + r.status);
      out.push(...await r.json());
    }
    return out;
  }

  /** 관리자 키 확인. 맞으면 true. */
  async function adminCheck(key) {
    if (!url || !key) return false;
    const r = await fetch(url + '/admin/check?key=' + encodeURIComponent(key));
    return r.ok;
  }

  /** 관리자가 바로 숨기기 / 다시 보이기 (모두에게). */
  async function adminHide(id, on, key) {
    if (!url) return null;
    const r = await fetch(url + '/admin/hide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, id, on }) });
    if (!r.ok) throw new Error('admin ' + r.status);
    return r.json();
  }

  return { enabled, counts, set, report, hidden, adminCheck, adminHide };
})();
