console.log(eval('{const run=function(body){let saved;class Owner{static value=(saved=body);[body=String(Math.random())+";"](){}}return eval(saved);};run("17;");}'));
