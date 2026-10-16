// @ts-nocheck
function consume(value){return String(Math.random());}
try{eval(consume(1n/0n));}catch(error){console.log(eval("17;"));}
function divide(value){return 1n/value;}
for(const value of [0n,1n]){try{console.log("normal:"+divide(value));}catch(error){console.log("range");}}
console.log("completion-complete");
