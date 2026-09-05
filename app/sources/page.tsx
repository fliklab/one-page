import type { Metadata } from "next";
import SourcesStudio from "./sources-studio";
import "../book/book.css";
import "./sources.css";
export const metadata: Metadata = {
  title: { absolute: "책의 재료 — 한 페이지" },
  description:
    "책을 만드는 노트, 참고 링크, 직접 인용을 목록과 연결 그래프로 탐색합니다.",
};
export default function SourcesPage() {
  return <SourcesStudio />;
}
