# 한 페이지 · One Page

**하나의 웹사이트가 한 권의 책이 되는 오픈소스 템플릿.** 👉 [DEMO](https://one-page-book-studio.jsh852.chatgpt.site/)

표지와 Markdown/MDX 원고를 넣고, 읽는 방식까지 직접 디자인하세요. 한 페이지 또는 양쪽 페이지로 읽고, Fumadocs 문서 화면에서 편집하고, 원고의 재료를 연결 그래프로 탐색합니다.

## 내 책으로 시작하기

1. GitHub의 **Use this template → Create a new repository**를 누릅니다.
2. 생성한 저장소를 내려받고 Node.js 22 이상에서 실행합니다.

```sh
npm ci
npm run dev
```

3. [로컬 책 화면](http://localhost:3000)을 엽니다.
4. `content/book.json`의 책 제목, 저자, 원고, 스타일, 재료를 자신의 주제로 바꿉니다. 웹의 **Edit**에서도 수정할 수 있습니다.

별도 API 키나 데이터베이스 없이 실행됩니다.

## 무엇을 만들 수 있나요?

- MD/MDX로 쓰는 에세이, 학습 자료, 연구 노트, 개인 매뉴얼
- 앞·뒷표지, 날개, 출간정보, 책등을 갖춘 한 권의 책
- 판형·서체·크기·줄간격·여백·테마를 바꾸는 독서 화면
- 한 페이지 / 양쪽 페이지 / 겉장 펼침
- 목록과 연결 그래프로 탐색하는 노트, 참고 링크, 직접 인용
- Git 저장소에 적용할 수 있는 변경사항 `.patch`

## 화면

| 경로 | 역할 |
| --- | --- |
| `/`, `/book/` | 책 읽기와 Edit 문서 편집 |
| `/sources/` | 노트·참고 링크·인용의 목록, 검색, 관계 그래프 |

`Edit`에서는 책 기본 정보, 겉장, 원고를 수정합니다. 상단 **적용하기**를 누르면 원고가 현재 브라우저의 책에 반영되고 diff 패널이 열립니다. 패널의 **diff 복사하기** 또는 **.patch 파일 저장**으로 변경을 가져갈 수 있습니다.

## 편집한 책을 저장소에 반영하기

화면에서 수정한 내용은 브라우저에 저장됩니다. 방문자가 수정한 책이 자동으로 다른 독자에게 공개되지는 않습니다. 공유할 책을 바꾸려면 변경을 저장소에 반영하고 다시 빌드·배포하세요.

1. Edit에서 **적용하기 → .patch 파일 저장**을 누릅니다.
2. 이 사이트를 빌드한 버전의 저장소에서 실행합니다.

```sh
git apply --check /path/to/book-changes.patch
git apply /path/to/book-changes.patch
npm test
npm run build
git add content/book.json
git commit -m "Update my book"
```

patch의 대상은 **`content/book.json` 한 파일**입니다. 원고, 책 정보, 겉장 이미지, 설정, 재료를 함께 담습니다. diff는 마지막 버튼 클릭 시점이 아니라 **현재 사이트 빌드에 포함된 원본**을 기준으로 누적 생성됩니다. 같은 patch를 두 번 적용하거나 원본 파일이 달라지면 `git apply --check`가 실패할 수 있습니다. 이 경우 변경을 검토하고 최신 원본에서 다시 편집하세요.

GitHub 저장소에 patch를 직접 적용하는 기능은 아직 구현하지 않았습니다. 현재는 복사·파일 저장과 수동 적용을 지원합니다. [개발 계획](docs/ROADMAP.md)을 참고하세요.

## 책 파일 구조

```text
content/book.json          # 배포할 책의 단일 원본
app/book/studio.tsx        # 읽기 / Edit / 스타일·페이지 패널
app/book/content.tsx       # MD/MDX 파서와 콘텐츠 컴포넌트
app/book/structure.ts      # 책 구성과 양쪽 페이지 계산
app/book/parts.tsx         # 표지·날개·출간정보·책등
app/book/patch.ts          # 원본과 비교한 unified diff 생성
app/book/diff-panel.tsx    # diff 확인·복사·파일 저장
app/sources/              # 재료 목록과 인터랙티브 그래프
public/                  # 책에서 참조할 이미지
```

`content/book.json`의 주요 키:

- `version`: 현재 `1`
- `book`: 제목·저자·출판사·원고·겉장 정보
- `settings`: 판형·폰트·줄간격·테마·보기 방식
- `sources`: 노트·링크·인용과 연결, 그래프 위치

`book.source`는 Markdown 또는 MDX 문자열이며 `book.format`을 `md` 또는 `mdx`로 설정합니다. `sources`를 빈 배열로 두면 빈 재료 목록에서 시작합니다. 샘플 책과 저자는 기능 설명을 위한 가상 예시이며, 예시 인용문은 이 샘플 원고의 문장입니다.

## MDX 컴포넌트

`#`는 챕터, `##`는 소챕터입니다. 일반 본문, 강조, 인용, 목록, 코드, 표, 링크와 이미지를 사용할 수 있습니다. MDX에서는 다음 컴포넌트를 import 없이 사용할 수 있습니다.

```mdx
<Chapter>첫 번째 챕터</Chapter>

<Section>작은 이야기</Section>

본문을 작성합니다.

<Callout title="기억할 점">
여기에 참고 내용을 작성합니다.
</Callout>

<Figure
  src="/my-photo.jpg"
  alt="사진 설명"
  caption="그림 1. 사진의 캡션"
/>
```

이미지는 `public/` 파일의 루트 경로나 접근 가능한 웹 URL을 사용합니다. 업로드한 MDX는 콘텐츠로 파싱하며 JavaScript 표현식, 임의 HTML, 외부 import를 실행하지 않습니다. 컴포넌트 속성은 문자열로 작성합니다.

## 저장과 이미지

- 책과 재료는 현재 브라우저의 localStorage에 저장됩니다. 서버 동기화는 없습니다.
- **책 내보내기**로 전체 JSON을 보관하고, 다른 브라우저의 **불러오기**로 복원할 수 있습니다.
- 겉장 이미지는 개별 2MB, MD/MDX 원고는 4MB, 책 JSON은 32MB까지 불러올 수 있습니다.
- 이미지가 많아 브라우저 저장 한도를 넘으면 저장 오류가 표시됩니다. JSON을 내보내 보관하세요.
- 업로드한 표지 이미지는 data URL로 JSON과 patch에 포함됩니다. 공개 저장소에 반영할 때는 공개할 수 있는 이미지·원고를 사용하세요.
- 이전 책 JSON은 새 겉장 필드를 비워 둔 상태로 호환됩니다.
- 새 버전을 배포해도 같은 브라우저의 기존 편집본이 우선 표시됩니다. 새 `content/book.json`을 불러오거나 새 브라우저 프로필에서 배포 원본을 확인할 수 있습니다.

## 검사와 배포

```sh
npm test
npm run typecheck
npm run build
```

빌드 결과는 `out/`에 생성되는 정적 사이트입니다. Next.js를 지원하는 호스팅 또는 정적 호스팅의 도메인 루트에 배포할 수 있습니다. 기본 구성은 `/book/`, `/sources/` 같은 루트 경로를 사용하며 서브디렉터리 배포는 별도 경로 설정이 필요합니다.

GitHub Actions는 push와 pull request에서 테스트와 프로덕션 빌드를 실행합니다. 별도 인증 토큰은 필요하지 않습니다.

## 기술과 라이선스

Next.js, React, Fumadocs, unified/remark, jsdiff로 만들었습니다. 그래프는 SVG 기반이며 별도 그래프 서비스가 필요하지 않습니다. 서체는 외부 CDN에서 로드하며 오프라인 사용이 필요하면 직접 호스팅하도록 바꿀 수 있습니다.

코드와 샘플 콘텐츠는 [MIT License](LICENSE)로 배포합니다. 사용한 라이브러리와 서체에는 각각의 라이선스가 적용됩니다. 기여는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

---

**English:** One Page is an MIT-licensed, single-book website template. Use this template, run `npm ci && npm run dev`, and replace `content/book.json` with your own book. It includes a paginated reader, facing-page and jacket views, a Fumadocs editor, a source graph, and downloadable Git-compatible patches. Browser edits are local; commit changes to the snapshot and redeploy to publish them. Direct GitHub patch application is planned, not implemented.
