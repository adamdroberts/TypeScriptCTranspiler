{
const results:string[]=[];
const consume=(body:string)=>{results.push(String(eval(body)));};
for(let index=0;index<2;index++){const actual:[string]=["17;"];consume(...actual);}
const values=["b","a"];
values.sort();
console.log(results.join("|"));
console.log(values.join("|"));
console.log("root-phase-complete");
}
