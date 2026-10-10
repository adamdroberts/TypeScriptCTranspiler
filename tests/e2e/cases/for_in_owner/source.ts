export const marker:any={token:11};
export const symbol=Symbol('excluded');
const prototype:any={inherited:marker,hidden:marker};
export const owner:any=Object.create(prototype);
owner[1]=marker;owner.visible=symbol;owner[symbol]=marker;
Object.defineProperty(owner,'hidden',{value:marker,enumerable:false});
export function* enumerate():Generator<string>{for(const key in owner)yield key;}
export async function retain(source:any):Promise<any[]>{
 const callbacks:any[]=[];
 for(const key in source){await Promise.resolve(marker);callbacks.push(()=>[key,source[key]]);}
 return callbacks;
}
export function shared():any[]{
 const callbacks:any[]=[];
 for(var key in owner)callbacks.push(()=>key);
 return callbacks;
}
