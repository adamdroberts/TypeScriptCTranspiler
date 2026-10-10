import {encode,decode,suspended} from './owner';
async function main():Promise<void>{
 const host:any=globalThis,saved:any=btoa,pending=suspended('abc');
 host.btoa=(value:any):string=>'replacement:'+value;
 const result=await pending;
 console.log('retained:'+(result==='YWJj'&&encode('abc')==='YWJj'&&btoa('abc')==='replacement:abc'));
 host.btoa=saved;const actual:any[]=['YWJj',undefined,17];const decodeActual:any=decode;console.log('decode:'+decodeActual(...actual));
 console.log('identity:'+(encode===btoa&&decode===atob&&encode.name==='btoa'&&decode.length===1));
}main();
