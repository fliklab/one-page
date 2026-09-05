"use client";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import SourceGraph from "./source-graph";
import {
  connectedSources,
  readSources,
  sampleSources,
  sourceEdges,
  sourceStorageKey,
  sourceUrl,
  typeNames,
  validateSources,
  type SourceItem,
  type SourceType,
} from "./model";
const blank: SourceItem = {
  id: "",
  type: "note",
  title: "",
  body: "",
  attribution: "",
  locator: "",
  url: "",
  tags: [],
  related: [],
  x: 500,
  y: 300,
};
function Mark({ type }: { type: SourceType }) {
  return (
    <span aria-hidden="true" className={`source-mark ${type}`}>
      {type === "note" ? "✎" : type === "quote" ? "”" : "↗"}
    </span>
  );
}
export default function SourcesStudio() {
  const [items, setItems] = useState<SourceItem[]>(sampleSources);
  const [view, setView] = useState<"list" | "graph">("graph");
  const [type, setType] = useState<"all" | SourceType>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("이 브라우저에 저장됩니다");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("느리게 읽는 작은 세계");
  const [theme, setTheme] = useState("cream");
  const [accent, setAccent] = useState("#b7472d");
  const [editing, setEditing] = useState<SourceItem | null>(null);
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const lastSaved = useRef(JSON.stringify(sampleSources));
  const returnFocus = useRef<HTMLElement | null>(null);
  const detail = useRef<HTMLElement>(null);
  const current = items.find((s) => s.id === selected);
  const related = current ? connectedSources(items, current.id) : [];
  const counts = useMemo(
    () => ({
      all: items.length,
      note: items.filter((s) => s.type === "note").length,
      link: items.filter((s) => s.type === "link").length,
      quote: items.filter((s) => s.type === "quote").length,
    }),
    [items],
  );
  const filtered = useMemo(
    () =>
      items.filter(
        (s) =>
          (type === "all" || s.type === type) &&
          [s.title, s.body, s.attribution, s.locator, ...s.tags]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [items, type, query],
  );
  const edges = useMemo(() => sourceEdges(items), [items]);
  useEffect(() => {
    try {
      const loaded = readSources();
      lastSaved.current = JSON.stringify(loaded);
      setItems(loaded);
      const saved = JSON.parse(
        localStorage.getItem("onepage-book-v1") || "null",
      );
      if (saved?.book?.title)
        setTitle(String(saved.book.title).replace(/\n/g, " "));
      if (["cream", "white", "night"].includes(saved?.settings?.theme))
        setTheme(saved.settings.theme);
      if (/^#[0-9a-f]{6}$/i.test(saved?.settings?.accent || ""))
        setAccent(saved.settings.accent);
    } catch {
      setStatus("저장된 재료를 읽지 못했습니다");
      setNotice("저장된 재료 형식을 확인해 주세요. 예시 자료를 표시합니다.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const value = JSON.stringify(items);
    if (value === lastSaved.current) return;
    try {
      localStorage.setItem(sourceStorageKey, value);
      lastSaved.current = value;
      setStatus("이 브라우저에 저장됨");
    } catch {
      setStatus("저장 공간 부족 · 변경 사항이 저장되지 않았습니다");
    }
  }, [items, ready]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    setPendingDelete(false);
  }, [selected]);
  useEffect(() => {
    if (editing && !dialog.current?.open) dialog.current?.showModal();
  }, [editing]);
  function choose(id: string) {
    setSelected(id);
    if (!filtered.some((s) => s.id === id)) {
      setQuery("");
      setType("all");
    }
    if (window.matchMedia("(max-width: 1000px)").matches)
      requestAnimationFrame(() =>
        detail.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        }),
      );
  }
  function openEditor(item?: SourceItem) {
    returnFocus.current = document.activeElement as HTMLElement;
    setFormError("");
    setEditing(
      item
        ? {
            ...item,
            related: connectedSources(items, item.id).map((s) => s.id),
          }
        : {
            ...blank,
            id: crypto.randomUUID(),
            related: current ? [current.id] : [],
            x: 200 + Math.random() * 600,
            y: 100 + Math.random() * 400,
          },
    );
  }
  function closeEditor() {
    dialog.current?.close();
    setEditing(null);
    returnFocus.current?.focus();
  }
  function save() {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) {
      setFormError("제목과 내용을 입력해 주세요.");
      return;
    }
    if (editing.type === "link" && !sourceUrl(editing.url)) {
      setFormError(
        "참고 링크에는 올바른 http 또는 https 주소를 입력해 주세요.",
      );
      return;
    }
    if (editing.url && !sourceUrl(editing.url)) {
      setFormError("출처 URL을 확인해 주세요.");
      return;
    }
    if (editing.type === "quote" && !editing.attribution.trim()) {
      setFormError("직접 인용의 저자 또는 원문 출처를 입력해 주세요.");
      return;
    }
    if (items.length >= 500 && !items.some((s) => s.id === editing.id)) {
      setFormError("재료는 최대 500개까지 추가할 수 있습니다.");
      return;
    }
    const saved = {
      ...editing,
      title: editing.title.trim(),
      body: editing.body.trim(),
      url: sourceUrl(editing.url),
      tags: [...new Set(editing.tags.map((t) => t.trim()).filter(Boolean))],
    };
    // Store each relationship once. Remove previous inbound links when editing.
    setItems((prev) => [
      ...prev
        .filter((s) => s.id !== saved.id)
        .map((s) => ({
          ...s,
          related: s.related.filter((id) => id !== saved.id),
        })),
      saved,
    ]);
    setSelected(saved.id);
    closeEditor();
    setNotice("재료와 연결 관계를 저장했습니다.");
  }
  function remove() {
    if (!current) return;
    const id = current.id;
    setItems((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s) => ({ ...s, related: s.related.filter((r) => r !== id) })),
    );
    setSelected(null);
    setPendingDelete(false);
    setNotice("재료를 삭제했습니다.");
  }
  function exportSources() {
    const data = JSON.stringify({ version: 1, sources: items }, null, 2);
    const a = document.createElement("a");
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    a.href = url;
    a.download = "book-sources.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importSources(file?: File) {
    if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024)
        throw new Error("4MB 이하의 재료 JSON을 선택해 주세요.");
      const data = JSON.parse(await file.text());
      if (data.version !== 1)
        throw new Error("한 페이지에서 내보낸 JSON을 선택해 주세요.");
      const incoming = validateSources(data.sources);
      const incomingIds = new Set(incoming.map((s) => s.id));
      const merged = validateSources([
        ...items.filter((s) => !incomingIds.has(s.id)),
        ...incoming,
      ]);
      setItems(merged);
      setNotice(`${incoming.length}개의 재료를 불러왔습니다.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "파일을 읽지 못했습니다.",
      );
    }
  }
  return (
    <div
      className="book-app sources-app"
      data-theme={theme}
      style={{ "--book-accent": accent } as CSSProperties}
    >
      <header className="book-topbar">
        <Link href="/book" className="book-brand">
          <svg
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" />
          </svg>
          <span>
            한 페이지<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="book-top-title">{title}</div>
        <nav className="source-nav" aria-label="책 화면">
          <Link href="/book">책 읽기</Link>
          <Link href="/sources" aria-current="page">
            책의 재료
          </Link>
        </nav>
      </header>
      <input
        ref={importRef}
        hidden
        type="file"
        accept=".json"
        onChange={(e) => {
          void importSources(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <main className="sources-main">
        <div className="sources-heading">
          <div>
            <h1>책의 재료</h1>
            <p>흩어져 있던 생각이 연결되어, 한 권의 책이 되기까지.</p>
          </div>
          <button className="source-primary" onClick={() => openEditor()}>
            ＋ 재료 추가
          </button>
        </div>
        <div className="sources-toolbar">
          <div className="source-filters" aria-label="재료 유형">
            {(["all", "note", "link", "quote"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={type === t}
                onClick={() => setType(t)}
              >
                {t === "all" ? "전체" : typeNames[t]}
                <span>{counts[t]}</span>
              </button>
            ))}
          </div>
          <div className="sources-view-controls">
            <label className="source-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="재료 검색"
                placeholder="재료 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="검색 지우기" onClick={() => setQuery("")}>
                  ×
                </button>
              )}
            </label>
            <div className="source-view-switch" aria-label="보기 방식">
              <button
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M6 5h12M6 10h12M6 15h12M2 5h1M2 10h1M2 15h1" />
                </svg>
                목록
              </button>
              <button
                aria-pressed={view === "graph"}
                onClick={() => setView("graph")}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="m5 6 9 2-4 7-5-9" />
                  <circle cx="5" cy="5" r="2" />
                  <circle cx="15" cy="8" r="2" />
                  <circle cx="10" cy="16" r="2" />
                </svg>
                그래프
              </button>
            </div>
          </div>
        </div>
        <div className={`sources-workspace ${current ? "has-selection" : ""}`}>
          <section
            className="sources-results"
            aria-label={view === "graph" ? "연결 그래프" : "재료 목록"}
          >
            <div className="sources-result-heading">
              <span>{view === "graph" ? "생각의 연결" : "모아 둔 재료"}</span>
              <span>
                {filtered.length}개의 재료 · {sourceEdges(filtered).length}개의
                연결
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className="sources-empty">
                <span>아직 연결되지 않은 페이지</span>
                <h2>
                  {items.length
                    ? "일치하는 재료가 없습니다"
                    : "첫 번째 재료를 모아 보세요"}
                </h2>
                <p>
                  {items.length
                    ? "검색어나 유형 필터를 바꿔 보세요."
                    : "노트, 참고 링크, 마음에 남은 문장부터 시작하세요."}
                </p>
                <button
                  className="book-mode-button"
                  onClick={() => {
                    if (items.length) {
                      setQuery("");
                      setType("all");
                    } else openEditor();
                  }}
                >
                  {items.length ? "필터 초기화" : "재료 추가"}
                </button>
              </div>
            ) : view === "graph" ? (
              <SourceGraph
                items={filtered}
                selected={
                  filtered.some((s) => s.id === selected) ? selected : null
                }
                onSelect={choose}
                onMove={(id, x, y) =>
                  setItems((prev) =>
                    prev.map((s) => (s.id === id ? { ...s, x, y } : s)),
                  )
                }
              />
            ) : (
              <div className="source-list">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    className={`source-row ${selected === s.id ? "selected" : ""}`}
                    aria-pressed={selected === s.id}
                    onClick={() => choose(s.id)}
                  >
                    <Mark type={s.type} />
                    <span className="source-row-content">
                      <span className="source-row-meta">
                        {typeNames[s.type]}
                        <span>
                          {s.locator || s.attribution || "출처 미지정"}
                        </span>
                      </span>
                      <strong>{s.title}</strong>
                      <span
                        className={`source-row-excerpt ${s.type === "quote" ? "quotation" : ""}`}
                      >
                        {s.type === "quote" ? "“" : ""}
                        {s.body}
                        {s.type === "quote" ? "”" : ""}
                      </span>
                      <span className="source-tags">
                        {s.tags.map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </span>
                    </span>
                    <span className="source-row-connections">
                      {connectedSources(items, s.id).length}
                      <span>연결</span>
                    </span>
                    <span className="source-row-arrow">↗</span>
                  </button>
                ))}
              </div>
            )}
          </section>
          <aside
            ref={detail}
            className="source-detail"
            aria-label="선택한 재료"
            tabIndex={-1}
          >
            {current ? (
              <>
                <div className="source-detail-top">
                  <span>
                    <Mark type={current.type} />
                    {typeNames[current.type]}
                  </span>
                  <button
                    aria-label="재료 상세 닫기"
                    onClick={() => setSelected(null)}
                  >
                    ×
                  </button>
                </div>
                <h2>{current.title}</h2>
                {current.type === "quote" ? (
                  <blockquote>{current.body}</blockquote>
                ) : (
                  <p className="source-detail-body">{current.body}</p>
                )}
                <dl>
                  <dt>
                    {current.type === "quote" ? "원문 출처" : "작성자 / 출처"}
                  </dt>
                  <dd>{current.attribution || "등록된 출처가 없습니다"}</dd>
                  {current.locator && (
                    <>
                      <dt>위치 / 페이지</dt>
                      <dd>{current.locator}</dd>
                    </>
                  )}
                  {current.url && (
                    <>
                      <dt>참고 링크</dt>
                      <dd>
                        <a
                          href={sourceUrl(current.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {new URL(current.url).hostname} ↗
                        </a>
                      </dd>
                    </>
                  )}
                </dl>
                <div className="source-tags">
                  {current.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setQuery(t);
                        setType("all");
                      }}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
                <div className="source-connections">
                  <h3>
                    연결된 재료 <span>{related.length}</span>
                  </h3>
                  {related.length ? (
                    related.map((s) => (
                      <button key={s.id} onClick={() => choose(s.id)}>
                        <Mark type={s.type} />
                        <span>{s.title}</span>
                        <span>↗</span>
                      </button>
                    ))
                  ) : (
                    <p>
                      연결된 재료가 없습니다. 수정에서 연결을 추가할 수
                      있습니다.
                    </p>
                  )}
                </div>
                <div className="source-detail-actions">
                  <button
                    className="book-mode-button"
                    onClick={() => openEditor(current)}
                  >
                    재료 수정
                  </button>
                  <button
                    className="source-delete"
                    onClick={() => setPendingDelete(true)}
                  >
                    삭제
                  </button>
                </div>
                {pendingDelete && (
                  <div className="source-delete-confirm">
                    <p>이 재료와 연결을 삭제할까요?</p>
                    <button onClick={remove}>삭제하기</button>
                    <button onClick={() => setPendingDelete(false)}>
                      취소
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="source-detail-placeholder">
                <svg width="94" height="94" viewBox="0 0 100 100" fill="none">
                  <path
                    d="m22 25 56 12-30 42-26-54"
                    stroke="currentColor"
                    opacity=".3"
                  />
                  <circle cx="22" cy="25" r="8" fill="#ac583c" opacity=".65" />
                  <circle cx="78" cy="37" r="6" fill="#53766e" opacity=".65" />
                  <circle cx="48" cy="79" r="9" fill="#8a759c" opacity=".65" />
                </svg>
                <h2>
                  하나의 재료에서
                  <br />
                  다음 생각으로.
                </h2>
                <p>
                  재료를 선택하면 내용과 출처,
                  <br />
                  연결된 생각을 함께 볼 수 있어요.
                </p>
                <div>
                  <strong>{items.length}</strong>
                  <span>모아 둔 재료</span>
                  <strong>{edges.length}</strong>
                  <span>생각의 연결</span>
                </div>
              </div>
            )}
          </aside>
        </div>
        <footer className="sources-footer">
          <span>
            <i />
            {status}
          </span>
          <span>예시 자료의 인용은 예시 책 원고에서 가져왔습니다.</span>
          <div>
            <button onClick={() => importRef.current?.click()}>
              재료 불러오기 ↑
            </button>
            <button onClick={exportSources}>재료 내보내기 ↓</button>
          </div>
        </footer>
      </main>
      <dialog
        ref={dialog}
        className="source-dialog"
        onCancel={(e) => {
          e.preventDefault();
          closeEditor();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) closeEditor();
        }}
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <header>
              <h2>
                {items.some((s) => s.id === editing.id)
                  ? "재료 수정"
                  : "새로운 재료"}
              </h2>
              <button
                type="button"
                aria-label="재료 편집 닫기"
                onClick={closeEditor}
              >
                ×
              </button>
            </header>
            <div className="source-form-fields">
              <label>
                유형
                <select
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      type: e.target.value as SourceType,
                    })
                  }
                >
                  {Object.entries(typeNames).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                제목
                <input
                  autoFocus
                  required
                  maxLength={150}
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </label>
              <label>
                {editing.type === "quote" ? "직접 인용 원문" : "내용 / 메모"}
                <textarea
                  required
                  rows={5}
                  maxLength={20000}
                  value={editing.body}
                  onChange={(e) =>
                    setEditing({ ...editing, body: e.target.value })
                  }
                />
              </label>
              <div className="source-form-pair">
                <label>
                  {editing.type === "quote"
                    ? "원문 출처 · 저자 (필수)"
                    : "작성자 / 출처"}
                  <input
                    required={editing.type === "quote"}
                    value={editing.attribution}
                    onChange={(e) =>
                      setEditing({ ...editing, attribution: e.target.value })
                    }
                  />
                </label>
                <label>
                  위치 / 페이지
                  <input
                    placeholder="예: 2장, p. 42"
                    value={editing.locator}
                    onChange={(e) =>
                      setEditing({ ...editing, locator: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                {editing.type === "link" ? "참고 URL (필수)" : "출처 URL"}
                <input
                  type="url"
                  required={editing.type === "link"}
                  placeholder="https://"
                  value={editing.url}
                  onChange={(e) =>
                    setEditing({ ...editing, url: e.target.value })
                  }
                />
              </label>
              <label>
                태그 <small>쉼표로 구분</small>
                <input
                  value={editing.tags.join(",")}
                  onChange={(e) =>
                    setEditing({ ...editing, tags: e.target.value.split(",") })
                  }
                />
              </label>
              <fieldset>
                <legend>연결할 재료</legend>
                <p>이 생각의 출처이거나, 함께 읽을 재료를 선택하세요.</p>
                <div className="source-related-options">
                  {items
                    .filter((s) => s.id !== editing.id)
                    .map((s) => (
                      <label key={s.id}>
                        <input
                          type="checkbox"
                          checked={editing.related.includes(s.id)}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              related: e.target.checked
                                ? [...editing.related, s.id]
                                : editing.related.filter((id) => id !== s.id),
                            })
                          }
                        />
                        <Mark type={s.type} />
                        {s.title}
                      </label>
                    ))}
                  {items.length === 0 && (
                    <p>다음 재료를 추가할 때 연결할 수 있습니다.</p>
                  )}
                </div>
              </fieldset>
              {formError && (
                <p className="source-form-error" role="alert">
                  {formError}
                </p>
              )}
            </div>
            <footer>
              <button
                type="button"
                className="book-text-button"
                onClick={closeEditor}
              >
                취소
              </button>
              <button type="submit" className="source-primary">
                저장하기
              </button>
            </footer>
          </form>
        )}
      </dialog>
      <div className="book-toast" role="status">
        {notice}
      </div>
    </div>
  );
}
