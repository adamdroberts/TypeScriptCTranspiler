import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* Writing an Array's "length" (assignment, Object.defineProperty, a write at
 * a key that may be "length") runs ArraySetLength: the value is converted
 * with ToNumber, running its own valueOf; ToUint32 must equal it, else
 * RangeError (a BigInt throws TypeError); the stored length is that Number,
 * and every integer index at or above it is deleted, so a later read of
 * such an index reaches the prototype chain (an inherited getter there).
 * A length the analysis does not know may delete any index; a larger one
 * keeps the elements. Each generated Script evaluates what it read; the
 * graph must fail closed or contain every source Node evaluates, and the
 * shapes listed as finite must stay finite. 256 arrays, each built from the
 * previous one and truncated, are the depth stress. */

const shapes:Record<string,string>={
 truncateInherited:'Object.defineProperty(Array.prototype,"0",{get(){return "2;"},configurable:true});function f(){const o=["1;"];o.length=0;return o[0]}observe(f());',
 truncateTop:'Object.defineProperty(Array.prototype,"0",{get(){return "4;"},configurable:true});const o=["3;"];o.length=0;observe(o[0]);',
 truncateKeepsLower:'const o=["5;","6;"];o.length=1;observe(o[0]);observe(String(o[1])+";");',
 growKeeps:'const o=["7;"];o.length=3;observe(o[0]);',
 unknownLength:'var n=Math.random()<2?0:1;const o=["8;"];o.length=n;observe(String(o[0])+";");',
 stringLength:'const o=["9;"];o.length="0";observe(String(o[0])+";");',
 valueOfLength:'var g="10;";const o=["x"];o.length={valueOf(){g="11;";return 1}};observe(g);',
 storedNumber:'const o=["x"];o.length={valueOf(){return 1}};observe(typeof o.length==="number"?"12;":"13;");',
 defineLength:'const o=["14;"];Object.defineProperty(o,"length",{value:0});observe(String(o[0])+";");',
 unknownIndexThenTruncate:'var i=Math.random()<2?0:1;const o=[];o[i]="15;";o.length=0;observe(String(o[0])+";");',
 unknownKeyLength:'var k=Math.random()<2?"length":"x";const o=["16;"];o[k]=0;observe(String(o[0])+";");',
 rangeError:'var out="17;";const o=[1];try{o.length=-1}catch(e){out=e.name==="RangeError"?"18;":"19;"}observe(out);',
 rangeErrorFraction:'var out="20;";const o=[1];try{o.length=1.5}catch(e){out="21;"}observe(out);',
 bigintLength:'var out="22;";const o=[1];try{o.length=1n}catch(e){out=e.name==="TypeError"?"23;":"24;"}observe(out);',
 lengthRead:'const o=["x","y"];o.length=1;observe(o.length+";");',
 numericKeyStore:'var g="25;";var i=Math.floor(Math.random());const o=[1];o[i]={valueOf(){g="26;";return 0}};observe(g);',
};
const finite=['numericKeyStore','truncateInherited','truncateTop','truncateKeepsLower','growKeeps','unknownLength','stringLength','valueOfLength','storedNumber','defineLength','unknownIndexThenTruncate','unknownKeyLength','rangeError','rangeErrorFraction','bigintLength','lengthRead'];

test('ArraySetLength converts the length and deletes the indices at or above it',()=>{
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
 // Precise: the listed shapes are finite, and a numeric key is never "length".
 expect(results.filter(result=>finite.includes(result.name)&&result.error!==null).map(result=>result.name)).toEqual([]);
 expect(results.find(result=>result.name==='numericKeyStore')!.sources).toEqual(['25;']);
},120_000);

test('256 truncated arrays built from one another stay finite',()=>{
 const lines=['const a0=["25;","x"];'];
 for(let index=1;index<=256;index++)lines.push(`const a${index}=[a${index-1}[0],"x"];a${index}.length=1;`);
 lines.push('eval(a256[0]);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['25;']});
},300_000);
