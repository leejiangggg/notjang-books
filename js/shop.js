/* 서점 데이터. CloudKit 공용 DB의 ShopSheet 레코드를 읽어 '작품'(같은 groupID의 낱장 묶음)으로 만든다.
 * 토큰이 없으면 디자인용 예시 낱장으로 돌아간다. 글 원문은 어디에도 없다 — 낱장 PNG만.
 */
window.NotjangShop = (function () {
  const cfg = Object.assign({
    container: 'iCloud.com.unrulermatter.PoemBook',
    environment: 'development',
    cloudKitToken: ''
  }, window.NOTJANG_CONFIG || {});

  const SAMPLE_ALTS = ['비 온 뒤 산책하는 강아지들', '붉은 꽃이 핀 담벼락', '노란 접시 위 레몬', '베일을 쓴 사람', '울타리 위 장미', '창가의 신부', '오늘만 주인공 하겠습니다', '하늘 아래 붉은 꽃', '꽃 핀 벽', '노란 토마토 두 알'];

  function sampleWorks() {
    const works = [];
    for (let i = 0; i < 10; i++) {
      const src = 'assets/samples/s' + String(i + 1).padStart(2, '0') + '.png';
      const sheets = [{ id: 'sample-' + i, src, alt: SAMPLE_ALTS[i] }];
      if (i % 4 === 1) {
        const j = (i + 3) % 10;
        sheets.push({ id: 'sample-' + i + 'b', src: 'assets/samples/s' + String(j + 1).padStart(2, '0') + '.png', alt: SAMPLE_ALTS[j] });
      }
      works.push({ id: 'sample-group-' + i, no: 214 - i, author: '', date: new Date(2026, 9, 30), shopDate: new Date(2026, 9, 30), sheets, sample: true });
    }
    return works;
  }

  function field(rec, name) {
    const f = rec.fields && rec.fields[name];
    return f ? f.value : undefined;
  }

  function groupRecords(records) {
    const groups = new Map();
    for (const rec of records) {
      if (!rec || rec.serverErrorCode || !rec.fields) continue;
      const image = field(rec, 'image');
      if (!image || !image.downloadURL) continue;
      const groupID = field(rec, 'groupID') || rec.recordName;
      let work = groups.get(groupID);
      if (!work) {
        work = {
          id: groupID,
          no: Number(field(rec, 'number') || 0),
          author: String(field(rec, 'authorName') || ''),
          date: new Date(Number(field(rec, 'publishedAt') || rec.created.timestamp)),
          shopDate: new Date(Number(field(rec, 'shopDate') || rec.created.timestamp)),
          sheets: []
        };
        groups.set(groupID, work);
      }
      work.sheets.push({
        id: rec.recordName,
        index: Number(field(rec, 'sheetIndex') || 0),
        src: image.downloadURL,
        width: Number(field(rec, 'width') || 0),
        height: Number(field(rec, 'height') || 0),
        alt: '낱장 ' + (field(rec, 'number') || '') + '번'
      });
    }
    const works = [...groups.values()];
    for (const w of works) w.sheets.sort((a, b) => a.index - b.index);
    works.sort((a, b) => b.shopDate - a.shopDate);
    return works;
  }

  async function queryCloudKit() {
    const url = 'https://api.apple-cloudkit.com/database/1/' + cfg.container + '/' + cfg.environment +
      '/public/records/query?ckAPIToken=' + encodeURIComponent(cfg.cloudKitToken);
    const all = [];
    let marker = null;
    do {
      const body = {
        query: {
          recordType: 'ShopSheet',
          filterBy: [{ fieldName: 'hidden', comparator: 'EQUALS', fieldValue: { value: 0 } }],
          sortBy: [{ fieldName: 'shopDate', ascending: false }]
        },
        resultsLimit: 200
      };
      if (marker) body.continuationMarker = marker;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.serverErrorCode) throw new Error(json.serverErrorCode + (json.reason ? ': ' + json.reason : ''));
      all.push(...(json.records || []));
      marker = json.continuationMarker || null;
    } while (marker);
    return all;
  }

  /** @returns {Promise<{works: Array, source: 'sample'|'cloudkit', error?: string}>} */
  async function load() {
    const params = new URLSearchParams(location.search);
    if (params.has('sample') || !cfg.cloudKitToken) {
      return { works: sampleWorks(), source: 'sample' };
    }
    try {
      const records = await queryCloudKit();
      return { works: groupRecords(records), source: 'cloudkit' };
    } catch (e) {
      const msg = String(e && e.message || e);
      // 아직 아무도 내놓지 않아 레코드 타입 자체가 없을 때: 오류가 아니라 빈 서점.
      if (/Missing record type/i.test(msg)) return { works: [], source: 'cloudkit' };
      return { works: [], source: 'cloudkit', error: msg };
    }
  }

  return { load, config: cfg };
})();
