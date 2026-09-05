import type { Metadata } from "next";
import BookStudio from "./studio";
import "./book.css";

export const metadata: Metadata = {
  title: { absolute: "한 페이지 — 나만의 한 권" },
  description:
    "표지와 원고가 한 권의 책이 되는 공간. 판형, 서체, 여백을 조절하며 읽고 편집하세요.",
};
export default function BookPage() {
  return <BookStudio />;
}
