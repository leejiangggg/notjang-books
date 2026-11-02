// 서점 연결 설정. 이 파일을 config.js로 복사하고 토큰을 넣는다. config.js는 git에 올리지 않는다.
window.NOTJANG_CONFIG = {
  container: 'iCloud.com.unrulermatter.PoemBook',
  environment: 'development', // 앱스토어 출시 뒤에는 'production'
  cloudKitToken: '350e5dc7b4efa86d29ef85085a28cfa11badbd3b0054023fb0767e8d162e3dc1',           // CloudKit Console > Tokens & Keys > API Tokens 의 값
  likesURL: 'https://notjang-likes.lhjgom.workers.dev',               // likes-worker/setup.sh 가 넣어 준다. 비우면 이 브라우저에만 남는다.
  contactEmail: 'unrulermatter@gmail.com'            // 소개 페이지 맨 아래 '신고와 문의는' 뒤에 보일 메일. 비우면 줄이 안 보인다.
};
