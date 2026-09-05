import template from "../../content/book.json";
export type SourceType = "note" | "link" | "quote";
export type SourceItem = {
  id: string;
  type: SourceType;
  title: string;
  body: string;
  attribution: string;
  locator: string;
  url: string;
  tags: string[];
  related: string[];
  x: number;
  y: number;
};
export const sourceStorageKey = "onepage-sources-v1";
export const typeNames: Record<SourceType, string> = {
  note: "노트",
  link: "참고 링크",
  quote: "직접 인용",
};
export const sampleSources: SourceItem[] = validateSources(template.sources);
export function sourceUrl(value: string): string {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function validateSources(value: unknown): SourceItem[] {
  if (!Array.isArray(value) || value.length > 500)
    throw new Error("재료는 최대 500개까지 저장할 수 있습니다.");
  const ids = new Set<string>();
  const items = value.map((v: unknown) => {
    if (!v || typeof v !== "object")
      throw new Error("재료 파일 형식을 확인해 주세요.");
    const s = v as SourceItem;
    if (
      !["note", "link", "quote"].includes(s.type) ||
      !["id", "title", "body", "attribution", "locator", "url"].every(
        (k) => typeof (s as unknown as Record<string, unknown>)[k] === "string",
      ) ||
      !s.id ||
      ids.has(s.id) ||
      !Array.isArray(s.tags) ||
      !s.tags.every((t) => typeof t === "string") ||
      !Array.isArray(s.related) ||
      !s.related.every((t) => typeof t === "string")
    )
      throw new Error("재료의 유형, 내용 또는 연결 정보가 올바르지 않습니다.");
    ids.add(s.id);
    return {
      ...s,
      url: sourceUrl(s.url),
      x: Number.isFinite(s.x) ? Math.max(50, Math.min(950, s.x)) : 500,
      y: Number.isFinite(s.y) ? Math.max(50, Math.min(550, s.y)) : 300,
    };
  });
  return items.map((s) => ({
    ...s,
    related: [...new Set(s.related)].filter((id) => id !== s.id && ids.has(id)),
  }));
}
export function sourceEdges(items: SourceItem[]) {
  const ids = new Set(items.map((s) => s.id));
  const seen = new Set<string>();
  return items.flatMap((s) =>
    s.related
      .filter((id) => ids.has(id))
      .flatMap((id) => {
        const key = [s.id, id].sort().join("::");
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ id: key, from: s.id, to: id }];
      }),
  );
}
export function connectedSources(items: SourceItem[], id: string) {
  return items.filter(
    (s) =>
      s.id !== id &&
      (s.related.includes(id) ||
        items.find((n) => n.id === id)?.related.includes(s.id)),
  );
}
export function readSources(): SourceItem[] {
  const raw = localStorage.getItem(sourceStorageKey);
  return raw ? validateSources(JSON.parse(raw)) : sampleSources;
}
