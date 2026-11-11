/* 개인정보 처리방침. 한국어·영어. 일본어·독일어를 고르면 영어를 보여 준다. */
(function () {
  const SITE = 'https://notjangbooks.com/';
  const LIKES = (window.NOTJANG_CONFIG && NOTJANG_CONFIG.likesURL) || '';
  const MAIL = (window.NOTJANG_CONFIG && NOTJANG_CONFIG.contactEmail) || '';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mail = () => MAIL ? '<a href="mailto:' + esc(MAIL) + '">' + esc(MAIL) + '</a>' : '';

  const KR = () => `
<h1>낱장북스 개인정보 처리방침</h1>
<p class="meta">시행일 2026년 11월 11일 · 운영 UNRULER MATTER</p>

<p>낱장북스(NOTJANG BOOOKS)는 사진 한 장과 몇 줄의 글로 낱장을 만드는 iPhone 앱과, 사람들이 서점에 내놓은 낱장을 보여 주는 웹사이트입니다. 이 문서는 앱과 사이트가 어떤 정보를 어디에 두는지 설명합니다. 짧게 말하면, 글과 사진은 당신의 iPhone에만 있고, 당신이 서점에 내놓기로 한 낱장 그림만 공개됩니다. 사이트에서 엽서 링크를 만들면 그 엽서의 앞뒷면 그림이 서버에 저장됩니다.</p>

<h2>1. 앱 안에만 있는 것</h2>
<ul>
<li><strong>사진과 글.</strong> 낱장을 만들 때 고른 사진과 쓴 글은 iPhone 안에만 저장됩니다. 서버로 보내지 않고, iCloud로 동기화하지 않으며, iPhone 백업에도 포함되지 않습니다. 앱을 지우거나 폰을 바꾸면 함께 사라집니다.</li>
<li><strong>필명.</strong> 설정에서 적은 필명은 iPhone에 저장되고, 서점에 내놓는 낱장에만 함께 붙습니다.</li>
<li><strong>사진 접근.</strong> 사진을 고를 때는 iOS의 사진 선택 창을 쓰므로 앱이 사진 보관함 전체를 읽지 않습니다. 낱장을 사진 앱에 저장할 때만 "추가" 권한을 씁니다.</li>
<li><strong>계정 없음.</strong> 가입, 로그인, 이메일, 전화번호를 받지 않습니다. 광고나 분석 도구도 없습니다.</li>
</ul>

<h2>2. 서점에 내놓을 때 공개되는 것</h2>
<p>낱장을 "서점에 내놓기"로 올리면 다음 정보가 Apple의 CloudKit 공용 데이터베이스에 저장되고, 이 사이트에서 누구나 볼 수 있게 됩니다.</p>
<ul>
<li>낱장 그림(PNG). 사진과 글이 합쳐진 완성본입니다. 사진 원본과 글 원문은 올라가지 않습니다.</li>
<li>필명, 종이 종류, 낱장 번호와 묶음 번호, 만든 날짜와 내놓은 날짜, 그림 크기, 앱 버전, 언어.</li>
<li>Apple이 붙이는 iCloud 사용자 레코드 ID. 이름이나 이메일이 아니라 무작위 식별자이며, 새 폰에서도 본인 낱장을 다시 내릴 수 있게 해 줍니다.</li>
</ul>
<p>서점에 내놓으려면 iPhone에 iCloud 계정이 로그인되어 있어야 합니다. 내놓은 낱장은 누구나 보고 내려받을 수 있습니다. 설정 &gt; 서점에 걸린 낱장 &gt; <strong>서점에서 내리기</strong>를 누르면 레코드가 바로 삭제되고 사이트에서도 사라집니다.</p>

<h2>3. 사이트가 다루는 것</h2>
<ul>
<li><strong>좋아요와 신고.</strong> 좋아요를 누르거나 낱장을 신고하면 브라우저가 만든 무작위 ID, 낱장 ID, 신고 이유, 글쓴이 레코드 ID가 Cloudflare에서 운영하는 작은 서버에 저장됩니다. 이 ID는 당신이 누구인지 알려 주지 않으며, 같은 사람이 여러 번 세지 않게 하는 용도입니다.</li>
<li><strong>한 장 써보기와 폰트 만들기.</strong> 사이트에서 낱장을 써 보거나 손글씨로 폰트를 만들 때 고른 사진, 쓴 글, 올린 글씨 사진은 당신의 브라우저 안에서만 처리되고 서버로 보내지 않습니다. 만든 폰트와 글씨는 다음에 다시 쓸 수 있게 그 브라우저에만 저장됩니다.</li>
<li><strong>엽서.</strong> 엽서 쓰기에서 "링크 만들기"를 누르면 엽서 앞면과 뒷면 그림, 종이 종류, 만든 시각이 Cloudflare에서 운영하는 서버에 저장됩니다. 링크를 아는 사람은 누구나 그 엽서를 볼 수 있습니다. 하루에 만들 수 있는 수를 세려고 접속 주소(IP)를 날짜와 함께 되돌릴 수 없게 바꾼 값을 같이 두며, IP 주소 자체는 저장하지 않습니다. 링크를 만들기 전에는 아무것도 서버로 가지 않습니다.</li>
<li><strong>브라우저에 남는 것.</strong> 고른 언어, 좋아요 표시, 가린 낱장 목록, 보낸 엽서 목록과 그 엽서를 지우는 열쇠는 당신의 브라우저(localStorage)에만 있습니다. 추적용 쿠키는 없습니다.</li>
<li><strong>남의 서버를 거치는 것.</strong> 사이트는 GitHub Pages에, 낱장 그림은 Apple iCloud에, 글꼴은 Google Fonts에 있습니다. 페이지를 열면 이 서비스들이 접속 기록(IP 주소 등)을 각자의 정책에 따라 남길 수 있습니다.</li>
</ul>

<h2>4. 보관과 삭제</h2>
<ul>
<li>서점 레코드는 당신이 내리거나 운영자가 지울 때까지 남습니다.</li>
<li>엽서는 보낸 사람이 지우거나 운영자가 지울 때까지 남습니다. 신고된 엽서는 운영자가 가리거나 지울 수 있습니다.</li>
<li>좋아요 기록은 서비스를 운영하는 동안, 신고 기록은 처리와 재발 확인을 위해 보관합니다.</li>
<li>규칙을 어긴 낱장(스팸, 혐오, 타인의 개인정보 등)은 운영자가 가리거나 지울 수 있습니다. 여러 사람이 신고한 낱장은 운영자가 확인할 때까지 먼저 가려집니다.</li>
</ul>

<h2>5. 당신이 할 수 있는 것</h2>
<ul>
<li>서점에 내놓은 낱장은 앱에서 직접 내릴 수 있습니다.</li>
<li>보낸 엽서는 엽서를 만든 브라우저의 엽서 쓰기 화면에서 직접 지울 수 있습니다. 그 브라우저를 더 쓸 수 없다면 링크와 함께 아래로 연락해 주세요.</li>
<li>앱 안의 글과 사진은 앱에서 지우거나 앱을 삭제하면 사라집니다.</li>
<li>그 밖에 본인 정보에 대해 묻고 싶은 것이 있으면 아래로 연락해 주세요.</li>
</ul>

<h2>6. 어린이</h2>
<p>이 서비스는 만 14세 미만을 대상으로 하지 않습니다.</p>

<h2>7. 바뀔 때</h2>
<p>이 문서가 바뀌면 이 페이지에 새 시행일과 함께 올립니다.</p>

<h2>8. 연락</h2>
<p>UNRULER MATTER (이지안)${MAIL ? ' · ' + mail() : ''}<br>
사이트 <a href="${SITE}">${SITE}</a></p>
`;

  const EN = () => `
<h1>NOTJANG BOOOKS Privacy Policy</h1>
<p class="meta">Effective 11 November 2026 · Operated by UNRULER MATTER</p>

<p>NOTJANG BOOOKS is an iPhone app for making a single sheet out of one photo and a few lines, and a website that shows the sheets people have put in the shop. This document explains what the app and the site keep, and where. In short: your words and photos stay on your iPhone, and only the sheet images you choose to put in the shop are public. If you make a postcard link on the site, the front and back images of that postcard are stored on a server.</p>

<h2>1. What stays in the app</h2>
<ul>
<li><strong>Photos and text.</strong> The photos you pick and the text you write are stored only on your iPhone. They are not sent to a server, not synced through iCloud, and not included in iPhone backups. Delete the app or change phones, and they go with it.</li>
<li><strong>Pen name.</strong> The pen name you type in Settings is stored on your iPhone and attached only to sheets you put in the shop.</li>
<li><strong>Photo access.</strong> Picking a photo uses the iOS photo picker, so the app never reads your whole library. The "add to Photos" permission is used only when you save a sheet to the Photos app.</li>
<li><strong>No accounts.</strong> There is no sign-up, login, email or phone number. No ads and no analytics.</li>
</ul>

<h2>2. What becomes public when you put a sheet in the shop</h2>
<p>When you "put a sheet in the shop", the following is stored in Apple's CloudKit public database and shown on this site to anyone:</p>
<ul>
<li>The sheet image (PNG): the finished composition of photo and text. The original photo and the raw text are not uploaded.</li>
<li>Pen name, paper, sheet and group numbers, the dates it was made and put out, image size, app version and language.</li>
<li>An iCloud user record ID attached by Apple. It is a random identifier, not your name or email, and it lets you take your own sheets back even from a new phone.</li>
</ul>
<p>Putting a sheet in the shop requires an iCloud account signed in on the iPhone. Anyone can view and download a sheet in the shop. Settings &gt; Sheets in the shop &gt; <strong>Take back from the shop</strong> deletes the record at once, and it disappears from the site.</p>

<h2>3. What the website handles</h2>
<ul>
<li><strong>Likes and reports.</strong> When you like or report a sheet, a random ID generated by your browser, the sheet ID, the report reason and the author's record ID are stored on a small server run on Cloudflare. The ID does not identify you; it only keeps one person from being counted twice.</li>
<li><strong>Writing a sheet and making a font.</strong> When you write a sheet on the site or make a font from your handwriting, the photo you pick, the words you write and the photos of your writing are processed inside your browser only and are not sent to a server. The font and the writing are kept in that browser so you can use them again.</li>
<li><strong>Postcards.</strong> When you press "Make a link" on the postcard page, the front and back images of the postcard, the paper type and the time it was made are stored on a server run on Cloudflare. Anyone who has the link can see that postcard. To count how many can be made in a day, a value derived from your IP address and the date, which cannot be turned back into the address, is kept with it; the IP address itself is not stored. Nothing is sent to the server before you make a link.</li>
<li><strong>Kept in your browser.</strong> Your chosen language, your likes, the list of sheets you hid, and the list of postcards you sent with the keys that delete them live only in your browser (localStorage). There are no tracking cookies.</li>
<li><strong>Third-party servers.</strong> The site is hosted on GitHub Pages, sheet images on Apple iCloud, and fonts on Google Fonts. Opening a page lets those services keep access logs (such as your IP address) under their own policies.</li>
</ul>

<h2>4. Retention and deletion</h2>
<ul>
<li>A shop record stays until you take it back or the operator removes it.</li>
<li>A postcard stays until the sender deletes it or the operator removes it. A reported postcard may be hidden or deleted by the operator.</li>
<li>Likes are kept while the service runs; reports are kept for handling and to spot repeat problems.</li>
<li>Sheets that break the rules (spam, hate, other people's private information and so on) may be hidden or deleted by the operator. A sheet reported by several people is hidden first, until the operator has looked at it.</li>
</ul>

<h2>5. What you can do</h2>
<ul>
<li>Take back any sheet you put in the shop, from the app.</li>
<li>Delete a postcard you sent, from the postcard page in the browser that made it. If you can no longer use that browser, contact us below with the link.</li>
<li>Delete your text and photos inside the app, or delete the app.</li>
<li>For anything else about your information, write to the contact below.</li>
</ul>

<h2>6. Children</h2>
<p>This service is not directed at children under 14.</p>

<h2>7. Changes</h2>
<p>If this document changes, the new version is posted on this page with a new effective date.</p>

<h2>8. Contact</h2>
<p>UNRULER MATTER (Jian Lee)${MAIL ? ' · ' + mail() : ''}<br>
Site <a href="${SITE}">${SITE}</a></p>
`;

  const doc = document.getElementById('doc');
  function render() {
    doc.innerHTML = NotjangLang.get() === 'KR' ? KR() : EN();
    document.title = NotjangLang.get() === 'KR' ? '낱장북스 · 개인정보 처리방침' : 'NOTJANG BOOOKS · Privacy Policy';
  }
  NotjangLang.mount(document.getElementById('lang'), render);
  render();
})();
