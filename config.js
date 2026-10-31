// 서점 연결 설정. 이 파일을 config.js로 복사하고 토큰을 넣는다. config.js는 git에 올리지 않는다.
window.NOTJANG_CONFIG = {
  container: 'iCloud.com.unrulermatter.PoemBook',
  environment: 'development', // 앱스토어 출시 뒤에는 'production'
  cloudKitToken: '350e5dc7b4efa86d29ef85085a28cfa11badbd3b0054023fb0767e8d162e3dc1'           // CloudKit Console > Tokens & Keys > API Tokens 의 값
};
