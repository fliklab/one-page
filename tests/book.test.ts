import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { applyPatch } from 'diff';
import { createBookPatch, serializeSnapshot } from '../app/book/patch';
import template from '../content/book.json';
import { bookLeaves, extraFields, normalizeBook, spreadPages } from '../app/book/structure';
import { parseBook } from '../app/book/content';
import { sampleSources, sourceEdges, connectedSources, validateSources } from '../app/sources/model';

test('no changes produces no patch, including validated template sources',()=>{
 assert.equal(createBookPatch(template),'');
 assert.equal(createBookPatch({...template,sources:validateSources(template.sources)}),'');
});
test('patch preserves manuscript, jacket, style and sources, including non-ASCII text',()=>{
 const changed=structuredClone(template);
 changed.book.title='나의 책 📖';changed.book.source+='\n\n새 문장과 중괄호 { text }\n';changed.book.backCover='data:image/png;base64,AAAA';changed.settings.fontSize=22;changed.sources=[];
 const patch=createBookPatch(changed);
 assert.match(patch,/--- a\/content\/book.json/);assert.match(patch,/\+\+\+ b\/content\/book.json/);
 assert.equal(applyPatch(serializeSnapshot(template),patch),serializeSnapshot(changed));
});
test('downloaded patch passes git apply --check against the real repository snapshot',()=>{
 const dir=mkdtempSync(join(tmpdir(),'one-page-patch-'));
 try {
  mkdirSync(join(dir,'content'));
  const source=readFileSync(new URL('../content/book.json',import.meta.url),'utf8');
  assert.equal(source,serializeSnapshot(template),'Format content/book.json with two spaces and a final newline before building.');
  writeFileSync(join(dir,'content/book.json'),source);
  const changed=structuredClone(template);changed.book.author='새로운 저자';changed.book.publicationInfo='초판 2026\nISBN 준비 중';
  writeFileSync(join(dir,'changes.patch'),createBookPatch(changed));
  execFileSync('git',['init','-q'],{cwd:dir});
  execFileSync('git',['apply','--check','changes.patch'],{cwd:dir});
  execFileSync('git',['apply','changes.patch'],{cwd:dir});
  assert.deepEqual(JSON.parse(readFileSync(join(dir,'content/book.json'),'utf8')),changed);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('old book files keep their manuscript without injecting new sample jacket text',()=>{
 const legacy=Object.fromEntries(Object.entries(template.book).filter(([key])=>!extraFields.includes(key as typeof extraFields[number])));
 const book=normalizeBook(legacy);assert.equal(book.source,template.book.source);assert.equal(book.frontFlap,'');assert.equal(book.backCover,'');
 assert.deepEqual(normalizeBook(JSON.parse(JSON.stringify(template.book))),template.book);
});
test('single and spread traversal cover every leaf exactly once, in both directions',()=>{
 for(let n=1;n<15;n++)for(const book of [template.book,{...template.book,frontFlap:'',publicationInfo:'',backFlap:'',backCoverText:''}]){
  const leaves=bookLeaves(book,Array.from({length:n},(_,i)=>({label:`page ${i}`,excerpt:''})));
  const forward:number[]=[],reverse:number[]=[];
  for(let p=0;p<leaves.length;){const visible=spreadPages(p,leaves,true);forward.push(...visible);for(const i of visible)assert.deepEqual(spreadPages(i,leaves,true),visible);p=visible.at(-1)!+1;}
  for(let p=leaves.length-1;p>=0;){const visible=spreadPages(p,leaves,true);reverse.push(...visible.slice().reverse());p=visible[0]-1;}
  assert.deepEqual(forward,leaves.map((_,i)=>i));assert.deepEqual(reverse,forward.slice().reverse());
  for(let i=0;i<leaves.length;i++)assert.deepEqual(spreadPages(i,leaves,false),[i]);
 }
});
test('Markdown and supported MDX are content; expressions and imports are rejected',()=>{
 assert.equal(parseBook(template.book.source).error,'');
 assert.equal(parseBook('# Hello\n\n{ ordinary text }','md').error,'');
 for(const source of ['{alert(1)}','import X from "x"','<Unknown />','<Callout title={danger()} />'])assert.notEqual(parseBook(source).error,'');
});
test('source connections are undirected, deduplicated, and validated on import',()=>{
 const edges=sourceEdges(sampleSources);assert.equal(new Set(edges.map(e=>e.id)).size,edges.length);
 for(const s of sampleSources)for(const neighbor of connectedSources(sampleSources,s.id))assert.ok(connectedSources(sampleSources,neighbor.id).some(n=>n.id===s.id));
 assert.throws(()=>validateSources([...sampleSources,sampleSources[0]]));
 assert.equal(validateSources([{...sampleSources[0],url:'javascript:alert(1)'}])[0].url,'');
});
