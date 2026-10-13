function forward(value:any):any{return value;}
const saved=forward('17;');
console.log('captured:',eval(saved));
forward(eval('Math.random();'));
