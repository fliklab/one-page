"use client";

import { useMemo, useRef, useState } from "react";
import { parseBook, renderBook, type TextEditor } from "./content";
import { applyTextEdits, textEdit, type SourceEdit } from "./inline-source";

export default function InlineEditor({ source, format, onChange }: {
  source: string;
  format: string;
  onChange: (source: string) => void;
}) {
  // Freeze the source and DOM for this editing session. Re-rendering the AST
  // on every keystroke would move the caret and interrupt Korean composition.
  const [baseline] = useState(source);
  const edits = useRef(new Map<string, SourceEdit>());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const content = useMemo(() => {
    const editText: TextEditor = (value, position, attribute) => {
      if (position?.start.offset === undefined || position.end?.offset === undefined)
        return value;
      const id = `${position.start.offset}:${position.end.offset}`;
      const update = (element: HTMLElement) => {
        const next = element.innerText.replace(/\r\n?/g, "\n");
        if (next === value) edits.current.delete(id);
        else {
          const edit = textEdit(position, next, attribute);
          if (edit) edits.current.set(id, edit);
        }
        onChangeRef.current(applyTextEdits(baseline, edits.current.values()));
      };
      return (
        <span
          key={id}
          className="book-inline-text"
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          role="textbox"
          aria-label={attribute === "caption" ? "이미지 캡션 편집" : attribute === "title" ? "박스 제목 편집" : `본문 편집: ${value.slice(0, 40)}`}
          aria-multiline="true"
          tabIndex={0}
          spellCheck={false}
          onInput={(event) => update(event.currentTarget)}
          onCompositionEnd={(event) => update(event.currentTarget)}
        >{value}</span>
      );
    };
    return renderBook(parseBook(baseline, format).tree, "root", "", editText);
  }, [baseline, format]);
  return <>{content}</>;
}
