"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { sourceEdges, type SourceItem, typeNames } from "./model";
const colors = { note: "#ac583c", link: "#53766e", quote: "#8a759c" };
export default function SourceGraph({
  items,
  selected,
  onSelect,
  onMove,
}: {
  items: SourceItem[];
  selected: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<{
    id: string | null;
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [viewport, setViewport] = useState({ width: 1000, height: 480 });
  function fitted(width: number, height: number) {
    const zoom = Math.max(
      0.65,
      Math.min(1, (width - 80) / 900, (height - 80) / 500),
    );
    return { zoom, x: (width - 1000 * zoom) / 2, y: (height - 600 * zoom) / 2 };
  }
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth,
        height = el.clientHeight;
      setViewport({ width, height });
      setView(fitted(width, height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  function reveal(x: number, y: number) {
    setView((v) => {
      const screenX = x * v.zoom + v.x;
      const screenY = y * v.zoom + v.y;
      if (
        screenX > 55 &&
        screenX < viewport.width - 55 &&
        screenY > 65 &&
        screenY < viewport.height - 65
      )
        return v;
      return {
        ...v,
        x: viewport.width / 2 - x * v.zoom,
        y: viewport.height / 2 - y * v.zoom,
      };
    });
  }
  useEffect(() => {
    const node = items.find((s) => s.id === selected);
    if (node) reveal(node.x, node.y);
  }, [selected, items, viewport.width, viewport.height]);
  const edges = sourceEdges(items);
  const positions = new Map(
    items.map((s) => [s.id, drag?.id === s.id ? { ...s, ...drag } : s]),
  );
  const neighbors = new Set(
    edges
      .filter((e) => e.from === selected || e.to === selected)
      .flatMap((e) => [e.from, e.to]),
  );
  function point(e: PointerEvent<SVGSVGElement>) {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
  }
  function start(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const target = e.target as SVGElement;
    const id = target.closest("[data-node]")?.getAttribute("data-node") || null;
    const p = point(e);
    const source = id ? positions.get(id) : null;
    gesture.current = {
      id,
      x: p.x,
      y: p.y,
      ox: source?.x ?? view.x,
      oy: source?.y ?? view.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g) return;
    const p = point(e);
    const dx = p.x - g.x,
      dy = p.y - g.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) g.moved = true;
    if (g.id)
      setDrag({
        id: g.id,
        x: Math.max(50, Math.min(950, g.ox + dx / view.zoom)),
        y: Math.max(50, Math.min(550, g.oy + dy / view.zoom)),
      });
    else setView((v) => ({ ...v, x: g.ox + dx, y: g.oy + dy }));
  }
  function end(e: PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g) return;
    if (g.id) {
      if (g.moved && drag) onMove(g.id, drag.x, drag.y);
      else onSelect(g.id);
    }
    gesture.current = null;
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function zoom(delta: number) {
    setView((v) => {
      const z = Math.max(0.5, Math.min(2.5, v.zoom + delta));
      const ratio = z / v.zoom;
      return {
        zoom: z,
        x: viewport.width / 2 - (viewport.width / 2 - v.x) * ratio,
        y: viewport.height / 2 - (viewport.height / 2 - v.y) * ratio,
      };
    });
  }
  return (
    <div className="source-graph">
      <div className="source-graph-legend">
        {Object.entries(typeNames).map(([key, name]) => (
          <span key={key}>
            <i style={{ background: colors[key as keyof typeof colors] }} />
            {name}
          </span>
        ))}
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        aria-label="재료 연결 그래프. 노드를 선택하면 상세 내용이 표시됩니다. 노드와 배경을 드래그할 수 있습니다."
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
      >
        <defs>
          <pattern
            id="source-dots"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".13" />
          </pattern>
        </defs>
        <rect
          width={viewport.width}
          height={viewport.height}
          fill="url(#source-dots)"
        />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
          {edges.map((e) => {
            const a = positions.get(e.from)!,
              b = positions.get(e.to)!;
            return (
              <line
                key={e.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={
                  e.from === selected || e.to === selected ? "selected" : ""
                }
              />
            );
          })}
          {items.map((s) => {
            const p = positions.get(s.id)!;
            const active = s.id === selected;
            return (
              <g
                key={s.id}
                data-node={s.id}
                transform={`translate(${p.x} ${p.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${typeNames[s.type]}: ${s.title}`}
                aria-pressed={active}
                onFocus={() => reveal(p.x, p.y)}
                className={`source-node ${active ? "selected" : ""} ${selected && !neighbors.has(s.id) && !active ? "muted" : ""}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                }}
              >
                <circle r={Math.max(31, 23 / view.zoom)} fill="transparent" />
                <circle
                  r={active ? 31 : 25}
                  fill={colors[s.type]}
                  className="source-node-halo"
                />
                <circle r={active ? 21 : 17} fill={colors[s.type]} />
                <text
                  y="5"
                  textAnchor="middle"
                  fill="white"
                  className="source-node-icon"
                >
                  {s.type === "note" ? "✎" : s.type === "quote" ? "”" : "↗"}
                </text>
                <text y="49" textAnchor="middle" className="source-node-title">
                  {s.title.length > 18 ? s.title.slice(0, 18) + "…" : s.title}
                </text>
                <title>{s.title}</title>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="source-graph-bottom">
        <p>노드 선택 · 드래그로 배치 · 배경을 끌어 이동</p>
        <div>
          <button
            aria-label="그래프 축소"
            onClick={() => zoom(-0.2)}
            disabled={view.zoom <= 0.5}
          >
            −
          </button>
          <span>{Math.round(view.zoom * 100)}%</span>
          <button
            aria-label="그래프 확대"
            onClick={() => zoom(0.2)}
            disabled={view.zoom >= 2.5}
          >
            +
          </button>
          <button
            aria-label="그래프 보기 초기화"
            onClick={() => setView(fitted(viewport.width, viewport.height))}
          >
            ↺
          </button>
        </div>
      </div>
    </div>
  );
}
