const token=/.*/.exec("known")![0];
const body=token==="known"?"return 31;":"return "+String(Math.random())+";";
console.log(Function(body)());
console.log("constructor-known-complete");
