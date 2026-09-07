# KANT BIBLE 배포 가이드

이 프로젝트는 세 서비스를 각각 다음 역할로 사용합니다.

1. **GitHub**: 사이트 원본 파일 저장
2. **Vercel**: GitHub 저장소를 연결해 실제 웹사이트 배포
3. **Supabase**: 성경책/강의안 데이터베이스

## 1. GitHub

GitHub에서 새 저장소를 하나 만드세요.

추천 저장소 이름:
- `kant-bible`
- `kant-theology`
- `kant-scripture`

그 다음 이 ZIP의 압축을 풀고 파일 전체를 저장소 최상위에 올립니다.

## 2. Vercel

Vercel에서 GitHub로 로그인한 뒤:
- Add New → Project
- 위 GitHub 저장소 선택
- Framework Preset: Other
- Root Directory: `./`
- Deploy

정적 HTML이므로 별도 빌드 명령이 필요 없습니다.
배포 뒤 `https://프로젝트이름.vercel.app` 주소가 생깁니다.
이후 GitHub의 기본 브랜치에 변경사항을 올리면 Vercel이 자동 재배포합니다.

## 3. Supabase

Supabase에서 새 프로젝트를 만든 뒤:
1. SQL Editor에서 `supabase-schema.sql` 전체 실행
2. Project Settings → API에서 Project URL과 Publishable key 확인
3. `assets/supabase-config.js`에 아래처럼 입력

```js
window.KANT_SUPABASE = {
  url: "https://xxxxx.supabase.co",
  publishableKey: "sb_publishable_xxxxx"
};
```

4. 이 파일을 GitHub에 다시 올리면 Vercel이 자동 재배포합니다.

## 보안

이 사이트는 브라우저용 publishable/anon key만 사용합니다.
`service_role` 키는 절대로 HTML, JavaScript, GitHub 저장소에 넣지 마세요.
공개 사용자의 읽기 권한은 `supabase-schema.sql`의 RLS 정책으로 제한합니다.

## 강의안 추가

Supabase의 Table Editor → `lectures`에서 행을 추가합니다.

- `book_slug`: 예) `luke`, `romans`, `isaiah`
- `title`: 강의 제목
- `summary`: 짧은 설명
- `content_html`: 실제 HTML 강의 내용
- `is_published`: 공개하려면 `true`

등록 후 해당 성경책 페이지에 자동으로 나타납니다.
