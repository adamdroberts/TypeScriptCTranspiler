export function advance(value:any):any {
 let local:number=value;
 const initialType=typeof local,old=local++;
 return [initialType,old,local,typeof local];
}
