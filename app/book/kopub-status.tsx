"use client";

import { useEffect, useState } from "react";

export default function KoPubStatus({ font }: { font: string }) {
  const family = font === "kopubBatang" ? "One Page KoPub Batang"
    : font === "kopubDotum" ? "One Page KoPub Dotum" : null;
  const [result, setResult] = useState<{ family: string; loaded: boolean } | null>(null);
  useEffect(() => {
    if (!family) return;
    let active = true;
    const check = () => {
      setResult(null);
      document.fonts.load(`400 16px "${family}"`, "한글").then(
        faces => { if (active) setResult({ family, loaded: faces.length > 0 }); },
        () => { if (active) setResult({ family, loaded: false }); },
      );
    };
    check();
    window.addEventListener("focus", check);
    return () => { active = false; window.removeEventListener("focus", check); };
  }, [family]);
  if (!family) return null;
  const current = result?.family === family ? result : null;
  return <div className="book-control-note">
    <p role="status">{!current ? "KoPub 설치 여부 확인 중…" : current.loaded
      ? "기기에 설치된 KoPub World를 사용하고 있습니다."
      : `KoPub World를 찾지 못해 ${font === "kopubBatang" ? "나눔명조" : "Noto Sans KR"}로 표시합니다.`}</p>
    <p>이 서체는 각 기기에 설치해야 합니다. 설치 후 페이지를 새로고침하세요.</p>
    <a href={`https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200195&wrtSn=${font === "kopubBatang" ? "13287215" : "13287212"}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>공식 다운로드 및 사용 조건</a>
  </div>;
}
