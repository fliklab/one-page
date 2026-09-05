import { initialBook, safeUrl, type Book } from "./content";
export const extraFields = [
  "frontFlap",
  "frontFlapImage",
  "publicationInfo",
  "spineText",
  "spineImage",
  "backFlap",
  "backFlapImage",
  "backCoverText",
  "backCover",
] as const;
export type ImageField =
  | "cover"
  | "frontFlapImage"
  | "spineImage"
  | "backFlapImage"
  | "backCover";
export type LeafKind =
  | "frontCover"
  | "frontFlap"
  | "publication"
  | "body"
  | "backFlap"
  | "backCover";
export type Leaf = {
  kind: LeafKind;
  label: string;
  excerpt: string;
  bodyIndex?: number;
};
export const partLabels: Record<LeafKind, string> = {
  frontCover: "앞표지",
  frontFlap: "앞날개",
  publication: "출간정보",
  body: "본문",
  backFlap: "뒷날개",
  backCover: "뒷표지",
};
export function normalizeBook(value: unknown): Book {
  if (!value || typeof value !== "object")
    throw new Error("책 정보 형식을 확인해 주세요.");
  const v = value as Record<string, unknown>;
  for (const key of [
    "title",
    "subtitle",
    "author",
    "publisher",
    "year",
    "cover",
    "source",
  ])
    if (typeof v[key] !== "string")
      throw new Error("책 정보 형식을 확인해 주세요.");
  // Older book files have none of the jacket fields. Preserve their existing content.
  const result = Object.fromEntries(
    Object.keys(initialBook).map((key) => [
      key,
      typeof v[key] === "string" ? v[key] : key === "format" ? "mdx" : "",
    ]),
  ) as Book;
  if (!["md", "mdx"].includes(result.format))
    throw new Error("지원하지 않는 원고 형식입니다.");
  for (const field of [
    "cover",
    "frontFlapImage",
    "spineImage",
    "backFlapImage",
    "backCover",
  ] as const)
    if (result[field] && !safeUrl(result[field], true))
      throw new Error("책 이미지 주소를 확인해 주세요.");
  return result;
}
export function bookLeaves(
  book: Book,
  pages: { label: string; excerpt: string }[],
): Leaf[] {
  const result: Leaf[] = [
    { kind: "frontCover", label: "앞표지", excerpt: book.title },
  ];
  if (book.frontFlap.trim() || book.frontFlapImage)
    result.push({
      kind: "frontFlap",
      label: "앞날개",
      excerpt: book.frontFlap,
    });
  if (book.publicationInfo.trim())
    result.push({
      kind: "publication",
      label: "출간정보",
      excerpt: book.publicationInfo,
    });
  result.push(
    ...pages.map((p, i) => ({ ...p, kind: "body" as const, bodyIndex: i })),
  );
  if (book.backFlap.trim() || book.backFlapImage)
    result.push({ kind: "backFlap", label: "뒷날개", excerpt: book.backFlap });
  if (book.backCoverText.trim() || book.backCover)
    result.push({
      kind: "backCover",
      label: "뒷표지",
      excerpt: book.backCoverText,
    });
  return result;
}
export function spreadPages(
  index: number,
  leaves: Leaf[],
  spread: boolean,
): number[] {
  if (!leaves.length) return [];
  const page = Math.max(0, Math.min(leaves.length - 1, index));
  if (
    !spread ||
    leaves[page].kind === "frontCover" ||
    leaves[page].kind === "backCover"
  )
    return [page];
  const start = 1 + Math.floor((page - 1) / 2) * 2;
  return [start, start + 1].filter(
    (i) => i < leaves.length && leaves[i].kind !== "backCover",
  );
}
