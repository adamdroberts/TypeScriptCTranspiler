import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* An instance field initializer runs inside every construction (after
 * super() returns in a derived class), not at its position in the class
 * body. A value it reads is the value at construction time: a binding
 * reassigned between the class definition and `new`, or a property the base
 * constructor wrote. A static field initializer runs once, at class
 * definition. Each generated program evaluates what an initializer read; the
 * graph must fail closed or contain every source Node evaluates. A 32-deep
 * derived-class chain whose fields read their base's fields is the depth
 * stress (derived construction chains cost far more than linear time in the
 * analysis; see docs/todo.md). */

const shapes:Record<string,string>={
 reassignedBefore:'var src="1;";class C {f=src;} src="2;"; observe(new C().f);',
 reassignedAfter:'var src="1;";class C {f=src;} const item=new C(); src="2;"; observe(item.f);',
 baseConstructorWrite:'class Base {constructor(){this.seed="2;";}} class C extends Base {f=this.seed;} observe(new C().f);',
 baseArgumentWrite:'class Base {constructor(value){this.seed=value;}} class C extends Base {f=this.seed;} observe(new C("2;").f);',
 explicitDerived:'class Base {constructor(){this.seed="2;";}} class C extends Base {f=this.seed; constructor(){super();}} observe(new C().f);',
 classExpression:'var src="1;";const C=class {f=src;}; src="2;"; observe(new C().f);',
 privateField:'var src="1;";class C {#f=src; read(){return this.#f;}} src="2;"; observe(new C().read());',
 arrowCapture:'var src="1;";class C {f=()=>src;} const item=new C(); src="2;"; observe(item.f());',
 staticField:'var src="1;";class C {static f=src;} src="2;"; observe(C.f);',
 nestedConstruction:'var src="1;";function make(){class C {f=src;} return new C();} src="2;"; observe(make().f);',
 repeated:'var src="1;";class C {f=src;} for(let index=0;index<2;index++){observe(new C().f); src="2;";}',
};

test('field initializers read the values present at construction',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const unsound=names.flatMap((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]!.replaceAll('observe(','eval(')}]);
  const sources=graph.directEvalSources.map(record=>record.source);
  return graph.error===null&&!observed[index]!.every(value=>sources.includes(value))?[{name,sources,node:observed[index]}]:[];
 });
 expect(unsound).toEqual([]);
 // A static initializer runs at definition: the later write is not visible.
 const definition=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes.staticField!.replaceAll('observe(','eval(')}]);
 expect({error:definition.error,sources:definition.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['1;']});
},120_000);

test('a 32-deep derived chain reads each base field after its constructor ran',()=>{
 const depth=32,classes=['class C0 {constructor(){this.f0="3;";}}'];
 for(let index=1;index<=depth;index++)classes.push(`class C${index} extends C${index-1} {f${index}=this.f${index-1};}`);
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:classes.join('\n')+`\neval(new C${depth}().f${depth});\n`}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['3;']});
},300_000);
