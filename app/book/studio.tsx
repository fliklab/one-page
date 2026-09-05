"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  readSources,
  sourceStorageKey,
  validateSources,
} from "../sources/model";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import { initialBook, parseBook, renderBook, type Book } from "./content";
import {
  bookLeaves,
  normalizeBook,
  spreadPages,
  type ImageField,
} from "./structure";
import { BookFace, BookPartsEditor, JacketPreview } from "./parts";
import template from "../../content/book.json";
import { createBookPatch, createManuscriptDiff } from "./patch";
import DiffPanel from "./diff-panel";
import InlineEditor from "./inline-editor";
import KoPubStatus from "./kopub-status";

import { sizes, fonts, defaults, validSettings, printPresets, matchingPreset,
  ptToPx, pxToPt, mmToPx, pxToMm, displayNumber, type Settings } from "./typography";
const storageKey = "onepage-book-v1";
function Icon({
  name,
  size = 19,
}: {
  name:
    | "book"
    | "edit"
    | "arrowLeft"
    | "arrowRight"
    | "settings"
    | "close"
    | "copy"
    | "upload"
    | "download"
    | "check"
    | "list";
  size?: number;
}) {
  const paths: Record<string, ReactNode> = {
    book: (
      <>
        <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z" />
        <path d="M12 5v15" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z" />
      </>
    ),
    arrowLeft: <path d="m14 6-6 6 6 6" />,
    arrowRight: <path d="m10 6 6 6-6 6" />,
    settings: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <path d="M8 3v6M16 9v6M10 15v6" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M15 8V3H3v13h5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3" />
      </>
    ),
    check: <path d="m4 12 5 5L20 6" />,
    list: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="book-field">
      <span>
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export default function BookStudio() {
  const [book, setBook] = useState<Book>(initialBook);
  const [settings, setSettings] = useState<Settings>(defaults);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState<{ label: string; excerpt: string }[]>([]);
  const [headingPages, setHeadingPages] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [panel, setPanel] = useState(false);
  const [tab, setTab] = useState<"style" | "pages">("style");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState("이 브라우저에 자동 저장");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(initialBook.source);
  const [showSource, setShowSource] = useState(false);
  const [jump, setJump] = useState("");
  const [scale, setScale] = useState(0.72);
  const [turning, setTurning] = useState(false);
  const [jacket, setJacket] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [patch, setPatch] = useState("");
  const [manuscriptDiff, setManuscriptDiff] = useState("");
  const [measured, setMeasured] = useState(false);
  const imageTarget = useRef<ImageField>("cover");
  const columnsRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const parsed = useMemo(
    () => parseBook(book.source, book.format),
    [book.source, book.format],
  );
  const deferredDraft = useDeferredValue(draft);
  const draftParsed = useMemo(
    () => parseBook(deferredDraft, book.format),
    [deferredDraft, book.format],
  );
  const content = useMemo(() => renderBook(parsed.tree), [parsed]);
  const paper = sizes[settings.size as keyof typeof sizes];
  const width = paper.width - 2 * settings.margin;
  const height = paper.height - 2 * settings.margin - 40;
  const leaves = useMemo(() => bookLeaves(book, pages), [book, pages]);
  const total = leaves.length;
  const bodyStart = bookLeaves(book, [{ label: "", excerpt: "" }]).findIndex(
    (p) => p.kind === "body",
  );
  const visible = spreadPages(page, leaves, settings.layout === "spread");
  const firstVisible = visible[0] ?? 0;
  const lastVisible = visible.at(-1) ?? 0;
  const pageDisplay =
    visible.length > 1
      ? `${firstVisible + 1}–${lastVisible + 1}`
      : String(firstVisible + 1);
  const active = jacket ? "겉장 펼침" : leaves[firstVisible]?.label || "앞표지";
  const spreadWidth =
    settings.layout === "spread" &&
    leaves[firstVisible]?.kind !== "frontCover" &&
    leaves[firstVisible]?.kind !== "backCover"
      ? 2
      : 1;
  const uploadImage = (field: ImageField) => {
    imageTarget.current = field;
    coverRef.current?.click();
  };
  useEffect(() => {
    if (measured) setPage((p) => Math.max(0, Math.min(p, total - 1)));
  }, [total, measured]);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));
  const updateBook = (key: keyof Book, value: string) =>
    setBook((b) => ({ ...b, [key]: value }));
  const toast = useCallback((message: string) => setNotice(message), []);
  const closePanel = useCallback(() => {
    setPanel(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        const restored = normalizeBook(saved.book);
        if (!parseBook(restored.source, restored.format).error) {
          setBook(restored);
          setDraft(restored.source);
        }
        setSettings(validSettings(saved.settings));
        if (Number.isInteger(saved.page) && saved.page >= 0)
          setPage(saved.page);
      }
    } catch {
      setSaveState("저장한 내용을 불러오지 못했습니다");
    }
    setReady(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ book, settings, page }),
        );
        setSaveState("이 브라우저에 저장됨");
      } catch {
        setSaveState("저장 공간 부족 · 책 파일을 내보내 주세요");
      }
    }, 500);
    return () => clearTimeout(id);
  }, [book, settings, page, ready]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (panel) closeRef.current?.focus();
  }, [panel]);

  useEffect(() => {
    if (mode !== "read") return;
    const stage = stageRef.current;
    if (!stage) return;
    const resize = () =>
      setScale(
        Math.min(
          1,
          Math.max(
            0.12,
            (stage.clientWidth - 36) / (paper.width * spreadWidth),
          ),
          Math.max(0.3, (stage.clientHeight - 30) / paper.height),
        ),
      );
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [paper, mode, spreadWidth, jacket]);

  useEffect(() => {
    if (mode !== "read") return;
    const el = columnsRef.current;
    if (!el) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const count = Math.max(
        1,
        Math.round((el.scrollWidth + 48) / (width + 48)),
      );
      const origin = el.getBoundingClientRect().left;
      const headings: Record<string, number> = {};
      const headingList = Array.from(
        el.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6"),
      );
      headingList.forEach((h) => {
        const rect = h.getClientRects()[0];
        if (rect)
          headings[h.id] =
            Math.round((rect.left - origin) / (width + 48)) + bodyStart;
      });
      const texts: string[] = Array.from({ length: count }, () => "");
      // Ranges account for paragraphs that flow across multiple columns.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent || "";
        if (!text.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        Array.from(range.getClientRects()).forEach((rect) => {
          const i = Math.floor((rect.left - origin + 1) / (width + 48));
          if (i >= 0 && i < count && texts[i].length < 100)
            texts[i] += ` ${text.trim()}`;
        });
      }
      const nextPages = Array.from({ length: count }, (_, i) => {
        const previous = headingList
          .filter((h) => (headings[h.id] ?? bodyStart) <= i + bodyStart)
          .at(-1);
        return {
          label: previous?.textContent || "본문",
          excerpt: texts[i].trim().slice(0, 86),
        };
      });
      setPages(nextPages);
      setHeadingPages(headings);
      setMeasured(true);
    };
    const id = requestAnimationFrame(measure);
    document.fonts.ready.then(measure);
    document.fonts.addEventListener("loadingdone", measure);
    const images = Array.from(el.querySelectorAll("img"));
    images.forEach((img) => {
      img.addEventListener("load", measure);
      img.addEventListener("error", measure);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(id);
      document.fonts.removeEventListener("loadingdone", measure);
      images.forEach((img) => {
        img.removeEventListener("load", measure);
        img.removeEventListener("error", measure);
      });
    };
  }, [content, settings, width, height, mode, bodyStart]);

  const go = useCallback(
    (next: number) => {
      setJacket(false);
      const target = Math.max(0, Math.min(total - 1, next));
      if (target === page) return;
      if (timer.current) clearTimeout(timer.current);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setPage(target);
        return;
      }
      setTurning(true);
      timer.current = setTimeout(() => {
        setPage(target);
        setTurning(false);
      }, 130);
    },
    [page, total],
  );
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if (e.key === "Escape" && panel) {
        e.preventDefault();
        closePanel();
        return;
      }
      if (
        mode !== "read" ||
        jacket ||
        panel ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        (e.target instanceof HTMLElement &&
          e.target.closest("input,textarea,select,[contenteditable]"))
      )
        return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        go(lastVisible + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(firstVisible - 1);
      }
      if (e.key === "Home") {
        e.preventDefault();
        go(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        go(total - 1);
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [
    go,
    page,
    mode,
    panel,
    total,
    closePanel,
    firstVisible,
    lastVisible,
    jacket,
  ]);

  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > (/\.json$/i.test(file.name) ? 32 : 4) * 1024 * 1024) {
      toast("원고는 4MB, 책 JSON은 32MB 이하의 파일을 선택해 주세요.");
      return;
    }
    try {
      const text = await file.text();
      if (/\.json$/i.test(file.name)) {
        const data = JSON.parse(text);
        if (data.version !== 1)
          throw new Error("한 페이지에서 내보낸 책 JSON 파일을 선택해 주세요.");
        const restored = normalizeBook(data.book);
        const result = parseBook(restored.source, restored.format);
        if (result.error) throw new Error(result.error);
        const sources = validateSources(data.sources ?? []);
        localStorage.setItem(sourceStorageKey, JSON.stringify(sources));
        setBook(restored);
        setDraft(restored.source);
        setSettings(validSettings(data.settings));
      } else {
        if (!/\.mdx?$/i.test(file.name))
          throw new Error(".md, .mdx 또는 책 .json 파일을 선택해 주세요.");
        const format = /\.md$/i.test(file.name) ? "md" : "mdx";
        const result = parseBook(text, format);
        if (result.error) throw new Error(result.error);
        setBook((b) => ({ ...b, source: text, format }));
        setDraft(text);
      }
      setPage(0);
      toast(`${file.name} 파일을 불러왔습니다.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    }
  }
  async function importCover(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      ) ||
      file.size > 2 * 1024 * 1024
    ) {
      toast("2MB 이하의 PNG, JPG, WebP, GIF 이미지를 선택해 주세요.");
      return;
    }
    const field = imageTarget.current;
    const reader = new FileReader();
    reader.onload = () => {
      updateBook(field, String(reader.result));
      if (field === "cover") setPage(0);
      toast("책 이미지를 변경했습니다.");
    };
    reader.onerror = () => toast("표지 파일을 읽지 못했습니다.");
    reader.readAsDataURL(file);
  }
  function applyEdits() {
    const result = parseBook(draft, book.format);
    if (result.error) {
      toast(result.error);
      return;
    }
    try {
      const applied = { ...book, source: draft };
      const changes = createBookPatch({
        version: 1,
        book: applied,
        settings,
        sources: readSources(),
      });
      setBook(applied);
      setPatch(changes);
      setManuscriptDiff(
        createManuscriptDiff({
          version: 1,
          book: applied,
          settings,
          sources: readSources(),
        }),
      );
      setDiffOpen(true);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "변경 사항을 만들지 못했습니다.",
      );
    }
  }
  function download(type: "book" | "source") {
    let value: string;
    try {
      value =
        type === "book"
          ? JSON.stringify(
              { version: 1, book, settings, sources: readSources() },
              null,
              2,
            )
          : book.source;
    } catch {
      toast("재료를 읽지 못했습니다. /sources에서 확인해 주세요.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([value], {
        type: type === "book" ? "application/json" : "text/markdown",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.title.replace(/[\n/\\:*?"<>|]/g, " ") || "book"}.${type === "book" ? "json" : book.format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(
      type === "book"
        ? "표지·원고·설정·재료가 담긴 책 파일을 내보냈습니다."
        : "원고를 내보냈습니다.",
    );
  }
  async function copySettings() {
    const value = JSON.stringify(
      {
        version: 1,
        ...settings,
        paper: { widthMm: paper.widthMm, heightMm: paper.heightMm, format: paper.label },
        print: { fontSizePt: displayNumber(pxToPt(settings.fontSize)),
          lineHeightPercent: displayNumber(settings.lineHeight * 100),
          marginMm: displayNumber(pxToMm(settings.margin)) },
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(value);
      toast("현재 설정을 복사했습니다.");
    } catch {
      toast("클립보드에 접근할 수 없습니다. 책 내보내기를 이용해 주세요.");
    }
  }
  const variables = {
    "--book-accent": settings.accent,
    "--paper-width": `${paper.width}px`,
    "--book-ratio": paper.width / paper.height,
    "--paper-height": `${paper.height}px`,
    "--book-font": fonts[settings.font as keyof typeof fonts].value,
    "--book-font-size": `${settings.fontSize}px`,
    "--book-line-height": settings.lineHeight,
    "--book-margin": `${settings.margin}px`,
    "--content-height": `${height}px`,
  } as CSSProperties;
  const hiddenInputs = (
    <>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".md,.mdx,.json"
        onChange={(e) => {
          void importFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={coverRef}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          void importCover(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
  const header = (
    <header className="book-topbar">
      <button
        className="book-brand"
        onClick={() => {
          setMode("read");
          go(0);
        }}
        aria-label="책 표지로 이동"
      >
        <Icon name="book" size={23} />
        <span>
          한 페이지<span className="brand-dot">.</span>
        </span>
      </button>
      <div className="book-top-title">
        {book.title.replace("\n", " ")}
        <span>{book.author}</span>
      </div>
      <div className="book-top-actions">
        <Link href="/sources" className="book-text-button book-sources-link">
          책의 재료
        </Link>
        <button
          className="book-text-button"
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="upload" />
          <span>불러오기</span>
        </button>
        <button
          className={`book-mode-button ${mode === "edit" ? "selected" : ""}`}
          onClick={() => {
            setMode(mode === "read" ? "edit" : "read");
            setPanel(false);
          }}
        >
          <Icon name={mode === "read" ? "edit" : "book"} />
          <span>{mode === "read" ? "Edit" : "책으로 읽기"}</span>
        </button>
      </div>
    </header>
  );

  if (mode === "edit")
    return (
      <div
        className="book-app book-editor"
        style={variables}
        data-theme={settings.theme}
      >
        {hiddenInputs}
        {header}
        <DocsLayout
          tree={{
            name: book.title,
            children: parsed.headings
              .filter((h) => h.depth <= 2)
              .map((h) => ({
                type: "page" as const,
                name: h.title,
                url: `#${h.id}`,
              })),
          }}
          nav={{ title: "원고 목차", url: "#" }}
          searchToggle={{ enabled: false }}
          themeSwitch={{ enabled: false }}
          sidebar={{ collapsible: false }}
        >
          <DocsPage
            full
            toc={parsed.headings.map((h) => ({
              title: h.title,
              url: `#${h.id}`,
              depth: h.depth,
            }))}
            footer={{ enabled: false }}
            breadcrumb={{ enabled: false }}
            tableOfContent={{ enabled: false }}
            tableOfContentPopover={{ enabled: false }}
          >
            <DiffPanel
              open={diffOpen}
              patch={patch}
              manuscriptDiff={manuscriptDiff}
              onClose={() => setDiffOpen(false)}
            />
            <div className="book-editor-toolbar">
              <span>
                <i />
                {draft !== book.source ? "수정 중 · 적용 전" : saveState}
              </span>
              <div>
                <button
                  className="book-text-button"
                  onClick={() => download("source")}
                >
                  <Icon name="download" />
                  원고 내보내기
                </button>
                <button
                  className="book-mode-button"
                  aria-pressed={showSource}
                  aria-controls="book-editable-document"
                  onClick={() => setShowSource((v) => !v)}
                >
                  <Icon name="edit" />
                  {showSource ? "편집 마치기" : "원문 편집"}
                </button>
                <button className="book-apply-button" onClick={applyEdits}>
                  적용하기
                </button>
              </div>
            </div>
            <details className="book-metadata">
              <summary>책 정보와 표지</summary>
              <div className="book-metadata-grid">
                {(
                  ["title", "subtitle", "author", "publisher", "year"] as const
                ).map((key, i) => (
                  <label key={key}>
                    {["책 제목", "부제", "저자", "출판사", "발행 연도"][i]}
                    <input
                      value={book[key]}
                      onChange={(e) => updateBook(key, e.target.value)}
                    />
                  </label>
                ))}
                <div className="book-cover-field">
                  <span>표지 이미지</span>
                  <button
                    className="book-mode-button"
                    onClick={() => uploadImage("cover")}
                  >
                    <Icon name="upload" />
                    {book.cover ? "표지 교체" : "표지 올리기"}
                  </button>
                  {book.cover && (
                    <button
                      className="book-text-button"
                      onClick={() => updateBook("cover", "")}
                    >
                      기본 표지로
                    </button>
                  )}
                </div>
              </div>
            </details>
            <BookPartsEditor
              book={book}
              onChange={updateBook}
              onUpload={uploadImage}
              onPreview={() => {
                setMode("read");
                setJacket(true);
              }}
            />
            <div className="book-editor-columns">
              {(showSource || draft !== book.source) && (
                <p className="book-inline-status" role="status">
                  {draftParsed.error || (showSource
                    ? "본문을 클릭해 바로 수정하세요. 수정한 내용은 상단의 적용하기로 반영합니다."
                    : "수정한 내용이 있습니다. 적용하기를 눌러 책에 반영하세요.")}
                </p>
              )}
              <DocsBody>
                <div className="book-doc-title">
                  <h1>{book.title}</h1>
                  <p>{book.subtitle}</p>
                  <span>
                    {book.author} · {book.publisher} · {book.year}
                  </span>
                </div>
                <div id="book-editable-document" className="book-prose book-document" data-editing={showSource}>
                  {showSource ? (
                    <InlineEditor key={book.source + book.format} source={draft} format={book.format} onChange={setDraft} />
                  ) : renderBook(draftParsed.tree)}
                </div>
              </DocsBody>
            </div>
          </DocsPage>
        </DocsLayout>
        <div className="book-toast" role="status">
          {notice}
        </div>
      </div>
    );

  return (
    <div className="book-app" style={variables} data-theme={settings.theme}>
      {hiddenInputs}
      {header}
      <main
        className={`book-reading ${settings.layout === "spread" || jacket ? "book-wide-reading" : ""}`}
      >
        <nav className="book-outline" aria-label="책 목차">
          <div className="book-outline-heading">
            CONTENTS
            <button
              aria-label="전체 페이지 보기"
              onClick={() => {
                setPanel(true);
                setTab("pages");
              }}
            >
              <Icon name="list" size={16} />
            </button>
          </div>
          <button className={page === 0 ? "active" : ""} onClick={() => go(0)}>
            <span>00</span>앞표지
          </button>
          {parsed.headings
            .filter((h) => h.depth === 1)
            .map((h, i) => (
              <button
                className={
                  leaves[page]?.kind === "body" &&
                  page >= (headingPages[h.id] ?? bodyStart) &&
                  page <
                    (headingPages[
                      parsed.headings.filter((x) => x.depth === 1)[i + 1]?.id
                    ] || total)
                    ? "active"
                    : ""
                }
                key={h.id}
                onClick={() => go(headingPages[h.id] ?? bodyStart)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {h.title}
              </button>
            ))}
          <button
            onClick={() => {
              setMode("edit");
              setShowSource(false);
            }}
          >
            겉장과 출간정보 편집 ↗
          </button>
          <div className="book-outline-bottom">
            <span>{book.publisher}</span>
            <span>{book.year} EDITION</span>
          </div>
        </nav>
        <section className="book-desk" aria-label="책 읽기">
          <div className="book-view-modes" aria-label="책 보기 방식">
            <button
              aria-pressed={!jacket && settings.layout === "single"}
              onClick={() => {
                setJacket(false);
                update("layout", "single");
              }}
            >
              한 페이지
            </button>
            <button
              aria-pressed={!jacket && settings.layout === "spread"}
              onClick={() => {
                setJacket(false);
                update("layout", "spread");
              }}
            >
              양쪽 페이지
            </button>
            <button aria-pressed={jacket} onClick={() => setJacket(true)}>
              겉장 펼침
            </button>
          </div>
          <div className="book-reading-label">
            <span>{active}</span>
            <span>
              {paper.name} · {Math.round(scale * 100)}%
            </span>
          </div>
          <div
            ref={stageRef}
            className={`book-stage ${jacket ? "book-jacket-stage" : ""}`}
            onTouchStart={(e) => {
              touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }}
            onTouchEnd={(e) => {
              if (jacket || !touchStart.current) return;
              const dx = e.changedTouches[0].clientX - touchStart.current.x;
              const dy = e.changedTouches[0].clientY - touchStart.current.y;
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
                go(dx < 0 ? lastVisible + 1 : firstVisible - 1);
              touchStart.current = null;
            }}
          >
            <div className="book-measure" aria-hidden="true" inert>
              <div
                ref={columnsRef}
                className={`book-prose book-columns ${settings.chapterBreak ? "chapter-break" : ""}`}
                style={{ width, height, columnWidth: width }}
              >
                {content}
              </div>
            </div>
            {jacket ? (
              <JacketPreview book={book} spineWidth={settings.spineWidth} />
            ) : (
              <div
                className={`book-open-spread ${spreadWidth === 2 ? "is-spread" : ""} ${turning ? "turning" : ""}`}
                style={{
                  width: paper.width * scale * spreadWidth,
                  height: paper.height * scale,
                }}
              >
                {visible.map((index) => {
                  const leaf = leaves[index];
                  return (
                    <div
                      key={index}
                      className="book-paper-wrap"
                      style={{
                        width: paper.width * scale,
                        height: paper.height * scale,
                      }}
                    >
                      <article
                        className={`book-paper ${leaf.kind === "frontCover" || leaf.kind === "backCover" ? "is-cover" : ""}`}
                        style={{ transform: `scale(${scale})` }}
                        aria-label={`${index + 1} / ${total} · ${leaf.label}`}
                      >
                        {leaf.kind !== "body" ? (
                          <BookFace book={book} kind={leaf.kind} />
                        ) : (
                          <div className="book-page-interior">
                            <div className="book-running-head">
                              <span>{book.title.replace(/\n/g, " ")}</span>
                              <span>{book.author}</span>
                            </div>
                            <div
                              className="book-page-clip"
                              style={{ width, height }}
                            >
                              <div
                                className={`book-prose book-columns ${settings.chapterBreak ? "chapter-break" : ""}`}
                                onFocusCapture={(e) => {
                                  if (!(e.target instanceof HTMLElement))
                                    return;
                                  const container = e.currentTarget;
                                  const offset =
                                    (e.target.getBoundingClientRect().left -
                                      container.getBoundingClientRect().left) /
                                    (scale * (width + 48));
                                  const target =
                                    bodyStart + Math.floor(offset + 0.01);
                                  if (!visible.includes(target)) go(target);
                                }}
                                style={{
                                  width,
                                  height,
                                  columnWidth: width,
                                  transform: `translateX(-${(leaf.bodyIndex ?? 0) * (width + 48)}px)`,
                                }}
                              >
                                {renderBook(
                                  parsed.tree,
                                  "root",
                                  `leaf-${index}-`,
                                )}
                              </div>
                            </div>
                            <div className="book-page-footer">
                              <span>{book.publisher}</span>
                              <span>
                                {String((leaf.bodyIndex ?? 0) + 1).padStart(
                                  2,
                                  "0",
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </article>
                    </div>
                  );
                })}
                {spreadWidth === 2 && visible.length === 1 && (
                  <div
                    className="book-blank-leaf"
                    style={{
                      width: paper.width * scale,
                      height: paper.height * scale,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
            )}
          </div>
          <div className="book-pagination" hidden={jacket}>
            <button
              aria-label="이전 페이지"
              disabled={firstVisible === 0}
              onClick={() => go(firstVisible - 1)}
            >
              <Icon name="arrowLeft" />
            </button>
            <span aria-live="polite">
              <strong>{pageDisplay}</strong>
              <i />
              {String(total).padStart(2, "0")}
            </span>
            <button
              aria-label="다음 페이지"
              disabled={lastVisible >= total - 1}
              onClick={() => go(lastVisible + 1)}
            >
              <Icon name="arrowRight" />
            </button>
          </div>
          <p className="book-keyboard-hint">
            {jacket
              ? "뒷날개 · 뒷표지 · 책등 · 앞표지 · 앞날개 — 좁은 화면에서는 옆으로 스크롤하세요"
              : "← → 방향키로 천천히 넘겨보세요"}
          </p>
        </section>
        <div className="book-side-note">A LITTLE SPACE FOR YOUR STORY</div>
      </main>
      <footer className="book-status">
        <span>
          <i />
          {saveState}
        </span>
        <button onClick={() => download("book")}>
          <Icon name="download" size={15} />책 내보내기
        </button>
      </footer>
      <button
        ref={triggerRef}
        className={`book-controls-trigger ${panel ? "is-open" : ""}`}
        aria-label="책 설정 패널 열기"
        aria-expanded={panel}
        aria-controls="book-control-panel"
        onClick={() => setPanel((v) => !v)}
      >
        <span>
          {jacket ? "겉장" : pageDisplay}
          <span>{jacket ? "" : ` / ${total}`}</span>
        </span>
        <i />
        <Icon name="settings" />
      </button>
      {panel && (
        <>
          <div className="book-panel-shade" onClick={closePanel} />
          <aside
            ref={panelRef}
            id="book-control-panel"
            className="book-panel"
            role="dialog"
            aria-modal="true"
            aria-label="책 설정"
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const items = panelRef.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,[tabindex="0"]',
              );
              if (!items?.length) return;
              const first = items[0],
                last = items[items.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
          >
            <div className="book-panel-header">
              <div>
                <h2>나의 읽는 방식</h2>
                <p>한 권의 책을, 내 취향대로.</p>
              </div>
              <button
                ref={closeRef}
                onClick={closePanel}
                aria-label="설정 패널 닫기"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="book-tabs" role="tablist" aria-label="설정 유형">
              <button
                role="tab"
                id="style-tab"
                aria-selected={tab === "style"}
                aria-controls="style-controls"
                tabIndex={tab === "style" ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    setTab("pages");
                    document.getElementById("pages-tab")?.focus();
                  }
                }}
                onClick={() => setTab("style")}
              >
                <Icon name="settings" size={16} />
                스타일 컨트롤
              </button>
              <button
                role="tab"
                id="pages-tab"
                aria-selected={tab === "pages"}
                aria-controls="page-controls"
                tabIndex={tab === "pages" ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    setTab("style");
                    document.getElementById("style-tab")?.focus();
                  }
                }}
                onClick={() => setTab("pages")}
              >
                <Icon name="list" size={16} />
                페이지 컨트롤
              </button>
            </div>
            {tab === "style" ? (
              <div
                id="style-controls"
                role="tabpanel"
                aria-labelledby="style-tab"
                className="book-panel-body"
              >
                <div className="book-control-group">
                  <h3>종이책 추천 설정</h3>
                  <label className="book-field">
                    <span>책의 성격</span>
                    <select value={matchingPreset(settings)} onChange={(e) => {
                      const preset = printPresets.find(p => p.id === e.target.value);
                      if (preset) {
                        setSettings(current => ({ ...current, ...preset.values, typographyVersion: 2 }));
                        toast(`${preset.name} 설정을 적용했습니다.`);
                      }
                    }}>
                      <option value="custom" disabled>직접 조정한 설정</option>
                      {printPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <p className="book-control-note">
                    {printPresets.find(p => p.id === matchingPreset(settings))?.description || "서체, 글자 크기와 여백을 직접 조정한 상태입니다."}
                  </p>
                  <p className="book-control-note">추천값을 적용한 뒤 책의 분량과 독자에 맞게 조정하세요.</p>
                  <h3>읽기 방식</h3>
                  <label className="book-field">
                    <span>페이지 보기</span>
                    <select
                      value={settings.layout}
                      onChange={(e) => {
                        setJacket(false);
                        update("layout", e.target.value);
                      }}
                    >
                      <option value="single">한 페이지</option>
                      <option value="spread">양쪽 페이지</option>
                    </select>
                  </label>
                  <h3>종이</h3>
                  <label className="book-field">
                    <span>판형</span>
                    <select
                      value={settings.size}
                      onChange={(e) => update("size", e.target.value)}
                    >
                      {Object.entries(sizes).map(([key, size]) => (
                        <option key={key} value={key}>
                          {size.name} — {size.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="book-field">
                    <span>종이 색</span>
                    <div className="book-paper-swatches">
                      {[
                        { id: "cream", name: "크림", color: "#f5efdf" },
                        { id: "white", name: "화이트", color: "#ffffff" },
                        { id: "night", name: "나이트", color: "#343631" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          aria-pressed={settings.theme === t.id}
                          onClick={() => update("theme", t.id)}
                        >
                          <span style={{ background: t.color }}>
                            {settings.theme === t.id && (
                              <Icon name="check" size={16} />
                            )}
                          </span>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Slider
                    label="페이지 여백"
                    value={displayNumber(pxToMm(settings.margin))}
                    min={8}
                    max={30}
                    step={0.5}
                    suffix=" mm"
                    onChange={(v) => update("margin", mmToPx(v))}
                  />
                </div>
                <div className="book-control-group">
                  <h3>타이포그래피</h3>
                  <label className="book-field">
                    <span>본문 서체</span>
                    <select
                      value={settings.font}
                      onChange={(e) => update("font", e.target.value)}
                    >
                      {Object.entries(fonts).map(([key, font]) => (
                        <option key={key} value={key}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <KoPubStatus font={settings.font} />
                  <Slider
                    label="글자 크기"
                    value={displayNumber(pxToPt(settings.fontSize))}
                    min={9}
                    max={20}
                    step={0.5}
                    suffix=" pt"
                    onChange={(v) => update("fontSize", ptToPx(v))}
                  />
                  <Slider
                    label="줄간격"
                    value={displayNumber(settings.lineHeight * 100)}
                    min={130}
                    max={240}
                    step={5}
                    suffix="%"
                    onChange={(v) => update("lineHeight", v / 100)}
                  />
                  <div
                    className="book-type-preview"
                    style={{
                      fontFamily:
                        fonts[settings.font as keyof typeof fonts].value,
                      fontSize: Math.max(56 / 3, settings.fontSize),
                      lineHeight: settings.lineHeight,
                    }}
                  >
                    문장 사이에 머무는 시간.
                    <br />
                    나에게 맞는 속도로 읽어요.
                  </div>
                </div>
                <div className="book-control-group">
                  <p className="book-control-note">pt와 mm는 종이 기준입니다. 화면은 크기에 맞춰 축소되며, 위 서체 미리보기는 읽기 쉽게 확대합니다. 이 미리보기는 인쇄용 PDF가 아닙니다.</p>
                  <h3>페이지와 표지</h3>
                  <Slider
                    label="책등 너비 (겉장 미리보기)"
                    value={settings.spineWidth}
                    min={20}
                    max={70}
                    suffix=" px"
                    onChange={(v) => update("spineWidth", v)}
                  />
                  <button
                    className="book-text-button"
                    onClick={() => {
                      setMode("edit");
                      setPanel(false);
                    }}
                  >
                    표지 · 날개 · 출간정보 편집 ↗
                  </button>
                  <label className="book-switch">
                    <span>챕터는 새 페이지에서 시작</span>
                    <input
                      type="checkbox"
                      checked={settings.chapterBreak}
                      onChange={(e) => update("chapterBreak", e.target.checked)}
                    />
                  </label>
                  <label className="book-field book-color-field">
                    <span>표지 · 강조 색상</span>
                    <input
                      aria-label="표지 강조 색상"
                      type="color"
                      value={settings.accent}
                      onChange={(e) => update("accent", e.target.value)}
                    />
                  </label>
                  <button
                    className="book-text-button"
                    onClick={() => {
                      uploadImage("cover");
                    }}
                  >
                    <Icon name="upload" size={16} />
                    표지 이미지 올리기
                  </button>
                  <button
                    className="book-reset"
                    onClick={() => {
                      setSettings(defaults);
                      toast("기본 스타일로 되돌렸습니다.");
                    }}
                  >
                    기본 스타일로 되돌리기
                  </button>
                </div>
              </div>
            ) : (
              <div
                id="page-controls"
                role="tabpanel"
                aria-labelledby="pages-tab"
                className="book-panel-body"
              >
                <div className="book-page-summary">
                  <span>
                    전체 <strong>{total}페이지</strong>
                  </span>
                  <span>
                    겉장·출간정보 {total - pages.length} · 본문 {pages.length}
                  </span>
                </div>
                <form
                  className="book-jump"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(jump);
                    if (!Number.isInteger(n) || n < 1 || n > total) {
                      toast(`1부터 ${total}까지 입력해 주세요.`);
                      return;
                    }
                    go(n - 1);
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    max={total}
                    placeholder="페이지 번호"
                    aria-label="이동할 페이지 번호"
                    value={jump}
                    onChange={(e) => setJump(e.target.value)}
                  />
                  <button type="submit">
                    이동 <Icon name="arrowRight" size={16} />
                  </button>
                </form>
                <div className="book-page-list">
                  {leaves.map((p, i) => (
                    <button
                      key={i}
                      className={!jacket && visible.includes(i) ? "active" : ""}
                      aria-current={page === i ? "page" : undefined}
                      onClick={() => go(i)}
                    >
                      <span
                        className={`book-mini-page ${p.kind === "frontCover" || p.kind === "backCover" ? "cover" : ""}`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{p.label}</strong>
                        <small>{p.excerpt || "본문 계속"}</small>
                      </span>
                      {!jacket && visible.includes(i) && (
                        <Icon name="check" size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="book-panel-footer">
              <button onClick={copySettings}>
                <Icon name="copy" size={17} />
                현재 설정 복사하기
              </button>
              <span>
                {paper.name} · {fonts[settings.font as keyof typeof fonts].name}{" "}
                · {displayNumber(pxToPt(settings.fontSize))}pt
              </span>
            </div>
          </aside>
        </>
      )}
      <div className="book-toast" role="status">
        {notice}
      </div>
    </div>
  );
}
