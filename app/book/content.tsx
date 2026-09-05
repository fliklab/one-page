import { createElement, type ReactNode } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";

import template from "../../content/book.json";

export const initialBook = template.book;

export type Book = typeof initialBook;
export type AstNode = {
  type: string;
  value?: string;
  name?: string;
  depth?: number;
  url?: string;
  alt?: string;
  title?: string;
  ordered?: boolean;
  start?: number;
  children?: AstNode[];
  attributes?: { type: string; name?: string; value?: unknown; position?: SourcePosition }[];
  identifier?: string;
  position?: SourcePosition;
};
export type SourcePosition = {
  start: { line: number; offset?: number };
  end?: { line: number; offset?: number };
};
export type TextEditor = (value: string, position: SourcePosition | undefined, attribute?: string) => ReactNode;
export function plain(node: AstNode): string {
  return node.value ?? node.children?.map(plain).join("") ?? "";
}
export function safeUrl(value: string, image = false) {
  if (/^(https?:\/\/|\/[^/]|\.\/|\.\.\/|#)/i.test(value)) return value;
  if (image && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value))
    return value;
  if (!image && /^(mailto:|tel:)/i.test(value)) return value;
  return "";
}
export function Chapter({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return <h1 id={id}>{children}</h1>;
}
export function Section({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return <h2 id={id}>{children}</h2>;
}
export function Callout({
  children,
  title,
}: {
  children?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <aside className="book-callout">
      {title && <strong>{title}</strong>}
      {children}
    </aside>
  );
}
export function Figure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt?: string;
  caption?: ReactNode;
}) {
  const url = safeUrl(src, true);
  return (
    <figure>
      {url ? (
        <img src={url} alt={alt || (typeof caption === "string" ? caption : "참고 이미지")} />
      ) : (
        <p>이미지 주소를 확인해 주세요.</p>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
const supported = new Set(["Chapter", "Section", "Callout", "Figure"]);
export function parseBook(source: string, format = "mdx") {
  // Treat MDX as content, never execute uploaded JavaScript.
  try {
    const processor = unified().use(remarkParse).use(remarkGfm);
    if (format === "mdx") processor.use(remarkMdx);
    const tree = processor.parse(source) as AstNode;
    const definitions = new Map(
      tree.children
        ?.filter((n) => n.type === "definition")
        .map((n) => [n.identifier, n]),
    );
    const headings: { id: string; title: string; depth: number }[] = [];
    function validate(node: AstNode) {
      if (node.type === "linkReference" || node.type === "imageReference") {
        const definition = definitions.get(node.identifier);
        if (definition) {
          node.type = node.type === "linkReference" ? "link" : "image";
          node.url = definition.url;
          node.title = definition.title;
        }
      }
      if (
        ["mdxjsEsm", "mdxFlowExpression", "mdxTextExpression", "html"].includes(
          node.type,
        )
      )
        throw new Error(
          "import, JavaScript 표현식, HTML은 지원하지 않습니다. Markdown과 Chapter, Section, Callout, Figure를 사용해 주세요.",
        );
      if (node.type.startsWith("mdxJsx")) {
        if (!node.name || !supported.has(node.name))
          throw new Error(
            `지원하지 않는 컴포넌트: ${node.name || "Fragment"}. Chapter, Section, Callout, Figure를 사용할 수 있습니다.`,
          );
        if (
          node.attributes?.some(
            (a) =>
              a.type !== "mdxJsxAttribute" ||
              (a.value !== null && typeof a.value !== "string"),
          )
        )
          throw new Error(
            '컴포넌트 속성은 title="제목"처럼 문자열로 입력해 주세요.',
          );
      }
      if (
        node.type === "heading" ||
        node.name === "Chapter" ||
        node.name === "Section"
      ) {
        node.identifier = `section-${headings.length + 1}`;
        headings.push({
          id: node.identifier,
          title: plain(node),
          depth: node.depth ?? (node.name === "Chapter" ? 1 : 2),
        });
      }
      node.children?.forEach(validate);
    }
    validate(tree);
    return { tree, headings, error: "" };
  } catch (error) {
    return {
      tree: { type: "root", children: [] } as AstNode,
      headings: [],
      error:
        error instanceof Error ? error.message : "원고 형식을 확인해 주세요.",
    };
  }
}
export function renderBook(
  node: AstNode,
  key = "root",
  idPrefix = "",
  editText?: TextEditor,
): ReactNode {
  const children = node.children?.map((n, i) =>
    renderBook(n, `${key}-${i}`, idPrefix, editText),
  );
  const props = { "data-block": key };
  switch (node.type) {
    case "root":
      return children;
    case "definition":
      return null;
    case "text":
      return editText ? editText(node.value || "", node.position) : node.value;
    case "paragraph":
      return (
        <p key={key} {...props}>
          {children}
        </p>
      );
    case "heading":
      return createElement(
        `h${node.depth}`,
        { ...props, key, id: idPrefix + node.identifier },
        children,
      );
    case "strong":
      return <strong key={key}>{children}</strong>;
    case "emphasis":
      return <em key={key}>{children}</em>;
    case "delete":
      return <del key={key}>{children}</del>;
    case "break":
      return <br key={key} />;
    case "thematicBreak":
      return <hr key={key} {...props} />;
    case "blockquote":
      return (
        <blockquote key={key} {...props}>
          {children}
        </blockquote>
      );
    case "list":
      return node.ordered ? (
        <ol key={key} {...props} start={node.start}>
          {children}
        </ol>
      ) : (
        <ul key={key} {...props}>
          {children}
        </ul>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "inlineCode":
      return <code key={key}>{node.value}</code>;
    case "code":
      return (
        <pre key={key} {...props}>
          <code>{node.value}</code>
        </pre>
      );
    case "link":
      return (
        <a
          key={key}
          href={safeUrl(node.url || "")}
          target="_blank"
          rel="noreferrer"
          onClick={editText ? (event) => event.preventDefault() : undefined}
        >
          {children}
        </a>
      );
    case "image":
      return (
        <img
          key={key}
          src={safeUrl(node.url || "", true) || undefined}
          alt={node.alt || ""}
          title={node.title}
        />
      );
    case "table":
      return (
        <table key={key} {...props}>
          <tbody>{children}</tbody>
        </table>
      );
    case "tableRow":
      return <tr key={key}>{children}</tr>;
    case "tableCell":
      return <td key={key}>{children}</td>;
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement": {
      const attributes = Object.fromEntries(
        (node.attributes || []).map((a) => [a.name, a.value]),
      );
      const headingChildren = node.children
        ?.flatMap((n) => (n.type === "paragraph" ? n.children || [] : [n]))
        .map((n, i) => renderBook(n, `${key}-heading-${i}`, idPrefix, editText));
      const editableAttribute = (name: string) => {
        const attribute = node.attributes?.find((a) => a.name === name);
        return editText && attribute && typeof attribute.value === "string"
          ? editText(attribute.value, attribute.position, name)
          : attributes[name];
      };
      if (node.name === "Chapter")
        return (
          <Chapter key={key} id={idPrefix + node.identifier}>
            {headingChildren}
          </Chapter>
        );
      if (node.name === "Section")
        return (
          <Section key={key} id={idPrefix + node.identifier}>
            {headingChildren}
          </Section>
        );
      if (node.name === "Callout")
        return (
          <Callout key={key} title={editableAttribute("title")}>
            {children}
          </Callout>
        );
      if (node.name === "Figure")
        return (
          <Figure
            key={key}
            src={attributes.src || ""}
            alt={attributes.alt}
            caption={editableAttribute("caption")}
          />
        );
      return null;
    }
    default:
      return children || node.value || null;
  }
}
