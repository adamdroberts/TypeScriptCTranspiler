// @ts-nocheck
const value=Reflect.ownKeys({}),alias=value;
value[0]="17;";console.log(eval(alias[0]));
function make(input){return Reflect.ownKeys(input);}
const result=make({});result[0]="19;";console.log(eval(result[0]));
console.log("allocation-complete");
