export let [first=11,,{value:nested},...tail]:[number|undefined,number,{value:number},...number[]]=[undefined,5,{value:17},19,23];
export const {child:{value:leaf},...rest}={child:{value:29},extra:31};
export var [shared]=[37];
export const {children:[fallback,,...fallbackTail]=[41,43,47]}={} as {children?:number[]};
export function mutate():void{first=53;shared=59;}
