import type { SourcePosition } from "./content";

export type SourceEdit = { start: number; end: number; replacement: string };

// Entity encoding keeps typed Markdown/MDX punctuation literal, including
// braces and pasted tags. Untouched ranges retain their original bytes.
export function literalSource(value: string): string {
  return value.replace(/[\n!-/:-@\[-`{-~]/g, (character) =>
    `&#${character.charCodeAt(0)};`,
  );
}

export function textEdit(
  position: SourcePosition | undefined,
  value: string,
  attribute?: string,
): SourceEdit | null {
  const start = position?.start.offset;
  const end = position?.end?.offset;
  if (start === undefined || end === undefined) return null;
  const literal = literalSource(value);
  return { start, end, replacement: attribute ? `${attribute}="${literal}"` : literal };
}

export function applyTextEdits(source: string, edits: Iterable<SourceEdit>): string {
  let result = "";
  let cursor = 0;
  for (const edit of [...edits].sort((a, b) => a.start - b.start)) {
    if (edit.start < cursor || edit.end < edit.start || edit.end > source.length)
      throw new Error("편집 위치가 원고와 일치하지 않습니다.");
    result += source.slice(cursor, edit.start) + edit.replacement;
    cursor = edit.end;
  }
  return result + source.slice(cursor);
}
