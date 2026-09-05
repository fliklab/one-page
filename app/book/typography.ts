import template from "../../content/book.json";

export const ptToPx = (pt: number) => pt * 96 / 72;
export const pxToPt = (px: number) => px * 72 / 96;
export const mmToPx = (mm: number) => mm * 96 / 25.4;
export const pxToMm = (px: number) => px * 25.4 / 96;
export const displayNumber = (value: number) => Number(value.toFixed(2));

function paper(name: string, widthMm: number, heightMm: number) {
  return { name, label: `${widthMm} × ${heightMm} mm`, widthMm, heightMm,
    width: mmToPx(widthMm), height: mmToPx(heightMm) };
}
export const sizes = {
  pocket: paper("문고판 · A6", 105, 148),
  fourSix: paper("사륙판", 128, 188),
  a5: paper("국판 · A5", 148, 210),
  shin: paper("신국판", 152, 225),
  jisB5: paper("사륙배판 · B5 JIS", 182, 257),
  b5: paper("B5 ISO", 176, 250),
  a4: paper("국배판 · A4", 210, 297),
  square: paper("정사각", 180, 180),
};
export const fonts = {
  kopubBatang: { name: "KoPub World 바탕 · 기기 설치", value: '"One Page KoPub Batang", "Nanum Myeongjo", Georgia, serif' },
  kopubDotum: { name: "KoPub World 돋움 · 기기 설치", value: '"One Page KoPub Dotum", "Noto Sans KR", Arial, sans-serif' },
  myeongjo: { name: "나눔명조", value: '\"Nanum Myeongjo\", Georgia, serif' },
  notoSerif: { name: "Noto Serif KR · 본명조 계열", value: '\"Noto Serif KR\", Georgia, serif' },
  notoSans: { name: "Noto Sans KR · 본고딕 계열", value: '\"Noto Sans KR\", Arial, sans-serif' },
  serif: { name: "고운바탕", value: '\"Gowun Batang\", Georgia, serif' },
  sans: { name: "프리텐다드", value: "Pretendard, Arial, sans-serif" },
};
export const defaults = template.settings;
export type Settings = typeof defaults;

// Editorial starting points, not universal print-production standards.
export const printPresets = [
  { id: "essay", name: "에세이 · 수필", description: "국판 · 나눔명조 · 11pt · 줄간격 175% · 여백 18mm",
    values: { size: "a5", font: "myeongjo", fontSize: ptToPx(11), lineHeight: 1.75, margin: mmToPx(18) } },
  { id: "literature", name: "소설 · 인문", description: "신국판 · Noto Serif KR · 10.5pt · 줄간격 170% · 여백 18mm",
    values: { size: "shin", font: "notoSerif", fontSize: ptToPx(10.5), lineHeight: 1.7, margin: mmToPx(18) } },
  { id: "compact", name: "작은 에세이 · 시집", description: "사륙판 · 나눔명조 · 10.5pt · 줄간격 180% · 여백 15mm",
    values: { size: "fourSix", font: "myeongjo", fontSize: ptToPx(10.5), lineHeight: 1.8, margin: mmToPx(15) } },
  { id: "practical", name: "실용서 · 교재", description: "사륙배판 · Noto Sans KR · 11pt · 줄간격 165% · 여백 20mm",
    values: { size: "jisB5", font: "notoSans", fontSize: ptToPx(11), lineHeight: 1.65, margin: mmToPx(20) } },
  { id: "large", name: "큰 글씨", description: "국판 · 나눔명조 · 14pt · 줄간격 170% · 여백 16mm",
    values: { size: "a5", font: "myeongjo", fontSize: ptToPx(14), lineHeight: 1.7, margin: mmToPx(16) } },
];
export function matchingPreset(settings: Settings) {
  return printPresets.find(p => Object.entries(p.values).every(([key, value]) => {
    const actual = settings[key as keyof Settings];
    return typeof value === "number" && typeof actual === "number"
      ? Math.abs(value - actual) < 0.0001 : actual === value;
  }))?.id || "custom";
}

export function validSettings(value: unknown): Settings {
  let v =
    value && typeof value === "object" ? (value as Partial<Settings>) : {};
  // Upgrade only the original default combination; keep custom layouts intact.
  if (!v.typographyVersion && v.size === "a5" && v.font === "serif" &&
      v.fontSize === 18 && v.lineHeight === 1.9 && v.margin === 56) {
    v = { ...v, font: defaults.font, fontSize: defaults.fontSize,
      lineHeight: defaults.lineHeight, margin: defaults.margin };
  }
  const bounded = (n: unknown, fallback: number, min: number, max: number) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.min(max, Math.max(min, n))
      : fallback;
  return {
    typographyVersion: 2,
    size: typeof v.size === "string" && Object.hasOwn(sizes, v.size) ? v.size : defaults.size,
    font: typeof v.font === "string" && Object.hasOwn(fonts, v.font) ? v.font : defaults.font,
    fontSize: bounded(v.fontSize, defaults.fontSize, ptToPx(9), ptToPx(20)),
    lineHeight: bounded(v.lineHeight, defaults.lineHeight, 1.3, 2.4),
    margin: bounded(v.margin, defaults.margin, mmToPx(8), mmToPx(30)),
    theme: ["cream", "white", "night"].includes(v.theme || "")
      ? v.theme!
      : "cream",
    accent: /^#[0-9a-f]{6}$/i.test(v.accent || "")
      ? v.accent!
      : defaults.accent,
    chapterBreak: typeof v.chapterBreak === "boolean" ? v.chapterBreak : true,
    layout: v.layout === "spread" ? "spread" : "single",
    spineWidth: bounded(v.spineWidth, 34, 20, 70),
  };
}
