# 보안 / Security

**이 프로젝트에서 실행되는 코드:**
- Node 스크립트: 데이터 검사, 빌드, 화면 검사. 화면 검사는 로컬 헤드리스 Chrome을 써요.
- 결과물 HTML: 오프라인에서 열려요.

**외부와의 통신:** 결과물 페이지는 외부로 요청을 보내지 않아요. 출처 링크는 사람이 눌렀을 때만 열려요. 외부 npm 패키지도 쓰지 않아요.

**신고 방법:** 취약점을 찾으면 공개 이슈 대신 이렇게 알려 주세요.
1. GitHub의 **Security → Report a vulnerability**를 열어요.
2. 비공개로 신고해 주세요.

일주일 안에 답할게요. 확인된 문제는 고친 다음 CHANGELOG에 남겨요.

**지원하는 버전:** 최신 릴리스만 지원해요.

---

**English.**
- **What runs:** Node scripts (data gate, build, screenshot gate with a local headless Chrome) and the offline HTML pages they produce.
- **Network:** the pages make no network requests; source links open only when clicked. There are no npm dependencies.
- **Reporting:** report vulnerabilities privately through **Security → Report a vulnerability**, not in a public issue. Expect a reply within a week.
- **Supported versions:** only the latest release.
