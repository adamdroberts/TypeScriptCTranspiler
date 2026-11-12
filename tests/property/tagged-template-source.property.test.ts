import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A tagged template calls its tag (a member tag with its base as `this`, a
 * name a with object supplies with that object) with the site's template
 * object and the substitution values, whether or not the result is used.
 * The template object is one frozen Array per site: the cooked strings
 * (undefined for an invalid escape) and a frozen, non-enumerable `raw`
 * Array of the raw strings, CR and CRLF read as LF; writes to either throw
 * in strict code and are ignored otherwise. Each generated Script evaluates
 * what the tag saw or did; the graph must fail closed or contain every
 * source Node evaluates, and the shapes listed as finite must stay finite.
 * 256 chained tagged templates, each returning its substitution, are the
 * depth stress. */

const shapes:Record<string,string>={
 tagEffect:'var g="1;";function t(s){g="2;"}t`x`;observe(g);',
 cooked:'function t(s){return s[0]}observe(t`3;`);',
 raw:'function t(s){return s.raw[0]}observe(t`4;`);',
 rawEscape:'function t(s){return s.raw[0].length+";"}observe(t`a\\n`);',
 substitution:'function t(s,a){return a}observe(t`x${"5;"}y`);',
 invalidEscape:'function t(s){return String(s[0])+";"}observe(t`\\unicode`);',
 frozenStrict:'function t(s){"use strict";try{s[0]="x";return "6;"}catch(e){return "7;"}}observe(t`a`);',
 frozenSloppy:'function t(s){s[0]="8;";return s[0]}observe(t`9;`);',
 frozenRaw:'function t(s){"use strict";try{s.raw[0]="x";return "10;"}catch(e){return "11;"}}observe(t`a`);',
 frozenAdd:'function t(s){"use strict";try{s.extra="x";return "12;"}catch(e){return "13;"}}observe(t`a`);',
 sameSite:'function t(s){return s}function f(){return t`a`}observe(f()===f()?"14;":"15;");',
 memberThis:'var o={k:"16;",t(s){return this.k}};observe(o.t`x`);',
 parenMemberThis:'var o={k:"17;",t(s){return this.k}};observe((o.t)`x`);',
 withThis:'var o={t(s){return this===o?"18;":"19;"}};with(o){observe(t`x`)}',
 unusedValue:'var g="20;";var o={t(s){g="21;"}};o.t`x`;observe(g);',
 throwingTag:'var out="22;";function t(){throw "23;"}try{t`x`}catch(e){out=e}observe(out);',
 lengths:'function t(s,...a){return s.length+":"+s.raw.length+":"+a.length+";"}observe(t`a${1}b${2}c`);',
 crlf:'function t(s){return s.raw[0].length+";"}observe(eval("t`a\\r\\nb`"));',
 evalTag:'var r=eval`24;`;observe(Array.isArray(r)?"25;":"26;");',
 functionTag:'var f=Function`return "27;"`;observe(f());',
};
const finite=['tagEffect','cooked','raw','rawEscape','substitution','invalidEscape','frozenStrict','frozenSloppy','frozenRaw','frozenAdd','sameSite','memberThis','parenMemberThis','withThis','unusedValue','throwingTag','lengths','evalTag'];

test('tagged templates call their tag with the frozen template object and the substitutions',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=names.map((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]!.replaceAll('observe(','eval(')}]);
  return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source),node:observed[index]!};
 });
 // Sound: a finite graph contains every source Node evaluates.
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value)))).toEqual([]);
 // Precise: the listed shapes are finite.
 expect(results.filter(result=>finite.includes(result.name)&&result.error!==null).map(result=>result.name)).toEqual([]);
},120_000);

test('256 chained tagged templates stay finite',()=>{
 const lines=['function t(s,v){return v}','const v0="28;";'];
 for(let index=1;index<=256;index++)lines.push(`const v${index}=t\`a\${v${index-1}}b\`;`);
 lines.push('eval(v256);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['28;']});
},300_000);
