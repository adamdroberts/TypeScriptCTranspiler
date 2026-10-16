const token=/.*/.exec("dynamic")![0];
const body=token==="known"?"return 31;":"return "+String(Math.random())+";";
try{Function(body)();}catch(error){console.log(error instanceof EvalError);}
console.log("constructor-guard-complete");
