// @ts-nocheck
import {parse,error,map,uri,delayed} from './owner';
const originals=[JSON,Error,Map,encodeURI,Function],marker={token:89},events:any[]=[];
JSON={get parse(){events.push('get');return function(value:any){events.push('call');return value;};}};console.log(parse(marker)===marker,events.join('|'));JSON=originals[0];
Error=function(value:any){return value;};console.log(error(marker)===marker);const pending=delayed(marker);Error=originals[1];
Map=function(value:any){return value;};console.log(map(marker)===marker);Map=originals[2];
encodeURI=function(value:any){return value;};console.log(uri(marker)===marker);encodeURI=originals[3];
Function=function(...args:any[]){return args;};const symbol=Symbol('argument');const made:any=Function(marker,symbol);console.log(made[0]===marker,made[1]===symbol);Function=originals[4];
let body='return 1;';const literal=Function(body);console.log(literal()===1);
async function observe():Promise<void>{const result=await pending;console.log(result===marker);}observe();
