# KANT BIBLE 관리자 기능

추가된 기능
- `admin.html` 관리자 페이지
- HTML / HTM 파일 업로드
- 성경 66권 중 원하는 책에 배치
- 제목 / 설명 입력
- 공개 / 비공개 전환
- 강의안 삭제
- 업로드 전 미리보기
- 공개 강의안은 sandbox iframe으로 안전하게 표시

## 필요한 설정

1. Supabase SQL Editor에서 `supabase-admin-upgrade.sql` 실행
2. 관리자 이메일 등록
3. `assets/supabase-config.js`에 Project URL + Publishable key 입력
4. `admin.html`에서 계정 만들기 또는 로그인
5. 관리자 페이지에서 HTML 업로드

## 보안
- service_role / secret key는 브라우저 코드에 절대로 넣지 않습니다.
- 관리자 여부는 Supabase RLS 정책으로 확인합니다.
- 업로드된 HTML은 공개 페이지에서 sandbox iframe으로 렌더링되어 스크립트 실행을 막습니다.
