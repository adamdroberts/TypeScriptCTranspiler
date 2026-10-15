import{expect,test}from'bun:test';
import{reviewedSourcePathRule,type PathRule}from'./inventory';
const row=(prefix:string,esid:string|undefined,owner:string):PathRule=>({prefix,esid,clauses:[owner],reason:'independent source owner plan',reviewedBy:'test'});
// The oracle walks actual source-directory ancestors rather than repeating
// the implementation's prefix comparison and descriptor scan.
function oracle(source:string,esid:string|undefined,rules:readonly PathRule[]):PathRule|undefined{
 const owners=new Map(rules.filter(rule=>rule.esid===esid).map(rule=>[rule.prefix,rule]));let end=source.lastIndexOf('/');
 while(end>=0){const owner=owners.get(source.slice(0,end+1));if(owner)return owner;end=source.lastIndexOf('/',end-1);}return undefined;
}
test('reviewed source-qualified metadata keeps placeholder owners and path boundaries distinct',()=>{
 const rules=[row('test/outer/','pending','outer'),row('test/outer/inner/','pending','inner'),row('test/outer/','informative','informative'),row('test/outer/',undefined,'legacy')];
 for(const source of ['test/outer/a.js','test/outer/inner/a.js','test/outer/inner/deeper/a.js','test/outer-sibling/a.js','test/unrelated/a.js'])for(const esid of [undefined,'pending','informative','other'])for(const order of [rules,[...rules].reverse()])expect(reviewedSourcePathRule(source,esid,order)).toBe(oracle(source,esid,order));
});
test('one deep source directory uses the same reviewed owner collection',()=>{
 const parts=Array.from({length:4096},(_,index)=>'level'+index),prefix='test/'+parts.join('/')+'/',rules=[row('test/','pending','root'),row(prefix,'pending','leaf')];
 expect(reviewedSourcePathRule(prefix+'scenario.js','pending',rules)).toBe(oracle(prefix+'scenario.js','pending',rules));expect(reviewedSourcePathRule(prefix+'scenario.js','unknown',rules)).toBeUndefined();
});
