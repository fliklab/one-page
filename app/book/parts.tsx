import type { Book } from "./content";
import type { ImageField, LeafKind } from "./structure";
export function BookFace({
  book,
  kind,
}: {
  book: Book;
  kind: Exclude<LeafKind, "body">;
}) {
  const image =
    kind === "frontCover"
      ? book.cover
      : kind === "frontFlap"
        ? book.frontFlapImage
        : kind === "backFlap"
          ? book.backFlapImage
          : kind === "backCover"
            ? book.backCover
            : "";
  if (image)
    return (
      <img
        className="book-uploaded-cover"
        src={image}
        alt={`${book.title} ${kind === "frontCover" ? "앞표지" : kind === "backCover" ? "뒷표지" : kind === "frontFlap" ? "앞날개" : "뒷날개"}`}
      />
    );
  if (kind === "frontCover")
    return (
      <div className="book-cover">
        <div className="book-cover-top">
          <span>{book.publisher}</span>
          <span>{book.year}</span>
        </div>
        <div className="book-cover-title">
          <h1>{book.title}</h1>
          <p>{book.subtitle}</p>
        </div>
        <div className="book-cover-art" aria-hidden="true">
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
        <div className="book-cover-bottom">
          <span>{book.author} 지음</span>
          <span>
            한 권의 책,
            <br />
            하나의 작은 세계.
          </span>
        </div>
      </div>
    );
  if (kind === "publication")
    return (
      <div className="book-matter book-publication">
        <h2>{book.title}</h2>
        <dl>
          <dt>지은이</dt>
          <dd>{book.author}</dd>
          <dt>펴낸곳</dt>
          <dd>{book.publisher}</dd>
          <dt>발행 연도</dt>
          <dd>{book.year}</dd>
        </dl>
        <div className="book-matter-text">{book.publicationInfo}</div>
      </div>
    );
  const text =
    kind === "frontFlap"
      ? book.frontFlap
      : kind === "backFlap"
        ? book.backFlap
        : book.backCoverText;
  return (
    <div
      className={`book-matter ${kind === "backCover" ? "book-back-cover" : "book-flap"}`}
    >
      <h2>
        {kind === "frontFlap"
          ? book.author
          : kind === "backFlap"
            ? book.publisher
            : book.title}
      </h2>
      <div className="book-matter-text">{text}</div>
      <span className="book-matter-signature">
        {kind === "backCover" ? book.publisher : book.title.replace(/\n/g, " ")}
      </span>
    </div>
  );
}
export function JacketPreview({
  book,
  spineWidth,
}: {
  book: Book;
  spineWidth: number;
}) {
  return (
    <div
      className="book-jacket-scroll"
      tabIndex={0}
      aria-label="책 겉장 펼침. 좁은 화면에서는 가로로 스크롤할 수 있습니다."
    >
      <div
        className="book-jacket"
        style={{ gridTemplateColumns: `.45fr 1fr ${spineWidth}px 1fr .45fr` }}
      >
        {(
          ["backFlap", "backCover", "spine", "frontCover", "frontFlap"] as const
        ).map((kind) => (
          <section
            key={kind}
            className={`book-jacket-part ${kind === "spine" ? "book-jacket-spine" : ""}`}
            aria-label={
              kind === "spine"
                ? "책등"
                : kind === "frontCover"
                  ? "앞표지"
                  : kind === "backCover"
                    ? "뒷표지"
                    : kind === "frontFlap"
                      ? "앞날개"
                      : "뒷날개"
            }
          >
            {kind === "spine" ? (
              book.spineImage ? (
                <img src={book.spineImage} alt="책등" />
              ) : (
                <div>
                  <strong>
                    {book.spineText || book.title.replace(/\n/g, " ")}
                  </strong>
                  <span>{book.author}</span>
                  <small>{book.publisher}</small>
                </div>
              )
            ) : (
              <BookFace book={book} kind={kind} />
            )}
            <span className="book-jacket-label">
              {kind === "spine"
                ? "책등"
                : kind === "frontCover"
                  ? "앞표지"
                  : kind === "backCover"
                    ? "뒷표지"
                    : kind === "frontFlap"
                      ? "앞날개"
                      : "뒷날개"}
            </span>
          </section>
        ))}
      </div>
    </div>
  );
}
export function BookPartsEditor({
  book,
  onChange,
  onUpload,
  onPreview,
}: {
  book: Book;
  onChange: (key: keyof Book, value: string) => void;
  onUpload: (field: ImageField) => void;
  onPreview: () => void;
}) {
  return (
    <details className="book-metadata book-parts-editor">
      <summary>표지 · 날개 · 출간정보 · 책등</summary>
      <p>
        내용이나 이미지를 넣은 면만 독서 순서에 포함됩니다. 이미지를 올린 면은
        이미지로 표시됩니다.
      </p>
      <div className="book-parts-fields">
        {[
          {
            label: "앞표지",
            image: "cover",
            text: null,
            help: "책 제목과 기본 정보로 표지가 만들어집니다. 직접 만든 이미지를 올릴 수도 있어요.",
          },
          {
            label: "앞날개",
            image: "frontFlapImage",
            text: "frontFlap",
            help: "저자 소개, 책을 쓴 계기 등",
          },
          {
            label: "출간정보",
            image: null,
            text: "publicationInfo",
            help: "초판 발행일, 판·쇄, ISBN, 편집·디자인, 저작권 등. 책 기본 정보도 함께 표시됩니다.",
          },
          {
            label: "책등",
            image: "spineImage",
            text: "spineText",
            help: "겉장 펼침에서 확인합니다. 비워 두면 책 제목을 사용합니다.",
          },
          {
            label: "뒷날개",
            image: "backFlapImage",
            text: "backFlap",
            help: "출판사 소개, 시리즈, 관련 도서 등",
          },
          {
            label: "뒷표지",
            image: "backCover",
            text: "backCoverText",
            help: "책 소개, 추천 문구, 독자에게 전하는 말 등",
          },
        ].map((part) => (
          <section key={part.label}>
            <h3>{part.label}</h3>
            <p>{part.help}</p>
            {part.text && (
              <label>
                <span className="book-visually-hidden">{part.label} 내용</span>
                <textarea
                  rows={part.text === "spineText" ? 2 : 5}
                  maxLength={part.text === "spineText" ? 80 : 1800}
                  value={book[part.text as keyof Book]}
                  onChange={(e) =>
                    onChange(part.text as keyof Book, e.target.value)
                  }
                />
                <small>
                  {part.text === "spineText"
                    ? ""
                    : "긴 내용은 해당 면 안에서 스크롤하여 읽을 수 있습니다."}
                </small>
              </label>
            )}
            {part.image && (
              <div className="book-part-image-control">
                {book[part.image as ImageField] && (
                  <img
                    src={book[part.image as ImageField]}
                    alt={`${part.label} 미리보기`}
                  />
                )}
                <button
                  className="book-mode-button"
                  type="button"
                  onClick={() => onUpload(part.image as ImageField)}
                >
                  {book[part.image as ImageField]
                    ? "이미지 교체"
                    : "이미지 올리기"}
                </button>
                {book[part.image as ImageField] && (
                  <button
                    className="book-text-button"
                    onClick={() => onChange(part.image as ImageField, "")}
                  >
                    이미지 제거
                  </button>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      <button className="book-mode-button" onClick={onPreview}>
        겉장 펼쳐 보기 ↗
      </button>
    </details>
  );
}
