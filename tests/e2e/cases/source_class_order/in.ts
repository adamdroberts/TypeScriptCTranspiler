console.log(eval('{const run=function(body){let saved;class Owner{static value=(saved=body);[body="31;"](){}}return eval(saved);};run("17;");}'));
console.log(eval('{const run=function(body){let saved;class Owner{static {saved=body;}[body="37;"](){}}return eval(saved);};run("17;");}'));
console.log("class-order-complete");
