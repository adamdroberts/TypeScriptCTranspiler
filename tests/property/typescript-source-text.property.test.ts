import {expect,test} from 'bun:test';
import ts from 'typescript';
import {callableSourceText} from '../../src/callable-source-text';

// Function.prototype.toString source text for TypeScript callables is the
// whitespace-preserving type erasure of the definition span. Independent Node
// (TSC2C_NODE_REFERENCE, which must provide module.stripTypeScriptTypes) is
// the oracle: every callable span must equal the same span of Node's
// strip-only output, and spans strip-only rejects fall back to native (null).
const oracle=process.env.TSC2C_NODE_REFERENCE??'node';
const erasable=[
 'function plain(a: number, b?: string): void { return; }',
 'function generic<T, U extends T = T>(this: any, value: T, other: U): T { return value as T; }',
 'function nonNull(x: string | null): number { return x!.length satisfies number; }',
 'const arrow = (x: number, y: number): number => x + y;',
 'const genericArrow = <T,>(value: T): T => value;',
 'const expression = function named(value: unknown): boolean { return typeof value === "string"; };',
 'function locals(): number { type Local = number; interface Shape { a: Local } const s: Shape = { a: 1 }; let n!: number; n = s.a; return n; }',
 'function calls(): number[] { const list = new Array<number>(); list.push(Math.max<number>(1, 2) as any); return list; }',
 'class Point<T> implements Shape { private x: number = 1; protected readonly y?: number; declare z: string; static s: T | null = null; public get value(): number { return this.x; } move(dx: number, dy?: number): this { return this; } }',
 'abstract class Base { abstract area(): number; describe(): string { return "base"; } }',
 'class Overloads { run(a: string): string; run(a: number): number; run(a: any): any { return a; } }',
 'function multi(\n  first: number,\n  second: string // trailing comment\n): Promise<void> {\n  return Promise.resolve();\n}',
 'async function* stream<T>(items: T[]): AsyncGenerator<T, void, unknown> { for (const item of items) yield item; }',
 'class Derived extends Base<number> { area(): number { return 2; } }',
];
const rejected=[
 'function withEnum(): number { enum Color { Red } return Color.Red; }',
 'class Props { constructor(private value: number) {} }',
 'function angle(x: unknown): number { return (<number>x) + 1; }',
];

test('TypeScript callable source text equals Node strip-only erasure of the definition span',()=>{
 const source=[...erasable,...rejected].join('\n');
 const probe=Bun.spawnSync([oracle,'-e','const m=require("node:module");process.stdout.write(m.stripTypeScriptTypes(require("node:fs").readFileSync(0,"utf8")))'],{stdin:new TextEncoder().encode(erasable.join('\n')),stdout:'pipe',stderr:'pipe'});
 expect({oracle,code:probe.exitCode}).toEqual({oracle,code:0});
 const stripped=probe.stdout.toString();
 const file=ts.createSourceFile('subject.ts',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.TS);
 const erasableEnd=erasable.join('\n').length;
 const checked:string[]=[];let rejectedCount=0;
 const visit=(node:ts.Node):void=>{
  if(ts.isFunctionLike(node)&&'body' in node&&node.body||ts.isClassLike(node)){
   const text=callableSourceText(node);
   if(node.end<=erasableEnd){
    let start=node.getStart(file);
    for(const modifier of ts.canHaveModifiers(node)?ts.getModifiers(node)??[]:[])
     if(modifier.kind===ts.SyntaxKind.StaticKeyword){const scanner=ts.createScanner(ts.ScriptTarget.ESNext,true,ts.LanguageVariant.Standard,file.text,undefined,modifier.end);scanner.scan();start=scanner.getTokenPos();}
    expect({span:file.text.slice(node.getStart(file),node.end),text}).toEqual({span:file.text.slice(node.getStart(file),node.end),text:stripped.slice(start,node.end)});
    checked.push(file.text.slice(node.getStart(file),node.getStart(file)+20));
   }else if(ts.isFunctionLike(node)&&node.parent&&(ts.isSourceFile(node.parent)||ts.isClassLike(node.parent))){
    expect({span:file.text.slice(node.getStart(file),node.end),text}).toEqual({span:file.text.slice(node.getStart(file),node.end),text:null});
    rejectedCount++;
   }
  }
  ts.forEachChild(node,visit);
 };
 visit(file);
 expect(checked.length).toBe(19);
 expect(rejectedCount).toBe(3);
});
