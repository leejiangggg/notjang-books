// 서점 연결 설정. 이 파일을 config.js로 복사하고 토큰을 넣는다. config.js는 git에 올리지 않는다.
window.NOTJANG_CONFIG = {
  container: 'iCloud.com.unrulermatter.PoemBook',
  environment: 'production', // 앱스토어 출시 뒤에는 'production'
  cloudKitToken: '8b17e5b3e81ca12ac6144b5bb0b4c53ed0e54cad0e83f9c60854a76bcc9fb9a9',           // CloudKit Console > Tokens & Keys > API Tokens 의 값
  likesURL: 'https://notjang-likes.lhjgom.workers.dev',               // likes-worker/setup.sh 가 넣어 준다. 비우면 이 브라우저에만 남는다.
  contactEmail: 'unrulermatter@gmail.com'            // 소개 페이지 맨 아래 '신고와 문의는' 뒤에 보일 메일. 비우면 줄이 안 보인다.
};
