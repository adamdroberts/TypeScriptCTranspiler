import {Owner,values} from "./source";
let first:any=0,nested:any=0,rest:any;
const source=values();const result=([first=11,,{value:nested},...rest]=source);
console.log("array",first,nested,rest.join("|"),result===source);
const record:any={nested:{value:29},extra:31};
const objectResult=({nested:{value:first},...rest}=record);
console.log("object",first,rest.extra,objectResult===record);
const owner=new Owner(),slots:number[]=[0,0];let index=0;
[owner.field,owner.value,slots[index++],slots[index++]]=[37,41,43,47];
console.log("references",owner.field,owner.value,slots.join("|"),index);
async function suspended():Promise<void>{
    let retained:any=0;const input:any=await Promise.resolve([{token:53}]);
    [retained]=input;await Promise.resolve(0);console.log("retained",retained.token);
}
suspended().catch((error:any)=>{console.log("failure",String(error));throw error;});
