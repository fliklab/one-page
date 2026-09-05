# 개발 계획

## 현재 구현

- 단일 책 JSON을 원본으로 하는 읽기·문서 편집·재료 그래프
- 브라우저 로컬 저장과 JSON 이동
- Edit → 적용하기 → unified diff 확인·복사·patch 저장
- `git apply --check`와 `git apply`로 수동 반영

## 다음 단계: GitHub에 직접 적용

아래는 설계 방향이며 현재 동작하는 기능이 아닙니다.

1. 사용자가 연결할 저장소와 브랜치를 명시적으로 선택합니다.
2. GitHub App 또는 서버 측 OAuth로 필요한 저장소에만 권한을 받습니다. 토큰을 클라이언트 번들이나 localStorage에 저장하지 않습니다.
3. 저장소의 `content/book.json`과 기준 commit/blob SHA를 읽습니다.
4. 현재 파일과 변경 사항을 다시 비교하고, 원본 SHA가 바뀌었으면 충돌을 보여줍니다.
5. 사용자가 확인한 변경을 별도 브랜치에 커밋하고 pull request를 만드는 흐름을 우선 지원합니다.
6. 권한 만료, 충돌, 취소, 네트워크 오류와 재시도를 처리합니다.

현재 `app/book/patch.ts`의 `createBookPatch(current, base)`는 비교 기준을 인자로 받을 수 있습니다. GitHub 연동은 이 순수 함수를 재사용하고, 저장소 인증·파일 읽기·커밋 작업을 별도 adapter로 추가할 수 있습니다. 현재 패널은 GitHub에 연결하거나 원격 파일을 쓰지 않습니다.
