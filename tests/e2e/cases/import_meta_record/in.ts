import {metadata,read} from './leaf';
const own:any=import.meta;const key=Symbol('meta');
metadata.token={value:17};metadata[key]=31;
console.log(own===import.meta,metadata===read(),own!==metadata);
console.log(Object.getPrototypeOf(own)===null,Object.isExtensible(own),Object.keys(own).length);
console.log(read().token.value,read()[key]);
Object.defineProperty(own,'code',{value:'retained',writable:true,enumerable:true,configurable:true});
console.log(Object.getOwnPropertyDescriptor(own,'code')!.enumerable,own.code);
function rejected(callback:()=>unknown):boolean {
    try { callback(); return false; } catch(error) { return error instanceof SyntaxError; }
}
console.log(rejected(()=>eval('import.meta')),rejected(()=>Function('return import.meta')));
let notCallable=false,notConstructible=false;
try { (import.meta as any)(); } catch(error) { notCallable=error instanceof TypeError; }
try { new (import.meta as any)(); } catch(error) { notConstructible=error instanceof TypeError; }
console.log(typeof import.meta,notCallable,notConstructible);
