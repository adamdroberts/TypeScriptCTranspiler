export function readUninitialized():any {
 let value!:number;
 const read=()=>value;
 return [read(),typeof read()];
}
export class Holder {
 value!:number;
 static value:number;
 read():number{return this.value;}
}
export function readHoisted():any {
 function read():any{return value;}
 const initial=read();
 var value:number=3;
 var value:number;
 return [initial,read()];
}
