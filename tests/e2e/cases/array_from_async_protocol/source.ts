export const factory:any=Array.fromAsync;
export const marker:any={token:31};
export function makeSource(value:any):any{
 return {[Symbol.asyncIterator](){let done=false;return {next(){return new Promise((resolve:any)=>queueMicrotask(()=>{const result={done,value};done=true;resolve(result);}));}};}};
}
