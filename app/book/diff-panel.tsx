"use client";
import { useEffect, useRef, useState } from "react";
export default function DiffPanel({
  open,
  patch,
  manuscriptDiff,
  onClose,
}: {
  open: boolean;
  patch: string;
  manuscriptDiff: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"manuscript" | "patch">("manuscript");
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      setMessage("");
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
      previousFocus.current?.focus();
    }
  }, [open]);
  const lines = (
    view === "manuscript" && manuscriptDiff ? manuscriptDiff : patch
  ).split("\n");
  const shortened =
    lines.length > 2000 || lines.some((line) => line.length > 600);
  async function copy() {
    try {
      await navigator.clipboard.writeText(patch);
      setMessage("전체 diff를 복사했습니다.");
    } catch {
      setMessage("클립보드에 접근할 수 없습니다. patch 파일로 저장해 주세요.");
    }
  }
  function save() {
    const url = URL.createObjectURL(
      new Blob([patch], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "book-changes.patch";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("book-changes.patch 파일을 저장했습니다.");
  }
  return (
    <dialog
      ref={dialog}
      className="book-diff-panel"
      aria-labelledby="book-diff-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <header>
        <div>
          <h2 id="book-diff-title">적용한 변경 사항</h2>
          <p>이 사이트에 배포된 원본과 현재 책을 비교합니다.</p>
        </div>
        <button aria-label="diff 패널 닫기" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="book-diff-file">
        <code>content/book.json</code>
        <span>{patch ? "수정됨" : "변경 없음"}</span>
      </div>
      {manuscriptDiff && (
        <div className="book-diff-tabs">
          <button
            aria-pressed={view === "manuscript"}
            onClick={() => setView("manuscript")}
          >
            원고 줄별 비교
          </button>
          <button
            aria-pressed={view === "patch"}
            onClick={() => setView("patch")}
          >
            전체 patch
          </button>
        </div>
      )}
      {patch ? (
        <div className="book-diff-content">
          <pre aria-label="변경 사항 unified diff">
            {lines.slice(0, 2000).map((line, i) => (
              <span
                key={i}
                className={
                  line.startsWith("+") && !line.startsWith("+++")
                    ? "added"
                    : line.startsWith("-") && !line.startsWith("---")
                      ? "removed"
                      : line.startsWith("@@")
                        ? "hunk"
                        : ""
                }
              >
                {line.length > 600 ? line.slice(0, 600) + " …" : line}
                {"\n"}
              </span>
            ))}
          </pre>
        </div>
      ) : (
        <div className="book-diff-empty">
          <h3>원본과 같은 책입니다.</h3>
          <p>
            원고나 책 정보, 겉장, 스타일, 재료를 바꾼 뒤 다시 적용해 주세요.
          </p>
        </div>
      )}
      <footer>
        {shortened && (
          <p>
            긴 내용은 미리보기에서 줄여 표시합니다. 복사와 파일 저장에는 전체
            diff가 포함됩니다.
          </p>
        )}
        <p>
          복사·저장은 책 정보와 원고 등 모든 변경이 담긴 전체 Git patch를
          사용합니다. 원고는 현재 브라우저의 책에 반영되었습니다. 저장소에
          반영하려면 이 patch를 적용해 주세요.
        </p>
        <div>
          <button disabled={!patch} className="book-mode-button" onClick={save}>
            .patch 파일 저장
          </button>
          <button
            disabled={!patch}
            className="book-apply-button"
            onClick={copy}
          >
            diff 복사하기
          </button>
        </div>
        <span role="status">{message}</span>
      </footer>
    </dialog>
  );
}
