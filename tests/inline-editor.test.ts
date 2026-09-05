import test from "node:test";
import assert from "node:assert/strict";
import { parseBook, plain, type AstNode } from "../app/book/content";
import { applyTextEdits, textEdit } from "../app/book/inline-source";

function nodes(node: AstNode): AstNode[] {
  return [node, ...(node.children || []).flatMap(nodes)];
}

test("inline edits preserve untouched Markdown, formatting, links and MDX", () => {
  const source = '# 제목\n\n문장 **강조**와 [링크](https://example.com).\n\n<Figure src="/image.svg" caption="캡션" />\n';
  const tree = parseBook(source).tree;
  const text = nodes(tree).filter(n => n.type === "text");
  const edit = textEdit(text[1].position, '바뀐 문장 {안전} <태그> & *기호* ');
  assert.ok(edit);
  const updated = applyTextEdits(source, [edit]);
  const parsed = parseBook(updated);
  assert.equal(parsed.error, "");
  assert.ok(plain(parsed.tree).includes('바뀐 문장 {안전} <태그> & *기호* '));
  assert.ok(updated.endsWith('**강조**와 [링크](https://example.com).\n\n<Figure src="/image.svg" caption="캡션" />\n'));
});

test("multiple edits use original offsets even when text lengths change", () => {
  const source = '# 처음\n\n가나다\n\n마지막\n';
  const text = nodes(parseBook(source).tree).filter(n => n.type === "text");
  const edits = [textEdit(text[2].position, '끝'), textEdit(text[0].position, '훨씬 긴 제목'), textEdit(text[1].position, '')];
  assert.equal(applyTextEdits(source, edits.filter(e => e !== null)), '# 훨씬 긴 제목\n\n\n\n끝\n');
  assert.equal(applyTextEdits(source, []), source);
  assert.throws(() => applyTextEdits(source, [{start: 0, end: 3, replacement: ''}, {start: 2, end: 4, replacement: ''}]));
});

test("editing MDX captions and box titles preserves attributes and safely encodes quotes", () => {
  const source = '<Callout title="원래 제목">\n본문\n</Callout>\n\n<Figure src="/image.svg" alt="그림" caption="원래 캡션" />\n';
  const elements = nodes(parseBook(source).tree).filter(n => n.name);
  const title = elements[0].attributes?.find(a => a.name === "title");
  const caption = elements[1].attributes?.find(a => a.name === "caption");
  const edits = [textEdit(title?.position, '새 "제목" & 내용', 'title'), textEdit(caption?.position, '새 캡션 {text}', 'caption')];
  const updated = applyTextEdits(source, edits.filter(e => e !== null));
  const parsed = parseBook(updated);
  assert.equal(parsed.error, "");
  const result = nodes(parsed.tree).filter(n => n.name);
  assert.equal(result[0].attributes?.find(a => a.name === "title")?.value, '새 "제목" & 내용');
  assert.equal(result[1].attributes?.find(a => a.name === "caption")?.value, '새 캡션 {text}');
  assert.ok(updated.includes('src="/image.svg" alt="그림"'));
});
