import { createTwoFilesPatch } from "diff";
import template from "../../content/book.json";
export type BookSnapshot = typeof template;
export const snapshotPath = "content/book.json";
export function serializeSnapshot(snapshot: BookSnapshot): string {
  return JSON.stringify(snapshot, null, 2) + "\n";
}
/** Always diff against the snapshot shipped by this build, so git apply has a stable base. */
export function createBookPatch(
  current: BookSnapshot,
  base: BookSnapshot = template,
): string {
  const before = serializeSnapshot(base),
    after = serializeSnapshot(current);
  if (before === after) return "";
  return createTwoFilesPatch(
    `a/${snapshotPath}`,
    `b/${snapshotPath}`,
    before,
    after,
    undefined,
    undefined,
    { context: 3 },
  );
}

export function createManuscriptDiff(
  current: BookSnapshot,
  base: BookSnapshot = template,
): string {
  if (base.book.source === current.book.source) return "";
  return createTwoFilesPatch(
    "원고 (이전)",
    "원고 (수정)",
    base.book.source,
    current.book.source,
    undefined,
    undefined,
    { context: 3 },
  );
}
