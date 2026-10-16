console.log(eval('{const run=function*(body){yield 0;body=String(Math.random())+";";return eval(body);};const step=run("17;");step.next();step.next();}'));
