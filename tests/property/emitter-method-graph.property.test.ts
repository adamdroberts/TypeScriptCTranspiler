import {expect,test} from 'bun:test';
import ts from 'typescript';
import {emitterMethodGraph} from '../../src/tools/emitter-method-graph';

function graph(text:string){
 const filename='/emitter-method-graph.ts';
 const options:ts.CompilerOptions={target:ts.ScriptTarget.ESNext,noLib:true,noEmit:true};
 const host=ts.createCompilerHost(options);
 host.getSourceFile=(file,version)=>file===filename?ts.createSourceFile(file,text,version,true):undefined;
 host.fileExists=file=>file===filename;host.readFile=file=>file===filename?text:undefined;
 const program=ts.createProgram([filename],options,host),source=program.getSourceFile(filename)!;
 const emitter=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='Emitter') as ts.ClassDeclaration;
 return emitterMethodGraph(program,emitter);
}

const forms=[
 'this.live()',
 'this["live"]()',
 'const retained=this; const alias=retained; function callback(){alias.live()} callback()',
 'const callback=()=>this.live(); callback()',
 'const retained=this.live; retained.call(this)',
];

test('method declaration graph retains references, aliases, callbacks and external roots',()=>{
 for(const form of forms){
  const result=graph(`class Emitter {run(){${form}} live(){this.cycle()} cycle(){this.live()} orphan(){this.orphan()} external(){this.externalLeaf()} externalLeaf(){} initialized(){} field=this.initialized;}
  const emitter=new Emitter();const callback=()=>emitter.external();`);
  expect([...result.roots].sort()).toEqual(['external','initialized','run']);
  expect([...result.reachable].sort()).toEqual(['cycle','external','externalLeaf','initialized','live','run']);
 }
 const shadow=graph(`class Other {orphan(){}} class Emitter {run(){const emitter=new Other();emitter.orphan();function foreign(){return this.orphan()}} orphan(){}}`);
 expect([...shadow.reachable]).toEqual(['run']);
});

test('unresolved dynamic emitter method selection fails closed',()=>{
 expect(()=>graph(`class Emitter {run(name:string){return this[name]()} live(){}}`)).toThrow('unresolved emitter method reference');
});

test('one deep reverse-ordered retained method graph follows independent reachability',()=>{
 const depth=4096;
 const links=new Map<string,string>(Array.from({length:depth},(_,i)=>[`step_${i}`,`step_${(i+1)%depth}`]));
 const text=`class Emitter {run(){this.step_0()} ${[...links].reverse().map(([from,to])=>`${from}(){this.${to}()}`).join('\n')} orphan(){this.orphan()}}`;
 const expected=new Set<string>(['run']),pending=['step_0'];
 while(pending.length){const name=pending.pop()!;if(expected.has(name))continue;expected.add(name);pending.push(links.get(name)!)}
 expect(new Set(graph(text).reachable)).toEqual(expected);
});
