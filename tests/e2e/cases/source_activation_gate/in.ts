console.log(eval('{let result;const run=function*(body){const saved=body;yield 0;body=String(Math.random())+";";result=eval(saved);};const step=run("31;");step.next();step.next();result;}'));
console.log("source-gate-complete");
